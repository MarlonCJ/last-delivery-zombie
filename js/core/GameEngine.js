/**
 * GameEngine.js
 * Bucle principal de tiempo real basado en requestAnimationFrame y deltaTime.
 * Separa estrictamente la fase de actualización lógica de la fase de renderizado.
 */

import { SpriteAtlas } from './SpriteAtlas.js';

const MAX_DELTA_TIME = 0.05; // Límite de 50ms (20 FPS mínimo lógico) para evitar saltos bruscos

export class GameEngine {
    constructor({
        renderer,
        sceneManager,
        inputManager,
        saveSystem,
        audioManager,
        economySystem,
        levelSystem,
        inventorySystem,
        shopSystem,
        assetLoader,
        spriteAtlas = null
    }) {
        this.renderer = renderer;
        this.sceneManager = sceneManager;
        this.input = inputManager;
        this.saveSystem = saveSystem;
        this.audio = audioManager;
        this.economy = economySystem;
        this.levels = levelSystem;
        this.inventory = inventorySystem;
        this.shop = shopSystem;
        this.assets = assetLoader;
        this.spriteAtlas = spriteAtlas || new SpriteAtlas(assetLoader);

        this.running = false;
        this.rafId = null;
        this.lastTimestamp = 0;
        this.fps = 60;
        this._fpsAccumulator = 0;
        this._fpsFrames = 0;

        this._boundLoop = this._loop.bind(this);
        this._onVisibilityChange = this._handleVisibilityChange.bind(this);
        document.addEventListener('visibilitychange', this._onVisibilityChange);
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTimestamp = performance.now();
        this.rafId = window.requestAnimationFrame(this._boundLoop);
    }

    stop() {
        this.running = false;
        if (this.rafId !== null) {
            window.cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    destroy() {
        this.stop();
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
    }

    _handleVisibilityChange() {
        if (!document.hidden) {
            // Reiniciar referencia temporal al recuperar el foco de la pestaña
            this.lastTimestamp = performance.now();
        }
    }

    _loop(timestamp) {
        if (!this.running) return;

        const rawDt = (timestamp - this.lastTimestamp) / 1000;
        this.lastTimestamp = timestamp;

        const dt = Math.max(0, Math.min(MAX_DELTA_TIME, rawDt));

        // Cálculo suavizado de FPS cada 0.25s
        this._fpsAccumulator += rawDt;
        this._fpsFrames += 1;
        if (this._fpsAccumulator >= 0.25) {
            this.fps = this._fpsFrames / this._fpsAccumulator;
            this._fpsAccumulator = 0;
            this._fpsFrames = 0;
        }

        // 1. Fase de actualización lógica
        this.update(dt);

        // 2. Fase de renderizado Canvas 2D
        this.render();

        // 3. Limpieza de entradas de un solo fotograma
        this.input.endFrame();

        this.rafId = window.requestAnimationFrame(this._boundLoop);
    }

    update(dt) {
        this.sceneManager.update(dt);
    }

    render() {
        this.sceneManager.render(this.renderer);

        if (this.saveSystem.getSettings().showFps) {
            this.renderer.drawPerformanceOverlay(this.fps);
        }
    }
}
