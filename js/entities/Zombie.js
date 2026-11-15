/**
 * Zombie.js
 * Variantes de infectados basadas en Enemy.js y renderizadas con SpriteAtlas:
 * - NormalZombie ('normal'): movimiento lento, ataque cuerpo a cuerpo, recompensa de puntos.
 * - FastZombie ('fast'): corredor agresivo de alta velocidad y salud moderada.
 * - SpecialZombie ('special'): Zombi Explosivo / Tóxico con hinchazón mutagénica,
 *   detonación de área bioquímica y recompensa económica adicional ($35 + 260 PTS).
 */

import { Enemy } from './Enemy.js';

export class Zombie extends Enemy {
    constructor(variant = 'normal', config = {}) {
        const presets = {
            normal: {
                width: 44,
                height: 104,
                visualHeight: 116,
                maxHealth: 70,
                speed: 62,
                chaseSpeed: 104,
                damage: 14,
                attackRange: 54,
                attackCooldownTime: 1.18,
                aggroRange: 370,
                scoreReward: 100,
                moneyReward: 0,
                typeLabel: 'Zombi Infectado'
            },
            fast: {
                width: 44,
                height: 100,
                visualHeight: 114,
                maxHealth: 95,
                speed: 108,
                chaseSpeed: 198,
                damage: 16,
                attackRange: 56,
                attackCooldownTime: 0.88,
                aggroRange: 445,
                scoreReward: 160,
                moneyReward: 0,
                typeLabel: 'Zombi Corredor'
            },
            special: {
                width: 52,
                height: 110,
                visualHeight: 124,
                maxHealth: 170,
                speed: 56,
                chaseSpeed: 118,
                damage: 28,
                attackRange: 62,
                attackCooldownTime: 1.35,
                aggroRange: 425,
                scoreReward: 260,
                moneyReward: 35,
                typeLabel: 'Zombi Explosivo Tóxico'
            },
            spitter: {
                width: 46,
                height: 104,
                visualHeight: 118,
                maxHealth: 125,
                speed: 68,
                chaseSpeed: 112,
                damage: 18,
                attackRange: 56,
                attackCooldownTime: 1.15,
                aggroRange: 500,
                scoreReward: 220,
                moneyReward: 25,
                typeLabel: 'Mutante Escupidor Bio-Ácido'
            }
        };

        const preset = presets[variant] || presets.normal;
        super({ ...preset, ...config });
        this.variant = variant;
        this.visualHeight = config.visualHeight || preset.visualHeight || 116;
        this.shambleCadence = variant !== 'fast';
        this.spriteAtlas = config.spriteAtlas || null;

        // Estado específico del Zombi Especial (Explosivo / Tóxico)
        this.priming = false;
        this.primeTimer = 0;
        this.primeDuration = 0.82;
        this.exploded = false;

        // Estado específico del Mutante Escupidor ('spitter')
        this.spitCooldown = 0.8 + Math.random() * 0.9;
    }

    _updateAI(dt, player, combatCallbacks) {
        if (this.variant === 'spitter' && !this.dead && player && !player.dead) {
            this.spitCooldown = Math.max(0, this.spitCooldown - dt);
            const myCx = this.x + this.width * 0.5;
            const plCx = player.x + player.width * 0.5;
            const dx = plCx - myCx;
            const absDx = Math.abs(dx);
            const dy = (player.y + player.height * 0.5) - (this.y + this.height * 0.45);

            if (absDx >= 135 && absDx <= 470 && Math.abs(dy) < 175 && this.spitCooldown <= 0) {
                this.facing = dx >= 0 ? 1 : -1;
                this.vx = this.knockbackVx * 0.35;
                this.attackAnimTimer = 0.32;
                this.spitCooldown = 2.05;

                const speedX = 335;
                const flightT = Math.max(0.25, absDx / speedX);
                const gravity = 220;
                const vy = (dy - 0.5 * gravity * flightT * flightT) / flightT;

                combatCallbacks?.onSpawnProjectile?.({
                    x: myCx + this.facing * 24,
                    y: this.y + 30,
                    vx: this.facing * speedX,
                    vy: Math.max(-280, Math.min(120, vy)),
                    gravity,
                    width: 14,
                    height: 14,
                    damage: this.damage,
                    maxDistance: 560,
                    owner: 'enemy',
                    color: '#52ff7a'
                });
                return;
            }
        }

        if (this.variant === 'special' && !this.dead && player && !player.dead) {
            const myCx = this.x + this.width * 0.5;
            const plCx = player.x + player.width * 0.5;
            const absDx = Math.abs(plCx - myCx);
            const dy = Math.abs((player.y + player.height * 0.5) - (this.y + this.height * 0.5));

            if (!this.priming && ((absDx <= 96 && dy < 95) || this.health <= this.maxHealth * 0.32)) {
                this.priming = true;
                this.primeTimer = 0;
            }

            if (this.priming) {
                this.facing = plCx >= myCx ? 1 : -1;
                this.vx = this.facing * 32 + this.knockbackVx * 0.4;
                this.primeTimer += dt;
                if (this.primeTimer >= this.primeDuration) {
                    this.dead = true;
                    this.deathTimer = 0;
                    this.exploded = true;
                    combatCallbacks?.onToxicExplosion?.(this, player);
                }
                return;
            }
        }

        super._updateAI(dt, player, combatCallbacks);
    }

    takeDamage(amount, knockbackVx = 0) {
        const died = super.takeDamage(amount, knockbackVx);
        if (died && this.variant === 'special') {
            this.exploded = true;
        }
        return died;
    }

    render(ctx, cameraX, cameraY) {
        const cx = Math.round(this.x + this.width * 0.5 - cameraX);
        const bottomY = Math.round(this.y + this.height - cameraY);
        const fade = this.dead ? Math.max(0, 1 - Math.max(0, this.deathTimer - 0.35) / 0.40) : 1;

        // Sombra de contacto de doble capa directamente bajo los pies del zombi (aporta peso físico real)
        ctx.save();
        ctx.globalAlpha = fade * 0.36;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(cx, bottomY, this.dead ? 44 : 29, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = fade * 0.68;
        ctx.beginPath();
        ctx.ellipse(cx, bottomY, this.dead ? 32 : 19, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Anillo de advertencia tóxica cuando el Zombi Especial va a detonar
        if (this.variant === 'special' && this.priming && !this.dead) {
            const pRatio = Math.min(1, this.primeTimer / this.primeDuration);
            ctx.save();
            ctx.strokeStyle = `rgba(90, 255, 110, ${(0.35 + pRatio * 0.55).toFixed(2)})`;
            ctx.fillStyle = `rgba(60, 235, 85, ${(0.08 + pRatio * 0.14).toFixed(2)})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(cx, bottomY, 126 * (0.45 + pRatio * 0.55), 24, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // Saco dorsal bioluminiscente para el Mutante Escupidor ('spitter')
        if (this.variant === 'spitter' && !this.dead) {
            const pulse = 0.55 + 0.35 * Math.sin(this.animTime * 7.5);
            ctx.save();
            ctx.fillStyle = `rgba(68, 255, 118, ${(pulse * 0.44).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(cx - this.facing * 12, bottomY - 72, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#5aff85';
            ctx.beginPath();
            ctx.arc(cx - this.facing * 12, bottomY - 72, 9, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (this.spriteAtlas && this.spriteAtlas.isReady()) {
            let animKey = 'znormal_walk';
            let frameIdx = 0;
            let loop = true;
            let targetHeight = this.visualHeight;

            if (this.variant === 'normal') {
                if (this.dead) {
                    animKey = 'znormal_dead';
                    frameIdx = Math.min(4, Math.floor((this.deathTimer / 0.55) * 5));
                    loop = false;
                } else if (this.attackAnimTimer > 0) {
                    animKey = 'znormal_attack';
                    const p = 1 - Math.max(0, this.attackAnimTimer / 0.26);
                    frameIdx = Math.min(4, Math.floor(p * 5));
                    loop = false;
                } else {
                    animKey = 'znormal_walk';
                    frameIdx = Math.abs(this.vx) > 4 ? Math.floor(this.stridePhase) : 0;
                }
            } else if (this.variant === 'fast' || this.variant === 'spitter') {
                if (this.dead) {
                    animKey = 'zfast_dead';
                    frameIdx = Math.min(4, Math.floor((this.deathTimer / 0.55) * 5));
                    loop = false;
                } else if (this.attackAnimTimer > 0) {
                    animKey = 'zfast_attack';
                    const p = 1 - Math.max(0, this.attackAnimTimer / 0.30);
                    frameIdx = Math.min(4, Math.floor(p * 5));
                    loop = false;
                } else {
                    animKey = 'zfast_run';
                    frameIdx = Math.abs(this.vx) > 4 ? Math.floor(this.stridePhase) : 0;
                }
            } else {
                // Zombi Especial (Explosivo / Tóxico)
                if (this.dead) {
                    animKey = 'zspecial_explode';
                    frameIdx = Math.min(3, Math.floor((this.deathTimer / 0.52) * 4));
                    loop = false;
                    targetHeight = this.visualHeight * 1.12;
                } else if (this.priming) {
                    animKey = 'zspecial_prepare';
                    frameIdx = Math.min(3, Math.floor((this.primeTimer / this.primeDuration) * 4));
                    loop = false;
                    targetHeight = this.visualHeight * 1.05;
                } else if (this.attackAnimTimer > 0) {
                    animKey = 'zspecial_prepare';
                    frameIdx = 2;
                    loop = false;
                } else {
                    animKey = 'zspecial_walk';
                    frameIdx = Math.abs(this.vx) > 4 ? Math.floor(this.stridePhase) : 0;
                }
            }

            const squashX = 1 + this.landSquash * 0.08;
            const squashY = 1 - this.landSquash * 0.10;
            const stepWeightY = (!this.dead && this.onGround && Math.abs(this.vx) > 6)
                ? -Math.abs(Math.sin(this.stridePhase * Math.PI * 0.5)) * 1.6
                : 0;

            this.spriteAtlas.drawFrame(ctx, animKey, frameIdx, cx, bottomY + 1, {
                targetHeight,
                squashX,
                squashY,
                offsetY: stepWeightY,
                flipX: this.facing < 0,
                loop,
                alpha: fade,
                hitFlash: this.hitFlashTimer > 0,
                flashColor: this.variant === 'special'
                    ? 'rgba(130, 255, 130, 0.55)'
                    : 'rgba(255, 255, 255, 0.58)'
            });
        } else {
            this._renderProceduralFallback(ctx, cx, bottomY, fade);
        }

        this.renderHealthBar(ctx, cx, Math.round(this.y - cameraY));
    }

    _renderProceduralFallback(ctx, cx, bottomY, fade) {
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(cx, bottomY);
        ctx.scale(this.facing, 1);
        ctx.fillStyle = this.variant === 'special' ? '#4a6e48' : '#58645a';
        ctx.fillRect(-12, -58, 24, 58);
        ctx.restore();
    }
}
