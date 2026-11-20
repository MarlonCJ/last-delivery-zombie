/**
 * SaveSystem.js
 * Sistema de persistencia versionado basado en localStorage.
 * Gestiona el perfil del jugador, progreso, economía, inventario, sonido y controles.
 */

const STORAGE_KEY = 'last_delivery_zombie_save';
const CURRENT_VERSION = '1.2.0';

// Cada 10,000 puntos acumulados se otorga +1 vida extra.
export const LIFE_SCORE_INTERVAL = 10000;

// Nombre fijo del protagonista: el repartidor se llama EDI.
export const PLAYER_NAME = 'EDI';

export const DEFAULT_CONTROLS = Object.freeze({
    moveLeft: ['KeyA', 'ArrowLeft'],
    moveRight: ['KeyD', 'ArrowRight'],
    jump: ['KeyW', 'Space', 'ArrowUp'],
    interact: ['KeyE'],
    attack: ['KeyF'],
    reload: ['KeyR'],
    inventory: ['KeyI'],
    pause: ['Escape']
});

function createDefaultState() {
    return {
        version: CURRENT_VERSION,
        updatedAt: new Date().toISOString(),
        player: {
            name: PLAYER_NAME,
            currentLevel: 1,
            completedLevels: [],
            introSeen: false,
            lives: 3,
            nextLifeScore: LIFE_SCORE_INTERVAL
        },
        economy: {
            money: 0,
            score: 0,
            highScore: 0
        },
        inventory: {
            unlockedWeapons: ['flashlight_melee', 'machete_combat', 'pistol_9mm', 'revolver_magnum', 'shotgun_combat'],
            purchasedWeapons: ['flashlight_melee', 'pistol_9mm'],
            loadout: ['flashlight_melee', 'pistol_9mm'],
            equippedWeapon: 'pistol_9mm',
            medkits: 2,
            armorLevel: 0,
            damageUpgradeLevel: 0,
            ammoReserves: {
                pistol_9mm: 48,
                revolver_magnum: 30,
                shotgun_combat: 24,
                smg_tactical: 84,
                rifle_bio: 72,
                flamethrower_bio: 120
            }
        },
        settings: {
            soundEnabled: true,
            masterVolume: 0.92,
            musicVolume: 0.62,
            sfxVolume: 0.96,
            particleQuality: 'high',
            showFps: false,
            controls: structuredClone(DEFAULT_CONTROLS)
        }
    };
}

export class SaveSystem {
    constructor() {
        this.memoryFallback = null;
        this.storageAvailable = this._checkStorageAvailability();
        this.state = createDefaultState();
        this.listeners = new Set();
        this.load();
    }

    _checkStorageAvailability() {
        try {
            const testKey = '__ldz_storage_test__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
            return true;
        } catch (err) {
            console.warn('[SaveSystem] localStorage no disponible; usando memoria de sesión.', err);
            return false;
        }
    }

    /**
     * Carga y migra los datos guardados asegurando integridad estructural.
     */
    load() {
        const defaults = createDefaultState();
        try {
            const raw = this.storageAvailable
                ? window.localStorage.getItem(STORAGE_KEY)
                : this.memoryFallback;

            if (!raw) {
                this.state = defaults;
                this.save();
                return this.state;
            }

            const parsed = JSON.parse(raw);
            this.state = this._migrateAndSanitize(parsed, defaults);
            this.save();
        } catch (err) {
            console.error('[SaveSystem] Error al leer datos guardados. Restaurando valores seguros.', err);
            this.state = defaults;
            this.save();
        }
        return this.state;
    }

    /**
     * Migra versiones previas y sanea campos faltantes o corruptos.
     */
    _migrateAndSanitize(saved, defaults) {
        if (!saved || typeof saved !== 'object') {
            return defaults;
        }

        const purchasedList = Array.isArray(saved.inventory?.purchasedWeapons) && saved.inventory.purchasedWeapons.length > 0
            ? [...new Set(['flashlight_melee', 'pistol_9mm', ...saved.inventory.purchasedWeapons])]
            : defaults.inventory.purchasedWeapons;

        const rawLoadout = Array.isArray(saved.inventory?.loadout) && saved.inventory.loadout.length > 0
            ? saved.inventory.loadout.filter(id => typeof id === 'string' && purchasedList.includes(id))
            : purchasedList.slice(0, 3);
        const sanitizedLoadout = [...new Set(rawLoadout)].slice(0, 3);
        if (sanitizedLoadout.length === 0) {
            sanitizedLoadout.push('flashlight_melee', 'pistol_9mm');
        }

        const savedScore = Number.isFinite(saved.economy?.score) && saved.economy.score >= 0
            ? Math.floor(saved.economy.score)
            : defaults.economy.score;
        const defaultNextLife = (Math.floor(savedScore / LIFE_SCORE_INTERVAL) + 1) * LIFE_SCORE_INTERVAL;

        // Migración: descarta umbrales antiguos (3,000 pts) o desalineados y los
        // recoloca en el siguiente múltiplo de 10,000 puntos.
        const savedNextLife = saved.player?.nextLifeScore;
        const normalizedNextLife = Number.isInteger(savedNextLife) &&
            savedNextLife > savedScore &&
            savedNextLife % LIFE_SCORE_INTERVAL === 0
            ? savedNextLife
            : defaultNextLife;

        const merged = {
            version: CURRENT_VERSION,
            updatedAt: saved.updatedAt || defaults.updatedAt,
            player: {
                // El nombre ya no es editable: todo perfil guardado pasa a llamarse EDI.
                name: PLAYER_NAME,
                currentLevel: Number.isInteger(saved.player?.currentLevel) && saved.player.currentLevel >= 1
                    ? saved.player.currentLevel
                    : defaults.player.currentLevel,
                completedLevels: Array.isArray(saved.player?.completedLevels)
                    ? saved.player.completedLevels.filter(Number.isInteger)
                    : defaults.player.completedLevels,
                introSeen: Boolean(saved.player?.introSeen),
                lives: Number.isInteger(saved.player?.lives) && saved.player.lives >= 1
                    ? saved.player.lives
                    : defaults.player.lives,
                nextLifeScore: normalizedNextLife
            },
            economy: {
                money: Number.isFinite(saved.economy?.money) && saved.economy.money >= 0
                    ? Math.floor(saved.economy.money)
                    : defaults.economy.money,
                score: savedScore,
                highScore: Number.isFinite(saved.economy?.highScore) && saved.economy.highScore >= 0
                    ? Math.floor(saved.economy.highScore)
                    : defaults.economy.highScore
            },
            inventory: {
                unlockedWeapons: Array.isArray(saved.inventory?.unlockedWeapons) && saved.inventory.unlockedWeapons.length > 0
                    ? [...new Set([...defaults.inventory.unlockedWeapons, ...saved.inventory.unlockedWeapons])]
                    : defaults.inventory.unlockedWeapons,
                purchasedWeapons: purchasedList,
                loadout: sanitizedLoadout,
                equippedWeapon: typeof saved.inventory?.equippedWeapon === 'string' &&
                    sanitizedLoadout.includes(saved.inventory.equippedWeapon)
                    ? saved.inventory.equippedWeapon
                    : (sanitizedLoadout.includes('pistol_9mm') ? 'pistol_9mm' : sanitizedLoadout[0]),
                medkits: Number.isInteger(saved.inventory?.medkits) && saved.inventory.medkits >= 0
                    ? saved.inventory.medkits
                    : defaults.inventory.medkits,
                armorLevel: Number.isInteger(saved.inventory?.armorLevel) && saved.inventory.armorLevel >= 0
                    ? Math.min(3, saved.inventory.armorLevel)
                    : defaults.inventory.armorLevel,
                damageUpgradeLevel: Number.isInteger(saved.inventory?.damageUpgradeLevel) && saved.inventory.damageUpgradeLevel >= 0
                    ? Math.min(3, saved.inventory.damageUpgradeLevel)
                    : defaults.inventory.damageUpgradeLevel,
                ammoReserves: {
                    ...defaults.inventory.ammoReserves,
                    ...(saved.inventory?.ammoReserves && typeof saved.inventory.ammoReserves === 'object'
                        ? saved.inventory.ammoReserves
                        : {})
                }
            },
            settings: {
                soundEnabled: typeof saved.settings?.soundEnabled === 'boolean'
                    ? saved.settings.soundEnabled
                    : defaults.settings.soundEnabled,
                masterVolume: this._clampUnit(saved.settings?.masterVolume, defaults.settings.masterVolume),
                musicVolume: this._clampUnit(saved.settings?.musicVolume, defaults.settings.musicVolume),
                sfxVolume: this._clampUnit(saved.settings?.sfxVolume, defaults.settings.sfxVolume),
                particleQuality: ['high', 'medium', 'low'].includes(saved.settings?.particleQuality)
                    ? saved.settings.particleQuality
                    : defaults.settings.particleQuality,
                showFps: Boolean(saved.settings?.showFps),
                controls: this._sanitizeControls(saved.settings?.controls, defaults.settings.controls)
            }
        };

        return merged;
    }

    _clampUnit(value, fallback) {
        return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
    }

    _sanitizeControls(savedControls, defaultControls) {
        const result = {};
        for (const action of Object.keys(defaultControls)) {
            const custom = savedControls?.[action];
            if (Array.isArray(custom) && custom.length > 0 && custom.every(k => typeof k === 'string')) {
                result[action] = [...custom];
            } else {
                result[action] = [...defaultControls[action]];
            }
        }
        return result;
    }

    /**
     * Persiste el estado actual en localStorage.
     */
    save() {
        this.state.version = CURRENT_VERSION;
        this.state.updatedAt = new Date().toISOString();
        const serialized = JSON.stringify(this.state);

        try {
            if (this.storageAvailable) {
                window.localStorage.setItem(STORAGE_KEY, serialized);
            } else {
                this.memoryFallback = serialized;
            }
        } catch (err) {
            console.error('[SaveSystem] Error al guardar en localStorage:', err);
        }

        this._notify();
    }

    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    _notify() {
        for (const listener of this.listeners) {
            listener(this.state);
        }
    }

    // --- Accesores de Jugador ---

    getPlayerName() {
        return PLAYER_NAME;
    }

    /** El nombre del protagonista es fijo (EDI); se conserva por compatibilidad. */
    setPlayerName() {
        this.state.player.name = PLAYER_NAME;
        this.save();
        return PLAYER_NAME;
    }

    markIntroSeen(seen = true) {
        this.state.player.introSeen = Boolean(seen);
        this.save();
    }

    completeLevel(levelId, unlockedWeapons = []) {
        if (!this.state.player.completedLevels.includes(levelId)) {
            this.state.player.completedLevels.push(levelId);
        }
        if (this.state.player.currentLevel <= levelId) {
            this.state.player.currentLevel = levelId + 1;
        }
        for (const wId of unlockedWeapons) {
            if (!this.state.inventory.unlockedWeapons.includes(wId)) {
                this.state.inventory.unlockedWeapons.push(wId);
            }
        }
        this.save();
    }

    getLives() {
        return Number.isInteger(this.state.player.lives) ? this.state.player.lives : 3;
    }

    addLives(count = 1) {
        const valid = Math.max(0, Math.floor(count));
        if (valid === 0) return this.getLives();
        this.state.player.lives = this.getLives() + valid;
        this.save();
        return this.state.player.lives;
    }

    loseLife() {
        this.state.player.lives = Math.max(0, this.getLives() - 1);
        this.save();
        return this.state.player.lives;
    }

    /**
     * Muerte permanente al agotar todas las vidas:
     * Reinicia completamente niveles, armas compradas, dinero, puntos, mejoras y vidas,
     * manteniendo únicamente el nombre del jugador y los ajustes de audio/controles.
     */
    resetGameOnPermadeath() {
        const savedName = this.state.player.name || '';
        const savedSettings = structuredClone(this.state.settings);
        const fresh = createDefaultState();
        fresh.player.name = savedName;
        fresh.settings = savedSettings;
        this.state = fresh;
        this.save();
        return this.state;
    }

    // --- Accesores de Configuración y Sonido ---

    getSettings() {
        return this.state.settings;
    }

    isSoundEnabled() {
        return this.state.settings.soundEnabled;
    }

    setSoundEnabled(enabled) {
        this.state.settings.soundEnabled = Boolean(enabled);
        this.save();
        return this.state.settings.soundEnabled;
    }

    toggleSound() {
        return this.setSoundEnabled(!this.state.settings.soundEnabled);
    }

    setVolumes({ masterVolume, musicVolume, sfxVolume }) {
        if (masterVolume !== undefined) {
            this.state.settings.masterVolume = this._clampUnit(masterVolume, this.state.settings.masterVolume);
        }
        if (musicVolume !== undefined) {
            this.state.settings.musicVolume = this._clampUnit(musicVolume, this.state.settings.musicVolume);
        }
        if (sfxVolume !== undefined) {
            this.state.settings.sfxVolume = this._clampUnit(sfxVolume, this.state.settings.sfxVolume);
        }
        this.save();
    }

    setParticleQuality(quality) {
        if (['high', 'medium', 'low'].includes(quality)) {
            this.state.settings.particleQuality = quality;
            this.save();
        }
    }

    setShowFps(enabled) {
        this.state.settings.showFps = Boolean(enabled);
        this.save();
    }

    // --- Accesores de Controles ---

    getControls() {
        return this.state.settings.controls;
    }

    setControlBinding(action, keyCodes) {
        if (!DEFAULT_CONTROLS[action]) return;
        const validKeys = Array.isArray(keyCodes) ? keyCodes.filter(Boolean) : [keyCodes];
        if (validKeys.length === 0) return;

        // Evitar que otra acción quede sin tecla si compartía la misma tecla única
        for (const [otherAction, codes] of Object.entries(this.state.settings.controls)) {
            if (otherAction !== action && otherAction !== 'pause') {
                const filtered = codes.filter(c => !validKeys.includes(c));
                if (filtered.length > 0) {
                    this.state.settings.controls[otherAction] = filtered;
                }
            }
        }

        this.state.settings.controls[action] = validKeys;
        this.save();
    }

    resetControls() {
        this.state.settings.controls = structuredClone(DEFAULT_CONTROLS);
        this.save();
    }

    /**
     * Reinicia el progreso conservando o restaurando ajustes según se indique.
     */
    resetAllProgress(keepSettings = true) {
        const currentSettings = structuredClone(this.state.settings);
        this.state = createDefaultState();
        if (keepSettings) {
            this.state.settings = currentSettings;
        }
        this.save();
    }
}
