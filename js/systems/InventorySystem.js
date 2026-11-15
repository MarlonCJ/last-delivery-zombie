/**
 * InventorySystem.js
 * Catálogo de armas con sprites HD y sistema de inventario/mochila del jugador.
 * Regla clave de jugabilidad: el jugador solo puede llevar hasta 3 armas equipadas
 * en su mochila de misión (loadout), y esta asignación solo puede realizarse
 * ANTES de iniciar la partida/misión (en Tienda o Despacho Pre-Misión).
 */

export const MAX_LOADOUT_SLOTS = 3;

export const WEAPON_CATALOG = Object.freeze({
    flashlight_melee: {
        id: 'flashlight_melee',
        name: 'Bate de Repartidor con Clavos',
        shortName: 'Bate CQC',
        type: 'melee',
        spriteKey: 'wpn_bat',
        playerHoldSprite: null,
        price: 0,
        damage: 34,
        fireRate: 2.35,
        magazineSize: 0,
        defaultReserve: 0,
        reloadTime: 0,
        range: 84,
        unlockLevel: 1,
        description: 'Bate reforzado de defensa urbana. Ideal para ahorrar munición y empujar infectados.'
    },
    machete_combat: {
        id: 'machete_combat',
        name: 'Machete Táctico Cortahuesos',
        shortName: 'Machete',
        type: 'melee',
        spriteKey: 'wpn_machete',
        playerHoldSprite: 'player_wpn_machete',
        price: 135,
        damage: 54,
        fireRate: 2.6,
        magazineSize: 0,
        defaultReserve: 0,
        reloadTime: 0,
        range: 94,
        unlockLevel: 1,
        description: 'Hoja pesada de acero templado con cortes rápidos y letales sin gasto de munición.'
    },
    pistol_9mm: {
        id: 'pistol_9mm',
        name: 'Pistola 9mm Reglamentaria',
        shortName: 'Pistola 9mm',
        type: 'ranged',
        spriteKey: 'wpn_pistol',
        playerHoldSprite: null,
        price: 0,
        damage: 35,
        fireRate: 3.5,
        magazineSize: 12,
        defaultReserve: 48,
        reloadTime: 1.2,
        projectileSpeed: 920,
        range: 680,
        pellets: 1,
        spread: 0.02,
        unlockLevel: 1,
        description: 'Arma corta fiable y precisa para entregas en zonas de riesgo moderado.'
    },
    revolver_magnum: {
        id: 'revolver_magnum',
        name: 'Revólver .357 Magnum',
        shortName: 'Magnum .357',
        type: 'ranged',
        spriteKey: 'wpn_revolver',
        playerHoldSprite: 'player_wpn_revolver',
        price: 185,
        damage: 64,
        fireRate: 2.0,
        magazineSize: 6,
        defaultReserve: 30,
        reloadTime: 1.55,
        projectileSpeed: 980,
        range: 720,
        pellets: 1,
        spread: 0.012,
        unlockLevel: 1,
        description: 'Tambor de 6 disparos de altísimo impacto capaz de derribar infectados resistentes.'
    },
    shotgun_combat: {
        id: 'shotgun_combat',
        name: 'Escopeta Táctica M-87',
        shortName: 'Escopeta M-87',
        type: 'ranged',
        spriteKey: 'wpn_shotgun',
        playerHoldSprite: 'player_wpn_shotgun',
        price: 220,
        damage: 20,
        fireRate: 1.15,
        magazineSize: 6,
        defaultReserve: 24,
        reloadTime: 1.8,
        projectileSpeed: 840,
        range: 420,
        pellets: 5,
        spread: 0.19,
        unlockLevel: 1,
        description: 'Dispara 5 perdigones devastadores a corta distancia capaces de desmembrar zombis.'
    },
    smg_tactical: {
        id: 'smg_tactical',
        name: 'Subfusil Bio-MP5',
        shortName: 'Bio-MP5',
        type: 'ranged',
        spriteKey: 'wpn_smg',
        playerHoldSprite: 'player_wpn_smg',
        price: 380,
        damage: 25,
        fireRate: 7.8,
        magazineSize: 28,
        defaultReserve: 84,
        reloadTime: 1.45,
        projectileSpeed: 960,
        range: 620,
        pellets: 1,
        spread: 0.055,
        unlockLevel: 2,
        description: 'Cadencia elevada ideal para contener corredores, saltadores y jefes agresivos.'
    },
    rifle_bio: {
        id: 'rifle_bio',
        name: 'Rifle de Asalto AR-Contención',
        shortName: 'AR-Contención',
        type: 'ranged',
        spriteKey: 'wpn_rifle',
        playerHoldSprite: 'player_wpn_rifle',
        price: 560,
        damage: 54,
        fireRate: 4.8,
        magazineSize: 24,
        defaultReserve: 72,
        reloadTime: 1.65,
        projectileSpeed: 1080,
        range: 780,
        pellets: 1,
        spread: 0.018,
        unlockLevel: 2,
        description: 'Fusil pesado de las fuerzas Biogen con gran perforación contra blindados y brutos.'
    },
    flamethrower_bio: {
        id: 'flamethrower_bio',
        name: 'Lanzallamas Purgador B-3',
        shortName: 'Lanzallamas',
        type: 'ranged',
        spriteKey: 'wpn_flamethrower',
        playerHoldSprite: 'player_wpn_flamethrower',
        price: 720,
        damage: 20,
        fireRate: 9.0,
        magazineSize: 40,
        defaultReserve: 120,
        reloadTime: 2.0,
        projectileSpeed: 540,
        range: 310,
        pellets: 3,
        spread: 0.22,
        isFlame: true,
        unlockLevel: 3,
        description: 'Incinera hordas completas a corta y media distancia con chorro térmico continuo.'
    }
});

export class InventorySystem {
    constructor(saveSystem) {
        this.saveSystem = saveSystem;
        this.magazines = {};
        this.reloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 0;

        this.resetMissionLoadout();
    }

    _sanitizeLoadout() {
        const inv = this.saveSystem.state.inventory;
        if (!Array.isArray(inv.loadout)) {
            inv.loadout = inv.purchasedWeapons.slice(0, MAX_LOADOUT_SLOTS);
        }
        inv.loadout = [...new Set(inv.loadout)]
            .filter(id => WEAPON_CATALOG[id] && inv.purchasedWeapons.includes(id))
            .slice(0, MAX_LOADOUT_SLOTS);

        if (inv.loadout.length === 0) {
            const fallback = inv.purchasedWeapons.filter(id => WEAPON_CATALOG[id]).slice(0, MAX_LOADOUT_SLOTS);
            inv.loadout = fallback.length > 0 ? fallback : ['flashlight_melee', 'pistol_9mm'];
        }

        if (!inv.loadout.includes(inv.equippedWeapon)) {
            inv.equippedWeapon = inv.loadout.includes('pistol_9mm') ? 'pistol_9mm' : inv.loadout[0];
        }
    }

    /**
     * Inicializa los cargadores llenos al comenzar un nivel respetando las 3 armas asignadas.
     */
    resetMissionLoadout() {
        this.reloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 0;

        const inv = this.saveSystem.state.inventory;
        if (!inv.ammoReserves || typeof inv.ammoReserves !== 'object') {
            inv.ammoReserves = {};
        }

        for (const [id, spec] of Object.entries(WEAPON_CATALOG)) {
            if (spec.type === 'ranged') {
                this.magazines[id] = spec.magazineSize;
                const currentReserve = inv.ammoReserves?.[id];
                if (!Number.isFinite(currentReserve) || currentReserve < spec.magazineSize * 2) {
                    inv.ammoReserves[id] = Math.max(currentReserve || 0, spec.defaultReserve);
                }
            }
        }

        this._sanitizeLoadout();
        this.saveSystem.save();
    }

    getAllWeaponSpecs() {
        return Object.values(WEAPON_CATALOG);
    }

    getWeaponSpec(weaponId) {
        return WEAPON_CATALOG[weaponId] || WEAPON_CATALOG.pistol_9mm;
    }

    getPurchasedWeapons() {
        const ids = this.saveSystem.state.inventory.purchasedWeapons || [];
        return ids.map(id => WEAPON_CATALOG[id]).filter(Boolean);
    }

    /**
     * Retorna únicamente las armas asignadas a la mochila de misión (máximo 3).
     */
    getLoadout() {
        this._sanitizeLoadout();
        return this.saveSystem.state.inventory.loadout
            .map(id => WEAPON_CATALOG[id])
            .filter(Boolean);
    }

    isInLoadout(weaponId) {
        this._sanitizeLoadout();
        return this.saveSystem.state.inventory.loadout.includes(weaponId);
    }

    /**
     * Asigna o retira un arma comprada de los 3 espacios de misión.
     * Solo debe invocarse ANTES de iniciar un nivel (Tienda o Despacho Pre-Misión).
     */
    toggleLoadoutWeapon(weaponId) {
        const spec = WEAPON_CATALOG[weaponId];
        if (!spec || !this.isPurchased(weaponId)) {
            return { ok: false, message: 'Primero debes comprar esta arma para asignarla.' };
        }

        this._sanitizeLoadout();
        const loadout = this.saveSystem.state.inventory.loadout;
        const idx = loadout.indexOf(weaponId);

        if (idx !== -1) {
            if (loadout.length <= 1) {
                return { ok: false, message: 'Debes llevar al menos 1 arma equipada a la misión.' };
            }
            loadout.splice(idx, 1);
            if (this.saveSystem.state.inventory.equippedWeapon === weaponId) {
                this.saveSystem.state.inventory.equippedWeapon = loadout[0];
            }
            this.saveSystem.save();
            return {
                ok: true,
                inLoadout: false,
                message: `${spec.shortName} retirada de tu mochila (${loadout.length}/${MAX_LOADOUT_SLOTS}).`
            };
        }

        if (loadout.length >= MAX_LOADOUT_SLOTS) {
            return {
                ok: false,
                message: `Mochila llena (${MAX_LOADOUT_SLOTS}/${MAX_LOADOUT_SLOTS} armas máx.). Retira una de tus 3 armas primero.`
            };
        }

        loadout.push(weaponId);
        this.saveSystem.state.inventory.equippedWeapon = weaponId;
        this.saveSystem.save();
        return {
            ok: true,
            inLoadout: true,
            message: `${spec.shortName} asignada a tu mochila (${loadout.length}/${MAX_LOADOUT_SLOTS}).`
        };
    }

    isUnlocked(weaponId) {
        const spec = WEAPON_CATALOG[weaponId];
        if (!spec) return false;
        const playerLevel = this.saveSystem.state.player.currentLevel;
        return (
            playerLevel >= spec.unlockLevel ||
            this.saveSystem.state.inventory.unlockedWeapons.includes(weaponId)
        );
    }

    isPurchased(weaponId) {
        return this.saveSystem.state.inventory.purchasedWeapons.includes(weaponId);
    }

    getEquippedWeapon() {
        this._sanitizeLoadout();
        const id = this.saveSystem.state.inventory.equippedWeapon;
        return WEAPON_CATALOG[id] || WEAPON_CATALOG.pistol_9mm;
    }

    /**
     * Cambia el arma activa únicamente entre las 3 armas llevadas en la mochila.
     */
    equipWeapon(weaponId) {
        if (!this.isPurchased(weaponId) || !this.isInLoadout(weaponId)) return false;
        if (this.saveSystem.state.inventory.equippedWeapon !== weaponId) {
            this.reloading = false;
            this.reloadTimer = 0;
            this.saveSystem.state.inventory.equippedWeapon = weaponId;
            this.saveSystem.save();
        }
        return true;
    }

    cycleWeapon(direction = 1) {
        const carried = this.getLoadout();
        if (carried.length <= 1) return this.getEquippedWeapon();
        const currentId = this.getEquippedWeapon().id;
        const idx = carried.findIndex(w => w.id === currentId);
        const safeIdx = idx === -1 ? 0 : idx;
        const nextIdx = (safeIdx + direction + carried.length) % carried.length;
        this.equipWeapon(carried[nextIdx].id);
        return this.getEquippedWeapon();
    }

    getDamageMultiplier() {
        const lvl = this.saveSystem.state.inventory.damageUpgradeLevel || 0;
        return 1 + lvl * 0.15;
    }

    getEffectiveDamage(weaponId) {
        const spec = this.getWeaponSpec(weaponId);
        return Math.round(spec.damage * this.getDamageMultiplier());
    }

    getMaxHealthBonus() {
        const lvl = this.saveSystem.state.inventory.armorLevel || 0;
        return lvl * 20;
    }

    getMagazineAmmo(weaponId = this.getEquippedWeapon().id) {
        return this.magazines[weaponId] ?? 0;
    }

    getReserveAmmo(weaponId = this.getEquippedWeapon().id) {
        return this.saveSystem.state.inventory.ammoReserves[weaponId] ?? 0;
    }

    addAmmo(weaponId, amount) {
        const spec = WEAPON_CATALOG[weaponId];
        if (!spec || spec.type !== 'ranged') return;
        const current = this.getReserveAmmo(weaponId);
        this.saveSystem.state.inventory.ammoReserves[weaponId] = current + Math.max(0, Math.floor(amount));
        this.saveSystem.save();
    }

    consumeShot() {
        const weapon = this.getEquippedWeapon();
        if (weapon.type === 'melee') return true;
        if (this.reloading) return false;

        const mag = this.getMagazineAmmo(weapon.id);
        if (mag <= 0) return false;

        this.magazines[weapon.id] = mag - 1;
        return true;
    }

    canReload() {
        const weapon = this.getEquippedWeapon();
        if (weapon.type === 'melee' || this.reloading) return false;
        const mag = this.getMagazineAmmo(weapon.id);
        const reserve = this.getReserveAmmo(weapon.id);
        return mag < weapon.magazineSize && reserve > 0;
    }

    startReload() {
        if (!this.canReload()) return false;
        const weapon = this.getEquippedWeapon();
        this.reloading = true;
        this.reloadDuration = weapon.reloadTime;
        this.reloadTimer = weapon.reloadTime;
        return true;
    }

    update(dt) {
        if (!this.reloading) return false;
        this.reloadTimer -= dt;
        if (this.reloadTimer <= 0) {
            const weapon = this.getEquippedWeapon();
            const needed = weapon.magazineSize - this.getMagazineAmmo(weapon.id);
            const available = this.getReserveAmmo(weapon.id);
            const transfer = Math.min(needed, available);

            this.magazines[weapon.id] += transfer;
            this.saveSystem.state.inventory.ammoReserves[weapon.id] = available - transfer;
            this.reloading = false;
            this.reloadTimer = 0;
            this.saveSystem.save();
            return true;
        }
        return false;
    }

    getReloadProgress() {
        if (!this.reloading || this.reloadDuration <= 0) return 0;
        return 1 - Math.max(0, this.reloadTimer / this.reloadDuration);
    }

    getMedkits() {
        return this.saveSystem.state.inventory.medkits || 0;
    }

    addMedkits(count = 1) {
        this.saveSystem.state.inventory.medkits = this.getMedkits() + Math.max(0, Math.floor(count));
        this.saveSystem.save();
    }

    useMedkit() {
        const count = this.getMedkits();
        if (count <= 0) return false;
        this.saveSystem.state.inventory.medkits = count - 1;
        this.saveSystem.save();
        return true;
    }
}
