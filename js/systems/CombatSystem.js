/**
 * CombatSystem.js
 * Orquestador modular de combate en tiempo real:
 * proyectiles, golpes cuerpo a cuerpo, ondas sísmicas del jefe, explosiones tóxicas,
 * barriles explosivos y cajas destructibles, partículas de impacto y recompensas.
 */

import { CollisionSystem } from '../core/CollisionSystem.js';
import { Projectile } from '../entities/Projectile.js';

export class CombatSystem {
    constructor({ audio, economy, camera, onEnemyKilled, onCrateBroken }) {
        this.audio = audio;
        this.economy = economy;
        this.camera = camera;
        this.onEnemyKilled = onEnemyKilled;
        this.onCrateBroken = onCrateBroken;

        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.shockwaves = [];
    }

    reset() {
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.shockwaves = [];
    }

    spawnProjectile(config) {
        this.projectiles.push(new Projectile(config));
    }

    spawnFloatingText(x, y, text, color = '#ffffff') {
        this.floatingTexts.push({
            x,
            y,
            text,
            color,
            vy: -44,
            life: 0.98,
            maxLife: 0.98
        });
    }

    spawnHitParticles(x, y, color = '#b51621', count = 8, speedMult = 1) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (45 + Math.random() * 175) * speedMult;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 65,
                size: 2.5 + Math.random() * 4,
                color,
                life: 0.36 + Math.random() * 0.28
            });
        }
    }

    spawnShockwave(x, y, maxRadius, color = 'rgba(110, 255, 110, 0.85)') {
        this.shockwaves.push({
            x,
            y,
            radius: 12,
            maxRadius,
            color,
            life: 0.34,
            maxLife: 0.34
        });
    }

    handlePlayerMelee(hitBox, damage, knockbackVx, enemies, destructibles = [], player = null) {
        let hitAny = false;
        for (const enemy of enemies) {
            if (enemy.dead) continue;
            if (CollisionSystem.intersectsAABB(hitBox, enemy)) {
                hitAny = true;
                this._applyDamageToEnemy(enemy, damage, knockbackVx, player, enemies);
            }
        }
        for (const prop of destructibles) {
            if (prop.destroyed) continue;
            if (CollisionSystem.intersectsAABB(hitBox, prop)) {
                hitAny = true;
                this._damageDestructible(prop, damage, player, enemies);
            }
        }
        if (hitAny) {
            this.camera?.shake(5, 0.12);
        }
    }

    handleEnemyMeleeHit(enemy, player, damage) {
        if (!player || player.dead) return;
        const damaged = player.takeDamage(damage, enemy.x + enemy.width * 0.5);
        if (damaged) {
            this.camera?.shake(9, 0.24);
            this.spawnHitParticles(player.x + player.width * 0.5, player.y + 32, '#d91e2a', 10);
            this.spawnFloatingText(player.x + 6, player.y - 10, `-${damage}`, '#ff4d5a');
        }
    }

    handleToxicExplosion(zombie, player, enemies = []) {
        const cx = zombie.x + zombie.width * 0.5;
        const cy = zombie.y + zombie.height * 0.52;
        const blastRadius = 118;

        this.camera?.shake(12, 0.32);
        this.audio?.playBossSlam?.();
        this.spawnShockwave(cx, cy, blastRadius, 'rgba(95, 255, 105, 0.9)');
        this.spawnHitParticles(cx, cy, '#64ff6e', 20, 1.35);
        this.spawnHitParticles(cx, cy, '#d4ff59', 10, 1.1);

        if (player && !player.dead) {
            const px = player.x + player.width * 0.5;
            const py = player.y + player.height * 0.5;
            const dist = Math.hypot(px - cx, py - cy);
            if (dist <= blastRadius) {
                const dmg = zombie.damage || 28;
                if (player.takeDamage(dmg, cx)) {
                    this.spawnFloatingText(player.x, player.y - 14, `-${dmg} TÓXICO`, '#7dff8a');
                }
            }
        }

        for (const other of enemies) {
            if (other === zombie || other.dead) continue;
            const ox = other.x + other.width * 0.5;
            const oy = other.y + other.height * 0.5;
            if (Math.hypot(ox - cx, oy - cy) <= blastRadius) {
                const kb = ox >= cx ? 240 : -240;
                this._applyDamageToEnemy(other, 65, kb, player, enemies);
            }
        }
    }

    _damageDestructible(prop, damage, player, enemies) {
        prop.hp -= damage;
        const cx = prop.x + prop.width * 0.5;
        const cy = prop.y + prop.height * 0.5;

        if (prop.kind === 'crate_wood') {
            this.spawnHitParticles(cx, cy, '#b5834a', 6);
            this.audio?.playEnemyHit?.();
            if (prop.hp <= 0 && !prop.destroyed) {
                prop.destroyed = true;
                this.spawnHitParticles(cx, cy, '#c69255', 14, 1.15);
                this.onCrateBroken?.(prop, cx, cy);
            }
        } else if (prop.kind === 'barrel_red') {
            this.spawnHitParticles(cx, cy, '#ff9f1c', 6);
            if (prop.hp <= 0 && !prop.destroyed) {
                prop.destroyed = true;
                this._detonateBarrel(prop, player, enemies);
            }
        }
    }

    _detonateBarrel(barrel, player, enemies) {
        const cx = barrel.x + barrel.width * 0.5;
        const cy = barrel.y + barrel.height * 0.5;
        const radius = 175;

        this.camera?.shake(15, 0.38);
        this.audio?.playBossSlam?.();
        this.spawnShockwave(cx, cy, radius, 'rgba(255, 120, 35, 0.92)');
        this.spawnHitParticles(cx, cy, '#ff5424', 22, 1.5);
        this.spawnHitParticles(cx, cy, '#ffd166', 14, 1.25);
        this.spawnFloatingText(cx - 38, barrel.y - 22, '💥 ¡EXPLOSIÓN!', '#ff9f1c');

        for (const enemy of enemies) {
            if (enemy.dead) continue;
            const ex = enemy.x + enemy.width * 0.5;
            const ey = enemy.y + enemy.height * 0.5;
            const dist = Math.hypot(ex - cx, ey - cy);
            if (dist <= radius) {
                const falloff = Math.max(0.45, 1 - dist / (radius * 1.25));
                const dmg = Math.round(195 * falloff);
                const kb = (ex >= cx ? 1 : -1) * 320;
                this._applyDamageToEnemy(enemy, dmg, kb, player, enemies);
            }
        }

        if (player && !player.dead) {
            const px = player.x + player.width * 0.5;
            const py = player.y + player.height * 0.5;
            if (Math.hypot(px - cx, py - cy) <= 95) {
                if (player.takeDamage(18, cx)) {
                    this.spawnFloatingText(player.x, player.y - 14, '-18 ONDA EXPANSIVA', '#ff6b4a');
                }
            }
        }
    }

    handleBossSlam(boss) {
        this.camera?.shake(14, 0.38);
        const groundY = boss.y + boss.height - 22;
        const centerX = boss.x + boss.width * 0.5;
        const isBioBoss = boss.variant === 2;
        const waveCol = isBioBoss ? '#46ff7a' : '#ff2b3d';

        this.spawnShockwave(
            centerX,
            groundY + 8,
            isBioBoss ? 155 : 125,
            isBioBoss ? 'rgba(72, 255, 122, 0.9)' : 'rgba(255, 58, 72, 0.85)'
        );

        [-1, 1].forEach(dir => {
            this.spawnProjectile({
                x: centerX + dir * 24,
                y: groundY,
                vx: dir * (isBioBoss ? 410 : 360),
                vy: 0,
                width: 30,
                height: 24,
                damage: isBioBoss ? 26 : 22,
                maxDistance: isBioBoss ? 680 : 560,
                owner: 'boss',
                color: waveCol
            });
        });
        this.spawnHitParticles(centerX, groundY + 14, '#7dff8a', 16);
    }

    _applyDamageToEnemy(enemy, damage, knockbackVx, player = null, enemies = []) {
        const died = enemy.takeDamage(damage, knockbackVx);
        const cx = enemy.x + enemy.width * 0.5;
        const cy = enemy.y + enemy.height * 0.42;

        const bloodColor = enemy.variant === 'special' ? '#64ff6e' : '#b81422';
        this.spawnHitParticles(cx, cy, bloodColor, died ? 14 : 6);
        this.spawnFloatingText(cx - 8, enemy.y - 6, `-${damage}`, '#ffe066');

        if (died && !enemy.rewardClaimed) {
            enemy.rewardClaimed = true;
            this.audio?.playEnemyDeath();

            if (enemy.scoreReward > 0) {
                this.economy.addScore(enemy.scoreReward);
            }
            if (enemy.moneyReward > 0) {
                this.economy.addMoney(enemy.moneyReward);
                this.spawnFloatingText(cx - 12, enemy.y - 26, `+$${enemy.moneyReward}`, '#47ff8c');
            }
            if (enemy.variant === 'special') {
                this.handleToxicExplosion(enemy, player, enemies);
            }
            this.onEnemyKilled?.(enemy);
        } else if (!died) {
            this.audio?.playEnemyHit();
        }
    }

    update(dt, player, enemies, platforms, destructibles = []) {
        // 1. Actualizar proyectiles y evaluar impactos
        for (const proj of this.projectiles) {
            if (!proj.active) continue;
            proj.update(dt);

            for (const plat of platforms) {
                if (plat.oneWay || proj.owner === 'boss') continue;
                if (CollisionSystem.intersectsAABB(proj, plat)) {
                    proj.active = false;
                    const sparkCol = proj.owner === 'enemy' ? '#58ff7a' : '#ffd166';
                    this.spawnHitParticles(proj.x, proj.y, sparkCol, proj.owner === 'enemy' ? 7 : 4);
                    break;
                }
            }
            if (!proj.active) continue;

            if (proj.owner === 'player') {
                // Impacto contra barriles explosivos y cajas destructibles
                for (const prop of destructibles) {
                    if (prop.destroyed) continue;
                    if (CollisionSystem.intersectsAABB(proj, prop)) {
                        this._damageDestructible(prop, proj.damage, player, enemies);
                        proj.active = false;
                        break;
                    }
                }
                if (!proj.active) continue;

                for (const enemy of enemies) {
                    if (enemy.dead || proj.hitTargets.has(enemy)) continue;
                    if (CollisionSystem.intersectsAABB(proj, enemy)) {
                        proj.hitTargets.add(enemy);
                        const kb = Math.sign(proj.vx) * proj.knockback;
                        this._applyDamageToEnemy(enemy, proj.damage, kb, player, enemies);
                        if (!proj.piercing) {
                            proj.active = false;
                            break;
                        }
                    }
                }
            } else if ((proj.owner === 'boss' || proj.owner === 'enemy') && player && !player.dead) {
                if (CollisionSystem.intersectsAABB(proj, player)) {
                    proj.active = false;
                    const hit = player.takeDamage(proj.damage, proj.x);
                    if (hit) {
                        this.camera?.shake(proj.owner === 'boss' ? 10 : 7, 0.22);
                        const pCol = proj.owner === 'enemy' ? '#58ff7a' : '#ff3344';
                        const tCol = proj.owner === 'enemy' ? '#7dff9b' : '#ff4d5a';
                        const label = proj.owner === 'enemy' ? `-${proj.damage} ÁCIDO` : `-${proj.damage}`;
                        this.spawnHitParticles(player.x + 20, player.y + 38, pCol, 10);
                        this.spawnFloatingText(player.x, player.y - 10, label, tCol);
                    }
                }
            }
        }

        this.projectiles = this.projectiles.filter(p => p.active);

        // 2. Actualizar ondas expansivas
        for (const sw of this.shockwaves) {
            sw.life -= dt;
            const prog = 1 - Math.max(0, sw.life / sw.maxLife);
            sw.radius = 12 + (sw.maxRadius - 12) * prog;
        }
        this.shockwaves = this.shockwaves.filter(sw => sw.life > 0);

        // 3. Actualizar partículas
        for (const part of this.particles) {
            part.x += part.vx * dt;
            part.y += part.vy * dt;
            part.vy += 580 * dt;
            part.life -= dt;
        }
        this.particles = this.particles.filter(p => p.life > 0);

        // 4. Actualizar textos flotantes
        for (const ft of this.floatingTexts) {
            ft.y += ft.vy * dt;
            ft.life -= dt;
        }
        this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
    }

    render(ctx, cameraX, cameraY) {
        for (const sw of this.shockwaves) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, sw.life / sw.maxLife);
            ctx.strokeStyle = sw.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(Math.round(sw.x - cameraX), Math.round(sw.y - cameraY), sw.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        for (const proj of this.projectiles) {
            proj.render(ctx, cameraX, cameraY);
        }

        ctx.save();
        for (const part of this.particles) {
            ctx.globalAlpha = Math.max(0, Math.min(1, part.life * 2.2));
            ctx.fillStyle = part.color;
            ctx.fillRect(
                Math.round(part.x - cameraX),
                Math.round(part.y - cameraY),
                part.size,
                part.size
            );
        }
        ctx.restore();

        ctx.save();
        ctx.font = 'bold 14px Consolas, "Courier New", monospace';
        for (const ft of this.floatingTexts) {
            ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
            ctx.fillStyle = '#05070c';
            ctx.fillText(ft.text, Math.round(ft.x - cameraX) + 1, Math.round(ft.y - cameraY) + 1);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, Math.round(ft.x - cameraX), Math.round(ft.y - cameraY));
        }
        ctx.restore();
    }
}
