/**
 * Renderer2D.js
 * Motor de renderizado Canvas 2D con resolución lógica fija (1280x720),
 * escalado adaptable proporcional y efectos atmosféricos Survival Horror
 * (iluminación volumétrica, viñeta, niebla y lluvia optimizada con pool de objetos).
 */

export const LOGICAL_WIDTH = 1280;
export const LOGICAL_HEIGHT = 720;

const QUALITY_COUNTS = Object.freeze({
    high: { rain: 190, splashes: 36, fog: 8 },
    medium: { rain: 105, splashes: 20, fog: 5 },
    low: { rain: 45, splashes: 8, fog: 3 }
});

export class Renderer2D {
    constructor(canvas, stageElement, saveSystem) {
        this.canvas = canvas;
        this.stageElement = stageElement;
        this.saveSystem = saveSystem;

        this.width = LOGICAL_WIDTH;
        this.height = LOGICAL_HEIGHT;
        this.dpr = 1;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in this.ctx) {
            this.ctx.imageSmoothingQuality = 'high';
        }

        this.scale = 1;
        this.rainPool = [];
        this.splashPool = [];
        this.fogPool = [];

        this._initAtmosphericPools();
        this._onResize = this.resize.bind(this);
        window.addEventListener('resize', this._onResize);
        this.resize();
    }

    destroy() {
        window.removeEventListener('resize', this._onResize);
    }

    /**
     * Ajusta el contenedor de juego manteniendo relación 16:9 exacta
     * y sincronizando la variable CSS --ui-scale para que el DOM escale con el Canvas.
     */
    resize() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const targetRatio = this.width / this.height;
        const windowRatio = vw / vh;

        let displayWidth;
        let displayHeight;

        if (windowRatio > targetRatio) {
            displayHeight = vh;
            displayWidth = Math.floor(vh * targetRatio);
        } else {
            displayWidth = vw;
            displayHeight = Math.floor(vw / targetRatio);
        }

        this.scale = displayWidth / this.width;

        // Backing store HiDPI (hasta 2x = 2560x1440) para nitidez HD nativa sin pixelado
        const rawDpr = (typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio))
            ? window.devicePixelRatio
            : 1;
        this.dpr = Math.min(2, Math.max(1, rawDpr * Math.max(1, this.scale)));
        const targetW = Math.round(this.width * this.dpr);
        const targetH = Math.round(this.height * this.dpr);

        if (this.canvas && (this.canvas.width !== targetW || this.canvas.height !== targetH)) {
            this.canvas.width = targetW;
            this.canvas.height = targetH;
        }

        if (this.ctx) {
            if (typeof this.ctx.setTransform === 'function') {
                this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            }
            this.ctx.imageSmoothingEnabled = true;
            if ('imageSmoothingQuality' in this.ctx) {
                this.ctx.imageSmoothingQuality = 'high';
            }
        }

        if (this.stageElement) {
            this.stageElement.style.width = `${displayWidth}px`;
            this.stageElement.style.height = `${displayHeight}px`;
            this.stageElement.style.setProperty('--ui-scale', this.scale.toFixed(4));
        }
    }

    _initAtmosphericPools() {
        const maxRain = QUALITY_COUNTS.high.rain;
        for (let i = 0; i < maxRain; i++) {
            this.rainPool.push({
                x: Math.random() * (this.width + 200) - 100,
                y: Math.random() * this.height,
                length: 14 + Math.random() * 20,
                speed: 720 + Math.random() * 440,
                wind: -130 - Math.random() * 60,
                alpha: 0.14 + Math.random() * 0.28,
                thickness: Math.random() > 0.75 ? 1.6 : 1
            });
        }

        const maxSplashes = QUALITY_COUNTS.high.splashes;
        for (let i = 0; i < maxSplashes; i++) {
            this.splashPool.push({
                x: Math.random() * this.width,
                y: 635 + Math.random() * 78,
                radius: Math.random() * 12,
                maxRadius: 8 + Math.random() * 14,
                speed: 22 + Math.random() * 18
            });
        }

        const maxFog = QUALITY_COUNTS.high.fog;
        for (let i = 0; i < maxFog; i++) {
            this.fogPool.push({
                x: (i / maxFog) * (this.width + 400) - 200,
                y: 430 + (i % 3) * 75,
                radiusX: 240 + (i % 4) * 70,
                radiusY: 58 + (i % 3) * 24,
                speed: 14 + (i % 4) * 7,
                alpha: 0.055 + (i % 3) * 0.022
            });
        }
    }

    getQualityCounts() {
        const q = this.saveSystem?.getSettings()?.particleQuality || 'high';
        return QUALITY_COUNTS[q] || QUALITY_COUNTS.high;
    }

    updateAtmosphere(dt) {
        const counts = this.getQualityCounts();

        for (let i = 0; i < counts.rain; i++) {
            const drop = this.rainPool[i];
            drop.x += drop.wind * dt;
            drop.y += drop.speed * dt;

            if (drop.y > this.height + 20 || drop.x < -120) {
                drop.x = Math.random() * (this.width + 220);
                drop.y = -25 - Math.random() * 80;
            }
        }

        for (let i = 0; i < counts.splashes; i++) {
            const sp = this.splashPool[i];
            sp.radius += sp.speed * dt;
            if (sp.radius >= sp.maxRadius) {
                sp.radius = 0.5;
                sp.x = Math.random() * this.width;
                sp.y = 638 + Math.random() * 75;
            }
        }

        for (let i = 0; i < counts.fog; i++) {
            const fog = this.fogPool[i];
            fog.x += fog.speed * dt;
            if (fog.x - fog.radiusX > this.width + 120) {
                fog.x = -fog.radiusX - 100;
            }
        }
    }

    clear(color = '#05070c') {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Dibuja capas de niebla baja con gradiente suave.
     */
    drawFog(tintRgb = '145, 175, 205', intensityMultiplier = 1) {
        const ctx = this.ctx;
        const counts = this.getQualityCounts();
        ctx.save();

        for (let i = 0; i < counts.fog; i++) {
            const fog = this.fogPool[i];
            const grad = ctx.createRadialGradient(fog.x, fog.y, 10, fog.x, fog.y, fog.radiusX);
            const alpha = Math.min(0.35, fog.alpha * intensityMultiplier);
            grad.addColorStop(0, `rgba(${tintRgb}, ${alpha})`);
            grad.addColorStop(0.55, `rgba(${tintRgb}, ${alpha * 0.45})`);
            grad.addColorStop(1, `rgba(${tintRgb}, 0)`);

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(fog.x, fog.y, fog.radiusX, fog.radiusY, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Dibuja lluvia diagonal y ondas de impacto en el asfalto mojado.
     */
    drawRain(drawSplashes = true) {
        const ctx = this.ctx;
        const counts = this.getQualityCounts();
        ctx.save();

        if (drawSplashes) {
            ctx.lineWidth = 1;
            for (let i = 0; i < counts.splashes; i++) {
                const sp = this.splashPool[i];
                const ratio = 1 - sp.radius / sp.maxRadius;
                ctx.strokeStyle = `rgba(185, 215, 245, ${(ratio * 0.28).toFixed(3)})`;
                ctx.beginPath();
                ctx.ellipse(sp.x, sp.y, sp.radius, sp.radius * 0.26, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        ctx.lineCap = 'round';
        for (let i = 0; i < counts.rain; i++) {
            const drop = this.rainPool[i];
            const dx = (drop.wind / drop.speed) * drop.length;
            ctx.strokeStyle = `rgba(185, 212, 240, ${drop.alpha})`;
            ctx.lineWidth = drop.thickness;
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            ctx.lineTo(drop.x + dx, drop.y + drop.length);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Dibuja un resplandor radial aditivo para farolas, balizas, ojos o pantallas.
     */
    drawRadialGlow(x, y, innerRadius, outerRadius, colorInner, colorOuter = 'rgba(0,0,0,0)') {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
        grad.addColorStop(0, colorInner);
        grad.addColorStop(1, colorOuter);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /**
     * Dibuja un cono de iluminación direccional (linterna, farola o reflector de helicóptero).
     */
    drawLightCone(x, y, angleRad, spreadRad, length, colorStart, colorEnd = 'rgba(0,0,0,0)') {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const endX = x + Math.cos(angleRad) * length;
        const endY = y + Math.sin(angleRad) * length;
        const grad = ctx.createLinearGradient(x, y, endX, endY);
        grad.addColorStop(0, colorStart);
        grad.addColorStop(1, colorEnd);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, length, angleRad - spreadRad * 0.5, angleRad + spreadRad * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    /**
     * Aplica viñeta oscura cinematográfica en los bordes del encuadre.
     */
    drawVignette(strength = 0.72) {
        const ctx = this.ctx;
        const cx = this.width * 0.5;
        const cy = this.height * 0.5;
        const grad = ctx.createRadialGradient(cx, cy, this.height * 0.32, cx, cy, this.width * 0.68);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.65, `rgba(2, 4, 8, ${(strength * 0.42).toFixed(3)})`);
        grad.addColorStop(1, `rgba(1, 2, 5, ${strength.toFixed(3)})`);

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
    }

    /**
     * Renderiza indicador opcional de rendimiento (FPS y resolución lógica).
     */
    drawPerformanceOverlay(fps) {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(8, 12, 18, 0.78)';
        ctx.strokeStyle = 'rgba(220, 45, 45, 0.55)';
        ctx.lineWidth = 1;
        ctx.fillRect(14, 14, 152, 28);
        ctx.strokeRect(14, 14, 152, 28);

        ctx.fillStyle = fps >= 50 ? '#57e389' : fps >= 30 ? '#f8e45c' : '#ff5555';
        ctx.font = 'bold 12px Consolas, "Courier New", monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText(`FPS: ${Math.round(fps)} | 1280x720`, 24, 28);
        ctx.restore();
    }
}
