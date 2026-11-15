/**
 * SceneManager.js
 * Administrador de escenas con soporte de ciclo de vida (enter, exit, update, render)
 * y transiciones cinematográficas por fundido negro.
 */

export class SceneManager {
    constructor() {
        this.scenes = new Map();
        this.currentScene = null;
        this.currentSceneName = null;

        // Estado de transición
        this.transitioning = false;
        this.transitionPhase = 'none'; // 'fadeOut' | 'fadeIn' | 'none'
        this.transitionAlpha = 0;
        this.transitionDuration = 0.42;
        this.pendingSceneName = null;
        this.pendingParams = null;
    }

    register(name, sceneInstance) {
        this.scenes.set(name, sceneInstance);
    }

    getCurrentSceneName() {
        return this.currentSceneName;
    }

    /**
     * Cambia inmediatamente a una escena sin transición de fundido.
     */
    switchImmediate(name, params = {}) {
        const nextScene = this.scenes.get(name);
        if (!nextScene) {
            console.error(`[SceneManager] Escena no registrada: "${name}"`);
            return;
        }

        if (this.currentScene && typeof this.currentScene.exit === 'function') {
            this.currentScene.exit();
        }

        this.currentSceneName = name;
        this.currentScene = nextScene;
        this.transitioning = false;
        this.transitionPhase = 'none';
        this.transitionAlpha = 0;

        if (typeof this.currentScene.enter === 'function') {
            this.currentScene.enter(params);
        }
    }

    /**
     * Inicia una transición con fundido hacia otra escena.
     */
    transitionTo(name, params = {}, duration = 0.42) {
        if (!this.scenes.has(name)) {
            console.error(`[SceneManager] Escena no registrada: "${name}"`);
            return;
        }

        if (!this.currentScene) {
            this.switchImmediate(name, params);
            return;
        }

        this.pendingSceneName = name;
        this.pendingParams = params;
        this.transitionDuration = Math.max(0.12, duration);
        this.transitioning = true;
        this.transitionPhase = 'fadeOut';
    }

    update(dt) {
        if (this.currentScene && typeof this.currentScene.update === 'function') {
            this.currentScene.update(dt);
        }

        if (!this.transitioning) return;

        const step = dt / this.transitionDuration;

        if (this.transitionPhase === 'fadeOut') {
            this.transitionAlpha = Math.min(1, this.transitionAlpha + step);
            if (this.transitionAlpha >= 1) {
                const targetName = this.pendingSceneName;
                const targetParams = this.pendingParams;
                this.pendingSceneName = null;
                this.pendingParams = null;

                if (this.currentScene && typeof this.currentScene.exit === 'function') {
                    this.currentScene.exit();
                }

                this.currentSceneName = targetName;
                this.currentScene = this.scenes.get(targetName);

                if (this.currentScene && typeof this.currentScene.enter === 'function') {
                    this.currentScene.enter(targetParams || {});
                }

                this.transitionPhase = 'fadeIn';
            }
        } else if (this.transitionPhase === 'fadeIn') {
            this.transitionAlpha = Math.max(0, this.transitionAlpha - step);
            if (this.transitionAlpha <= 0) {
                this.transitionAlpha = 0;
                this.transitionPhase = 'none';
                this.transitioning = false;
            }
        }
    }

    render(renderer) {
        if (this.currentScene && typeof this.currentScene.render === 'function') {
            this.currentScene.render(renderer);
        }

        if (this.transitionAlpha > 0.001) {
            const ctx = renderer.ctx;
            ctx.save();
            ctx.fillStyle = `rgba(3, 4, 8, ${this.transitionAlpha.toFixed(3)})`;
            ctx.fillRect(0, 0, renderer.width, renderer.height);
            ctx.restore();
        }
    }
}
