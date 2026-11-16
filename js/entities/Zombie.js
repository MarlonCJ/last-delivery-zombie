/**
 * Zombie.js
 * Bestiario completo de las 8 especies de infectados con puntajes exactos reglamentarios:
 * 01. Zombi Caminante ('walker' / 'normal'):    10 pts
 * 02. Zombi Corredor ('runner' / 'fast'):       25 pts
 * 03. Zombi Resistente ('resistant'):           35 pts
 * 04. Zombi Vomitador ('spitter'):              40 pts
 * 05. Zombi Bombero ('bomber' / 'special'):     45 pts
 * 06. Zombi Blindado ('armored'):               60 pts
 * 07. Zombi Saltador ('leaper'):                60 pts
 * 08. Zombi Bruto Mutante ('brute'):            65 pts
 * (Jefe / Boss en Boss.js:                      100 pts)
 */

import { Enemy } from './Enemy.js';

export const ZOMBIE_POINT_TABLE = Object.freeze({
    walker: 10,
    runner: 25,
    resistant: 35,
    spitter: 40,
    bomber: 45,
    armored: 60,
    leaper: 60,
    brute: 65,
    boss: 100
});

const VARIANT_ALIASES = Object.freeze({
    normal: 'walker',
    fast: 'runner',
    special: 'bomber',
    female: 'walker_female',
    caminante_femenina: 'walker_female',
    z01f_walker: 'walker_female',
    zombie_walker_female: 'walker_female'
});

export class Zombie extends Enemy {
    constructor(variant = 'walker', config = {}) {
        const canonical = VARIANT_ALIASES[variant] || variant;

        const presets = {
            walker: {
                code: '01',
                width: 44,
                height: 104,
                visualHeight: 120,
                maxHealth: 60,
                speed: 60,
                chaseSpeed: 102,
                damage: 12,
                attackRange: 54,
                attackCooldownTime: 1.18,
                aggroRange: 370,
                scoreReward: ZOMBIE_POINT_TABLE.walker,
                moneyReward: 0,
                typeLabel: '01. Zombi Caminante',
                animPrefix: 'z01',
                fallbackPrefix: 'znormal'
            },
            walker_female: {
                code: '01F',
                width: 42,
                height: 102,
                visualHeight: 120,
                maxHealth: 52,
                speed: 58,
                chaseSpeed: 98,
                damage: 10,
                attackRange: 52,
                attackCooldownTime: 1.22,
                aggroRange: 360,
                scoreReward: ZOMBIE_POINT_TABLE.walker,
                moneyReward: 0,
                typeLabel: '01F. Caminante Femenina',
                animPrefix: 'z01f',
                fallbackPrefix: 'znormal'
            },
            runner: {
                code: '02',
                width: 44,
                height: 100,
                visualHeight: 120,
                maxHealth: 78,
                speed: 112,
                chaseSpeed: 204,
                damage: 15,
                attackRange: 56,
                attackCooldownTime: 0.86,
                aggroRange: 450,
                scoreReward: ZOMBIE_POINT_TABLE.runner,
                moneyReward: 5,
                typeLabel: '02. Zombi Corredor',
                animPrefix: 'z02',
                fallbackPrefix: 'zfast'
            },
            resistant: {
                code: '03',
                width: 48,
                height: 108,
                visualHeight: 120,
                maxHealth: 135,
                speed: 58,
                chaseSpeed: 108,
                damage: 20,
                attackRange: 58,
                attackCooldownTime: 1.15,
                aggroRange: 400,
                scoreReward: ZOMBIE_POINT_TABLE.resistant,
                moneyReward: 10,
                typeLabel: '03. Zombi Resistente',
                animPrefix: 'z03',
                fallbackPrefix: 'znormal'
            },
            spitter: {
                code: '04',
                width: 46,
                height: 104,
                visualHeight: 120,
                maxHealth: 115,
                speed: 68,
                chaseSpeed: 112,
                damage: 20,
                attackRange: 56,
                attackCooldownTime: 1.15,
                aggroRange: 510,
                scoreReward: ZOMBIE_POINT_TABLE.spitter,
                moneyReward: 15,
                typeLabel: '04. Zombi Vomitador',
                animPrefix: 'z04',
                fallbackPrefix: 'zfast'
            },
            bomber: {
                code: '05',
                width: 52,
                height: 110,
                visualHeight: 120,
                maxHealth: 105,
                speed: 62,
                chaseSpeed: 126,
                damage: 34,
                attackRange: 62,
                attackCooldownTime: 1.30,
                aggroRange: 430,
                scoreReward: ZOMBIE_POINT_TABLE.bomber,
                moneyReward: 25,
                typeLabel: '05. Zombi Bombero',
                animPrefix: 'z05',
                fallbackPrefix: 'zspecial'
            },
            armored: {
                code: '06',
                width: 50,
                height: 110,
                visualHeight: 120,
                maxHealth: 205,
                speed: 54,
                chaseSpeed: 98,
                damage: 24,
                attackRange: 58,
                attackCooldownTime: 1.22,
                aggroRange: 420,
                scoreReward: ZOMBIE_POINT_TABLE.armored,
                moneyReward: 30,
                typeLabel: '06. Zombi Blindado',
                animPrefix: 'z06',
                fallbackPrefix: 'znormal'
            },
            leaper: {
                code: '07',
                width: 46,
                height: 104,
                visualHeight: 120,
                maxHealth: 185,
                speed: 96,
                chaseSpeed: 182,
                damage: 28,
                attackRange: 60,
                attackCooldownTime: 0.92,
                aggroRange: 490,
                scoreReward: ZOMBIE_POINT_TABLE.leaper,
                moneyReward: 35,
                typeLabel: '07. Zombi Saltador',
                animPrefix: 'z07',
                fallbackPrefix: 'zfast'
            },
            brute: {
                code: '08',
                width: 58,
                height: 120,
                visualHeight: 120,
                maxHealth: 320,
                speed: 50,
                chaseSpeed: 94,
                damage: 34,
                attackRange: 68,
                attackCooldownTime: 1.38,
                aggroRange: 440,
                scoreReward: ZOMBIE_POINT_TABLE.brute,
                moneyReward: 45,
                typeLabel: '08. Bruto Mutante',
                animPrefix: 'z08',
                fallbackPrefix: 'zspecial'
            }
        };

        const preset = presets[canonical] || presets.walker;
        super({ ...preset, ...config });

        // Forzar siempre el puntaje oficial exacto de la tabla salvo override explícito de test
        if (config.scoreReward === undefined) {
            this.scoreReward = preset.scoreReward;
        }

        this.variant = canonical;
        this.speciesCode = preset.code;
        this.animPrefix = preset.animPrefix;
        this.fallbackPrefix = preset.fallbackPrefix;
        this.visualHeight = config.visualHeight || preset.visualHeight || 116;
        this.shambleCadence = canonical !== 'runner' && canonical !== 'leaper';
        this.spriteAtlas = config.spriteAtlas || null;

        this.isBomber = canonical === 'bomber';
        this.isArmored = canonical === 'armored';
        this.isLeaper = canonical === 'leaper';
        this.isBrute = canonical === 'brute';

        // Estado específico del Zombi Bombero (Explosivo)
        this.priming = false;
        this.primeTimer = 0;
        this.primeDuration = 0.80;
        this.exploded = false;

        // Estado específico del Zombi Vomitador ('spitter')
        this.spitCooldown = 0.8 + Math.random() * 0.9;

        // Estado específico del Zombi Saltador ('leaper')
        this.leapCooldown = 1.2 + Math.random() * 0.8;
        this.leaping = false;
    }

    _updateAI(dt, player, combatCallbacks) {
        if (this.dead || !player || player.dead) {
            super._updateAI(dt, player, combatCallbacks);
            return;
        }

        const myCx = this.x + this.width * 0.5;
        const plCx = player.x + player.width * 0.5;
        const dx = plCx - myCx;
        const absDx = Math.abs(dx);
        const dy = (player.y + player.height * 0.5) - (this.y + this.height * 0.45);

        // 04. Zombi Vomitador: disparo parabólico de ácido
        if (this.variant === 'spitter') {
            this.spitCooldown = Math.max(0, this.spitCooldown - dt);
            if (absDx >= 135 && absDx <= 470 && Math.abs(dy) < 175 && this.spitCooldown <= 0) {
                this.facing = dx >= 0 ? 1 : -1;
                this.vx = this.knockbackVx * 0.35;
                this.attackAnimTimer = 0.36;
                this.spitCooldown = 2.05;

                const speedX = 340;
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

        // 05. Zombi Bombero: sobrecarga explosiva de corto alcance
        if (this.isBomber) {
            if (!this.priming && ((absDx <= 96 && Math.abs(dy) < 95) || this.health <= this.maxHealth * 0.30)) {
                this.priming = true;
                this.primeTimer = 0;
            }
            if (this.priming) {
                this.facing = dx >= 0 ? 1 : -1;
                this.vx = this.facing * 36 + this.knockbackVx * 0.4;
                this.primeTimer += dt;
                if (this.primeTimer >= this.primeDuration) {
                    this.dead = true;
                    this.deathTimer = 0;
                    this.exploded = true;
                    if (!this.rewardClaimed) {
                        this.rewardClaimed = true;
                    }
                    combatCallbacks?.onToxicExplosion?.(this, player);
                }
                return;
            }
        }

        // 07. Zombi Saltador: salto depredador parabólico hacia el jugador
        if (this.isLeaper) {
            this.leapCooldown = Math.max(0, this.leapCooldown - dt);
            if (this.onGround) {
                if (this.leaping) {
                    this.leaping = false;
                }
                if (absDx >= 135 && absDx <= 315 && Math.abs(dy) < 150 && this.leapCooldown <= 0) {
                    this.facing = dx >= 0 ? 1 : -1;
                    this.vx = this.facing * 380;
                    this.vy = -475;
                    this.onGround = false;
                    this.leaping = true;
                    this.leapCooldown = 2.35;
                    return;
                }
            } else if (this.leaping) {
                this.vx = this.facing * 355;
                if (absDx <= this.attackRange + 10 && Math.abs(dy) < 64 && this.attackCooldown <= 0) {
                    this.attackCooldown = this.attackCooldownTime;
                    this.attackAnimTimer = 0.30;
                    combatCallbacks?.onEnemyMeleeHit?.(this, player, this.damage);
                }
                return;
            }
        }

        super._updateAI(dt, player, combatCallbacks);
    }

    takeDamage(amount, knockbackVx = 0) {
        let effectiveKb = knockbackVx;
        if (this.isArmored) effectiveKb *= 0.35;
        else if (this.isBrute) effectiveKb *= 0.22;
        else if (this.variant === 'resistant') effectiveKb *= 0.6;

        const died = super.takeDamage(amount, effectiveKb);
        if (died && this.isBomber) {
            this.exploded = true;
        }
        return died;
    }

    render(ctx, cameraX, cameraY) {
        const cx = Math.round(this.x + this.width * 0.5 - cameraX);
        const bottomY = Math.round(this.y + this.height - cameraY);
        const fade = this.dead ? Math.max(0, 1 - Math.max(0, this.deathTimer - 0.38) / 0.42) : 1;

        // Sombra de contacto de doble capa directamente bajo los pies
        const shadowRx = this.isBrute ? 38 : 29;
        ctx.save();
        ctx.globalAlpha = fade * 0.38;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(cx, bottomY, this.dead ? shadowRx + 14 : shadowRx, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = fade * 0.68;
        ctx.beginPath();
        ctx.ellipse(cx, bottomY, this.dead ? shadowRx + 3 : shadowRx - 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Anillo de advertencia térmica/tóxica cuando el Zombi Bombero va a detonar
        if (this.isBomber && this.priming && !this.dead) {
            const pRatio = Math.min(1, this.primeTimer / this.primeDuration);
            ctx.save();
            ctx.strokeStyle = `rgba(255, 145, 48, ${(0.40 + pRatio * 0.55).toFixed(2)})`;
            ctx.fillStyle = `rgba(255, 90, 28, ${(0.10 + pRatio * 0.16).toFixed(2)})`;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(cx, bottomY, 126 * (0.45 + pRatio * 0.55), 24, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        if (this.spriteAtlas && this.spriteAtlas.isReady()) {
            const hasExt = this.spriteAtlas.getFrameCount(`${this.animPrefix}_walk`) > 0 &&
                Boolean(this.spriteAtlas.getExtImage() || this.spriteAtlas.getWalkerImage() || this.spriteAtlas.getFemaleImage());
            let animKey = 'znormal_walk';
            let frameIdx = 0;
            let loop = true;
            let targetHeight = this.visualHeight;

            if (hasExt) {
                if (this.dead) {
                    animKey = `${this.animPrefix}_dead`;
                    const count = Math.max(1, this.spriteAtlas.getFrameCount(animKey));
                    frameIdx = Math.min(count - 1, Math.floor((this.deathTimer / 0.56) * count));
                    loop = false;
                    if (this.isBomber) targetHeight = this.visualHeight * 1.15;
                } else if (this.isBomber && this.priming) {
                    animKey = 'z05_attack';
                    const count = Math.max(1, this.spriteAtlas.getFrameCount(animKey));
                    frameIdx = Math.min(count - 1, Math.floor((this.primeTimer / this.primeDuration) * count));
                    loop = false;
                    targetHeight = this.visualHeight * 1.06;
                } else if (this.isLeaper && !this.onGround) {
                    animKey = 'z07_leap';
                    const count = Math.max(1, this.spriteAtlas.getFrameCount(animKey));
                    frameIdx = this.vy < -120 ? 1 : (this.vy < 80 ? 2 : Math.min(count - 1, 3));
                    loop = false;
                } else if (this.attackAnimTimer > 0) {
                    animKey = `${this.animPrefix}_attack`;
                    const count = Math.max(1, this.spriteAtlas.getFrameCount(animKey));
                    const p = 1 - Math.max(0, this.attackAnimTimer / 0.32);
                    frameIdx = Math.min(count - 1, Math.floor(p * count));
                    loop = false;
                } else {
                    const idleKey = `${this.animPrefix}_idle`;
                    if (Math.abs(this.vx) > 4) {
                        animKey = `${this.animPrefix}_walk`;
                        frameIdx = Math.floor(this.stridePhase);
                    } else if (this.spriteAtlas.getFrameCount(idleKey) > 0) {
                        animKey = idleKey;
                        frameIdx = Math.floor(this.animTime * 5);
                    } else {
                        animKey = `${this.animPrefix}_walk`;
                        frameIdx = 0;
                    }
                }
            } else {
                // Fallback al primer atlas si el extendido aún no ha cargado
                if (this.fallbackPrefix === 'zspecial') {
                    animKey = this.dead ? 'zspecial_explode' : ((this.priming || this.attackAnimTimer > 0) ? 'zspecial_prepare' : 'zspecial_walk');
                } else if (this.fallbackPrefix === 'zfast') {
                    animKey = this.dead ? 'zfast_dead' : (this.attackAnimTimer > 0 ? 'zfast_attack' : 'zfast_run');
                } else {
                    animKey = this.dead ? 'znormal_dead' : (this.attackAnimTimer > 0 ? 'znormal_attack' : 'znormal_walk');
                }
                const count = Math.max(1, this.spriteAtlas.getFrameCount(animKey));
                frameIdx = this.dead
                    ? Math.min(count - 1, Math.floor((this.deathTimer / 0.55) * count))
                    : Math.floor(this.stridePhase);
                loop = !this.dead && this.attackAnimTimer <= 0;
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
                flashColor: this.isArmored
                    ? 'rgba(180, 225, 255, 0.65)'
                    : (this.isBomber ? 'rgba(255, 165, 60, 0.6)' : 'rgba(255, 255, 255, 0.58)')
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
        ctx.fillStyle = this.isBomber ? '#705832' : '#58645a';
        ctx.fillRect(-14, -64, 28, 64);
        ctx.restore();
    }
}
