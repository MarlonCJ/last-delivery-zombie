/**
 * Boss.js
 * Jefe Final del Nivel 01: "MUTANTE DE LABORATORIO (SECTOR B-3)".
 * Renderizado con SpriteAtlas (boss_walk, boss_attack, boss_charge, boss_dead),
 * cilindro mutagénico luminiscente, ataques sísmicos y embestida de alta velocidad.
 */

import { Enemy } from './Enemy.js';

export class Boss extends Enemy {
    constructor({ x, y, arenaMinX, arenaMaxX, audio, spriteAtlas = null, variant = 1 }) {
        const isTier2 = variant === 2;
        super({
            x,
            y,
            width: isTier2 ? 106 : 94,
            height: isTier2 ? 172 : 156,
            maxHealth: isTier2 ? 1150 : 760,
            speed: isTier2 ? 98 : 86,
            chaseSpeed: isTier2 ? 132 : 116,
            damage: isTier2 ? 28 : 24,
            attackRange: isTier2 ? 106 : 96,
            attackCooldownTime: isTier2 ? 1.18 : 1.32,
            aggroRange: 1200,
            patrolMinX: arenaMinX,
            patrolMaxX: arenaMaxX,
            scoreReward: isTier2 ? 2400 : 1200,
            moneyReward: isTier2 ? 280 : 150,
            typeLabel: isTier2 ? 'PACIENTE CERO — ABERRACIÓN BIO-ÁCIDA' : 'MUTANTE DE LABORATORIO B-3'
        });

        this.isBoss = true;
        this.variant = variant;
        this.visualHeight = isTier2 ? 208 : 186;
        this.audio = audio;
        this.spriteAtlas = spriteAtlas;
        this.arenaMinX = arenaMinX;
        this.arenaMaxX = arenaMaxX;

        // Máquina de estados de combate del Boss
        this.state = 'intro_roar';
        this.stateTimer = 1.1;
        this.specialTimer = isTier2 ? 2.6 : 3.1;
        this.nextSpecial = isTier2 ? 'acid_barrage' : 'charge';

        this.audio?.playBossRoar();
    }

    _updateAI(dt, player, combatCallbacks) {
        if (!player || player.dead) {
            this.vx = 0;
            return;
        }

        if (this.x < this.arenaMinX) this.x = this.arenaMinX;
        if (this.x + this.width > this.arenaMaxX) this.x = this.arenaMaxX - this.width;

        const myCenterX = this.x + this.width * 0.5;
        const playerCenterX = player.x + player.width * 0.5;
        const dx = playerCenterX - myCenterX;
        const absDx = Math.abs(dx);

        const enraged = this.health < this.maxHealth * 0.45;
        const speedMult = enraged ? 1.25 : 1.0;

        switch (this.state) {
            case 'intro_roar': {
                this.vx = 0;
                this.facing = dx >= 0 ? 1 : -1;
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = 'chase';
                }
                break;
            }

            case 'chase': {
                this.facing = dx >= 0 ? 1 : -1;
                this.specialTimer -= dt * speedMult;

                if (this.specialTimer <= 0 && this.onGround) {
                    if (this.nextSpecial === 'acid_barrage' && this.variant === 2) {
                        this.state = 'acid_barrage';
                        this.stateTimer = 0.55;
                        this.nextSpecial = 'charge';
                        this.audio?.playBossRoar();

                        // Lluvia parabólica de 3 esferas corrosivas
                        const angles = [-190, -295, -395];
                        const speeds = [270, 360, 445];
                        for (let i = 0; i < 3; i++) {
                            combatCallbacks?.onSpawnProjectile?.({
                                x: myCenterX + this.facing * 28,
                                y: this.y + 28,
                                vx: this.facing * speeds[i],
                                vy: angles[i],
                                gravity: 490,
                                width: 18,
                                height: 18,
                                damage: 22,
                                maxDistance: 960,
                                owner: 'enemy',
                                color: '#4aff78'
                            });
                        }
                    } else if (this.nextSpecial === 'charge') {
                        this.state = 'charge_windup';
                        this.stateTimer = enraged ? 0.52 : 0.72;
                        this.nextSpecial = 'slam';
                        this.audio?.playBossRoar();
                    } else {
                        this.state = 'slam_windup';
                        this.stateTimer = enraged ? 0.52 : 0.70;
                        this.vy = -515;
                        this.onGround = false;
                        this.nextSpecial = this.variant === 2 ? 'acid_barrage' : 'charge';
                    }
                    break;
                }

                if (absDx <= this.attackRange && Math.abs((player.y + player.height) - (this.y + this.height)) < 118) {
                    this.vx = this.knockbackVx * 0.25;
                    if (this.attackCooldown <= 0) {
                        this.attackCooldown = this.attackCooldownTime / speedMult;
                        this.attackAnimTimer = 0.38;
                        combatCallbacks?.onEnemyMeleeHit?.(this, player, this.damage);
                    }
                } else {
                    this.vx = this.facing * this.chaseSpeed * speedMult + this.knockbackVx * 0.25;
                }
                break;
            }

            case 'charge_windup': {
                this.vx = 0;
                this.facing = dx >= 0 ? 1 : -1;
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = 'charge';
                    this.stateTimer = 0.86;
                }
                break;
            }

            case 'charge': {
                this.vx = this.facing * (enraged ? 450 : 385);
                this.stateTimer -= dt;

                if (absDx < 74 && Math.abs((player.y + player.height) - (this.y + this.height)) < 88) {
                    combatCallbacks?.onEnemyMeleeHit?.(this, player, this.damage + 8);
                }

                if (
                    this.stateTimer <= 0 ||
                    this.x <= this.arenaMinX + 4 ||
                    this.x + this.width >= this.arenaMaxX - 4
                ) {
                    this.vx = 0;
                    this.state = 'chase';
                    this.specialTimer = enraged ? 2.3 : 3.3;
                }
                break;
            }

            case 'slam_windup': {
                this.vx = this.facing * 98;
                this.stateTimer -= dt;
                if (this.onGround && this.stateTimer <= 0.35) {
                    this.vx = 0;
                    this.state = 'slam_recover';
                    this.stateTimer = 0.68;
                    this.audio?.playBossSlam();
                    combatCallbacks?.onBossSlam?.(this);
                }
                break;
            }

            case 'slam_recover': {
                this.vx = 0;
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = 'chase';
                    this.specialTimer = enraged ? 2.1 : 2.9;
                }
                break;
            }

            case 'acid_barrage': {
                this.vx = 0;
                this.facing = dx >= 0 ? 1 : -1;
                this.stateTimer -= dt;
                if (this.stateTimer <= 0) {
                    this.state = 'chase';
                    this.specialTimer = enraged ? 2.0 : 2.7;
                }
                break;
            }

            default:
                this.state = 'chase';
                break;
        }
    }

    takeDamage(amount, knockbackVx = 0) {
        return super.takeDamage(amount, knockbackVx * 0.18);
    }

    render(ctx, cameraX, cameraY, renderer = null) {
        const cx = Math.round(this.x + this.width * 0.5 - cameraX);
        const bottomY = Math.round(this.y + this.height - cameraY);
        const fade = this.dead ? Math.max(0, 1 - Math.max(0, this.deathTimer - 0.35) / 0.40) : 1;

        // Sombra colosal de contacto pesado
        ctx.save();
        ctx.globalAlpha = fade * 0.42;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(cx, bottomY, 64, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = fade * 0.72;
        ctx.beginPath();
        ctx.ellipse(cx, bottomY, 44, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Resplandor dorsal y corona bio-ácida diferenciada para Paciente Cero (Nivel 02)
        if (!this.dead && renderer) {
            renderer.drawRadialGlow(
                cx - this.facing * 22,
                bottomY - (this.variant === 2 ? 112 : 98),
                8,
                this.variant === 2 ? 120 : 88,
                this.variant === 2 ? 'rgba(65, 255, 115, 0.36)' : 'rgba(80, 255, 95, 0.24)'
            );
            if (this.state === 'charge_windup' || this.state === 'charge' || this.state === 'slam_windup' || this.state === 'acid_barrage') {
                renderer.drawRadialGlow(
                    cx,
                    bottomY - 88,
                    12,
                    140,
                    this.variant === 2 ? 'rgba(80, 255, 130, 0.34)' : 'rgba(255, 42, 58, 0.28)'
                );
            }
        }

        if (this.variant === 2 && !this.dead) {
            ctx.save();
            ctx.strokeStyle = 'rgba(82, 255, 128, 0.72)';
            ctx.lineWidth = 3;
            for (let t = 0; t < 3; t++) {
                const sway = Math.sin(this.animTime * 6 + t * 1.4) * 10;
                ctx.beginPath();
                ctx.moveTo(cx - this.facing * 18, bottomY - 118 + t * 14);
                ctx.quadraticCurveTo(cx - this.facing * 52, bottomY - 148 + sway, cx - this.facing * 34 + sway, bottomY - 172 + t * 10);
                ctx.stroke();
            }
            ctx.restore();
        }

        if (this.spriteAtlas && this.spriteAtlas.isReady()) {
            let animKey = 'boss_walk';
            let frameIdx = 0;
            let loop = true;
            let targetHeight = this.visualHeight;

            if (this.dead) {
                animKey = 'boss_dead';
                frameIdx = Math.min(2, Math.floor((this.deathTimer / 0.55) * 3));
                loop = false;
            } else if (this.state === 'charge_windup') {
                animKey = 'boss_charge';
                frameIdx = 0;
                loop = false;
            } else if (this.state === 'charge') {
                animKey = 'boss_charge';
                frameIdx = Math.floor(this.animTime * 14) % 2;
            } else if (this.state === 'slam_windup' || this.state === 'acid_barrage') {
                animKey = 'boss_attack';
                frameIdx = 1;
                loop = false;
            } else if (this.state === 'slam_recover') {
                animKey = 'boss_attack';
                frameIdx = 3;
                loop = false;
            } else if (this.state === 'intro_roar') {
                animKey = 'boss_attack';
                frameIdx = Math.floor(this.animTime * 6) % 2;
            } else if (this.attackAnimTimer > 0) {
                animKey = 'boss_attack';
                const p = 1 - Math.max(0, this.attackAnimTimer / 0.38);
                frameIdx = Math.min(3, Math.floor(p * 4));
                loop = false;
            } else {
                animKey = 'boss_walk';
                frameIdx = Math.abs(this.vx) > 8 ? Math.floor(this.stridePhase) : 0;
            }

            const squashX = 1 + this.landSquash * 0.08;
            const squashY = 1 - this.landSquash * 0.10;
            const stepWeightY = (!this.dead && this.onGround && Math.abs(this.vx) > 8)
                ? -Math.abs(Math.sin(this.stridePhase * Math.PI * 0.5)) * 2.4
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
                flashColor: 'rgba(255, 255, 255, 0.58)'
            });
        } else {
            ctx.save();
            ctx.globalAlpha = fade;
            ctx.fillStyle = '#5e2c35';
            ctx.fillRect(cx - 34, bottomY - 116, 68, 116);
            ctx.restore();
        }
    }
}
