/**
 * Level01.js
 * Nivel 01: "EMBOSCADA EN LA CARRETERA".
 * Escenario panorámico nocturno ajustado exactamente a la medida de la imagen de fondo
 * (assets/backgrounds/level01_road_hd.jpg — 1290 x 720 lógicos), donde EDI dispone de
 * 1 minuto (60 segundos) para enfrentar y eliminar a los 5 zombis en la carretera.
 * Al derrotarlos dentro del tiempo límite, muestra la pantalla de Nivel Completado con
 * el retrato de EDI, puntos obtenidos, estadísticas y botones para Guardar Progreso,
 * Salir al Menú, ir a la Tienda o Continuar.
 */

import { Camera2D } from '../core/Camera2D.js';
import { PORTRAIT_FACES_META } from '../core/PortraitFacesMeta.js';
import { Player } from '../entities/Player.js';
import { Zombie } from '../entities/Zombie.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { PortraitSystem } from '../systems/PortraitSystem.js';
import { LIFE_SCORE_INTERVAL } from '../systems/SaveSystem.js';

const DEFAULT_WORLD_WIDTH = 1290;
const WORLD_HEIGHT = 720;
const GROUND_Y = 620;
const LEVEL_TIME_LIMIT = 60;
const TOTAL_ZOMBIES = 5;

export class Level01 {
    constructor(engine) {
        this.engine = engine;
        this.worldWidth = DEFAULT_WORLD_WIDTH;
        this.camera = new Camera2D(1280, 720, this.worldWidth, WORLD_HEIGHT);
        this.isSceneActive = false;

        this.player = null;
        this.enemies = [];
        this.platforms = [];
        this.ladders = [];
        this.movableCrates = [];
        this.destructibles = [];
        this.checkpoints = [];
        this.pickups = [];
        this.combat = null;
        this.portrait = null;

        this.elapsedTime = 0;
        this.remainingTime = LEVEL_TIME_LIMIT;
        this.zombiesKilled = 0;
        this.startMoneySnapshot = 0;
        this.startScoreSnapshot = 0;
        this.lastCheckpointX = 175;
        this._lastUrgentSecond = -1;

        this.paused = false;
        this.inventoryOpen = false;
        this.levelCompleted = false;
        this.defeatTimer = 0;
        this.gameOverTriggered = false;
        this.time = 0;

        this._onExtraLife = (e) => {
            if (!this.isSceneActive || !this.player) return;
            const total = e?.detail?.totalLives ?? this.engine.saveSystem.getLives();
            this.engine.audio.playExtraLife?.();
            this.camera.shake(6, 0.22);
            this.combat?.spawnFloatingText(
                this.player.x - 24,
                this.player.y - 34,
                `★ ¡+1 VIDA EXTRA POR ${LIFE_SCORE_INTERVAL.toLocaleString('en-US')} PTS! (VIDAS: ${total})`,
                '#ffd166'
            );
            this._syncHud();
        };

        this._cacheDomElements();
        this._bindHudEvents();
    }

    _cacheDomElements() {
        this.hudOverlay = document.getElementById('hud-overlay');
        this.hudMissionHeader = document.getElementById('hud-mission-header');
        this.hudAvatarCanvas = document.getElementById('hud-avatar-canvas');
        this.hudPlayerName = document.getElementById('hud-player-name');
        this.hudLives = document.getElementById('hud-lives');
        this.hudHealthFill = document.getElementById('hud-health-fill');
        this.hudHealthText = document.getElementById('hud-health-text');
        this.hudMoney = document.getElementById('hud-money');
        this.hudScore = document.getElementById('hud-score');
        this.hudPackageLabel = document.getElementById('hud-package-label');
        this.hudPackageState = document.getElementById('hud-package-state');
        this.hudObjectiveText = document.getElementById('hud-objective-text');
        this.hudProgressFill = document.getElementById('hud-delivery-fill');
        this.hudWeaponName = document.getElementById('hud-weapon-name');
        this.hudAmmoText = document.getElementById('hud-ammo-text');
        this.hudMedkitCount = document.getElementById('hud-medkit-count');

        this.hudTimerBox = document.getElementById('hud-timer-box');
        this.hudTimerVal = document.getElementById('hud-timer-val');
        this.bossBarWrap = document.getElementById('hud-boss-bar');
        this.hordeBanner = document.getElementById('horde-banner');
        this.hordeWarning = document.getElementById('horde-warning');
        this.hordeRedFlash = document.getElementById('horde-red-flash');

        this.inventoryPanel = document.getElementById('ingame-inventory-panel');
        this.inventorySlotsContainer = document.getElementById('ingame-inventory-slots');
        this.btnUseMedkitUI = document.getElementById('btn-inv-use-medkit');
        this.btnCloseInventory = document.getElementById('btn-inv-close');

        this.pausePanel = document.getElementById('ingame-pause-panel');
        this.btnPauseResume = document.getElementById('btn-pause-resume');
        this.btnPauseOptions = document.getElementById('btn-pause-options');
        this.btnPauseRestart = document.getElementById('btn-pause-restart');
        this.btnPauseMenu = document.getElementById('btn-pause-menu');

        this.victoryPanel = document.getElementById('level-victory-panel');
        this.victoryEdiCanvas = document.getElementById('victory-edi-canvas');
        this.victoryMissionTitle = document.getElementById('victory-mission-title');
        this.victorySubtitleMsg = document.getElementById('victory-subtitle-msg');
        this.resScore = document.getElementById('res-score');
        this.resTotalScore = document.getElementById('res-total-score');
        this.resZombies = document.getElementById('res-zombies');
        this.resHealth = document.getElementById('res-health');
        this.resCombatMoney = document.getElementById('res-combat-money');
        this.resLevelReward = document.getElementById('res-level-reward');
        this.resTime = document.getElementById('res-time');
        this.victorySaveFeedback = document.getElementById('victory-save-feedback');
        this.btnVictorySave = document.getElementById('btn-victory-save');
        this.btnVictoryMenu = document.getElementById('btn-victory-menu');
        this.btnVictoryShop = document.getElementById('btn-victory-shop');
        this.btnVictoryContinue = document.getElementById('btn-victory-continue');
    }

    _bindHudEvents() {
        this.btnCloseInventory?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.audio.playClick();
            this._setInventoryOpen(false);
        });

        this.btnUseMedkitUI?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            if (this.player?.tryUseMedkit({
                onFloatingText: (x, y, t, c) => this.combat.spawnFloatingText(x, y, t, c)
            })) {
                this._renderInventorySlots();
                this._syncHud();
            }
        });

        this.btnPauseResume?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.audio.playClick();
            this._setPaused(false);
        });

        this.btnPauseOptions?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.audio.playClick();
            window.dispatchEvent(new CustomEvent('ldz:open-modal', { detail: { modal: 'options' } }));
        });

        this.btnPauseRestart?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.audio.playClick();
            this._setPaused(false);
            this.engine.sceneManager.transitionTo('level01', {}, 0.35);
        });

        this.btnPauseMenu?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.audio.playClick();
            this._setPaused(false);
            this.engine.sceneManager.transitionTo('mainMenu', {}, 0.45);
        });

        this.btnVictorySave?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.saveSystem.save();
            this.engine.audio.playConfirm();
            if (this.victorySaveFeedback) {
                this.victorySaveFeedback.textContent = '✓ Progreso de EDI guardado correctamente en memoria local.';
                this.victorySaveFeedback.classList.add('is-saved');
            }
        });

        this.btnVictoryMenu?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.saveSystem.save();
            this.engine.audio.playClick();
            this.victoryPanel?.classList.add('hidden');
            this.engine.sceneManager.transitionTo('mainMenu', {}, 0.45);
        });

        this.btnVictoryShop?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.saveSystem.save();
            this.engine.audio.playClick();
            this.victoryPanel?.classList.add('hidden');
            this.engine.sceneManager.transitionTo('shop', { fromLevel: 1, nextScene: 'briefing' }, 0.45);
        });

        this.btnVictoryContinue?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.saveSystem.save();
            this.engine.audio.playConfirm();
            this.victoryPanel?.classList.add('hidden');
            this.engine.sceneManager.transitionTo('briefing', { levelId: 2 }, 0.45);
        });
    }

    enter() {
        this.isSceneActive = true;
        this.time = 0;
        this.elapsedTime = 0;
        this.remainingTime = LEVEL_TIME_LIMIT;
        this.zombiesKilled = 0;
        this.paused = false;
        this.inventoryOpen = false;
        this.levelCompleted = false;
        this.defeatTimer = 0;
        this.gameOverTriggered = false;
        this._lastUrgentSecond = -1;

        // Ajustar el ancho del escenario exactamente a la medida proporcional de la imagen de fondo
        const bgImg = this.engine.assets?.getImage('level01_bg');
        if (bgImg && bgImg.naturalWidth > 0 && bgImg.naturalHeight > 0) {
            this.worldWidth = Math.round(bgImg.naturalWidth * (WORLD_HEIGHT / bgImg.naturalHeight));
        } else {
            this.worldWidth = DEFAULT_WORLD_WIDTH;
        }
        this.lastCheckpointX = 175;

        window.addEventListener('ldz:extra-life', this._onExtraLife);

        if (this.hudMissionHeader) {
            this.hudMissionHeader.textContent = '🎯 NIVEL 01: EMBOSCADA EN LA CARRETERA';
        }
        if (this.hudPackageLabel) {
            this.hudPackageLabel.textContent = '🧟 Amenaza:';
        }
        if (this.victoryMissionTitle) {
            this.victoryMissionTitle.textContent = '¡NIVEL 01 COMPLETADO!';
        }
        if (this.victorySubtitleMsg) {
            this.victorySubtitleMsg.textContent = 'EDI eliminó a los 5 zombis de la carretera dentro del tiempo límite.';
        }
        if (this.btnVictoryContinue) {
            this.btnVictoryContinue.textContent = 'CONTINUAR ▶';
        }
        if (this.victorySaveFeedback) {
            this.victorySaveFeedback.textContent = 'Pulsa "Guardar Progreso" o continúa al siguiente nivel.';
            this.victorySaveFeedback.classList.remove('is-saved');
        }

        this.engine.inventory.resetMissionLoadout();
        this.startMoneySnapshot = this.engine.economy.getMoney();
        this.startScoreSnapshot = this.engine.economy.getScore();

        this.camera.setBounds(0, this.worldWidth);
        this.camera.x = 0;

        this._buildWorldGeometry();
        this._spawnInitialEntities();

        if (!this.portrait) {
            this.portrait = new PortraitSystem(this.hudAvatarCanvas, {
                assets: this.engine.assets,
                spriteAtlas: this.engine.spriteAtlas
            });
        } else {
            this.portrait.reset();
        }

        this.combat = new CombatSystem({
            audio: this.engine.audio,
            economy: this.engine.economy,
            camera: this.camera,
            spriteAtlas: this.engine.spriteAtlas,
            onEnemyKilled: () => {
                this.zombiesKilled = Math.min(TOTAL_ZOMBIES, this.zombiesKilled + 1);
                this.portrait?.notify('rage', 900);
            }
        });

        this.hudOverlay?.classList.remove('hidden');
        this.hudTimerBox?.classList.remove('hidden');
        this.hudTimerBox?.classList.remove('is-urgent');
        this.bossBarWrap?.classList.add('hidden');
        this.hordeBanner?.classList.add('hidden');
        this.hordeWarning?.classList.add('hidden');
        this.hordeRedFlash?.classList.add('hidden');
        this.inventoryPanel?.classList.add('hidden');
        this.pausePanel?.classList.add('hidden');
        this.victoryPanel?.classList.add('hidden');

        this._syncHud();
        this._zombieGroanTimer = 2.2;
        this.engine.audio.startAmbience('gameplay');
    }

    exit() {
        this.isSceneActive = false;
        window.removeEventListener('ldz:extra-life', this._onExtraLife);
        if (this.hudPackageLabel) {
            this.hudPackageLabel.textContent = '📦 Paquete:';
        }
        this.hudTimerBox?.classList.add('hidden');
        this.hudTimerBox?.classList.remove('is-urgent');
        this.hudOverlay?.classList.add('hidden');
        this.inventoryPanel?.classList.add('hidden');
        this.pausePanel?.classList.add('hidden');
        this.victoryPanel?.classList.add('hidden');
    }

    _buildWorldGeometry() {
        // Suelo continuo ajustado exactamente al ancho de la carretera de la imagen
        this.platforms = [
            { x: 0, y: GROUND_Y, width: this.worldWidth, height: 120, kind: 'ground', oneWay: false }
        ];
        this.ladders = [];
        this.movableCrates = [];
        this.destructibles = [];
        this.checkpoints = [];
        this.pickups = [
            { x: Math.round(this.worldWidth * 0.50), y: GROUND_Y - 34, width: 36, height: 32, type: 'ammo', taken: false }
        ];
    }

    _spawnInitialEntities() {
        const atlas = this.engine.spriteAtlas;
        const w = this.worldWidth;
        const playerHeight = 132;
        const zombieHeight = 132;

        this.player = new Player({
            x: 115,
            y: GROUND_Y - playerHeight,
            width: 52,
            height: playerHeight,
            visualHeight: 148,
            inventory: this.engine.inventory,
            audio: this.engine.audio,
            spriteAtlas: atlas
        });
        this.player.hasPackage = true;

        // Exactamente 5 zombis HD distribuidos a lo largo de la carretera nocturna a escala simétrica con EDI y el escenario
        const positions = [
            { variant: 'walker', x: Math.round(w * 0.37), min: 90, max: w - 60, fast: false },
            { variant: 'walker_female', x: Math.round(w * 0.51), min: 110, max: w - 60, fast: false },
            { variant: 'walker', x: Math.round(w * 0.65), min: 130, max: w - 60, fast: true },
            { variant: 'walker_female', x: Math.round(w * 0.79), min: 150, max: w - 60, fast: false },
            { variant: 'walker_female', x: Math.round(w * 0.92), min: 170, max: w - 50, fast: true }
        ];

        this.enemies = positions.map(cfg => {
            const fastOverrides = cfg.fast
                ? {
                    maxHealth: 78,
                    speed: 98,
                    chaseSpeed: 175,
                    damage: 15,
                    attackCooldownTime: 0.90,
                    scoreReward: 25,
                    moneyReward: 5,
                    shambleCadence: false
                }
                : {};

            const z = new Zombie(cfg.variant, {
                x: cfg.x,
                y: GROUND_Y - zombieHeight,
                width: 50,
                height: zombieHeight,
                visualHeight: 150,
                attackRange: 62,
                patrolMinX: cfg.min,
                patrolMaxX: cfg.max,
                spriteAtlas: atlas,
                ...fastOverrides
            });
            z.aggroRange = 760;
            return z;
        });
    }

    _setPaused(state) {
        if (this.levelCompleted) return;
        this.paused = Boolean(state);
        if (this.paused) {
            this.inventoryOpen = false;
            this.inventoryPanel?.classList.add('hidden');
        }
        this.pausePanel?.classList.toggle('hidden', !this.paused);
    }

    _setInventoryOpen(state) {
        if (this.levelCompleted || this.paused) return;
        this.inventoryOpen = Boolean(state);
        if (this.inventoryOpen) {
            this._renderInventorySlots();
        }
        this.inventoryPanel?.classList.toggle('hidden', !this.inventoryOpen);
    }

    _renderInventorySlots() {
        if (!this.inventorySlotsContainer) return;
        this.inventorySlotsContainer.innerHTML = '';
        const loadout = this.engine.inventory.getLoadout();
        const equippedId = this.engine.inventory.getEquippedWeapon().id;

        loadout.forEach((weapon, idx) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = `inv-slot-btn ${weapon.id === equippedId ? 'active' : ''}`;

            const ammoInfo = weapon.type === 'melee'
                ? 'Munición: ∞'
                : `Munición: ${this.engine.inventory.getMagazineAmmo(weapon.id)} / ${this.engine.inventory.getReserveAmmo(weapon.id)}`;

            card.innerHTML = `
                <span class="inv-slot-hotkey">[${idx + 1}]</span>
                <strong>${weapon.name}</strong>
                <span class="inv-slot-meta">Daño: ${this.engine.inventory.getEffectiveDamage(weapon.id)} | ${ammoInfo}</span>
            `;

            card.addEventListener('click', () => {
                this.engine.inventory.equipWeapon(weapon.id);
                this.engine.audio.playClick();
                this._renderInventorySlots();
                this._syncHud();
            });

            this.inventorySlotsContainer.appendChild(card);
        });

        if (this.btnUseMedkitUI) {
            const count = this.engine.inventory.getMedkits();
            this.btnUseMedkitUI.textContent = `✚ USAR BOTIQUÍN (+55 SALUD) — DISPONIBLES: ${count}`;
            this.btnUseMedkitUI.disabled = count <= 0 || this.player.health >= this.player.maxHealth;
        }
    }

    update(dt) {
        this.time += dt;
        this.engine.renderer.updateAtmosphere(dt);

        const globalModalOpen = document.querySelector('.modal-backdrop:not(.hidden)');
        if (globalModalOpen) return;

        if (this.engine.input.isActionJustPressed('pause')) {
            if (this.inventoryOpen) {
                this.engine.audio.playClick();
                this._setInventoryOpen(false);
                return;
            }
            if (!this.levelCompleted) {
                this.engine.audio.playClick();
                this._setPaused(!this.paused);
                return;
            }
        }

        if (!this.paused && !this.levelCompleted && this.engine.input.isActionJustPressed('inventory')) {
            this.engine.audio.playClick();
            this._setInventoryOpen(!this.inventoryOpen);
            return;
        }

        if (this.paused || this.inventoryOpen || this.levelCompleted) {
            return;
        }

        this.elapsedTime += dt;
        this.remainingTime = Math.max(0, LEVEL_TIME_LIMIT - this.elapsedTime);

        // Aviso sonoro en los últimos 10 segundos del minuto
        if (this.remainingTime > 0 && this.remainingTime <= 10) {
            const sec = Math.ceil(this.remainingTime);
            if (sec !== this._lastUrgentSecond) {
                this._lastUrgentSecond = sec;
                this.engine.audio.playClick?.();
            }
        }

        // Si se agota el minuto antes de eliminar a los 5 zombis
        if (this.remainingTime <= 0 && !this.player.dead && !this.gameOverTriggered) {
            this._handleTimeoutFailure();
            return;
        }

        const combatCallbacks = {
            onSpawnProjectile: (cfg) => this.combat.spawnProjectile(cfg),
            onPlayerMuzzleShot: (mx, my, facing, wId) => {
                this.combat.spawnMuzzleAndCasing(mx, my, facing, wId);
                this.portrait?.notify('rage', 700);
            },
            onPlayerMelee: (box, dmg, kb) => {
                this.portrait?.notify('rage', 700);
                this.combat.handlePlayerMelee(box, dmg, kb, this.enemies, this.destructibles, this.player);
            },
            onEnemyMeleeHit: (enemy, plr, dmg) => {
                this.portrait?.notify('pain', 950);
                this.combat.handleEnemyMeleeHit(enemy, plr, dmg);
            },
            onToxicExplosion: (zombie, plr) => this.combat.handleToxicExplosion(zombie, plr, this.enemies),
            onFloatingText: (x, y, text, color) => this.combat.spawnFloatingText(x, y, text, color),
            onLandImpact: (x, y, strength) => {
                this.combat.spawnHitParticles(x, y - 2, '#9db4cc', Math.max(3, Math.round(strength * 5)));
            }
        };

        this.camera.setBounds(0, this.worldWidth);

        this.player.update(
            dt,
            this.engine.input,
            this.platforms,
            this.worldWidth,
            combatCallbacks,
            this.ladders,
            this.movableCrates
        );

        // Gestión de vidas si EDI cae en combate
        if (this.player.dead) {
            this.defeatTimer += dt;
            this.camera.follow(this.player, dt);
            if (this.defeatTimer >= 1.35 && !this.gameOverTriggered) {
                const remainingLives = this.engine.saveSystem.loseLife();
                if (remainingLives > 0) {
                    this.defeatTimer = 0;
                    this.player.respawnAt(this.lastCheckpointX, GROUND_Y - this.player.height);
                    if (this.engine.inventory.getReserveAmmo('pistol_9mm') < 12) {
                        this.engine.inventory.addAmmo('pistol_9mm', 12);
                    }
                    this.engine.audio.playCheckpointRespawn?.();
                    this.camera.shake(8, 0.24);
                    this.combat.spawnFloatingText(
                        this.player.x - 16,
                        this.player.y - 24,
                        `♥ REAPARICIÓN — VIDAS RESTANTES: ${remainingLives}`,
                        '#47ff8c'
                    );
                } else {
                    this._triggerPermadeathGameOver();
                }
            }
            this._syncHud();
            return;
        }

        this._checkSupplyPickups();

        for (const enemy of this.enemies) {
            enemy.update(dt, this.player, this.platforms, this.worldWidth, combatCallbacks);
        }
        this.enemies = this.enemies.filter(e => !e.removable);

        this.combat.update(dt, this.player, this.enemies, this.platforms, this.destructibles, this.movableCrates);

        // Condición de victoria: los 5 zombis han sido derrotados dentro del minuto
        const aliveCount = this.enemies.filter(e => !e.dead).length;
        if (this.zombiesKilled >= TOTAL_ZOMBIES || aliveCount === 0) {
            this.zombiesKilled = TOTAL_ZOMBIES;
            this._completeLevel();
            return;
        }

        // Gruñidos ambientales periódicos mientras los zombis persiguen a EDI
        this._zombieGroanTimer = (this._zombieGroanTimer ?? 3.5) - dt;
        if (this._zombieGroanTimer <= 0 && aliveCount > 0) {
            this._zombieGroanTimer = 4.2 + Math.random() * 2.8;
            this.engine.audio.playZombieGroan?.(0.58);
        }

        this.camera.follow(this.player, dt);
        this._syncHud();
    }

    _handleTimeoutFailure() {
        const remainingLives = this.engine.saveSystem.loseLife();
        this.engine.audio.playError?.();
        if (remainingLives > 0) {
            // Reinicia el enfrentamiento de 1 minuto con las vidas restantes
            this.engine.sceneManager.transitionTo('level01', {}, 0.35);
        } else {
            this._triggerPermadeathGameOver();
        }
    }

    _triggerPermadeathGameOver() {
        this.gameOverTriggered = true;
        const finalScore = this.engine.economy.getScore();
        this.engine.saveSystem.resetGameOnPermadeath();
        this.engine.inventory.resetMissionLoadout();
        this.engine.sceneManager.transitionTo('gameOver', {
            retryScene: 'briefing',
            levelName: 'EMBOSCADA EN LA CARRETERA',
            zombiesKilled: this.zombiesKilled,
            timeSeconds: this.elapsedTime,
            finalScore,
            permadeath: true
        }, 0.5);
    }

    _checkSupplyPickups() {
        for (const item of this.pickups) {
            if (item.taken) continue;
            if (
                this.player.x < item.x + item.width &&
                this.player.x + this.player.width > item.x &&
                this.player.y < item.y + item.height &&
                this.player.y + this.player.height > item.y
            ) {
                item.taken = true;
                this.engine.inventory.addAmmo('pistol_9mm', 18);
                this.engine.audio.playPickup();
                this.combat.spawnFloatingText(item.x, item.y - 10, '+18 MUNICIÓN 9MM', '#ffd166');
            }
        }
    }

    _renderVictoryEdiFace() {
        const canvas = this.victoryEdiCanvas;
        if (!canvas || typeof canvas.getContext !== 'function') return;
        const ctx = canvas.getContext('2d');
        if (!ctx || typeof ctx.clearRect !== 'function') return;

        const cw = canvas.width || 128;
        const ch = canvas.height || 128;
        ctx.clearRect(0, 0, cw, ch);

        const facesImg = this.engine.assets?.getImage(PORTRAIT_FACES_META.imageKey);
        const hasFaces = Boolean(
            facesImg &&
            typeof ctx.drawImage === 'function' &&
            (facesImg.complete === undefined || facesImg.complete) &&
            (facesImg.naturalWidth === undefined || facesImg.naturalWidth > 0)
        );

        if (hasFaces) {
            const meta = PORTRAIT_FACES_META.moods.laugh || PORTRAIT_FACES_META.moods.calm;
            const srcW = PORTRAIT_FACES_META.cell.w;
            const srcH = PORTRAIT_FACES_META.cell.h;
            const sx = meta.col * srcW;
            const sy = meta.row * srcH;
            const scale = Math.max(cw / srcW, ch / srcH);
            const dw = srcW * scale;
            const dh = srcH * scale;
            ctx.drawImage(facesImg, sx, sy, srcW, srcH, (cw - dw) * 0.5, (ch - dh) * 0.5, dw, dh);
        } else if (this.engine.spriteAtlas?.isReady()) {
            this.engine.spriteAtlas.drawSprite(ctx, 'face_normal', 4, 4, cw - 8, ch - 8);
        }
    }

    _completeLevel() {
        if (this.levelCompleted) return;
        this.levelCompleted = true;

        const levelDef = this.engine.levels.getLevelById(1);
        const levelReward = levelDef.baseMoneyReward;
        const timeBonusPts = Math.max(0, Math.round(this.remainingTime) * 2);
        const baseScoreBonus = (levelDef.baseScoreReward || 100) + timeBonusPts;
        const combatMoney = Math.max(0, this.engine.economy.getMoney() - this.startMoneySnapshot);

        this.engine.economy.addMoney(levelReward);
        if (baseScoreBonus > 0) {
            this.engine.economy.addScore(baseScoreBonus);
        }

        this.engine.saveSystem.completeLevel(1, [
            'machete_combat',
            'revolver_magnum',
            'shotgun_combat',
            'smg_tactical'
        ]);
        this.engine.saveSystem.save();

        const runScore = Math.max(0, this.engine.economy.getScore() - this.startScoreSnapshot);
        const totalScore = this.engine.economy.getScore();

        this.portrait?.notify('laugh', 6000);
        this.engine.audio.playVictory();
        this._renderVictoryEdiFace();

        if (this.resScore) this.resScore.textContent = `+${runScore} PTS (incluye +${timeBonusPts} bono tiempo)`;
        if (this.resTotalScore) this.resTotalScore.textContent = `${totalScore} PTS`;
        if (this.resZombies) this.resZombies.textContent = `${this.zombiesKilled} / ${TOTAL_ZOMBIES}`;
        if (this.resHealth && this.player) {
            this.resHealth.textContent = `${this.player.health} / ${this.player.maxHealth} HP`;
        }
        if (this.resCombatMoney) this.resCombatMoney.textContent = `$${combatMoney}`;
        if (this.resLevelReward) this.resLevelReward.textContent = `+$${levelReward}`;
        if (this.resTime) {
            this.resTime.textContent = `${this._formatTime(this.elapsedTime)} (${this._formatTime(Math.ceil(this.remainingTime))} restantes)`;
        }

        this._syncHud();
        window.setTimeout(() => {
            if (this.isSceneActive) {
                this.victoryPanel?.classList.remove('hidden');
            }
        }, 480);
    }

    _formatTime(totalSeconds) {
        const safe = Math.max(0, Math.floor(totalSeconds));
        const mins = Math.floor(safe / 60);
        const secs = safe % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    _hasNearbyThreat() {
        if (!this.player) return false;
        const px = this.player.x;
        for (const enemy of this.enemies) {
            if (!enemy || enemy.dead || enemy.removable) continue;
            if (Math.abs(enemy.x - px) < 480) return true;
        }
        return false;
    }

    _syncHud() {
        const playerName = this.engine.saveSystem.getPlayerName() || 'EDI';
        if (this.hudPlayerName) this.hudPlayerName.textContent = playerName;

        const lives = this.engine.saveSystem.getLives();
        if (this.hudLives) {
            const hearts = '♥'.repeat(Math.min(5, Math.max(0, lives)));
            this.hudLives.textContent = `${hearts || '☠'} x${lives}`;
        }

        if (this.hudTimerVal) {
            this.hudTimerVal.textContent = this._formatTime(Math.ceil(this.remainingTime));
        }
        if (this.hudTimerBox) {
            this.hudTimerBox.classList.toggle('is-urgent', !this.levelCompleted && this.remainingTime <= 10);
        }

        if (this.player) {
            const hpRatio = Math.max(0, this.player.health / this.player.maxHealth);
            if (this.hudHealthFill) this.hudHealthFill.style.width = `${Math.round(hpRatio * 100)}%`;
            if (this.hudHealthText) this.hudHealthText.textContent = `${this.player.health} / ${this.player.maxHealth}`;

            this.portrait?.update(this.player, { enemiesNear: this._hasNearbyThreat() });

            const remainingZombies = Math.max(0, TOTAL_ZOMBIES - this.zombiesKilled);
            if (this.hudPackageState) {
                if (this.levelCompleted || remainingZombies === 0) {
                    this.hudPackageState.textContent = 'Carretera despejada (5 / 5)';
                    this.hudPackageState.style.color = '#47ff8c';
                } else {
                    this.hudPackageState.textContent = `${remainingZombies} zombi${remainingZombies === 1 ? '' : 's'} activo${remainingZombies === 1 ? '' : 's'}`;
                    this.hudPackageState.style.color = '#ffd166';
                }
            }

            if (this.hudObjectiveText) {
                this.hudObjectiveText.textContent = this.levelCompleted
                    ? '¡Amenaza eliminada! Guarda tu progreso o continúa.'
                    : `Elimina a los ${TOTAL_ZOMBIES} zombis en menos de 01:00 (${this.zombiesKilled} / ${TOTAL_ZOMBIES})`;
            }

            if (this.hudProgressFill) {
                const ratio = Math.min(1, this.zombiesKilled / TOTAL_ZOMBIES);
                this.hudProgressFill.style.width = `${Math.round(ratio * 100)}%`;
            }

            const wpn = this.engine.inventory.getEquippedWeapon();
            if (this.hudWeaponName) this.hudWeaponName.textContent = wpn.shortName || wpn.name;
            if (this.hudAmmoText) {
                if (wpn.type === 'melee') {
                    this.hudAmmoText.textContent = 'CQC / ∞';
                } else if (this.engine.inventory.reloading) {
                    this.hudAmmoText.textContent = 'RECARGANDO...';
                } else {
                    this.hudAmmoText.textContent = `${this.engine.inventory.getMagazineAmmo(wpn.id)} / ${this.engine.inventory.getReserveAmmo(wpn.id)}`;
                }
            }
            if (this.hudMedkitCount) {
                this.hudMedkitCount.textContent = String(this.engine.inventory.getMedkits());
            }
        }

        if (this.hudMoney) this.hudMoney.textContent = `$${this.engine.economy.getMoney()}`;
        if (this.hudScore) this.hudScore.textContent = String(this.engine.economy.getScore());
    }

    render(renderer) {
        const ctx = renderer.ctx;
        const camX = this.camera.getRenderX();
        const camY = this.camera.getRenderY();

        renderer.clear('#050913');

        // 1. Imagen panorámica completa de la carretera nocturna ajustada exactamente al escenario
        const bgImg = this.engine.assets?.getImage('level01_bg');
        const hasBg = Boolean(
            bgImg &&
            typeof ctx.drawImage === 'function' &&
            (bgImg.complete === undefined || bgImg.complete) &&
            (bgImg.naturalWidth === undefined || bgImg.naturalWidth > 0)
        );

        if (hasBg) {
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            if ('imageSmoothingQuality' in ctx) {
                ctx.imageSmoothingQuality = 'high';
            }
            ctx.drawImage(bgImg, -camX, -camY, this.worldWidth, WORLD_HEIGHT);
            ctx.restore();
        }

        // 2. Resplandores atmosféricos alineados con las farolas y el auto volcado del fondo a escala humana
        const flicker = Math.sin(this.time * 14) > 0.94 ? 0.76 : 1.0;
        renderer.drawRadialGlow(
            Math.round(this.worldWidth * 0.166) - camX,
            242 - camY,
            10,
            165,
            `rgba(255, 185, 82, ${(0.15 * flicker).toFixed(3)})`
        );
        renderer.drawRadialGlow(
            Math.round(this.worldWidth * 0.889) - camX,
            242 - camY,
            10,
            165,
            `rgba(255, 185, 82, ${(0.13 * flicker).toFixed(3)})`
        );
        const tailPulse = 0.13 + 0.07 * Math.abs(Math.sin(this.time * 4.2));
        renderer.drawRadialGlow(
            Math.round(this.worldWidth * 0.742) - camX,
            425 - camY,
            8,
            95,
            `rgba(255, 38, 48, ${tailPulse.toFixed(3)})`
        );

        // 3. Suministros opcionales sobre el asfalto
        const atlas = this.engine.spriteAtlas;
        if (atlas?.isReady()) {
            for (const item of this.pickups) {
                if (item.taken) continue;
                const bobY = Math.sin(this.time * 4.2) * 3;
                atlas.drawSprite(ctx, 'pickup_ammo', item.x - camX, item.y + bobY - camY, item.width, item.height);
            }
        }

        // 4. Los 5 zombis y el protagonista EDI sobre el asfalto nocturno
        for (const enemy of this.enemies) {
            enemy.render(ctx, camX, camY);
        }

        if (this.player) {
            this.player.render(ctx, camX, camY);
            this.player.renderFlashlight(renderer, camX, camY);
        }

        // 5. Proyectiles, impactos y textos flotantes de puntaje
        this.combat?.render(ctx, camX, camY);

        // 6. Niebla baja ligera y viñeta cinematográfica
        renderer.drawFog('120, 150, 185', 0.22);
        renderer.drawVignette(0.56);
    }
}
