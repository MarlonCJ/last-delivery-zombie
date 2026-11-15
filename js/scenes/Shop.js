/**
 * Shop.js
 * Escena interactiva de la Tienda de Supervivencia (Sección 13).
 * Renderiza los sprites pixel-art HD reales de cada arma (wpn_bat, wpn_machete,
 * wpn_pistol, wpn_revolver, wpn_shotgun, wpn_smg, wpn_rifle, wpn_flamethrower)
 * y permite asignar hasta 3 armas compradas a la mochila táctica antes de iniciar misión.
 */

export class Shop {
    constructor(engine) {
        this.engine = engine;
        this.time = 0;

        this.overlay = document.getElementById('shop-overlay');
        this.moneyEl = document.getElementById('shop-money-display');
        this.loadoutSummaryEl = document.getElementById('shop-loadout-summary');
        this.feedbackEl = document.getElementById('shop-feedback-msg');
        this.weaponsGrid = document.getElementById('shop-weapons-grid');
        this.suppliesGrid = document.getElementById('shop-supplies-grid');
        this.btnPlayAgain = document.getElementById('btn-shop-play-level');
        this.btnBackMenu = document.getElementById('btn-shop-back-menu');

        this._bindEvents();
    }

    _bindEvents() {
        this.btnPlayAgain?.addEventListener('pointerenter', () => this.engine.audio.playHover());
        this.btnBackMenu?.addEventListener('pointerenter', () => this.engine.audio.playHover());

        this.btnPlayAgain?.addEventListener('click', () => {
            this.engine.audio.playConfirm();
            const targetScene = this.nextSceneKey || 'briefing';
            this.engine.sceneManager.transitionTo(targetScene, {}, 0.45);
        });

        this.btnBackMenu?.addEventListener('click', () => {
            this.engine.audio.playClick();
            this.engine.sceneManager.transitionTo('mainMenu', {}, 0.45);
        });
    }

    enter(params = {}) {
        this.time = 0;
        this.nextSceneKey = params.nextScene || 'briefing';
        if (this.btnPlayAgain) {
            this.btnPlayAgain.textContent = '▶ CONFIRMAR MOCHILA (MÁX. 3 ARMAS) E IR A MISIÓN';
        }
        if (this.feedbackEl) {
            this.feedbackEl.textContent = 'Compra armamento y elige hasta 3 armas para tu mochila antes de iniciar la partida.';
            this.feedbackEl.classList.remove('is-error');
        }
        this._renderCatalog();
        this.overlay?.classList.remove('hidden');
        this.engine.audio.startAmbience('menu');
    }

    exit() {
        this.overlay?.classList.add('hidden');
    }

    _renderCatalog() {
        if (this.moneyEl) {
            this.moneyEl.textContent = `$${this.engine.economy.getMoney()} USD`;
        }

        const loadoutIds = this.engine.inventory.getLoadout().map(w => w.id);
        if (this.loadoutSummaryEl) {
            this.loadoutSummaryEl.textContent = `🎒 MOCHILA: ${loadoutIds.length} / 3 ARMAS`;
        }

        // 1. Listado de armas con sprites HD reales y control de mochila de 3 ranuras
        if (this.weaponsGrid) {
            this.weaponsGrid.innerHTML = '';
            const weapons = this.engine.shop.getWeaponsListing();

            for (const w of weapons) {
                const slotIdx = loadoutIds.indexOf(w.id);
                const inLoadout = slotIdx !== -1;

                const card = document.createElement('article');
                card.className = `shop-card ${!w.unlocked ? 'is-locked' : ''} ${inLoadout ? 'is-equipped' : ''}`;

                const ammoLabel = w.type === 'melee'
                    ? 'Infinita (CQC)'
                    : `${this.engine.inventory.getReserveAmmo(w.id)} disp.`;
                const magLabel = w.type === 'melee' ? 'N/A' : `${w.magazineSize} disp.`;
                const reloadLabel = w.type === 'melee' ? '0.0s' : `${w.reloadTime.toFixed(2)}s`;
                const dmgLabel = w.pellets && w.pellets > 1
                    ? `${this.engine.inventory.getEffectiveDamage(w.id)} x${w.pellets}`
                    : `${this.engine.inventory.getEffectiveDamage(w.id)}`;

                let btnText = '';
                let btnDisabled = false;
                if (!w.unlocked) {
                    btnText = `🔒 BLOQUEADA (NIVEL ${w.unlockLevel})`;
                    btnDisabled = true;
                } else if (w.purchased && inLoadout) {
                    btnText = loadoutIds.length > 1
                        ? `✓ EN MOCHILA [SLOT ${slotIdx + 1}/3] — RETIRAR`
                        : `✓ EN MOCHILA [SLOT 1/3]`;
                    btnDisabled = loadoutIds.length <= 1;
                } else if (w.purchased) {
                    btnText = `🎒 EQUIPAR EN MOCHILA (${loadoutIds.length}/3)`;
                } else if (!w.canAfford) {
                    btnText = `SIN FONDOS ($${w.price})`;
                    btnDisabled = true;
                } else {
                    btnText = `COMPRAR — $${w.price}`;
                }

                card.innerHTML = `
                    <div class="shop-card-top">
                        <h4 class="shop-item-name">${w.name}</h4>
                        <span class="shop-price-tag">${w.purchased ? (inLoadout ? `SLOT ${slotIdx + 1}` : 'COMPRADA') : `$${w.price}`}</span>
                    </div>
                    <div class="shop-weapon-preview">
                        <canvas class="shop-weapon-canvas" width="280" height="82" aria-label="Sprite de ${w.name}"></canvas>
                    </div>
                    <p class="shop-item-desc">${w.description}</p>
                    <div class="shop-stats-grid">
                        <span><strong>Daño:</strong> ${dmgLabel}</span>
                        <span><strong>Cadencia:</strong> ${w.fireRate}/s</span>
                        <span><strong>Cargador:</strong> ${magLabel}</span>
                        <span><strong>Recarga:</strong> ${reloadLabel}</span>
                        <span><strong>Munición:</strong> ${ammoLabel}</span>
                        <span><strong>Desbloqueo:</strong> Nivel ${w.unlockLevel}</span>
                    </div>
                `;

                const weaponCanvas = card.querySelector('.shop-weapon-canvas');
                if (weaponCanvas) {
                    this._drawWeaponIllustration(weaponCanvas, w, inLoadout);
                }

                const actionBtn = document.createElement('button');
                actionBtn.type = 'button';
                actionBtn.className = `shop-buy-btn ${w.purchased ? 'equip-mode' : ''}`;
                actionBtn.textContent = btnText;
                actionBtn.disabled = btnDisabled;

                actionBtn.addEventListener('click', () => {
                    const res = this.engine.shop.buyWeapon(w.id);
                    if (res.ok) {
                        this.engine.audio.playPickup();
                    } else {
                        this.engine.audio.playError();
                    }
                    if (this.feedbackEl) {
                        this.feedbackEl.textContent = res.message;
                        this.feedbackEl.classList.toggle('is-error', !res.ok);
                    }
                    this._renderCatalog();
                });

                card.appendChild(actionBtn);
                this.weaponsGrid.appendChild(card);
            }
        }

        // 2. Suministros y Mejoras disponibles
        if (this.suppliesGrid) {
            this.suppliesGrid.innerHTML = '';
            const supplies = this.engine.shop.getSuppliesListing();

            for (const s of supplies) {
                const card = document.createElement('article');
                card.className = 'shop-supply-card';

                const lvlBadge = s.level !== null ? ` (Nv. ${s.level}/${s.maxLevel})` : '';
                const btnLabel = s.maxed
                    ? 'NIVEL MÁXIMO'
                    : s.canAfford
                        ? `COMPRAR — $${s.price}`
                        : `SIN FONDOS ($${s.price})`;

                card.innerHTML = `
                    <div class="shop-supply-row">
                        <div class="shop-supply-preview">
                            <canvas class="shop-supply-canvas" width="84" height="64" aria-label="Sprite de ${s.name}"></canvas>
                        </div>
                        <div class="shop-supply-info">
                            <h4 class="shop-item-name">${s.name}${lvlBadge}</h4>
                            <p class="shop-item-desc">${s.description}</p>
                        </div>
                    </div>
                `;

                const supplyCanvas = card.querySelector('.shop-supply-canvas');
                if (supplyCanvas) {
                    this._drawSupplyIllustration(supplyCanvas, s);
                }

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'shop-buy-btn';
                btn.textContent = btnLabel;
                btn.disabled = s.maxed || !s.canAfford;

                btn.addEventListener('click', () => {
                    const res = this.engine.shop.buySupply(s.id);
                    if (res.ok) {
                        this.engine.audio.playPickup();
                    } else {
                        this.engine.audio.playError();
                    }
                    if (this.feedbackEl) {
                        this.feedbackEl.textContent = res.message;
                        this.feedbackEl.classList.toggle('is-error', !res.ok);
                    }
                    this._renderCatalog();
                });

                card.appendChild(btn);
                this.suppliesGrid.appendChild(card);
            }
        }
    }

    _drawBlueprintGrid(ctx, w, h, accentColor = 'rgba(110, 155, 210, 0.08)') {
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1;
        for (let x = 14; x < w; x += 18) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 14; y < h; y += 18) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    }

    /**
     * Dibuja el sprite HD real del arma desde game_atlas_ext_hd.png (con respaldo vectorial para pruebas sin DOM img).
     */
    _drawWeaponIllustration(canvas, weapon, inLoadout = false) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;

        this._drawBlueprintGrid(
            ctx,
            w,
            h,
            inLoadout ? 'rgba(56, 229, 125, 0.13)' : 'rgba(110, 155, 210, 0.08)'
        );

        ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h - 10, 92, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        const atlas = this.engine.spriteAtlas;
        if (atlas?.getExtImage() && weapon.spriteKey) {
            const meta = atlas.getSpriteMeta(weapon.spriteKey);
            const aspect = meta ? (meta.w / Math.max(1, meta.h)) : 2.3;
            const drawH = Math.min(58, Math.round(210 / Math.max(1.3, aspect)));
            const drawW = Math.min(226, Math.round(drawH * aspect));
            atlas.drawSprite(
                ctx,
                weapon.spriteKey,
                Math.round((w - drawW) * 0.5),
                Math.round((h - drawH) * 0.5) - 2,
                drawW,
                drawH
            );
        } else {
            // Respaldo vectorial limpio cuando se ejecuta en tests headless sin texturas reales
            ctx.fillStyle = '#8fa4bd';
            ctx.fillRect(w * 0.25, h * 0.36, w * 0.5, 16);
        }

        ctx.fillStyle = weapon.unlocked ? 'rgba(190, 212, 235, 0.78)' : 'rgba(255, 110, 120, 0.90)';
        ctx.font = 'bold 10px Consolas, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(weapon.unlocked ? weapon.shortName.toUpperCase() : `🔒 NV.${weapon.unlockLevel}`, w - 8, 14);
        ctx.textAlign = 'left';
    }

    _drawSupplyIllustration(canvas, supply) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;

        this._drawBlueprintGrid(ctx, w, h, 'rgba(110, 155, 210, 0.08)');
        const atlas = this.engine.spriteAtlas;

        ctx.save();
        if (supply.id === 'supply_medkit' && atlas?.isReady()) {
            const key = atlas.getExtImage() ? 'pickup_medkit' : 'icon_medkit';
            atlas.drawSprite(ctx, key, 16, 10, 52, 44);
        } else if (supply.id === 'supply_ammo_pack' && atlas?.getExtImage()) {
            atlas.drawSprite(ctx, 'pickup_ammo', 15, 10, 54, 44);
        } else if (supply.id === 'upgrade_damage') {
            const glow = ctx.createRadialGradient(42, 32, 4, 42, 32, 30);
            glow.addColorStop(0, 'rgba(235, 45, 58, 0.45)');
            glow.addColorStop(1, 'rgba(235, 45, 58, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, w, h);
            for (let i = 0; i < 3; i++) {
                const bx = 21 + i * 16;
                const by = 24 - (i === 1 ? 5 : 0);
                ctx.fillStyle = '#e3af42';
                ctx.fillRect(bx, by, 10, 24);
                ctx.fillStyle = '#cf5c2b';
                ctx.beginPath();
                ctx.arc(bx + 5, by, 5, Math.PI, 0);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = '#2b394d';
            ctx.strokeStyle = '#8aa4c4';
            ctx.lineWidth = 2;
            ctx.fillRect(22, 14, 40, 38);
            ctx.strokeRect(22, 14, 40, 38);
            ctx.fillStyle = '#38e57d';
            ctx.fillRect(40, 25, 4, 14);
            ctx.fillRect(35, 30, 14, 4);
        }
        ctx.restore();
    }

    update(dt) {
        this.time += dt;
        this.engine.renderer.updateAtmosphere(dt);
    }

    render(renderer) {
        renderer.clear('#070a11');
        renderer.drawRadialGlow(640, 120, 30, 460, 'rgba(245, 166, 35, 0.14)');
        renderer.drawRain(false);
        renderer.drawVignette(0.82);
    }
}
