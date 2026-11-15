/**
 * Player.js
 * Entidad controlable del protagonista (Domiciliario).
 * Implementa física 2D, escalada de escaleras verticales, colisiones AABB, salud,
 * inventario de armas, linterna dinámica, retratos reactivos de expresión facial
 * y 8 estados de animación con SpriteAtlas:
 * idle (quieto), walk (caminar), run (correr), jump (saltar),
 * fall (caer), attack (bate / disparo), hurt (recibir daño) y dead (morir).
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
        this.climbSpeed = 195;
        this.accel = 3100;
        this.decel = 4200;
        this.airAccel = 1850;
        this.airDecel = 950;
        this.jumpForce = -730;
        this.fallGravityMult = 1.52;

        this.onGround = false;
        this.climbing = false;
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

        // Sistema de animación por estado, zancada sincronizada a velocidad y peso físico al aterrizar
        this.animState = 'idle'; // 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'attack' | 'hurt' | 'dead'
        this.animTime = 0;
        this.stridePhase = 0;
        this.landSquash = 0;
        this.deathCollapse = 0;
    }

    /**
     * Devuelve la clave del retrato facial del protagonista según su estado vital y de acción.
     */
    getExpressionKey() {
        if (this.dead || this.health <= 0) return 'face_dead';
        if (this.hurtAnimTimer > 0.04) return 'face_surprised';
        if (this.attackAnimTimer > 0) return 'face_focused';
        const ratio = this.health / Math.max(1, this.maxHealth);
        if (ratio <= 0.30) return 'face_tired';
        if (ratio <= 0.62) return 'face_hurt';
        return 'face_normal';
    }

    update(dt, input, platforms, worldWidth, combatCallbacks, ladders = []) {
        this.animTime += dt;

        if (this.dead) {
            this.animState = 'dead';
            this.climbing = false;
            this.deathCollapse = Math.min(1, this.deathCollapse + dt * 2.2);
            this.vx = Physics2D.approach(this.vx, 0, this.decel * dt);
            Physics2D.applyGravity(this, dt);
            this._moveAndCollide(dt, platforms, worldWidth, false);
            return;
        }

        // Actualizar temporizadores
        if (this.attackCooldown > 0) this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        if (this.attackAnimTimer > 0) this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
        if (this.muzzleFlashTimer > 0) this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - dt);
        if (this.hurtAnimTimer > 0) this.hurtAnimTimer = Math.max(0, this.hurtAnimTimer - dt);
        if (this.invulnerableTimer > 0) this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
        if (this.landSquash > 0) this.landSquash = Math.max(0, this.landSquash - dt * 7.2);

        // Actualizar recarga activa en el inventario
        this.inventory.update(dt);

        // Cambio rápido de arma (Teclas 1-5 o Q)
        this._handleWeaponHotkeys(input);

        // Curación rápida con tecla H
        if (input.isKeyJustPressed('KeyH')) {
            this.tryUseMedkit(combatCallbacks);
        }

        // Movimiento horizontal con tracción firme en suelo e inercia controlada en aire
        let moveDir = 0;
        if (input.isActionDown('moveLeft')) moveDir -= 1;
        if (input.isActionDown('moveRight')) moveDir += 1;

        const isSprinting = input.isKeyDown('ShiftLeft') || input.isKeyDown('ShiftRight');
        const targetTopSpeed = isSprinting ? this.runSpeed : this.walkSpeed;
        const activeAccel = this.onGround
            ? ((moveDir !== 0 && Math.sign(this.vx) !== 0 && Math.sign(this.vx) !== moveDir) ? 4600 : this.accel)
            : this.airAccel;
        const activeDecel = this.onGround ? this.decel : this.airDecel;

        if (moveDir !== 0) {
            this.facing = moveDir;
            this.vx = Physics2D.approach(this.vx, moveDir * targetTopSpeed, activeAccel * dt);
        } else if (this.hurtAnimTimer <= 0) {
            this.vx = Physics2D.approach(this.vx, 0, activeDecel * dt);
        }

        // Detección de escaleras verticales (subir/bajar a tejados y andamios)
        const upHeld = input.isKeyDown('KeyW') || input.isKeyDown('ArrowUp');
        const downHeld = input.isKeyDown('KeyS') || input.isKeyDown('ArrowDown');
        let activeLadder = null;
        for (const lad of ladders) {
            const expanded = { x: lad.x - 8, y: lad.y - 12, width: lad.width + 16, height: lad.height + 20 };
            if (CollisionSystem.intersectsAABB(this, expanded)) {
                activeLadder = lad;
                break;
            }
        }

        if (activeLadder && (upHeld || downHeld)) {
            this.climbing = true;
        } else if (!activeLadder) {
            this.climbing = false;
        }

        if (this.climbing && activeLadder) {
            let climbDir = 0;
            if (upHeld) climbDir -= 1;
            if (downHeld) climbDir += 1;
            this.vy = climbDir * this.climbSpeed;
            this.vx *= 0.78;

            // Saltar con Espacio para soltarse de la escalera
            if (input.isKeyJustPressed('Space')) {
                this.climbing = false;
                this.vy = this.jumpForce * 0.92;
                this.audio.playJump();
            }
        } else {
            // Coyote time y buffer de salto
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

            if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
                this.vy = this.jumpForce;
                this.onGround = false;
                this.coyoteTimer = 0;
                this.jumpBufferTimer = 0;
                this.landSquash = -0.09; // Estiramiento atlético inicial al impulsar el salto
                this.audio.playJump();
            }

            // Corte de salto variable al soltar la tecla
            if (!input.isActionDown('jump') && this.vy < -260) {
                this.vy *= 0.62;
            }

            Physics2D.applyGravity(this, dt);
        }

        // Recarga manual (R)
        if (input.isActionJustPressed('reload')) {
            if (this.inventory.startReload()) {
                this.audio.playReload();
            }
        }

        // Ataque / Disparo (F o clic en el lienzo)
        const equipped = this.inventory.getEquippedWeapon();
        const autoFireAllowed = equipped.fireRate >= 4.2;
        const wantsAttack = autoFireAllowed
            ? (input.isActionDown('attack') || input.pointer.down)
            : (input.isActionJustPressed('attack') || input.pointer.justPressed);

        if (wantsAttack && this.attackCooldown <= 0) {
            this._performAttack(combatCallbacks);
        }

        // Resolver colisiones con plataformas/vehículos (registrando impacto físico al aterrizar)
        const wasOnGround = this.onGround;
        const preImpactVy = this.vy;
        const dropThroughOneWay = this.climbing && downHeld;
        this._moveAndCollide(dt, platforms, worldWidth, dropThroughOneWay);

        if (!wasOnGround && this.onGround && preImpactVy > 190) {
            this.landSquash = Math.min(1, preImpactVy / 720);
            combatCallbacks?.onLandImpact?.(this.x + this.width * 0.5, this.y + this.height, this.landSquash);
        } else if (this.landSquash < 0) {
            this.landSquash = Math.min(0, this.landSquash + dt * 6.5);
        }

        // Sincronizar fase de zancada con la distancia horizontal real recorrida (evita deslizamiento de pies)
        if (this.climbing) {
            this.stridePhase += Math.abs(this.vy) * dt * 0.055;
        } else if (this.onGround && Math.abs(this.vx) > 8) {
            const cadence = isSprinting ? 0.044 : 0.047;
            this.stridePhase += Math.abs(this.vx) * dt * cadence;
        } else if (this.onGround) {
            this.stridePhase = 0;
        }

        if (this.onGround && !upHeld && !downHeld) {
            this.climbing = false;
        }

        // Determinar estado de animación actual (8 estados)
        this._updateAnimationState(isSprinting);
    }

    _handleWeaponHotkeys(input) {
        const owned = this.inventory.getPurchasedWeapons();
        const digitKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
        digitKeys.forEach((code, idx) => {
            if (input.isKeyJustPressed(code) && owned[idx]) {
                if (this.inventory.getEquippedWeapon().id !== owned[idx].id) {
                    this.inventory.equipWeapon(owned[idx].id);
                    this.audio.playClick();
                }
            }
        });

        if (input.isKeyJustPressed('KeyQ')) {
            this.inventory.cycleWeapon(1);
            this.audio.playClick();
        }
    }

    tryUseMedkit(combatCallbacks) {
        if (this.dead || this.health >= this.maxHealth) return false;
        if (!this.inventory.useMedkit()) {
            this.audio.playError();
            return false;
        }
        const healed = Math.min(55, this.maxHealth - this.health);
        this.health += healed;
        this.audio.playHeal();
        if (combatCallbacks?.onFloatingText) {
            combatCallbacks.onFloatingText(this.x + 10, this.y - 12, `+${healed} SALUD`, '#47ff8c');
        }
        return true;
    }

    _performAttack(combatCallbacks) {
        const weapon = this.inventory.getEquippedWeapon();

        if (this.inventory.reloading) {
            return;
        }

        if (weapon.type === 'melee') {
            this.attackCooldown = 1 / weapon.fireRate;
            this.attackAnimDuration = 0.28;
            this.attackAnimTimer = this.attackAnimDuration;
            this.lastAttackType = 'melee';
            this.audio.playMelee();

            const dmg = this.inventory.getEffectiveDamage(weapon.id);
            const hitBox = {
                x: this.facing > 0 ? this.x + this.width - 6 : this.x - weapon.range + 6,
                y: this.y + 4,
                width: weapon.range,
                height: this.height - 10
            };
            combatCallbacks?.onPlayerMelee?.(hitBox, dmg, this.facing * 270);
            return;
        }

        // Arma de fuego
        if (!this.inventory.consumeShot()) {
            if (this.inventory.startReload()) {
                this.audio.playReload();
            } else {
                this.audio.playEmptyClip();
                this.attackCooldown = 0.25;
                combatCallbacks?.onFloatingText?.(this.x, this.y - 14, 'SIN MUNICIÓN [1: BATE]', '#ff9f43');
            }
            return;
        }

        this.attackCooldown = 1 / weapon.fireRate;
        this.attackAnimDuration = 0.22;
        this.attackAnimTimer = this.attackAnimDuration;
        this.lastAttackType = 'ranged';
        this.muzzleFlashTimer = 0.075;
        this.audio.playShoot(weapon.id);

        const dmg = this.inventory.getEffectiveDamage(weapon.id);
        const muzzleX = this.facing > 0 ? this.x + this.width + 14 : this.x - 22;
        const muzzleY = this.y + 40;

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
                knockback: weapon.id === 'shotgun_combat' ? 245 : 140
            });
        }

        if (this.inventory.getMagazineAmmo(weapon.id) === 0 && this.inventory.getReserveAmmo(weapon.id) > 0) {
            this.inventory.startReload();
            this.audio.playReload();
        }
    }

    _moveAndCollide(dt, platforms, worldWidth, dropThroughOneWay = false) {
        // 1. Eje horizontal
        this.x += this.vx * dt;
        if (this.x < 16) {
            this.x = 16;
            this.vx = 0;
        } else if (this.x + this.width > worldWidth - 16) {
            this.x = worldWidth - 16 - this.width;
            this.vx = 0;
        }

        for (const plat of platforms) {
            if (plat.oneWay) continue;
            if (CollisionSystem.intersectsAABB(this, plat)) {
                if (this.vx > 0) {
                    this.x = plat.x - this.width;
                } else if (this.vx < 0) {
                    this.x = plat.x + plat.width;
                }
                this.vx = 0;
            }
        }

        // 2. Eje vertical
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
    }

    _updateAnimationState(isSprinting) {
        if (this.dead) {
            this.animState = 'dead';
            return;
        }
        if (this.hurtAnimTimer > 0) {
            this.animState = 'hurt';
            return;
        }
        if (this.attackAnimTimer > 0) {
            this.animState = 'attack';
            return;
        }
        if (this.climbing) {
            this.animState = Math.abs(this.vy) > 10 ? 'walk' : 'idle';
            return;
        }
        if (!this.onGround) {
            this.animState = this.vy < 0 ? 'jump' : 'fall';
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
        this.invulnerableTimer = 0.95;
        this.climbing = false;

        const pushDir = this.x + this.width * 0.5 >= sourceX ? 1 : -1;
        this.vx = pushDir * 235;
        this.vy = -205;
        this.audio.playHurt();

        if (this.health <= 0) {
            this.dead = true;
            this.animState = 'dead';
            this.audio.playGameOver();
        }
        return true;
    }

    /**
     * Renderiza el cono de linterna acoplado al protagonista y el destello de disparo.
     */
    renderFlashlight(renderer, cameraX, cameraY) {
        if (this.dead) return;
        const originX = (this.facing > 0 ? this.x + this.width + 8 : this.x - 8) - cameraX;
        const originY = this.y + 44 - cameraY;
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
                originX + this.facing * 22,
                originY - 2,
                4,
                118,
                'rgba(255, 215, 90, 0.44)'
            );
        }
    }

    render(ctx, cameraX, cameraY) {
        if (!this.dead && this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer * 16) % 2 === 0) {
            return;
        }

        const cx = Math.round(this.x + this.width * 0.5 - cameraX);
        const bottomY = Math.round(this.y + this.height - cameraY);

        // Sombra de contacto de doble capa anclada directamente bajo las botas (da peso real en el suelo)
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

        // Renderizado principal mediante SpriteAtlas con altura anatómica normalizada (120 px)
        if (this.spriteAtlas && this.spriteAtlas.isReady()) {
            let animKey = 'player_idle';
            let frameIdx = 0;
            let loop = true;

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

            // Compresión física al aterrizar y cadencia sutil de paso sobre el pavimento
            const squashAmt = this.landSquash;
            const squashX = 1 + squashAmt * 0.09;
            const squashY = 1 - squashAmt * 0.11;
            const stepBounceY = (this.onGround && (this.animState === 'walk' || this.animState === 'run'))
                ? -Math.abs(Math.sin(this.stridePhase * Math.PI * 0.5)) * 1.8
                : 0;

            this.spriteAtlas.drawFrame(ctx, animKey, frameIdx, cx, bottomY + 1, {
                targetHeight: this.visualHeight,
                squashX,
                squashY,
                offsetY: stepBounceY,
                flipX: this.facing < 0,
                loop,
                hitFlash: this.hurtAnimTimer > 0.16
            });

            // Indicador visual del paquete de misión asegurado a la mochila cuando lo transporta
            if (this.hasPackage && !this.packageDelivered && !this.dead) {
                const packOffsetX = this.facing > 0 ? -32 : 8;
                this.spriteAtlas.drawSprite(
                    ctx,
                    'icon_package',
                    cx + packOffsetX,
                    bottomY - 78 + stepBounceY + Math.sin(this.animTime * 5) * 1.2,
                    25,
                    21
                );
            }
        } else {
            // Fallback procedural ligero para pruebas unitarias sin decodificador de imagen
            this._renderProceduralFallback(ctx, cx, bottomY);
        }

        // Barra flotante de recarga cuando está recargando
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
