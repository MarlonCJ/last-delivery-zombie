/**
 * BriefingScene.js
 * Terminal de Despacho Pre-Misión (cierre limpio de Fase 1 y Fase 2).
 * Muestra la ficha personalizada del protagonista con los datos reales de
 * SaveSystem y LevelSystem, dejando el punto de conexión exacto para el Nivel 01
 * en las Fases 3 y 4 sin simular mecánicas aún no implementadas.
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
        const btns = [this.btnPlayLevel, this.btnOpenShop, this.btnReplayIntro, this.btnOpenOptions, this.btnBackMenu, this.btnLvl1, this.btnLvl2];
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
            this.engine.sceneManager.transitionTo('shop', {}, 0.45);
        });

        this.btnReplayIntro?.addEventListener('click', () => {
            this.engine.audio.playClick();
            this.engine.sceneManager.transitionTo('introduction', {}, 0.45);
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
            this.missionRewardEl.textContent = `$${level.baseMoneyReward} USD  |  +${level.baseScoreReward} PTS`;
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

    enter(params = {}) {
        this.time = 0;
        const playerName = this.engine.saveSystem.getPlayerName() || 'Repartidor';
        if (this.courierNameEl) {
            this.courierNameEl.textContent = playerName;
        }

        const initialLvl = params.levelId || (this.engine.saveSystem.state.player.completedLevels.includes(1) ? 2 : 1);
        this._selectLevel(initialLvl);

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

        // Fondo de refugio de despacho con ventanal lluvioso al exterior
        ctx.fillStyle = '#0c1522';
        ctx.fillRect(140, 70, 1000, 340);
        renderer.drawRain(false);

        // Marco interior blindado del búnker de reparto
        ctx.fillStyle = '#080c13';
        ctx.fillRect(0, 0, 1280, 85);
        ctx.fillRect(0, 385, 1280, 335);
        ctx.fillRect(0, 0, 165, 720);
        ctx.fillRect(1115, 0, 165, 720);

        // Barrotes de seguridad en ventana
        ctx.strokeStyle = '#182230';
        ctx.lineWidth = 6;
        for (let x = 280; x <= 1000; x += 180) {
            ctx.beginPath();
            ctx.moveTo(x, 85);
            ctx.lineTo(x, 385);
            ctx.stroke();
        }

        // Tubo fluorescente superior con leve parpadeo eléctrico
        const flicker = Math.sin(this.time * 19) > 0.94 ? 0.55 : 1.0;
        ctx.fillStyle = `rgba(185, 235, 255, ${(0.85 * flicker).toFixed(2)})`;
        ctx.fillRect(450, 42, 380, 8);
        renderer.drawRadialGlow(640, 48, 20, 360, `rgba(120, 195, 240, ${(0.22 * flicker).toFixed(2)})`);

        renderer.drawVignette(0.8);
    }
}
