/**
 * SpriteAtlas.js
 * Sistema de renderizado de sprites 2D basado en los atlas extraídos
 * (assets/sprites/game_atlas_hd.png y assets/sprites/game_atlas_ext_hd.png).
 * Provee dibujo HD nítido alineado a la base de los pies o al centro, volteo horizontal,
 * rotación, destellos de impacto y acceso a vehículos, armas, VFX y las 8 especies de zombis.
 */

import { EXT_ATLAS_META } from './SpriteAtlasExtMeta.js';

export const ATLAS_META = {
    animations: {
        player_idle: [
            { x: 4, y: 4, w: 26, h: 59 },
            { x: 38, y: 4, w: 26, h: 59 },
            { x: 72, y: 4, w: 25, h: 59 },
            { x: 105, y: 4, w: 26, h: 59 }
        ],
        player_walk: [
            { x: 139, y: 4, w: 33, h: 59 },
            { x: 180, y: 4, w: 29, h: 59 },
            { x: 217, y: 4, w: 30, h: 58 },
            { x: 255, y: 4, w: 28, h: 58 },
            { x: 291, y: 4, w: 33, h: 58 }
        ],
        player_run: [
            { x: 332, y: 4, w: 41, h: 41 },
            { x: 381, y: 4, w: 41, h: 41 },
            { x: 430, y: 4, w: 33, h: 41 },
            { x: 471, y: 4, w: 29, h: 42 },
            { x: 508, y: 4, w: 33, h: 42 }
        ],
        player_jump: [
            { x: 549, y: 4, w: 25, h: 34 },
            { x: 582, y: 4, w: 30, h: 46 },
            { x: 620, y: 4, w: 25, h: 44 },
            { x: 653, y: 4, w: 24, h: 45 },
            { x: 685, y: 4, w: 26, h: 33 }
        ],
        player_melee: [
            { x: 719, y: 4, w: 25, h: 47 },
            { x: 752, y: 4, w: 25, h: 38 },
            { x: 785, y: 4, w: 39, h: 46 },
            { x: 832, y: 4, w: 40, h: 39 },
            { x: 880, y: 4, w: 36, h: 35 },
            { x: 924, y: 4, w: 24, h: 34 }
        ],
        player_shoot: [
            { x: 956, y: 4, w: 43, h: 47 },
            { x: 4, y: 71, w: 43, h: 47 },
            { x: 55, y: 71, w: 47, h: 46 },
            { x: 110, y: 71, w: 40, h: 46 },
            { x: 158, y: 71, w: 42, h: 45 }
        ],
        player_hurt: [
            { x: 208, y: 71, w: 31, h: 47 },
            { x: 247, y: 71, w: 26, h: 49 },
            { x: 281, y: 71, w: 41, h: 48 },
            { x: 330, y: 71, w: 29, h: 45 }
        ],
        player_dead: [
            { x: 367, y: 71, w: 31, h: 45 },
            { x: 406, y: 71, w: 39, h: 38 },
            { x: 453, y: 71, w: 59, h: 27 },
            { x: 520, y: 71, w: 84, h: 14 }
        ],
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
        portrait_hero_bust: { x: 395, y: 272, w: 88, h: 77 },
        face_normal: { x: 491, y: 272, w: 58, h: 55 },
        face_hurt: { x: 557, y: 272, w: 58, h: 55 },
        face_focused: { x: 623, y: 272, w: 58, h: 55 },
        face_surprised: { x: 689, y: 272, w: 58, h: 54 },
        face_tired: { x: 755, y: 272, w: 57, h: 54 },
        face_dead: { x: 820, y: 272, w: 58, h: 54 },
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
    // Altura anatómica de referencia por tira en el atlas base (corrige diferencias de escala entre filas)
    refHeights: {
        player_idle: 59,
        player_walk: 59,
        player_run: 43,
        player_jump: 46,
        player_melee: 39,
        player_shoot: 47,
        player_hurt: 48,
        player_dead: 47,
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

    isReady() {
        return Boolean(this.getImage() || this.getExtImage());
    }

    getFrameCount(animKey) {
        const frames = this.meta.animations[animKey] || this.extMeta.animations[animKey];
        return frames ? frames.length : 0;
    }

    getFrameMeta(animKey, frameIndex = 0) {
        const frames = this.meta.animations[animKey] || this.extMeta.animations[animKey];
        if (!frames || frames.length === 0) return null;
        const idx = Math.max(0, Math.min(frames.length - 1, Math.floor(frameIndex) % frames.length));
        return frames[idx];
    }

    getSpriteMeta(spriteKey) {
        return this.meta.sprites[spriteKey] || this.extMeta.sprites[spriteKey] || null;
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

    /**
     * Dibuja un fotograma de animación alineado a la base central de los pies (centerX, bottomY),
     * o centrado si options.centerAligned === true.
     * Retorna true si el atlas estaba listo y se dibujó, o false para permitir fallback procedural.
     */
    drawFrame(ctx, animKey, frameIndex, centerX, bottomY, options = {}) {
        if (!ctx || typeof ctx.drawImage !== 'function') return false;

        let frames = this.meta.animations[animKey];
        let isExt = false;
        if (!frames) {
            frames = this.extMeta.animations[animKey];
            isExt = true;
        }
        if (!frames || frames.length === 0) return false;

        const img = isExt ? this.getExtImage() : this.getImage();
        if (!img) return false;

        const loop = options.loop !== false;
        const rawIdx = Math.max(0, Math.floor(frameIndex));
        const idx = loop ? (rawIdx % frames.length) : Math.min(frames.length - 1, rawIdx);
        const f = frames[idx];
        const mul = isExt ? this.getExtAtlasScale(img) : this.getAtlasScale(img);

        const refMap = isExt ? this.extMeta.refHeights : this.meta.refHeights;
        const refH = refMap?.[animKey] || f.h || 48;
        const scale = options.targetHeight ? (options.targetHeight / refH) : (options.scale ?? (isExt ? 1.0 : 1.65));
        const squashX = options.squashX ?? 1;
        const squashY = options.squashY ?? 1;
        const flipX = Boolean(options.flipX);
        const alpha = options.alpha ?? 1;
        const offsetY = options.offsetY ?? 0;
        const offsetX = options.offsetX ?? 0;

        const dw = f.w * scale * squashX;
        const dh = f.h * scale * squashY;
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
            -dw * 0.5, drawY, dw, dh
        );

        if (options.hitFlash) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = options.flashColor || 'rgba(255, 90, 90, 0.55)';
            ctx.fillRect(-dw * 0.5, drawY, dw, dh);
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

        let s = this.meta.sprites[spriteKey];
        let isExt = false;
        if (!s) {
            s = this.extMeta.sprites[spriteKey];
            isExt = true;
        }
        if (!s) return false;

        const img = isExt ? this.getExtImage() : this.getImage();
        if (!img) return false;

        const mul = isExt ? this.getExtAtlasScale(img) : this.getAtlasScale(img);
        const scale = options.scale ?? (isExt ? 0.5 : 1);
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
