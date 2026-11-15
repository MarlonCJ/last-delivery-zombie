/**
 * Enemy.js
 * Clase base reutilizable para todos los enemigos terrestres (zombis, mutantes y monstruos).
 * Gestiona patrulla, persecución, colisiones con el entorno, ataques, daño recibido y recompensas.
 */

import { Physics2D } from '../core/Physics2D.js';
import { CollisionSystem } from '../core/CollisionSystem.js';

export class Enemy {
    constructor({
        x,
        y,
        width = 38,
        height = 70,
        maxHealth = 65,
        speed = 72,
        chaseSpeed = 95,
        damage = 14,
        attackRange = 42,
        attackCooldownTime = 1.15,
        aggroRange = 360,
        patrolMinX = x - 140,
        patrolMaxX = x + 140,
        scoreReward = 100,
        moneyReward = 0,
        typeLabel = 'Zombi'
    }) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.vx = 0;
        this.vy = 0;
        this.knockbackVx = 0;
        this.facing = -1;
        this.onGround = false;
        this.fallGravityMult = 1.62;
        this.stridePhase = Math.random() * 5;
        this.landSquash = 0;
        this.shambleCadence = true;

        this.maxHealth = maxHealth;
        this.health = maxHealth;
        this.speed = speed;
        this.chaseSpeed = chaseSpeed;
        this.damage = damage;
        this.attackRange = attackRange;
        this.attackCooldownTime = attackCooldownTime;
        this.attackCooldown = 0;
        this.attackAnimTimer = 0;

        this.aggroRange = aggroRange;
        this.patrolMinX = patrolMinX;
        this.patrolMaxX = patrolMaxX;
        this.patrolDir = -1;

        this.scoreReward = scoreReward;
        this.moneyReward = moneyReward;
        this.typeLabel = typeLabel;

        this.hitFlashTimer = 0;
        this.dead = false;
        this.deathTimer = 0;
        this.removable = false;
        this.rewardClaimed = false;
        this.animTime = Math.random() * 5;
    }

    update(dt, player, platforms, worldWidth, combatCallbacks) {
        this.animTime += dt;

        if (this.dead) {
            this.deathTimer += dt;
            this.vx = 0;
            Physics2D.applyGravity(this, dt);
            this._moveAndCollide(dt, platforms, worldWidth);
            if (this.deathTimer >= 0.75) {
                this.removable = true;
            }
            return;
        }

        if (this.hitFlashTimer > 0) this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
        if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        if (this.attackAnimTimer > 0) this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
        if (this.landSquash > 0) this.landSquash = Math.max(0, this.landSquash - dt * 7.0);

        this.knockbackVx = Physics2D.approach(this.knockbackVx, 0, 1380 * dt);

        this._updateAI(dt, player, combatCallbacks);

        const wasOnGround = this.onGround;
        const preImpactVy = this.vy;
        Physics2D.applyGravity(this, dt);
        this._moveAndCollide(dt, platforms, worldWidth);

        if (!wasOnGround && this.onGround && preImpactVy > 180) {
            this.landSquash = Math.min(0.9, preImpactVy / 700);
        }

        // Sincronizar fase de pasos con desplazamiento real en el suelo (elimina efecto de flotación/frote)
        if (this.onGround && Math.abs(this.vx) > 4) {
            const stepFactor = this.isBoss ? 0.032 : (this.shambleCadence ? 0.048 : 0.052);
            this.stridePhase += Math.abs(this.vx) * dt * stepFactor;
        }
    }

    _getGaitMultiplier() {
        if (!this.shambleCadence || this.isBoss) return 1.0;
        return 0.78 + 0.34 * Math.abs(Math.sin(this.animTime * 3.8));
    }

    _updateAI(dt, player, combatCallbacks) {
        if (!player || player.dead) {
            this._patrol();
            return;
        }

        const myCenterX = this.x + this.width * 0.5;
        const playerCenterX = player.x + player.width * 0.5;
        const dx = playerCenterX - myCenterX;
        const dy = Math.abs((player.y + player.height * 0.5) - (this.y + this.height * 0.5));
        const absDx = Math.abs(dx);

        if (absDx <= this.aggroRange && dy < 175) {
            this.facing = dx >= 0 ? 1 : -1;

            if (absDx <= this.attackRange && dy < 92) {
                this.vx = this.knockbackVx;
                if (this.attackCooldown <= 0) {
                    this._performAttack(player, combatCallbacks);
                }
            } else {
                this.vx = this.facing * this.chaseSpeed * this._getGaitMultiplier() + this.knockbackVx;
            }
        } else {
            this._patrol();
        }
    }

    _patrol() {
        if (this.x <= this.patrolMinX) {
            this.patrolDir = 1;
        } else if (this.x + this.width >= this.patrolMaxX) {
            this.patrolDir = -1;
        }
        this.facing = this.patrolDir;
        this.vx = this.patrolDir * this.speed * this._getGaitMultiplier() + this.knockbackVx;
    }

    _performAttack(player, combatCallbacks) {
        this.attackCooldown = this.attackCooldownTime;
        this.attackAnimTimer = 0.26;
        combatCallbacks?.onEnemyMeleeHit?.(this, player, this.damage);
    }

    _moveAndCollide(dt, platforms, worldWidth) {
        this.x += this.vx * dt;
        if (this.x < 16) {
            this.x = 16;
            this.patrolDir = 1;
        } else if (this.x + this.width > worldWidth - 16) {
            this.x = worldWidth - 16 - this.width;
            this.patrolDir = -1;
        }

        for (const plat of platforms) {
            if (plat.oneWay) continue;
            if (CollisionSystem.intersectsAABB(this, plat)) {
                if (this.vx > 0) {
                    this.x = plat.x - this.width;
                    this.patrolDir = -1;
                } else if (this.vx < 0) {
                    this.x = plat.x + plat.width;
                    this.patrolDir = 1;
                }
                this.vx = 0;
            }
        }

        const prevBottom = this.y + this.height;
        this.y += this.vy * dt;
        this.onGround = false;

        for (const plat of platforms) {
            if (!CollisionSystem.intersectsAABB(this, plat)) continue;
            if (plat.oneWay) {
                if (this.vy >= 0 && prevBottom <= plat.y + 12) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    this.onGround = true;
                }
                continue;
            }
            if (this.vy > 0 && prevBottom <= plat.y + 18) {
                this.y = plat.y - this.height;
                this.vy = 0;
                this.onGround = true;
            } else if (this.vy < 0) {
                this.y = plat.y + plat.height;
                this.vy = 0;
            }
        }
    }

    takeDamage(amount, knockbackVx = 0) {
        if (this.dead) return false;
        this.health = Math.max(0, this.health - Math.max(1, Math.round(amount)));
        this.hitFlashTimer = 0.14;
        this.knockbackVx = knockbackVx;

        // Ampliar rango de alerta si recibe disparos desde lejos
        this.aggroRange = Math.max(this.aggroRange, 680);

        if (this.health <= 0) {
            this.dead = true;
            this.deathTimer = 0;
            return true; // Murió con este impacto
        }
        return false;
    }

    renderHealthBar(ctx, cx, topY) {
        if (this.dead || this.health >= this.maxHealth) return;
        const barW = 40;
        const ratio = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = 'rgba(6, 9, 14, 0.85)';
        ctx.fillRect(cx - barW * 0.5, topY - 12, barW, 5);
        ctx.fillStyle = '#e62432';
        ctx.fillRect(cx - barW * 0.5 + 1, topY - 11, Math.round((barW - 2) * ratio), 3);
    }
}
