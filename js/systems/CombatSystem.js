/**
 * CombatSystem.js
 * Orquestador modular de combate y efectos visuales HD (SpriteAtlas VFX):
 * - Tiras animadas VFX: vfx_car_explosion, vfx_crate_break, vfx_explosion,
 *   vfx_hit_surface, vfx_hit_blood, vfx_blood_pool, vfx_smoke, vfx_fire, vfx_zombie_gib.
 * - Sprites VFX puntuales: vfx_muzzle_flash, vfx_shell_casing (casquillos con física),
 *   vfx_sparks, vfx_toxic_cloud, vfx_blood_splat, vfx_electric_arc, vfx_water_splash.
 */

import { CollisionSystem } from '../core/CollisionSystem.js';
import { Projectile } from '../entities/Projectile.js';

export class CombatSystem {
    constructor({ audio, economy, camera, spriteAtlas = null, onEnemyKilled, onCrateBroken }) {
        this.audio = audio;
        this.economy = economy;
        this.camera = camera;
        this.spriteAtlas = spriteAtlas;
        this.onEnemyKilled = onEnemyKilled;
        this.onCrateBroken = onCrateBroken;

        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.shockwaves = [];
        this.vfxAnims = [];
        this.spriteParticles = [];
        this.groundDecals = [];
    }

    reset() {
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.shockwaves = [];
        this.vfxAnims = [];
        this.spriteParticles = [];
        this.groundDecals = [];
    }

    spawnProjectile(config) {
        this.projectiles.push(new Projectile(config));
    }

    spawnSpriteVfx(animKey, x, y, options = {}) {
        const frameCount = this.spriteAtlas ? Math.max(1, this.spriteAtlas.getFrameCount(animKey)) : 6;
        const fps = options.fps || 16;
        this.vfxAnims.push({
            animKey,
            x,
            y,
            fps,
            age: 0,
            duration: options.duration || (frameCount / fps),
            loop: Boolean(options.loop),
            targetHeight: options.targetHeight || 72,
            centerAligned: options.centerAligned !== false,
            flipX: Boolean(options.flipX),
            alpha: options.alpha ?? 1
        });
    }

    spawnMuzzleAndCasing(x, y, facing, weaponId = 'pistol_9mm') {
        // Fogón de cañón en sprite HD
        this.spriteParticles.push({
            spriteKey: weaponId === 'flamethrower_bio' ? 'vfx_sparks' : 'vfx_muzzle_flash',
            x: facing > 0 ? x - 4 : x - 42,
            y: y - 16,
            w: 46,
            h: 28,
            vx: facing * 35,
            vy: 0,
            gravity: 0,
            rotation: 0,
            rotSpeed: 0,
            flipX: facing < 0,
            life: 0.07,
            maxLife: 0.07
        });

        // Casquillo metálico eyectado con rotación y rebote en suelo
        if (weaponId !== 'flamethrower_bio') {
            this.spriteParticles.push({
                spriteKey: 'vfx_shell_casing',
                x: x - facing * 18,
                y: y - 6,
                w: 16,
                h: 9,
                vx: -facing * (85 + Math.random() * 75),
                vy: -(160 + Math.random() * 90),
                gravity: 780,
                floorY: y + 66,
                rotation: Math.random() * Math.PI,
                rotSpeed: (Math.random() > 0.5 ? 1 : -1) * 14,
                flipX: false,
                life: 0.72,
                maxLife: 0.72
            });
        }
    }

    spawnWaterSplash(x, groundY) {
        this.spriteParticles.push({
            spriteKey: 'vfx_water_splash',
            x: x - 26,
            y: groundY - 32,
            w: 52,
            h: 34,
            vx: 0,
            vy: 0,
            gravity: 0,
            rotation: 0,
            rotSpeed: 0,
            flipX: false,
            life: 0.22,
            maxLife: 0.22
        });
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
            this.camera?.shake(6, 0.14);
        }
    }

    handleEnemyMeleeHit(enemy, player, damage) {
        if (!player || player.dead) return;
        const damaged = player.takeDamage(damage, enemy.x + enemy.width * 0.5);
        if (damaged) {
            this.camera?.shake(9, 0.24);
            const px = player.x + player.width * 0.5;
            const py = player.y + 42;
            this.spawnSpriteVfx('vfx_hit_blood', px, py, { targetHeight: 58, fps: 18, centerAligned: true });
            this.spawnHitParticles(px, py, '#d91e2a', 10);
            this.spawnFloatingText(player.x + 6, player.y - 10, `-${damage}`, '#ff4d5a');
        }
    }

    handleToxicExplosion(zombie, player, enemies = []) {
        const cx = zombie.x + zombie.width * 0.5;
        const bottomY = zombie.y + zombie.height;
        const cy = zombie.y + zombie.height * 0.52;
        const blastRadius = 128;

        this.camera?.shake(14, 0.36);
        this.audio?.playExplosion?.();
        this.spawnShockwave(cx, cy, blastRadius, 'rgba(255, 140, 48, 0.92)');
        this.spawnSpriteVfx('vfx_explosion', cx, bottomY, { targetHeight: 124, fps: 16, centerAligned: false });
        this.spawnSpriteVfx('vfx_zombie_gib', cx, bottomY, { targetHeight: 88, fps: 15, centerAligned: false });
        this.spriteParticles.push({
            spriteKey: 'vfx_toxic_cloud',
            x: cx - 48,
            y: cy - 38,
            w: 96,
            h: 68,
            vx: 0,
            vy: -18,
            gravity: 0,
            rotation: 0,
            rotSpeed: 0,
            flipX: false,
            life: 0.75,
            maxLife: 0.75
        });
        this.spawnHitParticles(cx, cy, '#ff8c32', 18, 1.35);

        if (player && !player.dead) {
            const hurtbox = player.getHurtbox ? player.getHurtbox() : player;
            const px = hurtbox.x + hurtbox.width * 0.5;
            const py = hurtbox.y + hurtbox.height * 0.5;
            const dist = Math.hypot(px - cx, py - cy);
            if (dist <= blastRadius) {
                const dmg = zombie.damage || 34;
                if (player.takeDamage(dmg, cx)) {
                    this.spawnFloatingText(player.x, player.y - 14, `-${dmg} EXPLOSIÓN`, '#ff944d');
                }
            }
        }

        for (const other of enemies) {
            if (other === zombie || other.dead) continue;
            const ox = other.x + other.width * 0.5;
            const oy = other.y + other.height * 0.5;
            if (Math.hypot(ox - cx, oy - cy) <= blastRadius) {
                const kb = ox >= cx ? 250 : -250;
                this._applyDamageToEnemy(other, 70, kb, player, enemies);
            }
        }
    }

    _damageDestructible(prop, damage, player, enemies) {
        prop.hp -= damage;
        const cx = prop.x + prop.width * 0.5;
        const cy = prop.y + prop.height * 0.5;
        const bottomY = prop.y + prop.height;

        if (prop.kind === 'crate_wood') {
            this.spawnSpriteVfx('vfx_hit_surface', cx, cy, { targetHeight: 54, fps: 18, centerAligned: true });
            this.spawnHitParticles(cx, cy, '#b5834a', 5);
            this.audio?.playEnemyHit?.(false);
            if (prop.hp <= 0 && !prop.destroyed) {
                prop.destroyed = true;
                this.spawnSpriteVfx('vfx_crate_break', cx, bottomY, { targetHeight: 82, fps: 16, centerAligned: false });
                this.spawnHitParticles(cx, cy, '#c69255', 12, 1.15);
                this.onCrateBroken?.(prop, cx, cy);
            }
        } else if (prop.kind === 'barrel_red' || prop.kind === 'vehicle_wreck') {
            this.spriteParticles.push({
                spriteKey: 'vfx_sparks',
                x: cx - 22,
                y: cy - 18,
                w: 44,
                h: 36,
                vx: 0,
                vy: -12,
                gravity: 0,
                rotation: 0,
                rotSpeed: 0,
                flipX: false,
                life: 0.16,
                maxLife: 0.16
            });
            this.audio?.playEnemyHit?.(true);
            if (prop.hp <= 0 && !prop.destroyed) {
                prop.destroyed = true;
                this._detonateBarrel(prop, player, enemies);
            }
        }
    }

    _detonateBarrel(barrel, player, enemies) {
        const cx = barrel.x + barrel.width * 0.5;
        const cy = barrel.y + barrel.height * 0.5;
        const bottomY = barrel.y + barrel.height;
        const isVehicle = barrel.kind === 'vehicle_wreck';
        const radius = isVehicle ? 225 : 180;

        this.camera?.shake(isVehicle ? 18 : 15, 0.42);
        this.audio?.playExplosion?.();
        this.spawnShockwave(cx, cy, radius, 'rgba(255, 120, 35, 0.92)');

        if (isVehicle) {
            this.spawnSpriteVfx('vfx_car_explosion', cx, bottomY, { targetHeight: 138, fps: 14, centerAligned: false });
        } else {
            this.spawnSpriteVfx('vfx_explosion', cx, bottomY, { targetHeight: 132, fps: 16, centerAligned: false });
        }
        this.spawnSpriteVfx('vfx_smoke', cx, bottomY - 12, { targetHeight: 96, fps: 12, centerAligned: false });
        this.spawnSpriteVfx('vfx_fire', cx, bottomY, { targetHeight: 74, fps: 12, duration: 2.2, loop: true, centerAligned: false });

        this.spawnHitParticles(cx, cy, '#ff5424', 20, 1.5);
        this.spawnFloatingText(cx - 38, barrel.y - 22, '💥 ¡EXPLOSIÓN!', '#ff9f1c');

        for (const enemy of enemies) {
            if (enemy.dead) continue;
            const ex = enemy.x + enemy.width * 0.5;
            const ey = enemy.y + enemy.height * 0.5;
            const dist = Math.hypot(ex - cx, ey - cy);
            if (dist <= radius) {
                const falloff = Math.max(0.45, 1 - dist / (radius * 1.25));
                const dmg = Math.round(210 * falloff);
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
        this.camera?.shake(15, 0.38);
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
        this.spawnSpriteVfx('vfx_smoke', centerX, boss.y + boss.height, { targetHeight: 84, fps: 15, centerAligned: false });

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
        this.spawnHitParticles(centerX, groundY + 14, '#7dff8a', 14);
    }

    _applyDamageToEnemy(enemy, damage, knockbackVx, player = null, enemies = []) {
        const died = enemy.takeDamage(damage, knockbackVx);
        const cx = enemy.x + enemy.width * 0.5;
        const cy = enemy.y + enemy.height * 0.44;
        const bottomY = enemy.y + enemy.height;

        if (enemy.isArmored) {
            this.spriteParticles.push({
                spriteKey: 'vfx_sparks',
                x: cx - 22,
                y: cy - 18,
                w: 44,
                h: 34,
                vx: 0,
                vy: -8,
                gravity: 0,
                rotation: 0,
                rotSpeed: 0,
                flipX: false,
                life: 0.14,
                maxLife: 0.14
            });
        } else {
            this.spawnSpriteVfx('vfx_hit_blood', cx, cy, {
                targetHeight: died ? 72 : 52,
                fps: 18,
                centerAligned: true,
                flipX: knockbackVx < 0
            });
        }

        const bloodColor = enemy.isBomber ? '#ff8c32' : '#b81422';
        this.spawnHitParticles(cx, cy, bloodColor, died ? 12 : 5);
        this.spawnFloatingText(cx - 8, enemy.y - 6, `-${damage}`, '#ffe066');

        if (died && !enemy.rewardClaimed) {
            enemy.rewardClaimed = true;
            this.audio?.playEnemyDeath?.();

            // Charco de sangre animado en el asfalto y desmembramiento por alto calibre
            this.groundDecals.push({
                animKey: 'vfx_blood_pool',
                x: cx,
                y: bottomY + 2,
                age: 0,
                life: 9.0,
                targetHeight: 28
            });
            if (this.groundDecals.length > 26) {
                this.groundDecals.shift();
            }

            if (damage >= 54 || Math.abs(knockbackVx) >= 220) {
                this.spawnSpriteVfx('vfx_zombie_gib', cx, bottomY, { targetHeight: 84, fps: 15, centerAligned: false });
            }

            if (enemy.scoreReward > 0) {
                this.economy.addScore(enemy.scoreReward);
                this.spawnFloatingText(cx - 18, enemy.y - 24, `+${enemy.scoreReward} PTS`, '#70e1ff');
            }
            if (enemy.moneyReward > 0) {
                this.economy.addMoney(enemy.moneyReward);
                this.spawnFloatingText(cx - 12, enemy.y - 42, `+$${enemy.moneyReward}`, '#47ff8c');
            }
            if (enemy.isBomber || enemy.variant === 'special') {
                this.handleToxicExplosion(enemy, player, enemies);
            }
            this.onEnemyKilled?.(enemy);
        } else if (!died) {
            this.audio?.playEnemyHit?.(Boolean(enemy.isArmored));
        }
    }

    update(dt, player, enemies, platforms, destructibles = [], movableCrates = []) {
        for (const proj of this.projectiles) {
            if (!proj.active) continue;
            proj.update(dt);

            for (const plat of platforms) {
                if (plat.oneWay || proj.owner === 'boss') continue;
                if (CollisionSystem.intersectsAABB(proj, plat)) {
                    proj.active = false;
                    if (proj.owner === 'enemy') {
                        this.spriteParticles.push({
                            spriteKey: 'vfx_toxic_cloud',
                            x: proj.x - 24,
                            y: proj.y - 20,
                            w: 48,
                            h: 36,
                            vx: 0,
                            vy: -12,
                            gravity: 0,
                            rotation: 0,
                            rotSpeed: 0,
                            flipX: false,
                            life: 0.35,
                            maxLife: 0.35
                        });
                    } else {
                        this.spawnSpriteVfx('vfx_hit_surface', proj.x, proj.y, { targetHeight: 46, fps: 20, centerAligned: true });
                    }
                    break;
                }
            }
            if (!proj.active) continue;

            // Las cajas móviles también bloquean proyectiles como cobertura táctica
            for (const mc of movableCrates) {
                if (mc.destroyed) continue;
                if (CollisionSystem.intersectsAABB(proj, mc)) {
                    proj.active = false;
                    this.spawnSpriteVfx('vfx_hit_surface', proj.x, proj.y, { targetHeight: 42, fps: 20, centerAligned: true });
                    break;
                }
            }
            if (!proj.active) continue;

            if (proj.owner === 'player') {
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
                const hurtbox = player.getHurtbox ? player.getHurtbox() : player;
                if (CollisionSystem.intersectsAABB(proj, hurtbox)) {
                    proj.active = false;
                    const hit = player.takeDamage(proj.damage, proj.x);
                    if (hit) {
                        this.camera?.shake(proj.owner === 'boss' ? 10 : 7, 0.22);
                        const pCol = proj.owner === 'enemy' ? '#58ff7a' : '#ff3344';
                        const tCol = proj.owner === 'enemy' ? '#7dff9b' : '#ff4d5a';
                        const label = proj.owner === 'enemy' ? `-${proj.damage} ÁCIDO` : `-${proj.damage}`;
                        this.spawnSpriteVfx('vfx_hit_blood', player.x + 22, player.y + 44, { targetHeight: 54, fps: 18, centerAligned: true });
                        this.spawnHitParticles(player.x + 20, player.y + 38, pCol, 10);
                        this.spawnFloatingText(player.x, player.y - 10, label, tCol);
                    }
                }
            }
        }

        this.projectiles = this.projectiles.filter(p => p.active);

        for (const sw of this.shockwaves) {
            sw.life -= dt;
            const prog = 1 - Math.max(0, sw.life / sw.maxLife);
            sw.radius = 12 + (sw.maxRadius - 12) * prog;
        }
        this.shockwaves = this.shockwaves.filter(sw => sw.life > 0);

        for (const part of this.particles) {
            part.x += part.vx * dt;
            part.y += part.vy * dt;
            part.vy += 580 * dt;
            part.life -= dt;
        }
        this.particles = this.particles.filter(p => p.life > 0);

        for (const sp of this.spriteParticles) {
            sp.x += sp.vx * dt;
            sp.y += sp.vy * dt;
            if (sp.gravity) {
                sp.vy += sp.gravity * dt;
                if (sp.floorY !== undefined && sp.y >= sp.floorY) {
                    sp.y = sp.floorY;
                    sp.vy = -Math.abs(sp.vy) * 0.35;
                    sp.vx *= 0.65;
                    sp.rotSpeed *= 0.5;
                }
            }
            sp.rotation += (sp.rotSpeed || 0) * dt;
            sp.life -= dt;
        }
        this.spriteParticles = this.spriteParticles.filter(sp => sp.life > 0);

        for (const fx of this.vfxAnims) {
            fx.age += dt;
        }
        this.vfxAnims = this.vfxAnims.filter(fx => fx.age < fx.duration);

        for (const dec of this.groundDecals) {
            dec.age += dt;
            dec.life -= dt;
        }
        this.groundDecals = this.groundDecals.filter(d => d.life > 0);

        for (const ft of this.floatingTexts) {
            ft.y += ft.vy * dt;
            ft.life -= dt;
        }
        this.floatingTexts = this.floatingTexts.filter(ft => ft.life > 0);
    }

    renderGroundDecals(ctx, cameraX, cameraY) {
        if (!this.spriteAtlas || !this.spriteAtlas.getExtImage()) return;
        for (const dec of this.groundDecals) {
            const sx = Math.round(dec.x - cameraX);
            if (sx < -90 || sx > 1370) continue;
            const frameIdx = Math.min(4, Math.floor(dec.age * 10));
            const alpha = Math.min(0.88, dec.life / 1.5);
            this.spriteAtlas.drawFrame(ctx, dec.animKey, frameIdx, sx, Math.round(dec.y - cameraY), {
                targetHeight: dec.targetHeight,
                loop: false,
                alpha
            });
        }
    }

    render(ctx, cameraX, cameraY) {
        const hasExt = Boolean(this.spriteAtlas && this.spriteAtlas.getExtImage());

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

        if (hasExt) {
            for (const sp of this.spriteParticles) {
                const alpha = Math.min(1, sp.life / Math.min(0.18, sp.maxLife));
                this.spriteAtlas.drawSprite(
                    ctx,
                    sp.spriteKey,
                    Math.round(sp.x - cameraX),
                    Math.round(sp.y - cameraY),
                    sp.w,
                    sp.h,
                    { flipX: sp.flipX, rotation: sp.rotation, alpha }
                );
            }

            for (const fx of this.vfxAnims) {
                const sx = Math.round(fx.x - cameraX);
                if (sx < -220 || sx > 1500) continue;
                const frameIdx = Math.floor(fx.age * fx.fps);
                const fadeOut = fx.loop ? Math.min(1, (fx.duration - fx.age) / 0.4) : 1;
                this.spriteAtlas.drawFrame(ctx, fx.animKey, frameIdx, sx, Math.round(fx.y - cameraY), {
                    targetHeight: fx.targetHeight,
                    centerAligned: fx.centerAligned,
                    flipX: fx.flipX,
                    loop: fx.loop,
                    alpha: fx.alpha * fadeOut
                });
            }
        }

        for (const part of this.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, part.life * 2.2));
            ctx.fillStyle = part.color;
            ctx.fillRect(Math.round(part.x - cameraX), Math.round(part.y - cameraY), part.size, part.size);
            ctx.restore();
        }

        for (const ft of this.floatingTexts) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
            ctx.font = 'bold 15px Consolas, monospace';
            ctx.fillStyle = '#05070b';
            ctx.fillText(ft.text, Math.round(ft.x - cameraX) + 1, Math.round(ft.y - cameraY) + 1);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, Math.round(ft.x - cameraX), Math.round(ft.y - cameraY));
            ctx.restore();
        }
    }
}
