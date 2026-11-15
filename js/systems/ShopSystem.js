/**
 * ShopSystem.js
 * Sistema lógico de Tienda de Equipamiento y Suministros (Sección 13).
 * Valida fondos disponibles, niveles de desbloqueo, compras de armas,
 * recargas de munición, botiquines y mejoras permanentes.
 */

import { WEAPON_CATALOG } from './InventorySystem.js';

export const SHOP_SUPPLIES = Object.freeze([
    {
        id: 'supply_medkit',
        name: 'Botiquín Médico de Campo',
        price: 45,
        description: 'Restaura +55 puntos de salud durante una misión (tecla H o desde el inventario).'
    },
    {
        id: 'supply_ammo_pack',
        name: 'Caja de Munición Universal',
        price: 50,
        description: 'Añade +2 cargadores completos de reserva a todas tus armas de fuego adquiridas.'
    },
    {
        id: 'upgrade_damage',
        name: 'Munición Punta Hueca (+15% Daño)',
        basePrice: 180,
        stepPrice: 110,
        maxLevel: 3,
        description: 'Incrementa permanentemente un +15% el daño de todas tus armas.'
    },
    {
        id: 'upgrade_armor',
        name: 'Chaleco Kevlar de Reparto (+20 Salud Máx)',
        basePrice: 160,
        stepPrice: 100,
        maxLevel: 3,
        description: 'Aumenta tu salud máxima en +20 puntos de forma permanente.'
    }
]);

export class ShopSystem {
    constructor(saveSystem, economySystem, inventorySystem) {
        this.saveSystem = saveSystem;
        this.economy = economySystem;
        this.inventory = inventorySystem;
    }

    isShopAvailable() {
        return this.saveSystem.state.player.completedLevels.length >= 1;
    }

    getWeaponsListing() {
        return Object.values(WEAPON_CATALOG).map(spec => {
            const unlocked = this.inventory.isUnlocked(spec.id);
            const purchased = this.inventory.isPurchased(spec.id);
            const equipped = this.inventory.getEquippedWeapon().id === spec.id;
            return {
                ...spec,
                unlocked,
                purchased,
                equipped,
                canAfford: this.economy.getMoney() >= spec.price
            };
        });
    }

    buyWeapon(weaponId) {
        const spec = WEAPON_CATALOG[weaponId];
        if (!spec) {
            return { ok: false, message: 'Arma no válida.' };
        }
        if (!this.inventory.isUnlocked(weaponId)) {
            return { ok: false, message: `Arma bloqueada. Requiere alcanzar el Nivel ${spec.unlockLevel}.` };
        }
        if (this.inventory.isPurchased(weaponId)) {
            this.inventory.equipWeapon(weaponId);
            return { ok: true, message: `${spec.name} equipada.` };
        }
        if (!this.economy.spendMoney(spec.price)) {
            return { ok: false, message: 'Fondos insuficientes para adquirir esta arma.' };
        }

        this.saveSystem.state.inventory.purchasedWeapons.push(weaponId);
        this.saveSystem.state.inventory.ammoReserves[weaponId] = spec.defaultReserve;
        this.inventory.magazines[weaponId] = spec.magazineSize;
        this.inventory.equipWeapon(weaponId);
        this.saveSystem.save();

        return { ok: true, message: `¡${spec.name} comprada y equipada!` };
    }

    getSuppliesListing() {
        const inv = this.saveSystem.state.inventory;
        return SHOP_SUPPLIES.map(item => {
            if (item.id === 'upgrade_damage') {
                const lvl = inv.damageUpgradeLevel || 0;
                const maxed = lvl >= item.maxLevel;
                const price = item.basePrice + lvl * item.stepPrice;
                return {
                    ...item,
                    level: lvl,
                    maxed,
                    price,
                    canAfford: !maxed && this.economy.getMoney() >= price
                };
            }
            if (item.id === 'upgrade_armor') {
                const lvl = inv.armorLevel || 0;
                const maxed = lvl >= item.maxLevel;
                const price = item.basePrice + lvl * item.stepPrice;
                return {
                    ...item,
                    level: lvl,
                    maxed,
                    price,
                    canAfford: !maxed && this.economy.getMoney() >= price
                };
            }
            return {
                ...item,
                level: null,
                maxed: false,
                canAfford: this.economy.getMoney() >= item.price
            };
        });
    }

    buySupply(supplyId) {
        const listing = this.getSuppliesListing().find(s => s.id === supplyId);
        if (!listing) return { ok: false, message: 'Suministro desconocido.' };
        if (listing.maxed) return { ok: false, message: 'Esta mejora ya alcanzó su nivel máximo.' };

        if (!this.economy.spendMoney(listing.price)) {
            return { ok: false, message: 'Dinero insuficiente para realizar esta compra.' };
        }

        if (supplyId === 'supply_medkit') {
            this.inventory.addMedkits(1);
            return { ok: true, message: 'Botiquín añadido a tu mochila (+1).' };
        }

        if (supplyId === 'supply_ammo_pack') {
            for (const w of this.inventory.getPurchasedWeapons()) {
                if (w.type === 'ranged') {
                    this.inventory.addAmmo(w.id, w.magazineSize * 2);
                }
            }
            return { ok: true, message: 'Munición de reserva reabastecida.' };
        }

        if (supplyId === 'upgrade_damage') {
            this.saveSystem.state.inventory.damageUpgradeLevel = (this.saveSystem.state.inventory.damageUpgradeLevel || 0) + 1;
            this.saveSystem.save();
            return { ok: true, message: `Calibre reforzado mejorado a Nivel ${this.saveSystem.state.inventory.damageUpgradeLevel}.` };
        }

        if (supplyId === 'upgrade_armor') {
            this.saveSystem.state.inventory.armorLevel = (this.saveSystem.state.inventory.armorLevel || 0) + 1;
            this.saveSystem.save();
            return { ok: true, message: `Chaleco Kevlar mejorado a Nivel ${this.saveSystem.state.inventory.armorLevel}.` };
        }

        return { ok: false, message: 'Operación no procesada.' };
    }
}
