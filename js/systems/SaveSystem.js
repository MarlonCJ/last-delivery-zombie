/**
 * SaveSystem.js
 * Sistema de persistencia versionado basado en localStorage.
 * Gestiona el perfil del jugador, progreso, economía, inventario, sonido y controles.
 */

const STORAGE_KEY = 'last_delivery_zombie_save';
const CURRENT_VERSION = '1.1.0';

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
            name: '',
            currentLevel: 1,
            completedLevels: [],
            introSeen: false
        },
        economy: {
            money: 0,
            score: 0,
            highScore: 0
        },
        inventory: {
            unlockedWeapons: ['flashlight_melee', 'pistol_9mm', 'shotgun_combat'],
            purchasedWeapons: ['flashlight_melee', 'pistol_9mm'],
            equippedWeapon: 'pistol_9mm',
            medkits: 2,
            armorLevel: 0,
            damageUpgradeLevel: 0,
            ammoReserves: {
                pistol_9mm: 36,
                shotgun_combat: 16,
                smg_tactical: 60,
                rifle_bio: 45
            }
        },
        settings: {
            soundEnabled: true,
            masterVolume: 0.8,
            musicVolume: 0.65,
            sfxVolume: 0.85,
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

        const merged = {
            version: CURRENT_VERSION,
            updatedAt: saved.updatedAt || defaults.updatedAt,
            player: {
                name: typeof saved.player?.name === 'string'
                    ? saved.player.name.trim().slice(0, 20)
                    : defaults.player.name,
                currentLevel: Number.isInteger(saved.player?.currentLevel) && saved.player.currentLevel >= 1
                    ? saved.player.currentLevel
                    : defaults.player.currentLevel,
                completedLevels: Array.isArray(saved.player?.completedLevels)
                    ? saved.player.completedLevels.filter(Number.isInteger)
                    : defaults.player.completedLevels,
                introSeen: Boolean(saved.player?.introSeen)
            },
            economy: {
                money: Number.isFinite(saved.economy?.money) && saved.economy.money >= 0
                    ? Math.floor(saved.economy.money)
                    : defaults.economy.money,
                score: Number.isFinite(saved.economy?.score) && saved.economy.score >= 0
                    ? Math.floor(saved.economy.score)
                    : defaults.economy.score,
                highScore: Number.isFinite(saved.economy?.highScore) && saved.economy.highScore >= 0
                    ? Math.floor(saved.economy.highScore)
                    : defaults.economy.highScore
            },
            inventory: {
                unlockedWeapons: Array.isArray(saved.inventory?.unlockedWeapons) && saved.inventory.unlockedWeapons.length > 0
                    ? [...new Set([...defaults.inventory.unlockedWeapons, ...saved.inventory.unlockedWeapons])]
                    : defaults.inventory.unlockedWeapons,
                purchasedWeapons: Array.isArray(saved.inventory?.purchasedWeapons) && saved.inventory.purchasedWeapons.length > 0
                    ? [...new Set(['flashlight_melee', 'pistol_9mm', ...saved.inventory.purchasedWeapons])]
                    : defaults.inventory.purchasedWeapons,
                equippedWeapon: typeof saved.inventory?.equippedWeapon === 'string' &&
                    saved.version === CURRENT_VERSION
                    ? saved.inventory.equippedWeapon
                    : defaults.inventory.equippedWeapon,
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
        return this.state.player.name;
    }

    setPlayerName(name) {
        const clean = String(name ?? '').trim().replace(/\s+/g, ' ').slice(0, 20);
        this.state.player.name = clean;
        this.save();
        return clean;
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
