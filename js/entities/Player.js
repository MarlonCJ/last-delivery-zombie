/**
 * Player.js
 * Entidad controlable del protagonista (Domiciliario).
 * Implementa física 2D con peso real, escalada de escaleras (player_climb_back),
 * agacharse/cubrirse (player_crouch), rodar/esquivar (player_roll), empujar cajas móviles
 * (player_push), rebote contra obstáculos (player_recoil), aturdimiento por golpe fuerte
 * (player_stun), sprites de disparo por arma específica, reaparición en Checkpoints
 * y mochila táctica limitada estrictamente a 3 armas preasignadas.
 */

import { Physics2D } from '../core/Physics2D.js';
import { CollisionSystem } from '../core/CollisionSystem.js';

export class Player {
    constructor({ x, y, inventory, audio, spriteAtlas = null }) {
        this.x = x;
        this.y = y;
        this.width = 44;
        this.height = 108;
        this.visualHeight = 120;

        this.vx = 0;
        this.vy = 0;
        this.facing = 1; // 1 = derecha, -1 = izquierda

        this.walkSpeed = 230;
        this.runSpeed = 345;
        this.crouchSpeed = 98;
        this.pushSpeed = 122;
        this.climbSpeed = 195;
        this.accel = 3100;
        this.decel = 4200;
        this.airAccel = 1850;
        this.airDecel = 950;
        this.jumpForce = -730;
        this.fallGravityMult = 1.52;

        this.onGround = false;
        this.climbing = false;
        this.crouching = false;
        this.pushing = false;
        this.rolling = false;
        this.rollTimer = 0;
        this.rollCooldown = 0;
        this.recoilTimer = 0;
        this.stunTimer = 0;
        this.pushSoundTimer = 0;

        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;

        this.inventory = inventory;
        this.audio = audio;
        this.spriteAtlas = spriteAtlas;

        this.maxHealth = 100 + this.inventory.getMaxHealthBonus();
        this.health = this.maxHealth;
        this.dead = false;

        // Estado del paquete de misión
        this.hasPackage = false;
        this.packageDelivered = false;

        // Temporizadores de combate y daño
        this.attackCooldown = 0;
        this.attackAnimTimer = 0;
        this.attackAnimDuration = 0.24;
        this.lastAttackType = 'melee';
        this.muzzleFlashTimer = 0;
        this.hurtAnimTimer = 0;
        this.invulnerableTimer = 0;

        // Sistema de animación por estado, zancada sincronizada a velocidad y peso físico
        this.animState = 'idle';
        this.animTime = 0;
        this.stridePhase = 0;
        this.landSquash = 0;
        this.deathCollapse = 0;
    }

    /**
     * Reaparece al jugador en el último Checkpoint tras perder 1 vida.
     */
    respawnAt(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.dead = false;
        this.deathCollapse = 0;
        this.maxHealth = 100 + this.inventory.getMaxHealthBonus();
        this.health = this.maxHealth;
        this.invulnerableTimer = 2.6;
        this.climbing = false;
        this.crouching = false;
        this.pushing = false;
        this.rolling = false;
        this.rollTimer = 0;
        this.recoilTimer = 0;
        this.stunTimer = 0;
        this.hurtAnimTimer = 0;
        this.attackAnimTimer = 0;
        this.animState = 'idle';
    }

    /**
     * Caja de impacto efectiva del jugador (se reduce al agacharse o rodar).
     */
    getHurtbox() {
        if (this.rolling || this.crouching) {
            return {
                x: this.x + 2,
                y: this.y + 36,
                width: this.width - 4,
                height: this.height - 36
            };
        }
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    getExpressionKey() {
        if (this.dead || this.health <= 0) return 'face_dead';
        if (this.hurtAnimTimer > 0.04 || this.stunTimer > 0) return 'face_surprised';
        if (this.attackAnimTimer > 0 || this.rolling) return 'face_focused';
        const ratio = this.health / Math.max(1, this.maxHealth);
        if (ratio <= 0.30) return 'face_tired';
        if (ratio <= 0.62) return 'face_hurt';
        return 'face_normal';
    }

    update(dt, input, platforms, worldWidth, combatCallbacks, ladders = [], movableCrates = []) {
        this.animTime += dt;

        if (this.dead) {
            this.animState = 'dead';
            this.climbing = false;
            this.crouching = false;
            this.rolling = false;
            this.pushing = false;
            this.deathCollapse = Math.min(1, this.deathCollapse + dt * 2.2);
            this.vx = Physics2D.approach(this.vx, 0, this.decel * dt);
            Physics2D.applyGravity(this, dt);
            this._moveAndCollide(dt, platforms, worldWidth, false, movableCrates, combatCallbacks);
            return;
        }

        // Actualizar temporizadores
        if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        if (this.attackAnimTimer > 0) this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
        if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - dt);
        if (this.hurtAnimTimer > 0) this.hurtAnimTimer = Math.max(0, this.hurtAnimTimer - dt);
        if (this.invulnerableTimer > 0) this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
        if (this.rollCooldown > 0) this.rollCooldown = Math.max(0, this.rollCooldown - dt);
        if (this.recoilTimer > 0) this.recoilTimer = Math.max(0, this.recoilTimer - dt);
        if (this.stunTimer > 0) this.stunTimer = Math.max(0, this.stunTimer - dt);
        if (this.pushSoundTimer > 0) this.pushSoundTimer = Math.max(0, this.pushSoundTimer - dt);
        if (this.landSquash > 0) this.landSquash = Math.max(0, this.landSquash - dt * 7.2);

        if (this.rolling) {
            this.rollTimer -= dt;
            if (this.rollTimer <= 0) {
                this.rolling = false;
                this.rollTimer = 0;
            }
        }

        // Actualizar recarga activa en el inventario
        this.inventory.update(dt);

        // Cambio rápido de arma (solo entre las 3 armas de la mochila: Teclas 1-3 o Q)
        this._handleWeaponHotkeys(input);

        // Curación rápida con tecla H
        if (input.isKeyJustPressed('KeyH')) {
            this.tryUseMedkit(combatCallbacks);
        }

        // Entradas direccionales
        let moveDir = 0;
        if (input.isActionDown('moveLeft')) moveDir -= 1;
        if (input.isActionDown('moveRight')) moveDir += 1;

        const upHeld = input.isKeyDown('KeyW') || input.isKeyDown('ArrowUp');
        const downHeld = input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown');
        const wantsRoll = input.isKeyJustPressed('KeyC') || input.isKeyJustPressed('ControlLeft');

        // Detección de escaleras verticales
        let activeLadder = null;
        for (const lad of ladders) {
            const expanded = { x: lad.x - 8, y: lad.y - 12, width: lad.width + 16, height: lad.height + 20 };
            if (CollisionSystem.intersectsAABB(this, expanded)) {
                activeLadder = lad;
                break;
            }
        }

        if (activeLadder && (upHeld || downHeld) && !this.rolling) {
            this.climbing = true;
            this.crouching = false;
        } else if (!activeLadder) {
            this.climbing = false;
        }

        // Esquivar / Rodar (Tecla C o Ctrl Izquierdo)
        if (wantsRoll && this.onGround && !this.climbing && !this.rolling && this.rollCooldown <= 0) {
            this.rolling = true;
            this.rollTimer = 0.36;
            this.rollCooldown = 0.80;
            this.crouching = false;
            this.invulnerableTimer = Math.max(this.invulnerableTimer, 0.34);
            if (moveDir !== 0) this.facing = moveDir;
            this.vx = this.facing * 425;
            this.audio?.playRoll?.();
        }

        // Agacharse / Cubrirse (S o Flecha Abajo en suelo firme fuera de escaleras)
        this.crouching = Boolean(!this.climbing && !this.rolling && this.onGround && downHeld);

        const isSprinting = !this.crouching && !this.rolling && (input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight'));
        const targetTopSpeed = this.crouching
            ? this.crouchSpeed
            : (isSprinting ? this.runSpeed : this.walkSpeed);

        const activeAccel = this.onGround
            ? ((moveDir !== 0 && Math.sign(this.vx) !== 0 && Math.sign(this.vx) !== moveDir) ? 4600 : this.accel)
            : this.airAccel;
        const activeDecel = this.onGround ? this.decel : this.airDecel;

        if (this.rolling) {
            this.vx = this.facing * 410;
        } else if (moveDir !== 0) {
            this.facing = moveDir;
            this.vx = Physics2D.approach(this.vx, moveDir * targetTopSpeed, activeAccel * dt);
        } else if (this.hurtAnimTimer <= 0) {
            this.vx = Physics2D.approach(this.vx, 0, activeDecel * dt);
        }

        if (this.climbing && activeLadder) {
            let climbDir = 0;
            if (upHeld) climbDir -= 1;
            if (downHeld) climbDir += 1;
            this.vy = climbDir * this.climbSpeed;
            this.vx *= 0.78;

            if (climbDir < 0 && (this.y + this.height) <= activeLadder.y + 4) {
                this.y = activeLadder.y - this.height;
                this.vy = 0;
                this.climbing = false;
                this.onGround = true;
            } else if (input.isKeyJustPressed('Space')) {
                this.climbing = false;
                this.vy = this.jumpForce * 0.92;
                this.audio?.playJump?.();
            }
        } else {
            if (this.onGround) {
                this.coyoteTimer = 0.11;
            } else {
                this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
            }

            if (input.isActionJustPressed('jump')) {
                this.jumpBufferTimer = 0.11;
            } else {
                this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
            }

            if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0 && !this.rolling) {
                this.vy = this.jumpForce;
                this.onGround = false;
                this.crouching = false;
                this.coyoteTimer = 0;
                this.jumpBufferTimer = 0;
                this.landSquash = -0.09;
                this.audio?.playJump?.();
            }

            if (!input.isActionDown('jump') && this.vy < -260) {
                this.vy *= 0.62;
            }

            Physics2D.applyGravity(this, dt);
        }

        // Recarga manual (R)
        if (input.isActionJustPressed('reload')) {
            if (this.inventory.startReload()) {
                this.audio?.playReload?.();
            }
        }

        // Ataque / Disparo (F o clic en el lienzo)
        const equipped = this.inventory.getEquippedWeapon();
        const autoFireAllowed = equipped.fireRate >= 4.2;
        const wantsAttack = autoFireAllowed
            ? (input.isActionDown('attack') || input.pointer.down)
            : (input.isActionJustPressed('attack') || input.pointer.justPressed);

        if (wantsAttack && this.attackCooldown <= 0 && !this.rolling) {
            this._performAttack(combatCallbacks);
        }

        // Resolver colisiones con plataformas, vehículos y cajas empujables
        const wasOnGround = this.onGround;
        const preImpactVy = this.vy;
        const dropThroughOneWay = this.climbing && downHeld;
        this._moveAndCollide(dt, platforms, worldWidth, dropThroughOneWay, movableCrates, combatCallbacks, moveDir);

        if (!wasOnGround && this.onGround && preImpactVy > 190) {
            this.landSquash = Math.min(1, preImpactVy / 720);
            combatCallbacks?.onLandImpact?.(this.x + this.width * 0.5, this.y + this.height, this.landSquash);
        } else if (this.landSquash < 0) {
            this.landSquash = Math.min(0, this.landSquash + dt * 6.5);
        }

        // Sincronizar fase de zancada/escalada/empuje
        if (this.climbing) {
            this.stridePhase += Math.abs(this.vy) * dt * 0.062;
        } else if (this.pushing) {
            this.stridePhase += Math.abs(this.vx || 95) * dt * 0.065;
        } else if (this.onGround && Math.abs(this.vx) > 8) {
            const cadence = isSprinting ? 0.044 : 0.047;
            this.stridePhase += Math.abs(this.vx) * dt * cadence;
        } else if (this.onGround) {
            this.stridePhase = 0;
        }

        if (this.onGround && !upHeld && !downHeld) {
            this.climbing = false;
        }

        this._updateAnimationState(isSprinting);
    }

    _handleWeaponHotkeys(input) {
        const carried = this.inventory.getLoadout();
        const digitKeys = ['Digit1', 'Digit2', 'Digit3'];
        digitKeys.forEach((code, idx) => {
            if (input.isKeyJustPressed(code) && carried[idx]) {
                if (this.inventory.getEquippedWeapon().id !== carried[idx].id) {
                    this.inventory.equipWeapon(carried[idx].id);
                    this.audio?.playClick?.();
                }
            }
        });

        if (input.isKeyJustPressed('KeyQ')) {
            this.inventory.cycleWeapon(1);
            this.audio?.playClick?.();
        }
    }

    tryUseMedkit(combatCallbacks) {
        if (this.dead || this.health >= this.maxHealth) return false;
        if (!this.inventory.useMedkit()) {
            this.audio?.playError?.();
            return false;
        }
        const healed = Math.min(55, this.maxHealth - this.health);
        this.health += healed;
        this.audio?.playHeal?.();
        combatCallbacks?.onFloatingText?.(this.x + 10, this.y - 12, `+${healed} SALUD`, '#47ff8c');
        return true;
    }

    _performAttack(combatCallbacks) {
        const weapon = this.inventory.getEquippedWeapon();
        if (this.inventory.reloading) return;

        if (weapon.type === 'melee') {
            this.attackCooldown = 1 / weapon.fireRate;
            this.attackAnimDuration = 0.28;
            this.attackAnimTimer = this.attackAnimDuration;
            this.lastAttackType = 'melee';
            this.audio?.playMelee?.(weapon.id);

            const dmg = this.inventory.getEffectiveDamage(weapon.id);
            const hitBox = {
                x: this.facing > 0 ? this.x + this.width - 6 : this.x - weapon.range + 6,
                y: this.y + 4,
                width: weapon.range,
                height: this.height - 10
            };
            combatCallbacks?.onPlayerMelee?.(hitBox, dmg, this.facing * 275);
            return;
        }

        if (!this.inventory.consumeShot()) {
            if (this.inventory.startReload()) {
                this.audio?.playReload?.();
            } else {
                this.audio?.playEmptyClip?.();
                this.attackCooldown = 0.25;
                combatCallbacks?.onFloatingText?.(this.x, this.y - 14, 'SIN MUNICIÓN [CAMBIA ARMA]', '#ff9f43');
            }
            return;
        }

        this.attackCooldown = 1 / weapon.fireRate;
        this.attackAnimDuration = 0.22;
        this.attackAnimTimer = this.attackAnimDuration;
        this.lastAttackType = 'ranged';
        this.muzzleFlashTimer = 0.085;
        this.audio?.playShoot?.(weapon.id);

        const dmg = this.inventory.getEffectiveDamage(weapon.id);
        const muzzleX = this.facing > 0 ? this.x + this.width + 14 : this.x - 22;
        const muzzleY = this.y + (this.crouching ? 62 : 40);

        combatCallbacks?.onPlayerMuzzleShot?.(muzzleX, muzzleY, this.facing, weapon.id);

        const pellets = weapon.pellets || 1;
        for (let i = 0; i < pellets; i++) {
            const angleOffset = (Math.random() - 0.5) * (weapon.spread || 0);
            const vx = Math.cos(angleOffset) * weapon.projectileSpeed * this.facing;
            const vy = Math.sin(angleOffset) * weapon.projectileSpeed;
            combatCallbacks?.onSpawnProjectile?.({
                x: muzzleX,
                y: muzzleY + (i - (pellets - 1) * 0.5) * 2,
                vx,
                vy,
                damage: dmg,
                maxDistance: weapon.range,
                owner: 'player',
                color: weapon.isFlame ? '#ff7b24' : '#ffe07d',
                width: weapon.isFlame ? 18 : 14,
                height: weapon.isFlame ? 12 : 4,
                knockback: weapon.id === 'shotgun_combat' ? 245 : (weapon.id === 'revolver_magnum' ? 210 : 140)
            });
        }

        if (this.inventory.getMagazineAmmo(weapon.id) === 0 && this.inventory.getReserveAmmo(weapon.id) > 0) {
            this.inventory.startReload();
            this.audio?.playReload?.();
        }
    }

    _moveAndCollide(dt, platforms, worldWidth, dropThroughOneWay = false, movableCrates = [], combatCallbacks = null, moveDir = 0) {
        this.pushing = false;
        const preVx = this.vx;

        // 1. Eje horizontal
        this.x += this.vx * dt;
        if (this.x < 16) {
            this.x = 16;
            this.vx = 0;
        } else if (this.x + this.width > worldWidth - 16) {
            this.x = worldWidth - 16 - this.width;
            this.vx = 0;
        }

        // Colisión contra plataformas sólidas (muros / barreras fijas)
        for (const plat of platforms) {
            if (plat.oneWay) continue;
            if (CollisionSystem.intersectsAABB(this, plat)) {
                if (Math.abs(preVx) > 255 && this.onGround && !this.rolling) {
                    this.recoilTimer = 0.22;
                }
                if (this.vx > 0) {
                    this.x = plat.x - this.width;
                } else if (this.vx < 0) {
                    this.x = plat.x + plat.width;
                }
                this.vx = 0;
            }
        }

        // Empuje horizontal de cajas móviles (movableCrates)
        for (const crate of movableCrates) {
            if (crate.destroyed) continue;
            if (!CollisionSystem.intersectsAABB(this, crate)) continue;

            // Solo empujar lateralmente si los pies del jugador están por debajo de la tapa superior de la caja
            if (this.y + this.height > crate.y + 12) {
                const dir = preVx > 0 ? 1 : (preVx < 0 ? -1 : moveDir);
                if (dir !== 0 && this.onGround && !this.rolling) {
                    const pushStep = dir * this.pushSpeed * dt;
                    const candidateX = Math.max(20, Math.min(worldWidth - 20 - crate.width, crate.x + pushStep));
                    const testRect = { x: candidateX, y: crate.y, width: crate.width, height: crate.height - 4 };

                    let blocked = false;
                    for (const plat of platforms) {
                        if (plat.oneWay) continue;
                        if (CollisionSystem.intersectsAABB(testRect, plat)) {
                            blocked = true;
                            break;
                        }
                    }
                    if (!blocked) {
                        for (const other of movableCrates) {
                            if (other === crate || other.destroyed) continue;
                            if (CollisionSystem.intersectsAABB(testRect, other)) {
                                blocked = true;
                                break;
                            }
                        }
                    }

                    if (!blocked && Math.abs(candidateX - crate.x) > 0.01) {
                        crate.x = candidateX;
                        this.pushing = true;
                        this.vx = dir * this.pushSpeed;
                        this.x = dir > 0 ? (crate.x - this.width) : (crate.x + crate.width);
                        if (this.pushSoundTimer <= 0) {
                            this.pushSoundTimer = 0.28;
                            this.audio?.playCratePush?.();
                        }
                    } else {
                        this.x = dir > 0 ? (crate.x - this.width) : (crate.x + crate.width);
                        this.vx = 0;
                    }
                } else {
                    if (preVx >= 0) this.x = crate.x - this.width;
                    else this.x = crate.x + crate.width;
                    this.vx = 0;
                }
            }
        }

        // Aplicar gravedad y soporte vertical a las cajas móviles
        for (const crate of movableCrates) {
            if (crate.destroyed) continue;
            crate.vy = (crate.vy || 0) + 1650 * dt;
            const prevCrateBottom = crate.y + crate.height;
            crate.y += crate.vy * dt;
            for (const plat of platforms) {
                if (!CollisionSystem.intersectsAABB(crate, plat)) continue;
                if (crate.vy >= 0 && prevCrateBottom <= plat.y + 22) {
                    crate.y = plat.y - crate.height;
                    crate.vy = 0;
                }
            }
        }

        // 2. Eje vertical del jugador
        const prevBottom = this.y + this.height;
        this.y += this.vy * dt;
        this.onGround = false;

        for (const plat of platforms) {
            if (!CollisionSystem.intersectsAABB(this, plat)) continue;

            if (plat.oneWay) {
                if (dropThroughOneWay) continue;
                if (this.vy >= 0 && prevBottom <= plat.y + 14) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    this.onGround = true;
                }
                continue;
            }

            if (this.vy > 0 && prevBottom <= plat.y + 20) {
                this.y = plat.y - this.height;
                this.vy = 0;
                this.onGround = true;
            } else if (this.vy < 0) {
                this.y = plat.y + plat.height;
                this.vy = 0;
            }
        }

        // Permitir subirse encima de las cajas móviles
        for (const crate of movableCrates) {
            if (crate.destroyed) continue;
            if (!CollisionSystem.intersectsAABB(this, crate)) continue;
            if (this.vy >= 0 && prevBottom <= crate.y + 18) {
                this.y = crate.y - this.height;
                this.vy = 0;
                this.onGround = true;
            }
        }
    }

    _updateAnimationState(isSprinting) {
        if (this.dead) {
            this.animState = 'dead';
            return;
        }
        if (this.stunTimer > 0) {
            this.animState = 'stun';
            return;
        }
        if (this.hurtAnimTimer > 0) {
            this.animState = 'hurt';
            return;
        }
        if (this.rolling) {
            this.animState = 'roll';
            return;
        }
        if (this.attackAnimTimer > 0) {
            this.animState = 'attack';
            return;
        }
        if (this.climbing) {
            this.animState = 'climb';
            return;
        }
        if (!this.onGround) {
            this.animState = this.vy < 0 ? 'jump' : 'fall';
            return;
        }
        if (this.pushing) {
            this.animState = 'push';
            return;
        }
        if (this.recoilTimer > 0) {
            this.animState = 'recoil';
            return;
        }
        if (this.crouching) {
            this.animState = 'crouch';
            return;
        }
        const absVx = Math.abs(this.vx);
        if ((isSprinting && absVx > 165) || absVx > 265) {
            this.animState = 'run';
        } else if (absVx > 14) {
            this.animState = 'walk';
        } else {
            this.animState = 'idle';
        }
    }

    takeDamage(amount, sourceX = this.x) {
        if (this.dead || this.invulnerableTimer > 0) return false;

        const dmg = Math.max(1, Math.round(amount));
        this.health = Math.max(0, this.health - dmg);
        this.hurtAnimTimer = 0.30;
        if (dmg >= 24) {
            this.stunTimer = 0.34;
        }
        this.invulnerableTimer = 0.95;
        this.climbing = false;
        this.rolling = false;

        const pushDir = this.x + this.width * 0.5 >= sourceX ? 1 : -1;
        this.vx = pushDir * 235;
        this.vy = -205;
        this.audio?.playHurt?.();

        if (this.health <= 0) {
            this.dead = true;
            this.animState = 'dead';
            this.audio?.playGameOver?.();
        }
        return true;
    }

    renderFlashlight(renderer, cameraX, cameraY) {
        if (this.dead) return;
        const crouchOffset = this.crouching ? 18 : 0;
        const originX = (this.facing > 0 ? this.x + this.width + 8 : this.x - 8) - cameraX;
        const originY = this.y + 44 + crouchOffset - cameraY;
        const angle = this.facing > 0 ? 0.04 : Math.PI - 0.04;

        renderer.drawLightCone(
            originX,
            originY,
            angle,
            0.46,
            395,
            'rgba(255, 232, 160, 0.27)',
            'rgba(255, 215, 115, 0)'
        );
        renderer.drawRadialGlow(
            this.x + this.width * 0.5 - cameraX,
            this.y + this.height * 0.5 - cameraY,
            12,
            115,
            'rgba(255, 220, 150, 0.14)'
        );

        if (this.muzzleFlashTimer > 0) {
            renderer.drawRadialGlow(
                originX + this.facing * 24,
                originY - 2,
                6,
                135,
                'rgba(255, 210, 80, 0.52)'
            );
        }
    }

    render(ctx, cameraX, cameraY) {
        if (!this.dead && !this.rolling && this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 16) % 2 === 0) {
            return;
        }

        const cx = Math.round(this.x + this.width * 0.5 - cameraX);
        const bottomY = Math.round(this.y + this.height - cameraY);

        // Sombra de contacto de doble capa
        const airShrink = this.onGround ? 1.0 : 0.72;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
        ctx.beginPath();
        ctx.ellipse(cx, bottomY, (this.dead ? 52 : 31) * airShrink, 7.5 * airShrink, 0, 0, Math.PI * 2);
        ctx.fill();
        if (this.onGround || this.dead) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
            ctx.beginPath();
            ctx.ellipse(cx, bottomY, this.dead ? 38 : 20, 4.2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        if (this.spriteAtlas && this.spriteAtlas.isReady()) {
            const hasExt = Boolean(this.spriteAtlas.getExtImage());
            const equipped = this.inventory.getEquippedWeapon();

            // Si está atacando con un arma con sprite dedicado (Escopeta, SMG, Rifle, Revólver, Machete, Lanzallamas)
            if (this.animState === 'attack' && hasExt && equipped.playerHoldSprite && this.spriteAtlas.getSpriteMeta(equipped.playerHoldSprite)) {
                const sMeta = this.spriteAtlas.getSpriteMeta(equipped.playerHoldSprite);
                const scale = (this.visualHeight * 0.96) / Math.max(1, sMeta.h);
                const dw = sMeta.w * scale;
                const dh = sMeta.h * scale;
                const kickX = this.muzzleFlashTimer > 0 ? (-this.facing * 4) : 0;
                this.spriteAtlas.drawSprite(
                    ctx,
                    equipped.playerHoldSprite,
                    cx - dw * 0.44 + kickX,
                    bottomY - dh + 2,
                    dw,
                    dh,
                    { flipX: this.facing < 0, hitFlash: this.hurtAnimTimer > 0.16 }
                );
            } else {
                let animKey = 'player_idle';
                let frameIdx = 0;
                let loop = true;
                let targetH = this.visualHeight;

                switch (this.animState) {
                    case 'idle':
                        animKey = 'player_idle';
                        frameIdx = Math.floor(this.animTime * 4.4);
                        break;
                    case 'walk':
                        animKey = 'player_walk';
                        frameIdx = Math.floor(this.stridePhase);
                        break;
                    case 'run':
                        animKey = 'player_run';
                        frameIdx = Math.floor(this.stridePhase);
                        break;
                    case 'climb':
                        if (hasExt) {
                            animKey = 'player_climb_back';
                            frameIdx = Math.floor(this.stridePhase);
                            targetH = this.visualHeight * 1.04;
                        } else {
                            animKey = 'player_walk';
                            frameIdx = Math.floor(this.stridePhase);
                        }
                        break;
                    case 'crouch':
                        if (hasExt) {
                            animKey = 'player_crouch';
                            frameIdx = Math.abs(this.vx) > 10 ? (1 + (Math.floor(this.animTime * 6) % 2)) : 2;
                            loop = false;
                            targetH = this.visualHeight * 0.88;
                        } else {
                            animKey = 'player_idle';
                            targetH = this.visualHeight * 0.78;
                        }
                        break;
                    case 'roll': {
                        if (hasExt) {
                            animKey = 'player_roll';
                            const rProg = 1 - Math.max(0, this.rollTimer / 0.36);
                            frameIdx = Math.min(3, Math.floor(rProg * 4));
                            loop = false;
                            targetH = this.visualHeight * 0.88;
                        } else {
                            animKey = 'player_jump';
                            frameIdx = 2;
                            loop = false;
                        }
                        break;
                    }
                    case 'push':
                        if (hasExt) {
                            animKey = 'player_push';
                            frameIdx = Math.floor(this.stridePhase);
                            targetH = this.visualHeight * 0.96;
                        } else {
                            animKey = 'player_walk';
                            frameIdx = Math.floor(this.stridePhase);
                        }
                        break;
                    case 'recoil': {
                        if (hasExt) {
                            animKey = 'player_recoil';
                            const cProg = 1 - Math.max(0, this.recoilTimer / 0.22);
                            frameIdx = Math.min(3, Math.floor(cProg * 4));
                            loop = false;
                        } else {
                            animKey = 'player_hurt';
                            frameIdx = 0;
                            loop = false;
                        }
                        break;
                    }
                    case 'stun': {
                        if (hasExt) {
                            animKey = 'player_stun';
                            const sProg = 1 - Math.max(0, this.stunTimer / 0.34);
                            frameIdx = Math.min(2, Math.floor(sProg * 3));
                            loop = false;
                        } else {
                            animKey = 'player_hurt';
                            frameIdx = 2;
                            loop = false;
                        }
                        break;
                    }
                    case 'jump':
                        animKey = 'player_jump';
                        frameIdx = this.vy < -320 ? 1 : 2;
                        loop = false;
                        break;
                    case 'fall':
                        animKey = 'player_jump';
                        frameIdx = this.vy > 300 ? 4 : 3;
                        loop = false;
                        break;
                    case 'attack': {
                        const prog = 1 - Math.max(0, this.attackAnimTimer / Math.max(0.01, this.attackAnimDuration));
                        if (this.lastAttackType === 'melee') {
                            animKey = 'player_melee';
                            frameIdx = Math.min(5, Math.floor(prog * 6));
                        } else {
                            animKey = 'player_shoot';
                            frameIdx = Math.min(4, Math.floor(prog * 5));
                        }
                        loop = false;
                        break;
                    }
                    case 'hurt': {
                        animKey = 'player_hurt';
                        const hProg = 1 - Math.max(0, this.hurtAnimTimer / 0.30);
                        frameIdx = Math.min(3, Math.floor(hProg * 4));
                        loop = false;
                        break;
                    }
                    case 'dead':
                        animKey = 'player_dead';
                        frameIdx = Math.min(3, Math.floor(this.deathCollapse * 4));
                        loop = false;
                        break;
                    default:
                        break;
                }

                const squashAmt = this.landSquash;
                const squashX = 1 + squashAmt * 0.09;
                const squashY = 1 - squashAmt * 0.11;
                const stepBounceY = (this.onGround && (this.animState === 'walk' || this.animState === 'run'))
                    ? -Math.abs(Math.sin(this.stridePhase * Math.PI * 0.5)) * 1.8
                    : 0;

                this.spriteAtlas.drawFrame(ctx, animKey, frameIdx, cx, bottomY + 1, {
                    targetHeight: targetH,
                    squashX,
                    squashY,
                    offsetY: stepBounceY,
                    flipX: this.facing < 0,
                    loop,
                    hitFlash: this.hurtAnimTimer > 0.16
                });
            }

            if (this.hasPackage && !this.packageDelivered && !this.dead && this.animState !== 'climb' && this.animState !== 'roll') {
                const packOffsetX = this.facing > 0 ? -32 : 8;
                const crouchShift = this.crouching ? 22 : 0;
                this.spriteAtlas.drawSprite(
                    ctx,
                    'pickup_package',
                    cx + packOffsetX,
                    bottomY - 78 + crouchShift + Math.sin(this.animTime * 5) * 1.2,
                    26,
                    23
                );
            }
        } else {
            this._renderProceduralFallback(ctx, cx, bottomY);
        }

        if (this.inventory.reloading && !this.dead) {
            const prog = this.inventory.getReloadProgress();
            ctx.save();
            ctx.fillStyle = 'rgba(8, 12, 18, 0.88)';
            ctx.fillRect(cx - 23, bottomY - this.height - 18, 46, 6);
            ctx.fillStyle = '#f5a623';
            ctx.fillRect(cx - 22, bottomY - this.height - 17, Math.round(44 * prog), 4);
            ctx.restore();
        }
    }

    _renderProceduralFallback(ctx, cx, bottomY) {
        ctx.save();
        ctx.translate(cx, bottomY);
        ctx.scale(this.facing, 1);
        ctx.fillStyle = '#1e2c40';
        ctx.fillRect(-10, -28, 9, 28);
        ctx.fillRect(2, -28, 9, 28);
        ctx.fillStyle = '#df9b1b';
        ctx.fillRect(-18, -58, 10, 26);
        ctx.fillStyle = '#c82330';
        ctx.fillRect(-10, -60, 20, 32);
        ctx.fillStyle = '#dc9e76';
        ctx.beginPath();
        ctx.arc(1, -68, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
