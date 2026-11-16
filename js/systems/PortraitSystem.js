/**
 * PortraitSystem.js
 * Retrato del repartidor en el HUD con 6 expresiones reactivas:
 *
 *   calm     → Tranquilo        (sin amenazas)
 *   serious  → Serio            (enemigos cerca o paquete en mano)
 *   pain     → Dolor            (recibe daño)
 *   laugh    → Risa / Descanso  (curación, checkpoint, entrega, jefe derrotado)
 *   rage     → Rabia            (dispara / ataca / elimina un zombi)
 *   tired    → Cansado          (salud ≤ 30 %)
 *   dead     → Cansado apagado  (salud 0, se dibuja sobre la cara de cansado)
 *
 * Dibuja sobre el canvas #hud-avatar-canvas (116×116 internos, 52×52 en pantalla)
 * y añade una clase `mood-*` al marco `.hud-avatar` para teñir el borde.
 */

import { PORTRAIT_FACES_META } from '../core/PortraitFacesMeta.js';

const FADE_MS = 180;
const FLASH_MS = 150;

// Duración de las expresiones que se activan por acción (ms)
const HOLD_MS = {
    pain: 950,
    rage: 1200,
    laugh: 1900
};

const MOOD_PRIORITY = {
    calm: 0,
    serious: 1,
    tired: 2,
    laugh: 3,
    rage: 4,
    pain: 5,
    dead: 6
};

const TINTS = {
    calm: null,
    serious: { color: 'rgba(58, 110, 160, 0.07)' },
    pain: { color: 'rgba(198, 22, 36, 0.17)', filter: 'saturate(1.08)' },
    laugh: { color: 'rgba(70, 220, 120, 0.07)' },
    rage: { color: 'rgba(226, 38, 20, 0.13)', filter: 'saturate(1.12) contrast(1.03)' },
    tired: { color: 'rgba(24, 40, 66, 0.28)', filter: 'saturate(0.78) brightness(0.94)' },
    dead: { color: 'rgba(8, 10, 16, 0.42)', filter: 'grayscale(0.85) brightness(0.70)' }
};

// Respaldo mientras la lámina nueva carga: caras del atlas de entrega
const ATLAS_FACE = {
    calm: 'face_normal',
    serious: 'face_focused',
    pain: 'face_hurt',
    rage: 'face_focused',
    laugh: 'face_normal',
    tired: 'face_tired',
    dead: 'face_dead'
};

export class PortraitSystem {
    constructor(canvas, { assets = null, spriteAtlas = null } = {}) {
        this.canvas = canvas || null;
        this.ctx = this.canvas && typeof this.canvas.getContext === 'function'
            ? this.canvas.getContext('2d')
            : null;
        this.assets = assets;
        this.spriteAtlas = spriteAtlas;
        this.frame = this.canvas?.parentElement || null;

        this.image = null;
        this._imageRequested = false;
        this._imageFailed = false;

        this.mood = 'calm';
        this.prevMood = null;
        this.fadeStart = 0;
        this.flashUntil = 0;
        this.holdMood = null;
        this.holdUntil = 0;
        this.lastHealth = null;
        this._lastPaintedMood = '';
        this._needsPaint = true;

        this._applyRing('calm');
    }

    /** Vuelve al estado inicial (al entrar o reiniciar un nivel). */
    reset() {
        this.mood = 'calm';
        this.prevMood = null;
        this.fadeStart = 0;
        this.flashUntil = 0;
        this.holdMood = null;
        this.holdUntil = 0;
        this.lastHealth = null;
        this._lastPaintedMood = '';
        this._needsPaint = true;
        this._applyRing('calm');
    }

    /** Expresión actual (para depuración). */
    getMood() {
        return this.mood;
    }

    /**
     * Fuerza una expresión durante `durationMs`. Las acciones de mayor prioridad
     * (dolor > rabia > risa) no se interrumpen con otras de menor prioridad.
     */
    notify(mood, durationMs) {
        if (!PORTRAIT_FACES_META.moods[mood]) return;
        const now = this._now();
        const ms = Number.isFinite(durationMs) ? durationMs : (HOLD_MS[mood] || 1200);
        const active = this.holdMood && now < this.holdUntil ? this.holdMood : null;
        if (active && (MOOD_PRIORITY[active] || 0) > (MOOD_PRIORITY[mood] || 0)) return;
        this.holdMood = mood;
        this.holdUntil = now + ms;
        this._needsPaint = true;
    }

    /**
     * Se llama una vez por frame (desde _syncHud). Resuelve la expresión según
     * el estado del jugador y repinta solo si cambió, si hay fundido o si la
     * lámina terminó de cargar.
     */
    update(player, { enemiesNear = false } = {}) {
        if (!this.ctx || !player) return;

        const now = this._now();
        // Si la lámina aún no cargó, se dibuja el respaldo del atlas.
        this._ensureImage();

        // Curación (botiquín, checkpoint, reaparición) → risa / descanso
        if (this.lastHealth !== null && !player.dead && player.health > this.lastHealth + 1) {
            this.notify('laugh');
        }
        this.lastHealth = player.health;

        if (this.holdUntil && now >= this.holdUntil) {
            this.holdMood = null;
            this.holdUntil = 0;
        }

        const next = this._resolve(player, enemiesNear, now);
        if (next !== this.mood) {
            this.prevMood = this.mood;
            this.mood = next;
            this.fadeStart = now;
            this._needsPaint = true;
            this._applyRing(next);
            if (next === 'pain') this.flashUntil = now + FLASH_MS;
        }

        const fading = this.prevMood !== null && (now - this.fadeStart) < FADE_MS;
        const flashing = now < this.flashUntil;
        const pulsing = this.mood === 'rage' || this.mood === 'pain';

        if (this._needsPaint || fading || flashing || pulsing || this._lastPaintedMood !== this.mood) {
            this._paint(now);
        }
    }

    // ── Interno ────────────────────────────────────────────────────────────

    _now() {
        return (typeof performance !== 'undefined' && typeof performance.now === 'function')
            ? performance.now()
            : Date.now();
    }

    _resolve(player, enemiesNear, now) {
        if (player.dead || player.health <= 0) return 'dead';
        if (this.holdMood && now < this.holdUntil) return this.holdMood;
        if (player.hurtAnimTimer > 0.04 || player.stunTimer > 0) return 'pain';
        if (player.attackAnimTimer > 0) return 'rage';

        const ratio = player.health / Math.max(1, player.maxHealth);
        if (ratio <= 0.30) return 'tired';
        if (enemiesNear || player.hasPackage) return 'serious';
        return 'calm';
    }

    _applyRing(mood) {
        const frame = this.frame;
        if (!frame || !frame.classList) return;
        for (const key of Object.keys(MOOD_PRIORITY)) {
            frame.classList.remove(`mood-${key}`);
        }
        frame.classList.add(`mood-${PORTRAIT_FACES_META.moods[mood] ? mood : 'calm'}`);
    }

    _ensureImage() {
        if (this.image || this._imageFailed) return;

        if (this.assets?.getImage) {
            const pre = this.assets.getImage(PORTRAIT_FACES_META.imageKey);
            if (pre && pre.complete !== false && pre.naturalWidth > 0) {
                this.image = pre;
                this._needsPaint = true;
                return;
            }
        }

        if (this._imageRequested || typeof Image !== 'function') return;
        this._imageRequested = true;

        const img = new Image();
        img.onload = () => {
            this.image = img;
            this._needsPaint = true;
        };
        img.onerror = () => {
            this._imageFailed = true;
        };
        img.src = PORTRAIT_FACES_META.src;
    }

    _paint(now) {
        const ctx = this.ctx;
        const cw = this.canvas.width || 116;
        const ch = this.canvas.height || 116;

        ctx.clearRect(0, 0, cw, ch);

        if (!this.image) {
            this._paintAtlasFallback(cw, ch);
            this._lastPaintedMood = this.mood;
            this._needsPaint = false;
            return;
        }

        const fade = this.prevMood !== null
            ? Math.min(1, (now - this.fadeStart) / FADE_MS)
            : 1;

        if (this.prevMood !== null && fade < 1) {
            this._drawFace(this.prevMood, 1 - fade, now);
        }
        this._drawFace(this.mood, fade, now);

        if (fade >= 1) this.prevMood = null;
        this._lastPaintedMood = this.mood;
        this._needsPaint = false;
    }

    _drawFace(mood, alpha, now) {
        const ctx = this.ctx;
        const cw = this.canvas.width || 116;
        const ch = this.canvas.height || 116;

        const face = mood === 'dead' ? 'tired' : mood;
        const meta = PORTRAIT_FACES_META.moods[face] || PORTRAIT_FACES_META.moods.calm;
        const srcW = PORTRAIT_FACES_META.cell.w;
        const srcH = PORTRAIT_FACES_META.cell.h;
        const sx = meta.col * srcW;
        const sy = meta.row * srcH;

        // "cover": llena el canvas y recorta los lados sobrantes
        const scale = Math.max(cw / srcW, ch / srcH);
        const dw = srcW * scale;
        const dh = srcH * scale;
        const dx = (cw - dw) * 0.5;
        const dy = (ch - dh) * 0.5;

        const pulse = mood === 'rage'
            ? 1 + 0.018 * Math.sin(now / 85)
            : (mood === 'pain' ? 1 + 0.012 * Math.sin(now / 55) : 1);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.rect(0, 0, cw, ch);
        ctx.clip();

        ctx.translate(cw * 0.5, ch * 0.5);
        ctx.scale(pulse, pulse);
        ctx.translate(-cw * 0.5, -ch * 0.5);

        const tint = TINTS[mood] || null;
        const supportsFilter = 'filter' in ctx;
        if (tint?.filter && supportsFilter) ctx.filter = tint.filter;

        ctx.drawImage(this.image, sx, sy, srcW, srcH, dx, dy, dw, dh);

        if (tint?.filter && supportsFilter) ctx.filter = 'none';

        if (tint) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = tint.color;
            ctx.fillRect(0, 0, cw, ch);
            ctx.globalCompositeOperation = 'source-over';
        }

        // Destello rojo breve al recibir daño
        if (mood === 'pain' && now < this.flashUntil) {
            const k = Math.max(0, (this.flashUntil - now) / FLASH_MS);
            ctx.globalAlpha = alpha * 0.45 * k;
            ctx.fillStyle = '#ff2f38';
            ctx.fillRect(0, 0, cw, ch);
            ctx.globalAlpha = alpha;
        }

        // Viñeta interna para integrar la cara con el marco del HUD
        if (!this._vignette || this._vignetteCW !== cw || this._vignetteCH !== ch) {
            const gradient = ctx.createRadialGradient(
                cw * 0.5, ch * 0.46, cw * 0.20,
                cw * 0.5, ch * 0.50, cw * 0.78
            );
            gradient.addColorStop(0, 'rgba(3, 5, 9, 0)');
            gradient.addColorStop(0.72, 'rgba(3, 5, 9, 0.18)');
            gradient.addColorStop(1, 'rgba(3, 5, 9, 0.66)');
            this._vignette = gradient;
            this._vignetteCW = cw;
            this._vignetteCH = ch;
        }
        ctx.fillStyle = this._vignette;
        ctx.fillRect(0, 0, cw, ch);

        ctx.restore();
    }

    _paintAtlasFallback(cw, ch) {
        const atlas = this.spriteAtlas;
        this.ctx.clearRect(0, 0, cw, ch);
        if (!atlas?.isReady?.()) return;
        const key = ATLAS_FACE[this.mood] || 'face_normal';
        atlas.drawSprite(this.ctx, key, 2, 4, cw - 4, ch - 6);
    }
}
