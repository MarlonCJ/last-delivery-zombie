/**
 * Shop.js
 * Escena interactiva de la Tienda de Supervivencia (Sección 13).
 * Permite consultar dinero disponible, revisar características técnicas de todas
 * las armas, identificar armas bloqueadas, comprar equipamiento y adquirir mejoras.
 */

export class Shop {
    constructor(engine) {
        this.engine = engine;
        this.time = 0;

        this.overlay = document.getElementById('shop-overlay');
        this.moneyEl = document.getElementById('shop-money-display');
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
            const targetScene = this.nextSceneKey || 'level01';
            this.engine.sceneManager.transitionTo(targetScene, {}, 0.45);
        });

        this.btnBackMenu?.addEventListener('click', () => {
            this.engine.audio.playClick();
            this.engine.sceneManager.transitionTo('mainMenu', {}, 0.45);
        });
    }

    enter(params = {}) {
        this.time = 0;
        const lvl1Done = this.engine.saveSystem.state.player.completedLevels.includes(1);
        this.nextSceneKey = params.nextScene || (lvl1Done ? 'level02' : 'level01');
        if (this.btnPlayAgain) {
            this.btnPlayAgain.textContent = this.nextSceneKey === 'level02'
                ? '▶ DESPLEGAR EN NIVEL 02: PABELLÓN DE URGENCIAS'
                : '▶ DESPLEGAR EN NIVEL 01: PRIMERA ENTREGA';
        }
        if (this.feedbackEl) {
            this.feedbackEl.textContent = 'Selecciona un arma o suministro para mejorar tu equipo de reparto.';
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

        // 1. Listado de armas con sus 8 atributos exigidos en Sección 13
        if (this.weaponsGrid) {
            this.weaponsGrid.innerHTML = '';
            const weapons = this.engine.shop.getWeaponsListing();

            for (const w of weapons) {
                const card = document.createElement('article');
                card.className = `shop-card ${!w.unlocked ? 'is-locked' : ''} ${w.equipped ? 'is-equipped' : ''}`;

                const ammoLabel = w.type === 'melee'
                    ? 'Infinita (CQC)'
                    : `${this.engine.inventory.getReserveAmmo(w.id)} balas`;
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
                } else if (w.equipped) {
                    btnText = '✓ EQUIPADA';
                    btnDisabled = true;
                } else if (w.purchased) {
                    btnText = 'EQUIPAR ARMA';
                } else if (!w.canAfford) {
                    btnText = `SIN FONDOS ($${w.price})`;
                    btnDisabled = true;
                } else {
                    btnText = `COMPRAR — $${w.price}`;
                }

                card.innerHTML = `
                    <div class="shop-card-top">
                        <h4 class="shop-item-name">${w.name}</h4>
                        <span class="shop-price-tag">${w.purchased ? 'ADQUIRIDA' : `$${w.price}`}</span>
                    </div>
                    <div class="shop-weapon-preview">
                        <canvas class="shop-weapon-canvas" width="280" height="82" aria-label="Ilustración de ${w.name}"></canvas>
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
                    this._drawWeaponIllustration(weaponCanvas, w);
                }

                const actionBtn = document.createElement('button');
                actionBtn.type = 'button';
                actionBtn.className = `shop-buy-btn ${w.purchased && !w.equipped ? 'equip-mode' : ''}`;
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
                            <canvas class="shop-supply-canvas" width="84" height="64" aria-label="Ilustración de ${s.name}"></canvas>
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
     * Dibuja en Canvas 2D la ilustración lateral detallada de cada arma de la tienda.
     */
    _drawWeaponIllustration(canvas, weapon) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;

        this._drawBlueprintGrid(
            ctx,
            w,
            h,
            weapon.equipped ? 'rgba(56, 229, 125, 0.11)' : 'rgba(110, 155, 210, 0.08)'
        );

        // Sombra suave bajo el arma
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.beginPath();
        ctx.ellipse(w * 0.5, h - 11, 88, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        switch (weapon.id) {
            case 'flashlight_melee': {
                // Bate de repartidor reforzado con placas de acero y linterna acoplada
                ctx.save();
                ctx.translate(w * 0.48, h * 0.52);
                ctx.rotate(-0.14);

                // Haz cálido de la linterna táctica
                const cone = ctx.createLinearGradient(58, -10, 128, -10);
                cone.addColorStop(0, 'rgba(255, 225, 130, 0.52)');
                cone.addColorStop(1, 'rgba(255, 210, 95, 0)');
                ctx.fillStyle = cone;
                ctx.beginPath();
                ctx.moveTo(62, -14);
                ctx.lineTo(132, -30);
                ctx.lineTo(132, 6);
                ctx.lineTo(62, -6);
                ctx.closePath();
                ctx.fill();

                // Pomo metálico y empuñadura encintada
                ctx.fillStyle = '#303946';
                ctx.fillRect(-108, -6, 8, 14);
                ctx.fillStyle = '#d63038';
                ctx.fillRect(-100, -5, 36, 12);
                ctx.strokeStyle = '#78141a';
                ctx.lineWidth = 1.5;
                for (let gx = -95; gx < -66; gx += 6) {
                    ctx.beginPath();
                    ctx.moveTo(gx, -5);
                    ctx.lineTo(gx + 3, 7);
                    ctx.stroke();
                }

                // Cuerpo de madera dura reforzada
                const woodGrad = ctx.createLinearGradient(0, -11, 0, 12);
                woodGrad.addColorStop(0, '#d89b5a');
                woodGrad.addColorStop(0.55, '#a86b32');
                woodGrad.addColorStop(1, '#6c401b');
                ctx.fillStyle = woodGrad;
                ctx.strokeStyle = '#1b120b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-64, -5);
                ctx.lineTo(76, -11);
                ctx.quadraticCurveTo(86, 0, 76, 12);
                ctx.lineTo(-64, 7);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Bandas de acero y remaches de impacto
                ctx.fillStyle = '#7e8e9f';
                ctx.fillRect(14, -9, 12, 19);
                ctx.fillRect(46, -10, 14, 21);
                ctx.fillStyle = '#dce6f2';
                ctx.fillRect(18, -13, 4, 4);
                ctx.fillRect(51, -14, 4, 4);
                ctx.fillRect(51, 11, 4, 4);

                // Linterna táctica acoplada al cañón superior
                ctx.fillStyle = '#222b36';
                ctx.fillRect(24, -18, 38, 8);
                ctx.fillStyle = '#fff0a8';
                ctx.fillRect(60, -18, 4, 8);
                ctx.restore();
                break;
            }

            case 'pistol_9mm': {
                // Pistola semiautomática 9mm reglamentaria + cartuchos de latón
                ctx.translate(w * 0.44, h * 0.46);

                // Empuñadura ergonómica inclinada
                ctx.save();
                ctx.translate(-34, 4);
                ctx.rotate(0.24);
                ctx.fillStyle = '#1e2530';
                ctx.strokeStyle = '#0c1016';
                ctx.lineWidth = 2;
                ctx.fillRect(-12, 0, 24, 32);
                ctx.strokeRect(-12, 0, 24, 32);
                ctx.fillStyle = '#313c4d';
                ctx.fillRect(-7, 5, 14, 21);
                ctx.fillStyle = '#141920';
                ctx.fillRect(-14, 30, 28, 4);
                ctx.restore();

                // Guardamonte y gatillo
                ctx.strokeStyle = '#4f6075';
                ctx.lineWidth = 2.4;
                ctx.beginPath();
                ctx.moveTo(-22, 6);
                ctx.lineTo(-22, 18);
                ctx.lineTo(-4, 18);
                ctx.lineTo(0, 6);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-13, 6);
                ctx.quadraticCurveTo(-10, 13, -14, 15);
                ctx.stroke();

                // Armazón inferior con riel táctico
                ctx.fillStyle = '#384659';
                ctx.fillRect(-46, -2, 92, 9);

                // Corredera metálica mecanizada
                const slideGrad = ctx.createLinearGradient(0, -18, 0, 0);
                slideGrad.addColorStop(0, '#b8c7d9');
                slideGrad.addColorStop(0.5, '#6e8096');
                slideGrad.addColorStop(1, '#3e4c5e');
                ctx.fillStyle = slideGrad;
                ctx.strokeStyle = '#121821';
                ctx.lineWidth = 2;
                ctx.fillRect(-48, -17, 98, 16);
                ctx.strokeRect(-48, -17, 98, 16);

                // Ventana expulsora, estrías de agarre y miras
                ctx.fillStyle = '#1d242e';
                ctx.fillRect(-6, -15, 18, 6);
                ctx.strokeStyle = '#263140';
                ctx.lineWidth = 1.6;
                for (let sx = -42; sx <= -26; sx += 4) {
                    ctx.beginPath();
                    ctx.moveTo(sx, -14);
                    ctx.lineTo(sx, -4);
                    ctx.stroke();
                }
                ctx.fillStyle = '#38e57d';
                ctx.fillRect(-45, -21, 5, 4);
                ctx.fillRect(43, -21, 4, 4);
                ctx.fillStyle = '#202833';
                ctx.fillRect(50, -13, 7, 7);

                // Dos proyectiles 9mm de latón a la derecha
                for (let i = 0; i < 2; i++) {
                    const bx = 76 + i * 16;
                    const by = 4;
                    ctx.fillStyle = '#d4a23a';
                    ctx.fillRect(bx, by, 8, 16);
                    ctx.fillStyle = '#c87338';
                    ctx.beginPath();
                    ctx.arc(bx + 4, by, 4, Math.PI, 0);
                    ctx.fill();
                }
                break;
            }

            case 'shotgun_combat': {
                // Escopeta táctica de corredera M-87 + cartuchos calibre 12 rojos
                ctx.translate(w * 0.48, h * 0.50);

                // Culata táctica pesada
                ctx.fillStyle = '#252d38';
                ctx.strokeStyle = '#0e131a';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-118, 18);
                ctx.lineTo(-118, -4);
                ctx.lineTo(-68, -8);
                ctx.lineTo(-62, 6);
                ctx.lineTo(-112, 20);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Cajón de mecanismos de acero
                const recGrad = ctx.createLinearGradient(0, -14, 0, 6);
                recGrad.addColorStop(0, '#9fb0c4');
                recGrad.addColorStop(1, '#465466');
                ctx.fillStyle = recGrad;
                ctx.fillRect(-68, -13, 56, 17);
                ctx.strokeRect(-68, -13, 56, 17);
                ctx.fillStyle = '#1b222c';
                ctx.fillRect(-44, -10, 20, 6);

                // Cañón largo y tubo cargador inferior
                ctx.fillStyle = '#7c8ea3';
                ctx.fillRect(-12, -13, 114, 6);
                ctx.fillStyle = '#4c5b6e';
                ctx.fillRect(-12, -5, 98, 5);

                // Escudo térmico perforado sobre el cañón
                ctx.fillStyle = '#2f3b4a';
                ctx.fillRect(-8, -16, 68, 4);
                ctx.fillStyle = '#0f141c';
                for (let hx = -2; hx < 56; hx += 9) {
                    ctx.fillRect(hx, -15, 4, 2);
                }

                // Guardamanos acanalado (pump action)
                ctx.fillStyle = '#b56d33';
                ctx.strokeStyle = '#1d1209';
                ctx.fillRect(10, -6, 48, 11);
                ctx.strokeRect(10, -6, 48, 11);
                for (let px = 16; px <= 52; px += 6) {
                    ctx.beginPath();
                    ctx.moveTo(px, -5);
                    ctx.lineTo(px, 4);
                    ctx.stroke();
                }

                // Cartuchos rojos calibre 12 en esquina derecha
                for (let s = 0; s < 2; s++) {
                    const sx = 86 + s * 14;
                    ctx.fillStyle = '#cf232e';
                    ctx.fillRect(sx, 6, 9, 14);
                    ctx.fillStyle = '#e0b347';
                    ctx.fillRect(sx, 18, 9, 5);
                }
                break;
            }

            case 'smg_tactical': {
                // Subfusil Bio-MP5 con mira holográfica, cargador curvo y supresor
                ctx.translate(w * 0.48, h * 0.48);

                // Culata retráctil
                ctx.strokeStyle = '#5c6e84';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-106, -4);
                ctx.lineTo(-64, -4);
                ctx.stroke();
                ctx.fillStyle = '#1e2530';
                ctx.fillRect(-114, -12, 10, 24);

                // Cuerpo compacto del subfusil
                const bodyGrad = ctx.createLinearGradient(0, -15, 0, 8);
                bodyGrad.addColorStop(0, '#8fa2b8');
                bodyGrad.addColorStop(1, '#394657');
                ctx.fillStyle = bodyGrad;
                ctx.strokeStyle = '#10151d';
                ctx.lineWidth = 2;
                ctx.fillRect(-64, -14, 96, 19);
                ctx.strokeRect(-64, -14, 96, 19);

                // Empuñadura trasera
                ctx.fillStyle = '#202834';
                ctx.beginPath();
                ctx.moveTo(-48, 5);
                ctx.lineTo(-34, 5);
                ctx.lineTo(-40, 27);
                ctx.lineTo(-54, 27);
                ctx.closePath();
                ctx.fill();

                // Cargador curvo extendido de 28 balas
                ctx.fillStyle = '#2c3747';
                ctx.strokeStyle = '#11161f';
                ctx.beginPath();
                ctx.moveTo(-8, 5);
                ctx.quadraticCurveTo(-2, 24, 12, 33);
                ctx.lineTo(23, 30);
                ctx.quadraticCurveTo(10, 19, 6, 5);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Mira holográfica superior con punto bio-verde
                ctx.fillStyle = '#222b38';
                ctx.fillRect(-32, -25, 28, 11);
                ctx.fillStyle = 'rgba(56, 229, 125, 0.35)';
                ctx.fillRect(-27, -23, 18, 7);
                ctx.fillStyle = '#38e57d';
                ctx.fillRect(-19, -20, 3, 3);

                // Supresor cilíndrico táctico
                ctx.fillStyle = '#536378';
                ctx.fillRect(32, -11, 56, 11);
                ctx.strokeRect(32, -11, 56, 11);
                ctx.fillStyle = '#38e57d';
                ctx.fillRect(42, -7, 16, 2);
                break;
            }

            case 'rifle_bio':
            default: {
                // Rifle pesado AR-Contención Biogen con óptica ACOG y módulo láser
                ctx.translate(w * 0.49, h * 0.50);

                // Culata táctica pesada
                ctx.fillStyle = '#25303d';
                ctx.strokeStyle = '#0f141b';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-120, 15);
                ctx.lineTo(-120, -10);
                ctx.lineTo(-74, -10);
                ctx.lineTo(-74, 4);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Receptor superior e inferior + guardamanos ventilado
                const arGrad = ctx.createLinearGradient(0, -15, 0, 8);
                arGrad.addColorStop(0, '#9cb0c7');
                arGrad.addColorStop(0.55, '#526378');
                arGrad.addColorStop(1, '#2b3645');
                ctx.fillStyle = arGrad;
                ctx.fillRect(-74, -14, 138, 20);
                ctx.strokeRect(-74, -14, 138, 20);

                // Ranuras de ventilación del guardamanos
                ctx.fillStyle = '#131922';
                for (let vx = 4; vx <= 50; vx += 11) {
                    ctx.fillRect(vx, -8, 7, 5);
                }

                // Cañón pesado y freno de boca
                ctx.fillStyle = '#7e91a8';
                ctx.fillRect(64, -9, 42, 7);
                ctx.fillStyle = '#394657';
                ctx.fillRect(104, -11, 14, 11);

                // Empuñadura y cargador STANAG con franja verde Biogen
                ctx.fillStyle = '#1d242e';
                ctx.fillRect(-58, 6, 14, 22);
                ctx.fillStyle = '#323f52';
                ctx.beginPath();
                ctx.moveTo(-18, 6);
                ctx.lineTo(2, 6);
                ctx.lineTo(8, 31);
                ctx.lineTo(-12, 31);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = '#38e57d';
                ctx.fillRect(-13, 18, 17, 3);

                // Mira óptica ACOG de largo alcance
                ctx.fillStyle = '#202936';
                ctx.beginPath();
                ctx.moveTo(-48, -14);
                ctx.lineTo(-42, -27);
                ctx.lineTo(-4, -27);
                ctx.lineTo(2, -14);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#38e57d';
                ctx.fillRect(-42, -25, 4, 8);
                ctx.fillRect(-6, -25, 4, 8);
                break;
            }
        }
        ctx.restore();

        // Etiqueta sutil de calibre / estado en esquina superior derecha
        ctx.fillStyle = weapon.unlocked ? 'rgba(190, 212, 235, 0.72)' : 'rgba(255, 110, 120, 0.88)';
        ctx.font = 'bold 10px Consolas, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(weapon.unlocked ? weapon.shortName.toUpperCase() : `🔒 NV.${weapon.unlockLevel}`, w - 8, 14);
        ctx.textAlign = 'left';
    }

    /**
     * Dibuja en Canvas 2D la ilustración visual de suministros y mejoras.
     */
    _drawSupplyIllustration(canvas, supply) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;

        this._drawBlueprintGrid(ctx, w, h, 'rgba(110, 155, 210, 0.08)');

        ctx.save();
        switch (supply.id) {
            case 'supply_medkit': {
                const atlas = this.engine.spriteAtlas;
                if (atlas?.isReady()) {
                    atlas.drawFrame(ctx, 'icon_medkit', 0, w * 0.5, h - 10, { targetHeight: 44 });
                } else {
                    ctx.fillStyle = '#d62834';
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.fillRect(20, 16, 44, 34);
                    ctx.strokeRect(20, 16, 44, 34);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(38, 23, 8, 20);
                    ctx.fillRect(32, 29, 20, 8);
                }
                break;
            }

            case 'supply_ammo_pack': {
                // Caja militar de munición con cartuchos de latón visibles
                ctx.fillStyle = '#2d4436';
                ctx.strokeStyle = '#6e9479';
                ctx.lineWidth = 2;
                ctx.fillRect(14, 22, 56, 30);
                ctx.strokeRect(14, 22, 56, 30);
                ctx.fillStyle = '#203127';
                ctx.fillRect(12, 17, 60, 7);
                ctx.fillStyle = '#ffd166';
                ctx.font = 'bold 9px Consolas, monospace';
                ctx.textAlign = 'center';
                ctx.fillText('AMMO x2', 42, 41);
                for (let i = 0; i < 4; i++) {
                    const bx = 23 + i * 11;
                    ctx.fillStyle = '#e0ae43';
                    ctx.fillRect(bx, 9, 6, 8);
                    ctx.fillStyle = '#c96f32';
                    ctx.beginPath();
                    ctx.arc(bx + 3, 9, 3, Math.PI, 0);
                    ctx.fill();
                }
                ctx.textAlign = 'left';
                break;
            }

            case 'upgrade_damage': {
                // Proyectiles punta hueca con resplandor cinético carmesí
                const glow = ctx.createRadialGradient(42, 32, 4, 42, 32, 30);
                glow.addColorStop(0, 'rgba(235, 45, 58, 0.45)');
                glow.addColorStop(1, 'rgba(235, 45, 58, 0)');
                ctx.fillStyle = glow;
                ctx.fillRect(0, 0, w, h);

                for (let i = 0; i < 3; i++) {
                    const bx = 21 + i * 16;
                    const by = 24 - (i === 1 ? 5 : 0);
                    ctx.fillStyle = '#e3af42';
                    ctx.strokeStyle = '#1a140a';
                    ctx.lineWidth = 1.5;
                    ctx.fillRect(bx, by, 10, 24);
                    ctx.strokeRect(bx, by, 10, 24);
                    ctx.fillStyle = '#cf5c2b';
                    ctx.beginPath();
                    ctx.moveTo(bx, by);
                    ctx.lineTo(bx + 3, by - 9);
                    ctx.lineTo(bx + 5, by - 6);
                    ctx.lineTo(bx + 7, by - 9);
                    ctx.lineTo(bx + 10, by);
                    ctx.closePath();
                    ctx.fill();
                }
                break;
            }

            case 'upgrade_armor':
            default: {
                // Chaleco táctico Kevlar con placas balísticas
                ctx.fillStyle = '#2b394d';
                ctx.strokeStyle = '#8aa4c4';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(26, 12);
                ctx.lineTo(34, 12);
                ctx.lineTo(37, 20);
                ctx.lineTo(47, 20);
                ctx.lineTo(50, 12);
                ctx.lineTo(58, 12);
                ctx.lineTo(64, 24);
                ctx.lineTo(60, 52);
                ctx.lineTo(24, 52);
                ctx.lineTo(20, 24);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Placas frontales y cruz de blindaje
                ctx.fillStyle = '#1b2432';
                ctx.fillRect(29, 26, 26, 19);
                ctx.fillStyle = '#38e57d';
                ctx.fillRect(40, 29, 4, 12);
                ctx.fillRect(36, 33, 12, 4);
                break;
            }
        }
        ctx.restore();
    }

    update(dt) {
        this.time += dt;
        this.engine.renderer.updateAtmosphere(dt);
    }

    render(renderer) {
        const ctx = renderer.ctx;
        renderer.clear('#070a11');
        renderer.drawRadialGlow(640, 120, 30, 460, 'rgba(245, 166, 35, 0.14)');
        renderer.drawRain(false);
        renderer.drawVignette(0.82);
    }
}
