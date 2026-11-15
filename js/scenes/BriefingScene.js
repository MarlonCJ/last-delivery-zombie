/**
 * BriefingScene.js
 * Terminal de Despacho Pre-Misión.
 * Muestra la ficha personalizada del protagonista, objetivos de nivel y el
 * Selector de Mochila Táctica (máx. 3 armas compradas), cuya asignación solo
 * puede realizarse antes de iniciar la misión.
 */

export class BriefingScene {
    constructor(engine) {
        this.engine = engine;
        this.time = 0;

        this.overlay = document.getElementById('briefing-overlay');
        this.courierNameEl = document.getElementById('briefing-courier-name');
        this.missionTitleEl = document.getElementById('briefing-mission-title');
        this.missionSettingEl = document.getElementById('briefing-mission-setting');
        this.missionRouteEl = document.getElementById('briefing-mission-route');
        this.missionRewardEl = document.getElementById('briefing-mission-reward');
        this.objectivesListEl = document.getElementById('briefing-objectives-list');

        this.loadoutCountEl = document.getElementById('briefing-loadout-count');
        this.loadoutGridEl = document.getElementById('briefing-loadout-grid');

        this.btnPlayLevel = document.getElementById('btn-briefing-play');
        this.btnOpenShop = document.getElementById('btn-briefing-shop');
        this.btnReplayIntro = document.getElementById('btn-briefing-replay');
        this.btnOpenOptions = document.getElementById('btn-briefing-options');
        this.btnBackMenu = document.getElementById('btn-briefing-menu');
        this.btnLvl1 = document.getElementById('btn-briefing-lvl1');
        this.btnLvl2 = document.getElementById('btn-briefing-lvl2');
        this.selectedLevelId = 1;

        this._bindEvents();
    }

    _bindEvents() {
        const btns = [
            this.btnPlayLevel,
            this.btnOpenShop,
            this.btnReplayIntro,
            this.btnOpenOptions,
            this.btnBackMenu,
            this.btnLvl1,
            this.btnLvl2
        ];
        for (const btn of btns) {
            btn?.addEventListener('pointerenter', () => this.engine.audio.playHover());
        }

        this.btnLvl1?.addEventListener('click', () => {
            this.engine.audio.playClick();
            this._selectLevel(1);
        });

        this.btnLvl2?.addEventListener('click', () => {
            if (!this.engine.levels.isLevelUnlocked(2)) {
                this.engine.audio.playError();
                return;
            }
            this.engine.audio.playClick();
            this._selectLevel(2);
        });

        this.btnPlayLevel?.addEventListener('click', () => {
            if (!this.engine.levels.isLevelUnlocked(this.selectedLevelId)) {
                this.engine.audio.playError();
                this._selectLevel(1);
                return;
            }
            this.engine.audio.playConfirm();
            const sceneKey = this.selectedLevelId === 2 ? 'level02' : 'level01';
            this.engine.sceneManager.transitionTo(sceneKey, {}, 0.45);
        });

        this.btnOpenShop?.addEventListener('click', () => {
            if (!this.engine.shop.isShopAvailable()) {
                this.engine.audio.playError();
                return;
            }
            this.engine.audio.playClick();
            this.engine.sceneManager.transitionTo('shop', { nextScene: 'briefing' }, 0.45);
        });

        this.btnReplayIntro?.addEventListener('click', () => {
            this.engine.audio.playClick();
            this.engine.sceneManager.transitionTo('introduction', { targetScene: 'briefing' }, 0.45);
        });

        this.btnOpenOptions?.addEventListener('click', () => {
            this.engine.audio.playClick();
            window.dispatchEvent(new CustomEvent('ldz:open-modal', { detail: { modal: 'options' } }));
        });

        this.btnBackMenu?.addEventListener('click', () => {
            this.engine.audio.playClick();
            this.engine.sceneManager.transitionTo('mainMenu', {}, 0.45);
        });
    }

    _selectLevel(levelId) {
        const lvl2Unlocked = this.engine.levels.isLevelUnlocked(2);
        const safeLevelId = (levelId === 2 && lvl2Unlocked) ? 2 : 1;
        this.selectedLevelId = safeLevelId;

        if (this.btnLvl1) {
            this.btnLvl1.classList.toggle('is-active', this.selectedLevelId === 1);
        }
        if (this.btnLvl2) {
            this.btnLvl2.disabled = !lvl2Unlocked;
            this.btnLvl2.textContent = lvl2Unlocked ? 'NIVEL 02' : '🔒 NIVEL 02 (BLOQUEADO)';
            this.btnLvl2.classList.toggle('is-active', this.selectedLevelId === 2);
        }

        const level = this.engine.levels.getLevelById(this.selectedLevelId);
        if (this.missionTitleEl) {
            this.missionTitleEl.textContent = `NIVEL 0${level.id}: ${level.name}`;
        }
        if (this.missionSettingEl) {
            this.missionSettingEl.textContent = level.setting;
        }
        if (this.missionRouteEl) {
            this.missionRouteEl.textContent = `${level.pickupPoint}  ➔  ${level.deliveryPoint}`;
        }
        if (this.missionRewardEl) {
            const lives = this.engine.saveSystem.getLives();
            this.missionRewardEl.textContent = `$${level.baseMoneyReward} USD  |  ♥ ${lives} Vidas (+1 cada 3,000 PTS)`;
        }
        if (this.objectivesListEl) {
            this.objectivesListEl.innerHTML = '';
            for (const obj of level.objectives) {
                const li = document.createElement('li');
                li.textContent = obj;
                this.objectivesListEl.appendChild(li);
            }
        }
        if (this.btnPlayLevel) {
            this.btnPlayLevel.textContent = `▶ INICIAR NIVEL 0${level.id}: ${level.name}`;
        }
    }

    _renderLoadoutSelector() {
        if (!this.loadoutGridEl) return;
        this.loadoutGridEl.innerHTML = '';

        const purchased = this.engine.inventory.getPurchasedWeapons();
        const loadout = this.engine.inventory.getLoadout();
        const loadoutIds = loadout.map(w => w.id);

        if (this.loadoutCountEl) {
            this.loadoutCountEl.textContent = `${loadoutIds.length} / 3 EQUIPADAS`;
        }

        const atlas = this.engine.spriteAtlas;

        for (const w of purchased) {
            const slotIndex = loadoutIds.indexOf(w.id);
            const inLoadout = slotIndex !== -1;

            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = `loadout-weapon-chip ${inLoadout ? 'in-loadout' : ''}`;

            chip.innerHTML = `
                <canvas width="136" height="44" aria-hidden="true"></canvas>
                <span class="loadout-chip-name">${w.shortName}</span>
                <span class="loadout-chip-status">${inLoadout ? `✓ SLOT [${slotIndex + 1}]` : '+ EQUIPAR'}</span>
            `;

            const cnv = chip.querySelector('canvas');
            const cctx = cnv?.getContext?.('2d');
            if (cctx) {
                cctx.clearRect(0, 0, cnv.width, cnv.height);
                if (atlas?.getExtImage() && w.spriteKey) {
                    const meta = atlas.getSpriteMeta(w.spriteKey);
                    const aspect = meta ? (meta.w / Math.max(1, meta.h)) : 2.2;
                    const drawH = Math.min(34, Math.round(112 / Math.max(1.2, aspect)));
                    const drawW = Math.min(124, Math.round(drawH * aspect));
                    atlas.drawSprite(
                        cctx,
                        w.spriteKey,
                        Math.round((cnv.width - drawW) * 0.5),
                        Math.round((cnv.height - drawH) * 0.5),
                        drawW,
                        drawH
                    );
                } else {
                    cctx.fillStyle = inLoadout ? '#38e57d' : '#8fa4bd';
                    cctx.font = 'bold 11px Consolas, monospace';
                    cctx.fillText(w.shortName, 18, 26);
                }
            }

            chip.addEventListener('click', () => {
                const res = this.engine.inventory.toggleLoadoutWeapon(w.id);
                if (res.ok) {
                    this.engine.audio.playPickup();
                } else {
                    this.engine.audio.playError();
                }
                if (this.loadoutCountEl && !res.ok) {
                    this.loadoutCountEl.textContent = res.message;
                } else {
                    this._renderLoadoutSelector();
                }
            });

            this.loadoutGridEl.appendChild(chip);
        }
    }

    enter(params = {}) {
        this.time = 0;
        const playerName = this.engine.saveSystem.getPlayerName() || 'Repartidor';
        if (this.courierNameEl) {
            this.courierNameEl.textContent = playerName;
        }

        const initialLvl = params.levelId || (this.engine.saveSystem.state.player.completedLevels.includes(1) ? 2 : 1);
        this._selectLevel(initialLvl);
        this._renderLoadoutSelector();

        if (this.btnOpenShop) {
            const shopUnlocked = this.engine.shop.isShopAvailable();
            this.btnOpenShop.disabled = !shopUnlocked;
            this.btnOpenShop.textContent = shopUnlocked
                ? '🛒 TIENDA DE ARMAS'
                : '🔒 TIENDA (COMPLETA NIVEL 01)';
        }

        this.overlay?.classList.remove('hidden');
        this.engine.audio.startAmbience('menu');
    }

    exit() {
        this.overlay?.classList.add('hidden');
    }

    update(dt) {
        this.time += dt;
        this.engine.renderer.updateAtmosphere(dt);

        const modalOpen = document.querySelector('.modal-backdrop:not(.hidden)');
        if (!modalOpen && this.engine.input.isKeyJustPressed('Escape')) {
            this.engine.audio.playClick();
            this.engine.sceneManager.transitionTo('mainMenu', {}, 0.45);
        }
    }

    render(renderer) {
        const ctx = renderer.ctx;
        renderer.clear('#070b12');

        ctx.fillStyle = '#0c1522';
        ctx.fillRect(140, 70, 1000, 340);
        renderer.drawRain(false);

        ctx.fillStyle = '#080c13';
        ctx.fillRect(0, 0, 1280, 85);
        ctx.fillRect(0, 385, 1280, 335);
        ctx.fillRect(0, 0, 165, 720);
        ctx.fillRect(1115, 0, 165, 720);

        ctx.strokeStyle = '#182230';
        ctx.lineWidth = 6;
        for (let x = 280; x <= 1000; x += 180) {
            ctx.beginPath();
            ctx.moveTo(x, 85);
            ctx.lineTo(x, 385);
            ctx.stroke();
        }

        const flicker = Math.sin(this.time * 19) > 0.94 ? 0.55 : 1.0;
        ctx.fillStyle = `rgba(185, 235, 255, ${(0.85 * flicker).toFixed(2)})`;
        ctx.fillRect(450, 42, 380, 8);
        renderer.drawRadialGlow(640, 48, 20, 360, `rgba(120, 195, 240, ${(0.22 * flicker).toFixed(2)})`);

        renderer.drawVignette(0.8);
    }
}
