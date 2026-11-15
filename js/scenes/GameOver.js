/**
 * GameOver.js
 * Escena de derrota cuando la salud del protagonista llega a cero (Sección 15).
 * Permite reintentar inmediatamente el nivel o regresar al menú principal.
 */

export class GameOver {
    constructor(engine) {
        this.engine = engine;
        this.time = 0;

        this.overlay = document.getElementById('gameover-overlay');
        this.courierEl = document.getElementById('gameover-courier-name');
        this.statsEl = document.getElementById('gameover-stats-line');
        this.btnRetry = document.getElementById('btn-gameover-retry');
        this.btnMenu = document.getElementById('btn-gameover-menu');

        this.retrySceneKey = 'level01';
        this._bindEvents();
    }

    _bindEvents() {
        this.btnRetry?.addEventListener('pointerenter', () => this.engine.audio.playHover());
        this.btnMenu?.addEventListener('pointerenter', () => this.engine.audio.playHover());

        this.btnRetry?.addEventListener('click', () => {
            this.engine.audio.playConfirm();
            this.engine.sceneManager.transitionTo(this.retrySceneKey, {}, 0.4);
        });

        this.btnMenu?.addEventListener('click', () => {
            this.engine.audio.playClick();
            this.engine.sceneManager.transitionTo('mainMenu', {}, 0.45);
        });
    }

    enter(params = {}) {
        this.time = 0;
        this.retrySceneKey = params.retryScene || 'level01';
        const name = this.engine.saveSystem.getPlayerName() || 'Repartidor';
        const kills = params.zombiesKilled ?? 0;
        const secs = Math.floor(params.timeSeconds ?? 0);

        if (this.courierEl) this.courierEl.textContent = name;
        if (this.statsEl) {
            this.statsEl.textContent = `Zombis neutralizados: ${kills}  |  Tiempo sobrevivido: ${secs}s`;
        }

        this.overlay?.classList.remove('hidden');
        this.engine.audio.startAmbience('intro');
    }

    exit() {
        this.overlay?.classList.add('hidden');
    }

    update(dt) {
        this.time += dt;
        this.engine.renderer.updateAtmosphere(dt);

        if (this.engine.input.isKeyJustPressed('Enter') || this.engine.input.isKeyJustPressed('Space')) {
            this.engine.audio.playConfirm();
            this.engine.sceneManager.transitionTo(this.retrySceneKey, {}, 0.4);
        }
    }

    render(renderer) {
        const ctx = renderer.ctx;
        renderer.clear('#0b0305');
        renderer.drawRadialGlow(640, 320, 20, 420, 'rgba(210, 22, 34, 0.24)');
        renderer.drawRain(false);
        renderer.drawVignette(0.86);
    }
}
