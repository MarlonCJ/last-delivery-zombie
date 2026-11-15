/**
 * GameOver.js
 * Escena de Derrota Definitiva cuando el jugador pierde todas sus vidas (0 vidas).
 * Muestra la cinemática visual del protagonista domiciliario transformado en zombi
 * y aplica el reseteo total de la partida (niveles, armas, mejoras, dinero y puntos a cero).
 */

export class GameOver {
    constructor(engine) {
        this.engine = engine;
        this.time = 0;

        this.overlay = document.getElementById('gameover-overlay');
        this.courierEl = document.getElementById('gameover-courier-name');
        this.statsEl = document.getElementById('gameover-stats-line');
        this.zombieCanvas = document.getElementById('gameover-zombie-canvas');
        this.btnRetry = document.getElementById('btn-gameover-retry');
        this.btnMenu = document.getElementById('btn-gameover-menu');

        this.retrySceneKey = 'briefing';
        this._bindEvents();
    }

    _bindEvents() {
        this.btnRetry?.addEventListener('pointerenter', () => this.engine.audio.playHover());
        this.btnMenu?.addEventListener('pointerenter', () => this.engine.audio.playHover());

        this.btnRetry?.addEventListener('click', () => {
            this.engine.audio.playConfirm();
            this.engine.sceneManager.transitionTo('briefing', { levelId: 1 }, 0.45);
        });

        this.btnMenu?.addEventListener('click', () => {
            this.engine.audio.playClick();
            this.engine.sceneManager.transitionTo('mainMenu', {}, 0.45);
        });
    }

    enter(params = {}) {
        this.time = 0;
        this.retrySceneKey = 'briefing';

        // Garantizar que el reseteo total se aplique siempre al llegar a Game Over sin vidas
        if (!params.permadeath) {
            this.engine.saveSystem.resetGameOnPermadeath();
            this.engine.inventory.resetMissionLoadout();
        }

        const name = this.engine.saveSystem.getPlayerName() || 'Repartidor';
        const kills = params.zombiesKilled ?? 0;
        const secs = Math.floor(params.timeSeconds ?? 0);
        const finalScore = params.finalScore ?? 0;

        if (this.courierEl) this.courierEl.textContent = name;
        if (this.statsEl) {
            this.statsEl.textContent = `Puntaje final antes de caer: ${finalScore} PTS  |  Zombis abatidos: ${kills}  |  Tiempo: ${secs}s`;
        }

        this.overlay?.classList.remove('hidden');
        this.engine.audio.startAmbience('intro');
        this.engine.audio.playZombieTransformation?.();
        this._renderZombifiedCourierScene();
    }

    exit() {
        this.overlay?.classList.add('hidden');
    }

    update(dt) {
        this.time += dt;
        this.engine.renderer.updateAtmosphere(dt);
        this._renderZombifiedCourierScene();

        if (this.engine.input.isKeyJustPressed('Enter') || this.engine.input.isKeyJustPressed('Space')) {
            this.engine.audio.playConfirm();
            this.engine.sceneManager.transitionTo('briefing', { levelId: 1 }, 0.45);
        }
    }

    /**
     * Renderiza en el Canvas de Game Over al protagonista domiciliario transformado en zombi
     * (gorra roja desgarrada, chaqueta de reparto ensangrentada, mochila amarilla en la espalda,
     * piel necrótica verdosa, ojos rojos infectados y horda detrás bajo lluvia tóxica).
     */
    _renderZombifiedCourierScene() {
        if (!this.zombieCanvas || typeof this.zombieCanvas.getContext !== 'function') return;
        const ctx = this.zombieCanvas.getContext('2d');
        if (!ctx || typeof ctx.fillRect !== 'function') return;

        const w = this.zombieCanvas.width || 440;
        const h = this.zombieCanvas.height || 200;
        const atlas = this.engine.spriteAtlas;

        // 1. Cielo nocturno contaminado por gas mutagénico B-3
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#070309');
        bg.addColorStop(0.55, '#131d19');
        bg.addColorStop(1, '#080b0a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Resplandor verde tóxico y rojo sangriento pulsante detrás del protagonista infectado
        const pulse = 0.28 + 0.10 * Math.sin(this.time * 3.4);
        const aura = ctx.createRadialGradient(w * 0.5, h * 0.55, 8, w * 0.5, h * 0.55, 145);
        aura.addColorStop(0, `rgba(74, 255, 118, ${pulse.toFixed(2)})`);
        aura.addColorStop(0.55, 'rgba(180, 20, 36, 0.22)');
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.fillRect(0, 0, w, h);

        // Asfalto húmedo
        const groundY = h - 26;
        ctx.fillStyle = '#0c1116';
        ctx.fillRect(0, groundY, w, 26);
        ctx.fillStyle = '#22312a';
        ctx.fillRect(0, groundY, w, 3);

        // Zombis de la horda escoltando al nuevo repartidor infectado
        if (atlas?.isReady()) {
            const zKeyLeft = atlas.getExtImage() ? 'z01_walk' : 'znormal_walk';
            const zKeyRight = atlas.getExtImage() ? 'z04_walk' : 'zspecial_walk';
            atlas.drawFrame(ctx, zKeyLeft, Math.floor(this.time * 4.5), 88, groundY + 2, {
                targetHeight: 96,
                alpha: 0.72
            });
            atlas.drawFrame(ctx, zKeyRight, Math.floor(this.time * 4.2 + 2), w - 88, groundY + 2, {
                targetHeight: 98,
                flipX: true,
                alpha: 0.72
            });
            if (atlas.getExtImage()) {
                atlas.drawSprite(ctx, 'prop_sign_biohazard', 18, 22, 38, 40, { alpha: 0.65 });
                atlas.drawSprite(ctx, 'pickup_package', w - 74, groundY - 26, 36, 30);
            }
        }

        // 2. Protagonista Domiciliario Transformado en Zombi (centro en primer plano)
        const cx = Math.round(w * 0.5);
        const swayX = Math.sin(this.time * 2.8) * 3.5;
        const bobY = Math.abs(Math.cos(this.time * 2.8)) * 3;
        const baseY = groundY + 2;

        ctx.save();
        ctx.translate(cx + swayX, baseY - bobY);

        // Sombra y charco de sangre en el suelo
        ctx.fillStyle = 'rgba(135, 12, 22, 0.72)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 38, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Mochila amarilla icónica de reparto torcida y manchada de sangre en la espalda
        ctx.save();
        ctx.translate(-22, -74);
        ctx.rotate(-0.18);
        ctx.fillStyle = '#c8921e';
        ctx.strokeStyle = '#14100a';
        ctx.lineWidth = 2;
        ctx.fillRect(-16, -22, 30, 38);
        ctx.strokeRect(-16, -22, 30, 38);
        ctx.fillStyle = '#8e141e';
        ctx.fillRect(-10, -8, 14, 10);
        ctx.restore();

        // Piernas arqueadas con jeans rotos
        ctx.fillStyle = '#243447';
        ctx.strokeStyle = '#0b0f14';
        ctx.lineWidth = 2;
        ctx.fillRect(-16, -44, 12, 38);
        ctx.strokeRect(-16, -44, 12, 38);
        ctx.fillRect(4, -44, 12, 38);
        ctx.strokeRect(4, -44, 12, 38);
        // Rodilla desgarrada mostrando piel necrótica verde
        ctx.fillStyle = '#6e9c68';
        ctx.fillRect(6, -26, 8, 7);
        // Botas
        ctx.fillStyle = '#2c1d14';
        ctx.fillRect(-18, -8, 16, 8);
        ctx.fillRect(3, -8, 17, 8);

        // Torso encorvado con chaqueta roja/amarilla desgarrada e infectada
        ctx.save();
        ctx.translate(2, -68);
        ctx.rotate(0.16);
        ctx.fillStyle = '#9e1b24';
        ctx.fillRect(-18, -22, 36, 44);
        ctx.strokeRect(-18, -22, 36, 44);
        // Franja amarilla de repartidor y manchas oscuras de sangre
        ctx.fillStyle = '#d49b27';
        ctx.fillRect(-6, -20, 12, 40);
        ctx.fillStyle = '#4f0910';
        ctx.beginPath();
        ctx.arc(4, -2, 10, 0, Math.PI * 2);
        ctx.fill();

        // Brazos extendidos hacia adelante como zombi hambriento
        const armWave = Math.sin(this.time * 4.2) * 4;
        ctx.fillStyle = '#8b1820';
        ctx.fillRect(8, -16, 26, 10);
        ctx.fillStyle = '#73a36c'; // Mano zombi necrótica con garras
        ctx.fillRect(32, -17 + armWave * 0.4, 13, 9);
        ctx.fillStyle = '#5a0c14';
        ctx.fillRect(42, -17 + armWave * 0.4, 4, 9);
        ctx.restore();

        // Cabeza del domiciliario mutada en zombi
        ctx.save();
        ctx.translate(10, -104);
        ctx.rotate(0.14);
        // Piel verde grisácea putrefacta
        ctx.fillStyle = '#75a46d';
        ctx.strokeStyle = '#0d140d';
        ctx.lineWidth = 2;
        ctx.fillRect(-15, -18, 30, 30);
        ctx.strokeRect(-15, -18, 30, 30);

        // Venas oscuras y mandíbula ensangrentada abierta
        ctx.fillStyle = '#3c080e';
        ctx.fillRect(-2, 1, 15, 9);
        ctx.fillStyle = '#d8dfd0';
        ctx.fillRect(0, 1, 3, 3);
        ctx.fillRect(5, 1, 3, 3);
        ctx.fillRect(10, 1, 3, 3);
        // Hilo de sangre goteando
        const dripH = 4 + (Math.sin(this.time * 5) * 0.5 + 0.5) * 7;
        ctx.fillStyle = '#c81422';
        ctx.fillRect(6, 10, 3, dripH);

        // Ojos rojos luminosos de infectado
        ctx.fillStyle = '#ff1e2d';
        ctx.shadowColor = '#ff1e2d';
        ctx.shadowBlur = 10;
        ctx.fillRect(1, -9, 5, 4);
        ctx.fillRect(9, -9, 5, 4);
        ctx.shadowBlur = 0;

        // Gorra roja de domiciliario rota con visera hacia adelante
        ctx.fillStyle = '#bf1d28';
        ctx.fillRect(-17, -25, 31, 10);
        ctx.fillRect(6, -19, 18, 4);
        ctx.fillStyle = '#f0f4f8';
        ctx.fillRect(2, -23, 7, 5);
        ctx.restore();

        ctx.restore();

        // 3. Esporas mutagénicas flotando y lluvia diagonal
        ctx.fillStyle = 'rgba(110, 255, 145, 0.55)';
        for (let i = 0; i < 14; i++) {
            const sx = ((i * 47 + Math.floor(this.time * 24)) % w);
            const sy = ((i * 29 + Math.floor(Math.sin(this.time * 2 + i) * 14) + h) % (h - 24));
            ctx.fillRect(sx, sy, 2.5, 2.5);
        }
    }

    render(renderer) {
        renderer.clear('#0b0305');
        renderer.drawRadialGlow(640, 320, 20, 440, 'rgba(195, 22, 36, 0.24)');
        renderer.drawRain(true);
        renderer.drawVignette(0.86);
    }
}
