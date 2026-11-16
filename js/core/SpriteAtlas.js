/**
 * SpriteAtlas.js
 * Sistema de renderizado de sprites 2D basado en los atlas extraídos
 * (assets/sprites/game_atlas_hd.png y assets/sprites/game_atlas_ext_hd.png).
 * Provee dibujo HD nítido alineado a la base de los pies o al centro, volteo horizontal,
 * rotación, destellos de impacto y acceso a vehículos, armas, VFX y las 8 especies de zombis.
 */

import { EXT_ATLAS_META } from './SpriteAtlasExtMeta.js';
import { ZOMBIE_WALKER_META } from './ZombieWalkerMeta.js';
import { FEMALE_ZOMBIE_META } from './FemaleZombieMeta.js';
import { DELIVERY_META } from './DeliveryMeta.js';

export const ATLAS_META = {
    animations: {
        znormal_walk: [
            { x: 612, y: 71, w: 34, h: 47 },
            { x: 654, y: 71, w: 35, h: 44 },
            { x: 697, y: 71, w: 35, h: 45 },
            { x: 740, y: 71, w: 27, h: 45 },
            { x: 775, y: 71, w: 29, h: 44 }
        ],
        znormal_attack: [
            { x: 812, y: 71, w: 29, h: 47 },
            { x: 849, y: 71, w: 34, h: 46 },
            { x: 891, y: 71, w: 33, h: 45 },
            { x: 932, y: 71, w: 32, h: 45 },
            { x: 4, y: 128, w: 46, h: 37 }
        ],
        znormal_dead: [
            { x: 58, y: 128, w: 27, h: 50 },
            { x: 93, y: 128, w: 30, h: 40 },
            { x: 131, y: 128, w: 43, h: 35 },
            { x: 182, y: 128, w: 45, h: 21 },
            { x: 235, y: 128, w: 52, h: 13 }
        ],
        zfast_run: [
            { x: 295, y: 128, w: 37, h: 40 },
            { x: 340, y: 128, w: 38, h: 39 },
            { x: 386, y: 128, w: 37, h: 38 },
            { x: 431, y: 128, w: 35, h: 38 },
            { x: 474, y: 128, w: 35, h: 39 }
        ],
        zfast_attack: [
            { x: 517, y: 128, w: 35, h: 41 },
            { x: 560, y: 128, w: 34, h: 40 },
            { x: 602, y: 128, w: 44, h: 39 },
            { x: 654, y: 128, w: 32, h: 41 },
            { x: 694, y: 128, w: 51, h: 40 }
        ],
        zfast_dead: [
            { x: 753, y: 128, w: 32, h: 45 },
            { x: 793, y: 128, w: 42, h: 39 },
            { x: 843, y: 128, w: 45, h: 30 },
            { x: 896, y: 128, w: 51, h: 16 },
            { x: 955, y: 128, w: 34, h: 10 }
        ],
        zspecial_walk: [
            { x: 4, y: 186, w: 36, h: 40 },
            { x: 48, y: 186, w: 38, h: 39 },
            { x: 94, y: 186, w: 35, h: 40 },
            { x: 137, y: 186, w: 35, h: 40 }
        ],
        zspecial_prepare: [
            { x: 180, y: 186, w: 37, h: 42 },
            { x: 225, y: 186, w: 34, h: 44 },
            { x: 267, y: 186, w: 35, h: 44 },
            { x: 310, y: 186, w: 31, h: 46 }
        ],
        zspecial_explode: [
            { x: 349, y: 186, w: 40, h: 42 },
            { x: 397, y: 186, w: 47, h: 48 },
            { x: 452, y: 186, w: 43, h: 48 },
            { x: 503, y: 186, w: 34, h: 48 }
        ],
        boss_walk: [
            { x: 545, y: 186, w: 56, h: 63 },
            { x: 609, y: 186, w: 52, h: 61 },
            { x: 669, y: 186, w: 46, h: 60 }
        ],
        boss_attack: [
            { x: 723, y: 186, w: 57, h: 70 },
            { x: 788, y: 186, w: 59, h: 78 },
            { x: 855, y: 186, w: 55, h: 58 },
            { x: 918, y: 186, w: 72, h: 65 }
        ],
        boss_charge: [
            { x: 4, y: 272, w: 101, h: 49 },
            { x: 113, y: 272, w: 63, h: 48 }
        ],
        boss_dead: [
            { x: 184, y: 272, w: 61, h: 70 },
            { x: 253, y: 272, w: 56, h: 65 },
            { x: 317, y: 272, w: 70, h: 48 }
        ]
    },
    sprites: {
        icon_backpack: { x: 886, y: 272, w: 51, h: 53 },
        icon_package: { x: 945, y: 272, w: 48, h: 41 },
        icon_medkit: { x: 4, y: 357, w: 49, h: 47 },
        prop_crate_wood: { x: 61, y: 357, w: 46, h: 44 },
        prop_barrel_red: { x: 115, y: 357, w: 33, h: 46 },
        prop_crate_metal: { x: 156, y: 357, w: 44, h: 41 },
        prop_barrier_concrete: { x: 208, y: 357, w: 57, h: 32 },
        prop_rubble: { x: 273, y: 357, w: 41, h: 25 },
        prop_ladder: { x: 322, y: 357, w: 29, h: 64 },
        prop_fence: { x: 359, y: 357, w: 59, h: 67 },
        prop_streetlamp: { x: 426, y: 357, w: 38, h: 64 },
        prop_electric_box: { x: 472, y: 357, w: 27, h: 45 },
        prop_spikes: { x: 507, y: 357, w: 106, h: 25 },
        portrait_boss_bust: { x: 621, y: 357, w: 134, h: 112 }
    },
    // Altura anatómica de referencia por tira en el atlas base (zombis y boss)
    refHeights: {
        znormal_walk: 46,
        znormal_attack: 46,
        znormal_dead: 48,
        zfast_run: 40,
        zfast_attack: 41,
        zfast_dead: 44,
        zspecial_walk: 40,
        zspecial_prepare: 42,
        zspecial_explode: 42,
        boss_walk: 62,
        boss_attack: 62,
        boss_charge: 56,
        boss_dead: 66
    }
};

export class SpriteAtlas {
    constructor(assetLoader = null) {
        this.assets = assetLoader;
        this.meta = ATLAS_META;
        this.extMeta = EXT_ATLAS_META;
        this.walkerMeta = ZOMBIE_WALKER_META;
        this.femaleMeta = FEMALE_ZOMBIE_META;
        this.deliveryMeta = DELIVERY_META;
    }

    getImage() {
        if (!this.assets) return null;
        const img = this.assets.getImage('game_atlas');
        if (!img) return null;
        if (typeof img.complete === 'boolean' && !img.complete) return null;
        if (typeof img.naturalWidth === 'number' && img.naturalWidth === 0) return null;
        return img;
    }

    getExtImage() {
        if (!this.assets) return null;
        const img = this.assets.getImage('game_atlas_ext');
        if (!img) return null;
        if (typeof img.complete === 'boolean' && !img.complete) return null;
        if (typeof img.naturalWidth === 'number' && img.naturalWidth === 0) return null;
        return img;
    }

    getWalkerImage() {
        if (!this.assets || !this.walkerMeta?.imageKey) return null;
        const img = this.assets.getImage(this.walkerMeta.imageKey);
        if (!img) return null;
        if (typeof img.complete === 'boolean' && !img.complete) return null;
        if (typeof img.naturalWidth === 'number' && img.naturalWidth === 0) return null;
        return img;
    }

    getFemaleImage() {
        if (!this.assets || !this.femaleMeta?.imageKey) return null;
        const img = this.assets.getImage(this.femaleMeta.imageKey);
        if (!img) return null;
        if (typeof img.complete === 'boolean' && !img.complete) return null;
        if (typeof img.naturalWidth === 'number' && img.naturalWidth === 0) return null;
        return img;
    }

    getDeliveryImage() {
        if (!this.assets || !this.deliveryMeta?.imageKey) return null;
        const img = this.assets.getImage(this.deliveryMeta.imageKey);
        if (!img) return null;
        if (typeof img.complete === 'boolean' && !img.complete) return null;
        if (typeof img.naturalWidth === 'number' && img.naturalWidth === 0) return null;
        return img;
    }

    /**
     * Resuelve una animación en orden de prioridad: hoja del repartidor,
     * hoja de la caminante femenina, hoja del caminante, atlas base y atlas extendido.
     */
    _resolveAnimation(animKey) {
        const deliveryFrames = this.deliveryMeta?.animations?.[animKey];
        if (deliveryFrames && deliveryFrames.length > 0 && this.getDeliveryImage()) {
            return { frames: deliveryFrames, source: 'delivery' };
        }

        const femaleFrames = this.femaleMeta?.animations?.[animKey];
        if (femaleFrames && femaleFrames.length > 0 && this.getFemaleImage()) {
            return { frames: femaleFrames, source: 'female' };
        }

        const walkerFrames = this.walkerMeta?.animations?.[animKey];
        if (walkerFrames && walkerFrames.length > 0 && this.getWalkerImage()) {
            return { frames: walkerFrames, source: 'walker' };
        }

        const baseFrames = this.meta.animations[animKey];
        if (baseFrames && baseFrames.length > 0) {
            return { frames: baseFrames, source: 'base' };
        }

        const extFrames = this.extMeta.animations[animKey];
        if (extFrames && extFrames.length > 0) {
            return { frames: extFrames, source: 'ext' };
        }

        return { frames: null, source: null };
    }

    isReady() {
        return Boolean(this.getImage() || this.getExtImage() || this.getWalkerImage() || this.getFemaleImage() || this.getDeliveryImage());
    }

    getFrameCount(animKey) {
        const { frames } = this._resolveAnimation(animKey);
        return frames ? frames.length : 0;
    }

    getFrameMeta(animKey, frameIndex = 0) {
        const { frames } = this._resolveAnimation(animKey);
        if (!frames || frames.length === 0) return null;
        const idx = Math.max(0, Math.min(frames.length - 1, Math.floor(frameIndex) % frames.length));
        return frames[idx];
    }

    getSpriteMeta(spriteKey) {
        return this.deliveryMeta?.sprites?.[spriteKey] || this.meta.sprites[spriteKey] || this.extMeta.sprites[spriteKey] || null;
    }

    getAtlasScale(img) {
        if (!img || typeof img.naturalWidth !== 'number' || img.naturalWidth <= 0) {
            return 1;
        }
        return img.naturalWidth >= 2048 ? Math.round(img.naturalWidth / 1024) : 1;
    }

    getExtAtlasScale(img) {
        if (!img || typeof img.naturalWidth !== 'number' || img.naturalWidth <= 0) {
            return 1;
        }
        return img.naturalWidth >= 1800 ? (img.naturalWidth / 2048) : (img.naturalWidth / 2048);
    }

    getWalkerAtlasScale(img) {
        if (!img || typeof img.naturalWidth !== 'number' || img.naturalWidth <= 0) {
            return 1;
        }
        return img.naturalWidth / 2048;
    }

    getDeliveryAtlasScale(img) {
        if (!img || typeof img.naturalWidth !== 'number' || img.naturalWidth <= 0) {
            return 1;
        }
        const baseWidth = this.deliveryMeta?.naturalWidth || img.naturalWidth;
        return img.naturalWidth / baseWidth;
    }

    getFemaleAtlasScale(img) {
        if (!img || typeof img.naturalWidth !== 'number' || img.naturalWidth <= 0) {
            return 1;
        }
        const baseWidth = this.femaleMeta?.naturalWidth || img.naturalWidth;
        return img.naturalWidth / baseWidth;
    }

    /**
     * Dibuja un fotograma de animación alineado a la base central de los pies (centerX, bottomY),
     * o centrado si options.centerAligned === true.
     * Retorna true si el atlas estaba listo y se dibujó, o false para permitir fallback procedural.
     */
    drawFrame(ctx, animKey, frameIndex, centerX, bottomY, options = {}) {
        if (!ctx || typeof ctx.drawImage !== 'function') return false;

        const { frames, source } = this._resolveAnimation(animKey);
        if (!frames || frames.length === 0) return false;

        const img = source === 'delivery'
            ? this.getDeliveryImage()
            : (source === 'female'
                ? this.getFemaleImage()
                : (source === 'walker'
                    ? this.getWalkerImage()
                    : (source === 'ext' ? this.getExtImage() : this.getImage())));
        if (!img) return false;

        const loop = options.loop !== false;
        const rawIdx = Math.max(0, Math.floor(frameIndex));
        const idx = loop ? (rawIdx % frames.length) : Math.min(frames.length - 1, rawIdx);
        const f = frames[idx];
        const mul = source === 'delivery'
            ? this.getDeliveryAtlasScale(img)
            : (source === 'female'
                ? this.getFemaleAtlasScale(img)
                : (source === 'walker'
                    ? this.getWalkerAtlasScale(img)
                    : (source === 'ext' ? this.getExtAtlasScale(img) : this.getAtlasScale(img))));

        const refMap = source === 'delivery'
            ? this.deliveryMeta.refHeights
            : (source === 'female'
                ? this.femaleMeta.refHeights
                : (source === 'walker'
                    ? this.walkerMeta.refHeights
                    : (source === 'ext' ? this.extMeta.refHeights : this.meta.refHeights)));
        const refH = refMap?.[animKey] || f.h || 48;
        const baseScale = options.targetHeight
            ? (options.targetHeight / refH)
            : (options.scale ?? (source === 'base' ? 1.65 : 1.0));
        const frameScale = f.scale ?? 1;
        const frameSx = f.sx ?? 1;
        const anchorX = f.anchorX ?? 0.5;
        const squashX = options.squashX ?? 1;
        const squashY = options.squashY ?? 1;
        const flipX = Boolean(options.flipX);
        const alpha = options.alpha ?? 1;
        const offsetY = options.offsetY ?? 0;
        const offsetX = options.offsetX ?? 0;

        const dw = f.w * baseScale * frameScale * frameSx * squashX;
        const dh = f.h * baseScale * frameScale * squashY;
        const drawX = options.centerAligned ? (-dw * 0.5) : (-dw * anchorX);
        const drawY = options.centerAligned ? (-dh * 0.5) : (-dh);

        ctx.save();
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in ctx) {
            ctx.imageSmoothingQuality = 'high';
        }
        if (alpha < 1) ctx.globalAlpha *= alpha;

        ctx.translate(centerX + offsetX, bottomY + offsetY);
        if (options.rotation) {
            ctx.rotate(options.rotation);
        }
        if (flipX) {
            ctx.scale(-1, 1);
        }

        ctx.drawImage(
            img,
            f.x * mul, f.y * mul, f.w * mul, f.h * mul,
            drawX, drawY, dw, dh
        );

        if (options.hitFlash) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = options.flashColor || 'rgba(255, 90, 90, 0.55)';
            ctx.fillRect(drawX, drawY, dw, dh);
        }

        ctx.imageSmoothingEnabled = prevSmooth;
        ctx.restore();
        return true;
    }

    /**
     * Dibuja un sprite individual (vehículo, arma, prop, retrato o ícono) dentro del rectángulo destino (x, y, w, h).
     */
    drawSprite(ctx, spriteKey, x, y, w = null, h = null, options = {}) {
        if (!ctx || typeof ctx.drawImage !== 'function') return false;

        let s = this.deliveryMeta?.sprites?.[spriteKey];
        let source = 'delivery';
        if (!s) {
            s = this.meta.sprites[spriteKey];
            source = 'base';
        }
        if (!s) {
            s = this.extMeta.sprites[spriteKey];
            source = 'ext';
        }
        if (!s) return false;

        const img = source === 'delivery'
            ? this.getDeliveryImage()
            : (source === 'ext' ? this.getExtImage() : this.getImage());
        if (!img) return false;

        const mul = source === 'delivery'
            ? this.getDeliveryAtlasScale(img)
            : (source === 'ext' ? this.getExtAtlasScale(img) : this.getAtlasScale(img));
        const scale = options.scale ?? (source === 'ext' ? 0.5 : 1);
        const dw = w !== null ? w : s.w * scale;
        const dh = h !== null ? h : s.h * scale;

        ctx.save();
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in ctx) {
            ctx.imageSmoothingQuality = 'high';
        }
        if (options.alpha !== undefined && options.alpha < 1) {
            ctx.globalAlpha *= options.alpha;
        }

        if (options.rotation) {
            ctx.translate(x + dw * 0.5, y + dh * 0.5);
            ctx.rotate(options.rotation);
            if (options.flipX) ctx.scale(-1, 1);
            ctx.drawImage(img, s.x * mul, s.y * mul, s.w * mul, s.h * mul, -dw * 0.5, -dh * 0.5, dw, dh);
            if (options.hitFlash) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = options.flashColor || 'rgba(255, 95, 95, 0.55)';
                ctx.fillRect(-dw * 0.5, -dh * 0.5, dw, dh);
            }
        } else if (options.flipX) {
            ctx.translate(x + dw, y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, s.x * mul, s.y * mul, s.w * mul, s.h * mul, 0, 0, dw, dh);
            if (options.hitFlash) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = options.flashColor || 'rgba(255, 95, 95, 0.55)';
                ctx.fillRect(0, 0, dw, dh);
            }
        } else {
            ctx.drawImage(img, s.x * mul, s.y * mul, s.w * mul, s.h * mul, x, y, dw, dh);
            if (options.hitFlash) {
                ctx.globalCompositeOperation = 'source-atop';
                ctx.fillStyle = options.flashColor || 'rgba(255, 95, 95, 0.55)';
                ctx.fillRect(x, y, dw, dh);
            }
        }

        ctx.imageSmoothingEnabled = prevSmooth;
        ctx.restore();
        return true;
    }
}
