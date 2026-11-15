/**
 * Camera2D.js
 * Cámara 2D con seguimiento suavizado, anticipación direccional (look-ahead),
 * límites de escenario y sacudida cinematográfica (screen shake).
 */

export class Camera2D {
    constructor(viewportWidth = 1280, viewportHeight = 720, worldWidth = 4600, worldHeight = 720) {
        this.viewportWidth = viewportWidth;
        this.viewportHeight = viewportHeight;
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;

        this.x = 0;
        this.y = 0;
        this.minX = 0;
        this.maxX = Math.max(0, worldWidth - viewportWidth);

        this.shakeTimer = 0;
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    setBounds(minX, maxX) {
        this.minX = Math.max(0, minX);
        this.maxX = Math.max(this.minX, maxX - this.viewportWidth);
    }

    shake(intensity = 8, duration = 0.22) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(0.05, duration);
        this.shakeTimer = this.shakeDuration;
    }

    follow(target, dt) {
        if (!target) return;
        const lookAhead = (target.facing || 1) * 95;
        const desiredX = target.x + target.width * 0.5 + lookAhead - this.viewportWidth * 0.44;
        const clampedX = Math.max(this.minX, Math.min(this.maxX, desiredX));

        const lerpFactor = 1 - Math.exp(-7.5 * dt);
        this.x += (clampedX - this.x) * lerpFactor;

        if (this.shakeTimer > 0) {
            this.shakeTimer = Math.max(0, this.shakeTimer - dt);
            const falloff = this.shakeTimer / this.shakeDuration;
            const mag = this.shakeIntensity * falloff;
            this.offsetX = (Math.random() * 2 - 1) * mag;
            this.offsetY = (Math.random() * 2 - 1) * mag;
            if (this.shakeTimer <= 0) {
                this.shakeIntensity = 0;
            }
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
        }
    }

    getRenderX() {
        return Math.round(this.x - this.offsetX);
    }

    getRenderY() {
        return Math.round(this.y - this.offsetY);
    }
}
