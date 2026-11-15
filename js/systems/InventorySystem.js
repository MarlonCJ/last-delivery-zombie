/**
 * InventorySystem.js
 * Catálogo de armas y sistema de inventario en tiempo real del jugador.
 * Gestiona el arma equipada, cargadores activos, munición de reserva,
 * tiempos de recarga, botiquines y bonificaciones de mejora.
 */

export const WEAPON_CATALOG = Object.freeze({
    flashlight_melee: {
        id: 'flashlight_melee',
        name: 'Bate de Repartidor Reforzado',
        shortName: 'Bate CQC',
        type: 'melee',
        price: 0,
        damage: 34,
        fireRate: 2.35,         // ataques por segundo
        magazineSize: 0,        // sin cargador (cuerpo a cuerpo)
        defaultReserve: 0,
        reloadTime: 0,
        range: 84,
        unlockLevel: 1,
        description: 'Bate contundente de defensa urbana. Ideal para ahorrar munición y hacer retroceder infectados.'
    },
    pistol_9mm: {
        id: 'pistol_9mm',
        name: 'Pistola 9mm Reglamentaria',
        shortName: 'Pistola 9mm',
        type: 'ranged',
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
    shotgun_combat: {
        id: 'shotgun_combat',
        name: 'Escopeta Táctica M-87',
        shortName: 'Escopeta M-87',
        type: 'ranged',
        price: 220,
        damage: 20,             // por perdigón (x5 = 100 máx)
        fireRate: 1.15,
        magazineSize: 6,
        defaultReserve: 24,
        reloadTime: 1.8,
        projectileSpeed: 840,
        range: 420,
        pellets: 5,
        spread: 0.19,
        unlockLevel: 1,
        description: 'Dispara una ráfaga de 5 perdigones letales a corta distancia con gran retroceso.'
    },
    smg_tactical: {
        id: 'smg_tactical',
        name: 'Subfusil Bio-MP5',
        shortName: 'Bio-MP5',
        type: 'ranged',
        price: 380,
        damage: 24,
        fireRate: 7.5,
        magazineSize: 28,
        defaultReserve: 84,
        reloadTime: 1.45,
        projectileSpeed: 960,
        range: 620,
        pellets: 1,
        spread: 0.055,
        unlockLevel: 2,
        description: 'Cadencia elevada ideal para contener múltiples infectados y jefes agresivos.'
    },
    rifle_bio: {
        id: 'rifle_bio',
        name: 'Rifle AR-Contención',
        shortName: 'AR-Contención',
        type: 'ranged',
        price: 650,
        damage: 54,
        fireRate: 4.6,
        magazineSize: 24,
        defaultReserve: 72,
        reloadTime: 1.7,
        projectileSpeed: 1080,
        range: 780,
        pellets: 1,
        spread: 0.018,
        unlockLevel: 3,
        description: 'Armamento pesado de las fuerzas de contención Biogen. Alto poder de parada.'
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

    /**
     * Inicializa los cargadores llenos al comenzar un nivel respetando reservas guardadas.
     */
    resetMissionLoadout() {
        this.reloading = false;
        this.reloadTimer = 0;
        this.reloadDuration = 0;

        const inv = this.saveSystem.state.inventory;
        for (const [id, spec] of Object.entries(WEAPON_CATALOG)) {
            if (spec.type === 'ranged') {
                this.magazines[id] = spec.magazineSize;
                const currentReserve = inv.ammoReserves?.[id];
                if (!Number.isFinite(currentReserve) || currentReserve < spec.magazineSize * 2) {
                    inv.ammoReserves[id] = Math.max(currentReserve || 0, spec.defaultReserve);
                }
            }
        }

        if (!this.isPurchased(inv.equippedWeapon)) {
            inv.equippedWeapon = 'pistol_9mm';
        }
        this.saveSystem.save();
    }

    getAllWeaponSpecs() {
        return Object.values(WEAPON_CATALOG);
    }

    getWeaponSpec(weaponId) {
        return WEAPON_CATALOG[weaponId] || WEAPON_CATALOG.pistol_9mm;
    }

    getPurchasedWeapons() {
        const ids = this.saveSystem.state.inventory.purchasedWeapons;
        return ids.map(id => WEAPON_CATALOG[id]).filter(Boolean);
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
        const id = this.saveSystem.state.inventory.equippedWeapon;
        return WEAPON_CATALOG[id] || WEAPON_CATALOG.pistol_9mm;
    }

    equipWeapon(weaponId) {
        if (!this.isPurchased(weaponId)) return false;
        if (this.saveSystem.state.inventory.equippedWeapon !== weaponId) {
            this.reloading = false;
            this.reloadTimer = 0;
            this.saveSystem.state.inventory.equippedWeapon = weaponId;
            this.saveSystem.save();
        }
        return true;
    }

    cycleWeapon(direction = 1) {
        const owned = this.getPurchasedWeapons();
        if (owned.length <= 1) return this.getEquippedWeapon();
        const currentId = this.getEquippedWeapon().id;
        const idx = owned.findIndex(w => w.id === currentId);
        const nextIdx = (idx + direction + owned.length) % owned.length;
        this.equipWeapon(owned[nextIdx].id);
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
            return true; // Recarga completada en este frame
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
