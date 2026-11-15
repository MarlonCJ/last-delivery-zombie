/**
 * Level02.js
 * Segundo Nivel Jugable Completo: "PABELLÓN DE URGENCIAS — HOSPITAL Y SECTOR B-3" (12,000 px).
 * Recorrido interior extenso dividido en 3 alas interconectadas:
 *   1) Hospital General y Sala de Emergencias (0 - 4,000 px) con Ambulancia HD en bahía de urgencias
 *   2) Bloque Quirúrgico en Apagón (4,000 - 8,200 px)
 *   3) Subsuelo Biotech Labs Sector B-3 con cápsulas mutagénicas y fosas de ácido (8,200 - 12,000 px)
 * Incluye cajas empujables, objetos 100% en sprites HD, las 8 especies de zombis, VFX en sprites,
 * 3 vidas con reaparición en Checkpoints, vida extra cada 10,000 pts y Jefe Final Paciente
 * Cero.
 */

import { Camera2D } from '../core/Camera2D.js';
import { CollisionSystem } from '../core/CollisionSystem.js';
import { Player } from '../entities/Player.js';
import { Zombie } from '../entities/Zombie.js';
import { Boss } from '../entities/Boss.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { HordeSystem } from '../systems/HordeSystem.js';
import { LIFE_SCORE_INTERVAL } from '../systems/SaveSystem.js';

const WORLD_WIDTH = 12000;
const WORLD_HEIGHT = 720;
const GROUND_Y = 590;
const ARENA_LOCK_X = 10540;

export class Level02 {
    constructor(engine) {
        this.engine = engine;
        this.camera = new Camera2D(1280, 720, WORLD_WIDTH, WORLD_HEIGHT);
        this.isSceneActive = false;

        this.player = null;
        this.enemies = [];
        this.boss = null;
        this.platforms = [];
        this.ladders = [];
        this.movableCrates = [];
        this.destructibles = [];
        this.hazards = [];
        this.acidPits = [];
        this.checkpoints = [];
        this.ceilingLights = [];
        this.stasisPods = [];
        this.hospitalProps = [];
        this.pickups = [];
        this.combat = null;
        this.horde = null;
        this.hordeStarted = false;

        // Puntos clave de entrega del Nivel 02 renderizados con sprites HD
        this.pickupStation = { x: 225, y: GROUND_Y - 126, width: 168, height: 126 };
        this.deliveryStation = { x: 10740, y: GROUND_Y - 128, width: 176, height: 128 };

        // Estadísticas de la misión
        this.elapsedTime = 0;
        this.zombiesKilled = 0;
        this.moneyEarnedInRun = 0;
        this.scoreEarnedInRun = 0;
        this.startMoneySnapshot = 0;
        this.startScoreSnapshot = 0;
        this.lastCheckpointX = 80;

        // Estados de escena
        this.paused = false;
        this.inventoryOpen = false;
        this.levelCompleted = false;
        this.defeatTimer = 0;
        this.gameOverTriggered = false;
        this.bossSpawned = false;
        this.arenaLocked = false;
        this.time = 0;
        this._lastAvatarKey = '';

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
        this.hudPackageState = document.getElementById('hud-package-state');
        this.hudObjectiveText = document.getElementById('hud-objective-text');
        this.hudProgressFill = document.getElementById('hud-delivery-fill');
        this.hudWeaponName = document.getElementById('hud-weapon-name');
        this.hudAmmoText = document.getElementById('hud-ammo-text');
        this.hudMedkitCount = document.getElementById('hud-medkit-count');

        this.bossBarWrap = document.getElementById('hud-boss-bar');
        this.bossNameText = document.getElementById('hud-boss-name');
        this.bossHealthFill = document.getElementById('hud-boss-fill');
        this.bossHealthText = document.getElementById('hud-boss-hp-text');

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
        this.victoryMissionTitle = document.getElementById('victory-mission-title');
        this.resScore = document.getElementById('res-score');
        this.resZombies = document.getElementById('res-zombies');
        this.resCombatMoney = document.getElementById('res-combat-money');
        this.resLevelReward = document.getElementById('res-level-reward');
        this.resTime = document.getElementById('res-time');
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
            this.engine.sceneManager.transitionTo('level02', {}, 0.35);
        });

        this.btnPauseMenu?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.audio.playClick();
            this._setPaused(false);
            this.engine.sceneManager.transitionTo('mainMenu', {}, 0.45);
        });

        this.btnVictoryShop?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.audio.playClick();
            this.victoryPanel?.classList.add('hidden');
            this.engine.sceneManager.transitionTo('shop', { fromLevel: 2, nextScene: 'briefing' }, 0.45);
        });

        this.btnVictoryContinue?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.audio.playConfirm();
            this.victoryPanel?.classList.add('hidden');
            this.engine.sceneManager.transitionTo('briefing', { levelId: 2 }, 0.45);
        });
    }

    enter() {
        // Progresión estrictamente secuencial: no se permite jugar Nivel 02 sin haber superado el Nivel 01
        if (!this.engine.levels.isLevelUnlocked(2)) {
            this.engine.sceneManager.switchImmediate('level01');
            return;
        }

        this.isSceneActive = true;
        this.time = 0;
        this.elapsedTime = 0;
        this.zombiesKilled = 0;
        this.paused = false;
        this.inventoryOpen = false;
        this.levelCompleted = false;
        this.defeatTimer = 0;
        this.gameOverTriggered = false;
        this.bossSpawned = false;
        this.arenaLocked = false;
        this.boss = null;
        this.hordeStarted = false;
        this.lastCheckpointX = 80;
        this._lastAvatarKey = '';

        this.horde?.stop();
        this.horde = null;

        window.addEventListener('ldz:extra-life', this._onExtraLife);

        if (this.hudMissionHeader) {
            this.hudMissionHeader.textContent = '🎯 MISIÓN 02: PABELLÓN DE URGENCIAS';
        }
        if (this.victoryMissionTitle) {
            this.victoryMissionTitle.textContent = '¡MISIÓN COMPLETADA: PABELLÓN DE URGENCIAS!';
        }
        if (this.btnVictoryContinue) {
            this.btnVictoryContinue.textContent = 'EXPEDIENTE OPERATIVO ▶';
        }

        this.engine.inventory.resetMissionLoadout();
        this.startMoneySnapshot = this.engine.economy.getMoney();
        this.startScoreSnapshot = this.engine.economy.getScore();

        this.camera.setBounds(0, WORLD_WIDTH);
        this._buildWorldGeometry();
        this._spawnInitialEntities();

        this.combat = new CombatSystem({
            audio: this.engine.audio,
            economy: this.engine.economy,
            camera: this.camera,
            spriteAtlas: this.engine.spriteAtlas,
            onEnemyKilled: (enemy) => {
                if (!enemy.isBoss) {
                    this.zombiesKilled += 1;
                    this.horde?.onZombieKilled(enemy);
                } else {
                    this._handleBossDefeated();
                }
            },
            onCrateBroken: (crate, cx, cy) => {
                if (crate.loot === 'money') {
                    this.engine.economy.addMoney(35);
                    this.combat.spawnFloatingText(cx - 16, cy - 12, '+$35 SUMINISTRO', '#47ff8c');
                } else {
                    const equipped = this.engine.inventory.getEquippedWeapon();
                    const wId = equipped.type === 'ranged' ? equipped.id : 'pistol_9mm';
                    this.engine.inventory.addAmmo(wId, 16);
                    this.combat.spawnFloatingText(cx - 24, cy - 12, '+16 MUNICIÓN', '#ffd166');
                }
                this.engine.audio.playPickup();
            }
        });

        // Evento de horda previo al Jefe Final: 15 zombis en Nivel 02, 5 activos a la vez.
        // El nivel 2 introduce variantes más agresivas (spitter, bomber, armored, leaper).
        this.horde = new HordeSystem({
            levelId: 2,
            arenaMinX: ARENA_LOCK_X + 20,
            arenaMaxX: WORLD_WIDTH - 24,
            groundY: GROUND_Y,
            spriteAtlas: this.engine.spriteAtlas,
            audio: this.engine.audio,
            onSpawn: (zombie) => {
                this.enemies.push(zombie);
                this.combat?.spawnHitParticles(
                    zombie.x + zombie.width * 0.5,
                    zombie.y + zombie.height * 0.55,
                    '#6d1018',
                    7
                );
            },
            onWarning: () => {
                this.camera.shake(16, 0.65);
            },
            onComplete: () => {
                this._triggerBossEncounter();
            }
        });

        this.camera.x = 0;
        this.hudOverlay?.classList.remove('hidden');
        this.bossBarWrap?.classList.add('hidden');
        this.inventoryPanel?.classList.add('hidden');
        this.pausePanel?.classList.add('hidden');
        this.victoryPanel?.classList.add('hidden');

        this._syncHud();
        this.engine.audio.startAmbience('intro');
    }

    exit() {
        this.isSceneActive = false;
        this.horde?.stop();
        this.horde = null;
        window.removeEventListener('ldz:extra-life', this._onExtraLife);
        this.hudOverlay?.classList.add('hidden');
        this.inventoryPanel?.classList.add('hidden');
        this.pausePanel?.classList.add('hidden');
        this.victoryPanel?.classList.add('hidden');
    }

    _buildWorldGeometry() {
        // Suelo continuo clínico/subterráneo + andamios industriales HD (prop_scaffold) + Ambulancia en bahía de urgencias
        this.platforms = [
            { x: 0, y: GROUND_Y, width: WORLD_WIDTH, height: 150, kind: 'ground', oneWay: false },

            // ALA A (0 - 4000): Hospital General y Bahía de Emergencias
            { x: 540, y: GROUND_Y - 98, width: 232, height: 18, drawH: 102, kind: 'veh_ambulance', oneWay: true },
            { x: 820, y: GROUND_Y - 150, width: 290, height: 18, drawH: 150, kind: 'scaffold', oneWay: true },
            { x: 1320, y: GROUND_Y - 64, width: 70, height: 64, kind: 'metal_crate', oneWay: false },
            { x: 1680, y: GROUND_Y - 154, width: 310, height: 18, drawH: 154, kind: 'scaffold', oneWay: true },
            { x: 2210, y: GROUND_Y - 50, width: 96, height: 50, kind: 'barrier_red', oneWay: false },
            { x: 2560, y: GROUND_Y - 150, width: 320, height: 18, drawH: 150, kind: 'scaffold', oneWay: true },
            { x: 2740, y: GROUND_Y - 276, width: 240, height: 18, drawH: 126, kind: 'scaffold', oneWay: true },
            { x: 3260, y: GROUND_Y - 64, width: 70, height: 64, kind: 'metal_crate', oneWay: false },
            { x: 3560, y: GROUND_Y - 152, width: 300, height: 18, drawH: 152, kind: 'scaffold', oneWay: true },

            // ALA B (4000 - 8200): Bloque Quirúrgico en Apagón
            { x: 4320, y: GROUND_Y - 50, width: 96, height: 50, kind: 'barrier_concrete', oneWay: false },
            { x: 4620, y: GROUND_Y - 152, width: 340, height: 18, drawH: 152, kind: 'scaffold', oneWay: true },
            { x: 5180, y: GROUND_Y - 64, width: 70, height: 64, kind: 'metal_crate', oneWay: false },
            { x: 5480, y: GROUND_Y - 148, width: 380, height: 18, drawH: 148, kind: 'scaffold', oneWay: true },
            { x: 5680, y: GROUND_Y - 274, width: 250, height: 18, drawH: 126, kind: 'scaffold', oneWay: true },
            { x: 6160, y: GROUND_Y - 50, width: 96, height: 50, kind: 'barrier_red', oneWay: false },
            { x: 6520, y: GROUND_Y - 150, width: 390, height: 18, drawH: 150, kind: 'scaffold', oneWay: true },
            { x: 7140, y: GROUND_Y - 64, width: 70, height: 64, kind: 'metal_crate', oneWay: false },
            { x: 7440, y: GROUND_Y - 154, width: 360, height: 18, drawH: 154, kind: 'scaffold', oneWay: true },
            { x: 7920, y: GROUND_Y - 50, width: 96, height: 50, kind: 'barrier_concrete', oneWay: false },

            // ALA C (8200 - 12000): Subsuelo Biotech Labs Sector B-3 (andamios sobre fosas de ácido)
            { x: 8420, y: GROUND_Y - 138, width: 420, height: 18, drawH: 138, kind: 'scaffold', oneWay: true },
            { x: 9040, y: GROUND_Y - 142, width: 440, height: 18, drawH: 142, kind: 'scaffold', oneWay: true },
            { x: 9220, y: GROUND_Y - 268, width: 250, height: 18, drawH: 126, kind: 'scaffold', oneWay: true },
            { x: 9680, y: GROUND_Y - 138, width: 430, height: 18, drawH: 138, kind: 'scaffold', oneWay: true },
            { x: 10240, y: GROUND_Y - 64, width: 70, height: 64, kind: 'metal_crate', oneWay: false },

            // Pasarelas de combate en la Arena del Reactor B-3 (Paciente Cero)
            { x: 10980, y: GROUND_Y - 148, width: 245, height: 18, drawH: 148, kind: 'scaffold', oneWay: true },
            { x: 11510, y: GROUND_Y - 148, width: 245, height: 18, drawH: 148, kind: 'scaffold', oneWay: true }
        ];

        // Cajas móviles / empujables por el protagonista
        this.movableCrates = [
            { x: 445, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_metal_hd' },
            { x: 1565, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_wood_hd' },
            { x: 3145, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_metal_hd' },
            { x: 4510, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_wood_hd' },
            { x: 6415, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_metal_hd' },
            { x: 8315, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_metal_hd' },
            { x: 10875, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_wood_hd' }
        ];

        // Escaleras industriales hacia pasarelas y niveles superiores
        this.ladders = [
            { x: 836, y: GROUND_Y - 150, width: 38, height: 150 },
            { x: 1696, y: GROUND_Y - 154, width: 38, height: 154 },
            { x: 2576, y: GROUND_Y - 150, width: 38, height: 150 },
            { x: 2758, y: GROUND_Y - 276, width: 38, height: 128 },
            { x: 3576, y: GROUND_Y - 152, width: 38, height: 152 },
            { x: 4638, y: GROUND_Y - 152, width: 38, height: 152 },
            { x: 5498, y: GROUND_Y - 148, width: 38, height: 148 },
            { x: 5698, y: GROUND_Y - 274, width: 38, height: 128 },
            { x: 6538, y: GROUND_Y - 150, width: 38, height: 150 },
            { x: 7458, y: GROUND_Y - 154, width: 38, height: 154 },
            { x: 8436, y: GROUND_Y - 138, width: 38, height: 138 },
            { x: 9056, y: GROUND_Y - 142, width: 38, height: 142 },
            { x: 9238, y: GROUND_Y - 268, width: 38, height: 128 },
            { x: 9696, y: GROUND_Y - 138, width: 38, height: 138 },
            { x: 10998, y: GROUND_Y - 148, width: 38, height: 148 },
            { x: 11705, y: GROUND_Y - 148, width: 38, height: 148 }
        ];

        // Fosas químicas de ácido mutagénico verde en el Ala B y Sector B-3
        this.acidPits = [
            { x: 5560, y: GROUND_Y - 16, width: 220, height: 28, damage: 18 },
            { x: 6610, y: GROUND_Y - 16, width: 230, height: 28, damage: 18 },
            { x: 8510, y: GROUND_Y - 16, width: 250, height: 28, damage: 20 },
            { x: 9130, y: GROUND_Y - 16, width: 260, height: 28, damage: 20 },
            { x: 9770, y: GROUND_Y - 16, width: 250, height: 28, damage: 20 }
        ];

        // Trampas cortantes en sprites HD
        this.hazards = [
            { x: 1455, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 },
            { x: 3035, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 },
            { x: 4980, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 },
            { x: 7260, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 }
        ];

        // Estaciones médicas de control intermedio (guardan punto de reaparición de vidas!)
        this.checkpoints = [
            { x: 4040, y: GROUND_Y - 98, width: 124, height: 98, label: 'UCI ALFA', reached: false },
            { x: 8090, y: GROUND_Y - 98, width: 124, height: 98, label: 'ESCLUSA B-3', reached: false }
        ];

        // Cajas de suministros y barriles bioquímicos explosivos
        this.destructibles = [
            { x: 785, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 1140, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 1840, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false },
            { x: 2040, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 2890, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 3420, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 3890, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false },
            { x: 4390, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 4840, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 5340, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 6020, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false },
            { x: 6325, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 7020, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 7690, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 8910, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 9560, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 10140, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            // Arena de Paciente Cero
            { x: 11290, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 11840, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false }
        ];

        // Tubos fluorescentes y balizas de emergencia en el techo
        this.ceilingLights = [];
        for (let x = 220; x < WORLD_WIDTH - 180; x += 480) {
            const mode = x < 4000 ? 'hospital' : x < 8200 ? 'blackout_red' : 'biolab_green';
            this.ceilingLights.push({ x, mode });
        }

        // Cápsulas gigantes de estasis mutagénica con especímenes HD reales
        this.stasisPods = [
            { x: 8360, broken: false, specimen: 'z06_walk' },
            { x: 8820, broken: true, specimen: null },
            { x: 9360, broken: false, specimen: 'z08_walk' },
            { x: 9920, broken: true, specimen: null },
            { x: 10420, broken: false, specimen: 'z07_leap' },
            { x: 11260, broken: true, specimen: null },
            { x: 11760, broken: false, specimen: 'z05_walk' }
        ];

        // Equipamiento clínico y de laboratorio 100% en sprites HD (bancas, tanques de gas, consolas, generadores, barriles bio)
        this.hospitalProps = [
            { x: 990, w: 94, h: 52, sprite: 'prop_bench' },
            { x: 1210, kind: 'emergency_doors' },
            { x: 1930, w: 46, h: 78, sprite: 'prop_gas_tanks' },
            { x: 2420, kind: 'emergency_doors' },
            { x: 3195, w: 62, h: 52, sprite: 'prop_crate_military' },
            { x: 3740, w: 92, h: 70, sprite: 'prop_pallet_tarp' },
            { x: 4520, kind: 'emergency_doors' },
            { x: 5265, w: 46, h: 78, sprite: 'prop_gas_tanks' },
            { x: 6245, w: 86, h: 68, sprite: 'prop_generator' },
            { x: 6940, kind: 'emergency_doors' },
            { x: 7820, w: 42, h: 72, sprite: 'prop_barrel_blue' },
            { x: 8680, w: 92, h: 72, sprite: 'prop_console', glow: true },
            { x: 9490, w: 92, h: 72, sprite: 'prop_console', glow: true },
            { x: 10330, w: 92, h: 72, sprite: 'prop_console', glow: true },
            { x: 11420, w: 92, h: 72, sprite: 'prop_console', glow: true }
        ];

        // Pickups 100% en sprites HD (pickup_medkit, pickup_ammo, pickup_money, pickup_points)
        this.pickups = [
            { x: 645, y: GROUND_Y - 134, width: 36, height: 30, type: 'money', taken: false },
            { x: 945, y: GROUND_Y - 188, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 1820, y: GROUND_Y - 192, width: 36, height: 32, type: 'medkit', taken: false },
            { x: 2840, y: GROUND_Y - 314, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 2890, y: GROUND_Y - 314, width: 34, height: 32, type: 'points', taken: false },
            { x: 3710, y: GROUND_Y - 190, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 4780, y: GROUND_Y - 190, width: 36, height: 32, type: 'medkit', taken: false },
            { x: 5790, y: GROUND_Y - 312, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 5845, y: GROUND_Y - 312, width: 36, height: 30, type: 'money', taken: false },
            { x: 6710, y: GROUND_Y - 188, width: 36, height: 32, type: 'medkit', taken: false },
            { x: 7620, y: GROUND_Y - 192, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 8620, y: GROUND_Y - 176, width: 36, height: 32, type: 'medkit', taken: false },
            { x: 9330, y: GROUND_Y - 306, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 9385, y: GROUND_Y - 306, width: 34, height: 32, type: 'points', taken: false },
            { x: 9890, y: GROUND_Y - 176, width: 36, height: 32, type: 'medkit', taken: false },
            { x: 11085, y: GROUND_Y - 186, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 11610, y: GROUND_Y - 186, width: 36, height: 32, type: 'medkit', taken: false }
        ];
    }

    _spawnInitialEntities() {
        const atlas = this.engine.spriteAtlas;

        this.player = new Player({
            x: 80,
            y: GROUND_Y - 108,
            inventory: this.engine.inventory,
            audio: this.engine.audio,
            spriteAtlas: atlas
        });

        // Las 8 especies de infectados en alta intensidad a lo largo de Hospital y Sector B-3
        this.enemies = [
            // Ala A: Recepción y Urgencias
            new Zombie('walker', { x: 810, y: GROUND_Y - 104, patrolMinX: 775, patrolMaxX: 980, spriteAtlas: atlas }),
            new Zombie('runner', { x: 1020, y: GROUND_Y - 102, patrolMinX: 840, patrolMaxX: 1260, spriteAtlas: atlas }),
            new Zombie('resistant', { x: 1220, y: GROUND_Y - 108, patrolMinX: 980, patrolMaxX: 1300, spriteAtlas: atlas }),
            new Zombie('spitter', { x: 1760, y: GROUND_Y - 104, patrolMinX: 1630, patrolMaxX: 1990, spriteAtlas: atlas }),
            new Zombie('leaper', { x: 2090, y: GROUND_Y - 98, patrolMinX: 1880, patrolMaxX: 2195, spriteAtlas: atlas }),
            new Zombie('resistant', { x: 2440, y: GROUND_Y - 108, patrolMinX: 2330, patrolMaxX: 2680, spriteAtlas: atlas }),
            new Zombie('bomber', { x: 2790, y: GROUND_Y - 108, patrolMinX: 2580, patrolMaxX: 3010, spriteAtlas: atlas }),
            new Zombie('spitter', { x: 3480, y: GROUND_Y - 104, patrolMinX: 3350, patrolMaxX: 3720, spriteAtlas: atlas }),
            new Zombie('armored', { x: 3790, y: GROUND_Y - 112, patrolMinX: 3560, patrolMaxX: 3980, spriteAtlas: atlas }),

            // Ala B: Bloque Quirúrgico en Apagón
            new Zombie('runner', { x: 4560, y: GROUND_Y - 102, patrolMinX: 4520, patrolMaxX: 4820, spriteAtlas: atlas }),
            new Zombie('spitter', { x: 4760, y: GROUND_Y - 104, patrolMinX: 4580, patrolMaxX: 4940, spriteAtlas: atlas }),
            new Zombie('bomber', { x: 5290, y: GROUND_Y - 108, patrolMinX: 5260, patrolMaxX: 5520, spriteAtlas: atlas }),
            new Zombie('leaper', { x: 5620, y: GROUND_Y - 98 - 148, patrolMinX: 5500, patrolMaxX: 5830, spriteAtlas: atlas }),
            new Zombie('armored', { x: 5960, y: GROUND_Y - 112, patrolMinX: 5820, patrolMaxX: 6140, spriteAtlas: atlas }),
            new Zombie('spitter', { x: 6340, y: GROUND_Y - 104, patrolMinX: 6270, patrolMaxX: 6560, spriteAtlas: atlas }),
            new Zombie('runner', { x: 6720, y: GROUND_Y - 102 - 150, patrolMinX: 6540, patrolMaxX: 6890, spriteAtlas: atlas }),
            new Zombie('brute', { x: 7040, y: GROUND_Y - 126, patrolMinX: 6900, patrolMaxX: 7125, spriteAtlas: atlas }),
            new Zombie('leaper', { x: 7520, y: GROUND_Y - 98, patrolMinX: 7400, patrolMaxX: 7860, spriteAtlas: atlas }),
            new Zombie('spitter', { x: 7780, y: GROUND_Y - 104, patrolMinX: 7560, patrolMaxX: 7900, spriteAtlas: atlas }),

            // Ala C: Subsuelo Biotech Labs Sector B-3
            new Zombie('armored', { x: 8390, y: GROUND_Y - 112, patrolMinX: 8340, patrolMaxX: 8490, spriteAtlas: atlas }),
            new Zombie('spitter', { x: 8640, y: GROUND_Y - 104 - 138, patrolMinX: 8460, patrolMaxX: 8810, spriteAtlas: atlas }),
            new Zombie('bomber', { x: 8940, y: GROUND_Y - 108, patrolMinX: 8800, patrolMaxX: 9100, spriteAtlas: atlas }),
            new Zombie('leaper', { x: 9260, y: GROUND_Y - 98 - 142, patrolMinX: 9060, patrolMaxX: 9450, spriteAtlas: atlas }),
            new Zombie('brute', { x: 9540, y: GROUND_Y - 126, patrolMinX: 9420, patrolMaxX: 9740, spriteAtlas: atlas }),
            new Zombie('bomber', { x: 9880, y: GROUND_Y - 108 - 138, patrolMinX: 9700, patrolMaxX: 10080, spriteAtlas: atlas }),
            new Zombie('armored', { x: 10180, y: GROUND_Y - 112, patrolMinX: 10050, patrolMaxX: 10225, spriteAtlas: atlas }),
            new Zombie('spitter', { x: 10440, y: GROUND_Y - 104, patrolMinX: 10330, patrolMaxX: 10680, spriteAtlas: atlas }),
            new Zombie('brute', { x: 10620, y: GROUND_Y - 126, patrolMinX: 10460, patrolMaxX: 10720, spriteAtlas: atlas })
        ];
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
        // Solo muestra las 3 armas preseleccionadas en la mochila antes de iniciar la misión
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

        const combatCallbacks = {
            onSpawnProjectile: (cfg) => this.combat.spawnProjectile(cfg),
            onPlayerMuzzleShot: (mx, my, facing, wId) => this.combat.spawnMuzzleAndCasing(mx, my, facing, wId),
            onPlayerMelee: (box, dmg, kb) => this.combat.handlePlayerMelee(box, dmg, kb, this.enemies, this.destructibles, this.player),
            onEnemyMeleeHit: (enemy, plr, dmg) => this.combat.handleEnemyMeleeHit(enemy, plr, dmg),
            onToxicExplosion: (zombie, plr) => this.combat.handleToxicExplosion(zombie, plr, this.enemies),
            onBossSlam: (boss) => this.combat.handleBossSlam(boss),
            onFloatingText: (x, y, text, color) => this.combat.spawnFloatingText(x, y, text, color),
            onLandImpact: (x, y, strength) => {
                this.combat.spawnHitParticles(x, y - 2, '#8fa6ba', Math.max(3, Math.round(strength * 5)));
            }
        };

        const activeMinX = this.arenaLocked ? ARENA_LOCK_X : 0;
        this.camera.setBounds(activeMinX, WORLD_WIDTH);

        this.player.update(
            dt,
            this.engine.input,
            this.platforms,
            WORLD_WIDTH,
            combatCallbacks,
            this.ladders,
            this.movableCrates
        );
        if (this.arenaLocked && this.player.x < activeMinX + 16) {
            this.player.x = activeMinX + 16;
            this.player.vx = 0;
        }

        // Gestión de 3 vidas + reaparición en último Checkpoint o Game Over con transformación zombi y reseteo total
        if (this.player.dead) {
            this.defeatTimer += dt;
            this.camera.follow(this.player, dt);
            if (this.defeatTimer >= 1.35 && !this.gameOverTriggered) {
                const remainingLives = this.engine.saveSystem.loseLife();
                if (remainingLives > 0) {
                    this.defeatTimer = 0;
                    const respawnX = this.arenaLocked ? (ARENA_LOCK_X + 54) : this.lastCheckpointX;
                    this.player.respawnAt(respawnX, GROUND_Y - this.player.height);
                    if (this.engine.inventory.getReserveAmmo('pistol_9mm') < 12) {
                        this.engine.inventory.addAmmo('pistol_9mm', 12);
                    }
                    this.engine.audio.playCheckpointRespawn?.();
                    this.camera.shake(8, 0.24);
                    this.combat.spawnFloatingText(
                        this.player.x - 24,
                        this.player.y - 24,
                        `♥ REAPARICIÓN EN CHECKPOINT — VIDAS: ${remainingLives}`,
                        '#47ff8c'
                    );
                } else {
                    this.gameOverTriggered = true;
                    const finalScore = this.engine.economy.getScore();
                    this.engine.saveSystem.resetGameOnPermadeath();
                    this.engine.inventory.resetMissionLoadout();
                    this.engine.sceneManager.transitionTo('gameOver', {
                        retryScene: 'briefing',
                        levelName: 'PABELLÓN DE URGENCIAS',
                        zombiesKilled: this.zombiesKilled,
                        timeSeconds: this.elapsedTime,
                        finalScore,
                        permadeath: true
                    }, 0.5);
                }
            }
            this._syncHud();
            return;
        }

        this._checkHazardsAndAcidPits();
        this._checkCheckpoints();
        this._checkMissionInteractions();
        this._checkSupplyPickups();

        for (const enemy of this.enemies) {
            enemy.update(dt, this.player, this.platforms, WORLD_WIDTH, combatCallbacks);
        }
        this.enemies = this.enemies.filter(e => !e.removable);

        this.combat.update(dt, this.player, this.enemies, this.platforms, this.destructibles, this.movableCrates);

        // Evento de horda: repone zombis y avanza hacia la alerta del Jefe Final
        this.horde?.update(dt, this.player);

        this.camera.follow(this.player, dt);
        this._syncHud();
    }

    _checkHazardsAndAcidPits() {
        const hurtbox = this.player.getHurtbox ? this.player.getHurtbox() : this.player;
        for (const hz of this.hazards) {
            const hitbox = { x: hz.x + 8, y: hz.y + 8, width: hz.width - 16, height: hz.height - 8 };
            if (CollisionSystem.intersectsAABB(hurtbox, hitbox)) {
                if (this.player.takeDamage(hz.damage, hz.x + hz.width * 0.5)) {
                    this.camera.shake(7, 0.2);
                    this.combat.spawnSpriteVfx('vfx_hit_blood', this.player.x + 22, this.player.y + 62, { targetHeight: 48 });
                    this.combat.spawnFloatingText(this.player.x, this.player.y - 12, `-${hz.damage} PÚAS`, '#ff4d5a');
                }
            }
        }

        for (const pit of this.acidPits) {
            const hitbox = { x: pit.x + 10, y: pit.y + 4, width: pit.width - 20, height: pit.height };
            if (CollisionSystem.intersectsAABB(hurtbox, hitbox)) {
                if (this.player.takeDamage(pit.damage, pit.x + pit.width * 0.5)) {
                    this.camera.shake(9, 0.24);
                    this.combat.spawnHitParticles(this.player.x + 20, this.player.y + 64, '#4eff78', 12);
                    this.combat.spawnFloatingText(this.player.x - 8, this.player.y - 14, `-${pit.damage} ÁCIDO B-3`, '#6dff92');
                }
            }
        }
    }

    _checkCheckpoints() {
        for (const cp of this.checkpoints) {
            if (cp.reached) continue;
            if (CollisionSystem.intersectsAABB(this.player, cp)) {
                cp.reached = true;
                this.lastCheckpointX = cp.x + 12;
                this.engine.audio.playPickup();
                this.engine.economy.addMoney(40);
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 40);
                this.engine.inventory.addAmmo('pistol_9mm', 16);
                this.combat.spawnFloatingText(
                    cp.x - 24,
                    cp.y - 18,
                    `✓ CHECKPOINT ${cp.label}: GUARDADO (+40 SALUD / +$40)`,
                    '#47ff8c'
                );
            }
        }
    }

    _checkMissionInteractions() {
        const interactPressed = this.engine.input.isActionJustPressed('interact');

        const pickupZone = {
            x: this.pickupStation.x - 24,
            y: this.pickupStation.y - 20,
            width: this.pickupStation.width + 48,
            height: this.pickupStation.height + 24
        };

        const deliveryZone = {
            x: this.deliveryStation.x - 24,
            y: this.deliveryStation.y - 20,
            width: this.deliveryStation.width + 48,
            height: this.deliveryStation.height + 24
        };

        if (!this.player.hasPackage && CollisionSystem.intersectsAABB(this.player, pickupZone)) {
            if (interactPressed) {
                this.player.hasPackage = true;
                this.lastCheckpointX = Math.max(this.lastCheckpointX, this.pickupStation.x + 24);
                this.engine.audio.playPickup();
                this.engine.economy.addMoney(35);
                this.combat.spawnFloatingText(
                    this.player.x - 10,
                    this.player.y - 18,
                    '🧪 SUERO ESTABILIZADOR RECIBIDO (+$35 BONO)',
                    '#5eff98'
                );
            }
        }

        if (!this.player.packageDelivered && CollisionSystem.intersectsAABB(this.player, deliveryZone)) {
            if (interactPressed) {
                if (!this.player.hasPackage) {
                    this.engine.audio.playError();
                    this.combat.spawnFloatingText(
                        this.player.x - 40,
                        this.player.y - 18,
                        '⚠ RECOGE EL SUERO EN LA FARMACIA BLINDADA',
                        '#ff5c66'
                    );
                    return;
                }

                this.player.packageDelivered = true;
                this.lastCheckpointX = ARENA_LOCK_X + 54;
                this.engine.audio.playPickup();
                this.engine.economy.addMoney(80);
                this.combat.spawnFloatingText(
                    this.player.x - 35,
                    this.player.y - 24,
                    '✓ SUERO ENTREGADO (+$80) — ¡HORDA DE INFECTADOS DETECTADA!',
                    '#47ff8c'
                );
                this._startHorde();
            }
        }
    }

    _startHorde() {
        if (this.hordeStarted) return;
        this.hordeStarted = true;
        this.arenaLocked = true;
        this.camera.setBounds(ARENA_LOCK_X, WORLD_WIDTH);
        this.camera.shake(10, 0.4);
        this.horde?.start();
    }

    _triggerBossEncounter() {
        if (this.bossSpawned) return;
        this.bossSpawned = true;
        this.arenaLocked = true;
        this.camera.shake(15, 0.5);

        this.boss = new Boss({
            x: 11720,
            y: GROUND_Y - 172,
            arenaMinX: ARENA_LOCK_X + 20,
            arenaMaxX: WORLD_WIDTH - 24,
            audio: this.engine.audio,
            spriteAtlas: this.engine.spriteAtlas,
            variant: 2
        });
        this.enemies.push(this.boss);
        this.bossBarWrap?.classList.remove('hidden');
    }

    _checkSupplyPickups() {
        for (const item of this.pickups) {
            if (item.taken) continue;
            if (CollisionSystem.intersectsAABB(this.player, item)) {
                item.taken = true;
                this.engine.audio.playPickup();
                if (item.type === 'medkit') {
                    this.engine.inventory.addMedkits(1);
                    this.combat.spawnFloatingText(item.x, item.y - 10, '+1 BOTIQUÍN [H]', '#47ff8c');
                } else if (item.type === 'money') {
                    this.engine.economy.addMoney(50);
                    this.combat.spawnFloatingText(item.x, item.y - 10, '+$50 EFECTIVO', '#47ff8c');
                } else if (item.type === 'points') {
                    this.engine.economy.addScore(100);
                    this.combat.spawnFloatingText(item.x, item.y - 10, '+100 PTS EXTRA', '#ffd166');
                } else {
                    const equipped = this.engine.inventory.getEquippedWeapon();
                    const targetWeapon = equipped.type === 'ranged' ? equipped.id : 'pistol_9mm';
                    const spec = this.engine.inventory.getWeaponSpec(targetWeapon);
                    const amount = Math.max(8, spec.magazineSize * 2);
                    this.engine.inventory.addAmmo(targetWeapon, amount);
                    this.combat.spawnFloatingText(item.x, item.y - 10, `+${amount} MUNICIÓN`, '#ffd166');
                }
            }
        }
    }

    _handleBossDefeated() {
        if (this.levelCompleted) return;
        this.levelCompleted = true;
        this.bossBarWrap?.classList.add('hidden');

        const levelInfo = this.engine.levels.getLevelById(2);
        this.moneyEarnedInRun = this.engine.economy.getMoney() - this.startMoneySnapshot;

        this.engine.economy.addMoney(levelInfo.baseMoneyReward);
        if (levelInfo.baseScoreReward > 0) {
            this.engine.economy.addScore(levelInfo.baseScoreReward);
        }
        this.scoreEarnedInRun = this.engine.economy.getScore() - this.startScoreSnapshot;

        this.engine.saveSystem.completeLevel(1, ['machete_combat', 'revolver_magnum', 'shotgun_combat', 'smg_tactical']);
        this.engine.saveSystem.completeLevel(2, ['rifle_bio', 'flamethrower_bio']);
        this.engine.audio.playVictory();

        if (this.resScore) this.resScore.textContent = `${this.scoreEarnedInRun} PTS`;
        if (this.resZombies) this.resZombies.textContent = String(this.zombiesKilled);
        if (this.resCombatMoney) this.resCombatMoney.textContent = `$${this.moneyEarnedInRun}`;
        if (this.resLevelReward) this.resLevelReward.textContent = `+$${levelInfo.baseMoneyReward}`;
        if (this.resTime) this.resTime.textContent = this._formatTime(this.elapsedTime);

        this._syncHud();
        window.setTimeout(() => {
            if (this.isSceneActive) {
                this.victoryPanel?.classList.remove('hidden');
            }
        }, 650);
    }

    _formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = Math.floor(totalSeconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    _renderHudAvatar() {
        if (!this.hudAvatarCanvas || typeof this.hudAvatarCanvas.getContext !== 'function') return;
        const atlas = this.engine.spriteAtlas;
        if (!atlas || !atlas.isReady()) return;

        const exprKey = this.player ? this.player.getExpressionKey() : 'face_normal';
        if (exprKey === this._lastAvatarKey) return;
        this._lastAvatarKey = exprKey;

        const actx = this.hudAvatarCanvas.getContext('2d');
        if (!actx || typeof actx.clearRect !== 'function') return;
        const cw = this.hudAvatarCanvas.width || 116;
        const ch = this.hudAvatarCanvas.height || 116;
        actx.clearRect(0, 0, cw, ch);
        atlas.drawSprite(actx, exprKey, 2, 4, cw - 4, ch - 6);
    }

    _syncHud() {
        const playerName = this.engine.saveSystem.getPlayerName() || 'Repartidor';
        if (this.hudPlayerName) this.hudPlayerName.textContent = playerName;

        const lives = this.engine.saveSystem.getLives();
        if (this.hudLives) {
            const hearts = '♥'.repeat(Math.min(5, Math.max(0, lives)));
            this.hudLives.textContent = `${hearts || '☠'} x${lives}`;
        }

        if (this.player) {
            const hpRatio = Math.max(0, this.player.health / this.player.maxHealth);
            if (this.hudHealthFill) this.hudHealthFill.style.width = `${Math.round(hpRatio * 100)}%`;
            if (this.hudHealthText) this.hudHealthText.textContent = `${this.player.health} / ${this.player.maxHealth}`;

            this._renderHudAvatar();

            if (!this.player.hasPackage) {
                if (this.hudPackageState) this.hudPackageState.textContent = 'Suero pendiente';
                if (this.hudObjectiveText) {
                    this.hudObjectiveText.textContent = this.player.x > 460
                        ? '⬅ Vuelve a la Farmacia Blindada y pulsa [E]'
                        : 'Recoge el Suero en la Farmacia Blindada [E]';
                }
                if (this.hudProgressFill) this.hudProgressFill.style.width = '4%';
            } else if (!this.player.packageDelivered) {
                if (this.hudPackageState) this.hudPackageState.textContent = 'Suero B-3 (Refrigerado)';
                const distLeft = Math.max(0, Math.round((this.deliveryStation.x - this.player.x) / 10));
                if (this.hudObjectiveText) {
                    this.hudObjectiveText.textContent = `Lleva el Suero a Aislamiento B-3 (${distLeft}m) [E]`;
                }
                const routeRatio = Math.max(0, Math.min(1, (this.player.x - this.pickupStation.x) / (this.deliveryStation.x - this.pickupStation.x)));
                if (this.hudProgressFill) this.hudProgressFill.style.width = `${Math.round(routeRatio * 100)}%`;
            } else if (!this.levelCompleted) {
                const horde = this.horde?.getSnapshot();
                const hordeRunning = horde && ['intro', 'active', 'warning'].includes(horde.state);

                if (hordeRunning) {
                    if (this.hudPackageState) this.hudPackageState.textContent = '✓ Entregado — Horda en curso';
                    if (this.hudObjectiveText) {
                        if (horde.state === 'warning') {
                            this.hudObjectiveText.textContent = '⚠ WARNING: PACIENTE CERO APROXIMÁNDOSE';
                        } else if (horde.state === 'intro') {
                            this.hudObjectiveText.textContent = '¡Prepárate para la horda!';
                        } else {
                            this.hudObjectiveText.textContent = `Sobrevive a la horda (${horde.killed} / ${horde.total})`;
                        }
                    }
                    if (this.hudProgressFill) {
                        const ratio = horde.total > 0 ? Math.min(1, horde.killed / horde.total) : 0;
                        this.hudProgressFill.style.width = `${Math.round(ratio * 100)}%`;
                    }
                } else {
                    if (this.hudPackageState) this.hudPackageState.textContent = '✓ Suero en Aislamiento';
                    if (this.hudObjectiveText) this.hudObjectiveText.textContent = '¡Elimina a PACIENTE CERO en el Reactor B-3!';
                    if (this.hudProgressFill) this.hudProgressFill.style.width = '100%';
                }
            } else {
                if (this.hudObjectiveText) this.hudObjectiveText.textContent = '¡Pabellón y Sector B-3 asegurados!';
            }
        }

        if (this.hudMoney) this.hudMoney.textContent = `$${this.engine.economy.getMoney()}`;
        if (this.hudScore) {
            const sc = this.engine.economy.getScore();
            const nextLife = this.engine.saveSystem.state.player.nextLifeScore || LIFE_SCORE_INTERVAL;
            this.hudScore.textContent = `${sc} (Vida: ${nextLife.toLocaleString('en-US')})`;
        }

        const weapon = this.engine.inventory.getEquippedWeapon();
        if (this.hudWeaponName) this.hudWeaponName.textContent = weapon.shortName;
        if (this.hudAmmoText) {
            if (weapon.type === 'melee') {
                this.hudAmmoText.textContent = 'CQC ∞';
            } else if (this.engine.inventory.reloading) {
                this.hudAmmoText.textContent = 'RECARGANDO...';
            } else {
                this.hudAmmoText.textContent = `${this.engine.inventory.getMagazineAmmo(weapon.id)} / ${this.engine.inventory.getReserveAmmo(weapon.id)}`;
            }
        }
        if (this.hudMedkitCount) {
            this.hudMedkitCount.textContent = String(this.engine.inventory.getMedkits());
        }

        if (this.boss && !this.boss.dead) {
            const bRatio = Math.max(0, this.boss.health / this.boss.maxHealth);
            if (this.bossNameText) this.bossNameText.textContent = this.boss.typeLabel;
            if (this.bossHealthFill) this.bossHealthFill.style.width = `${Math.round(bRatio * 100)}%`;
            if (this.bossHealthText) this.bossHealthText.textContent = `${this.boss.health} / ${this.boss.maxHealth}`;
        }
    }

    // =========================================================================
    // RENDERIZADO HD SURVIVAL HORROR: HOSPITAL GENERAL + BIOTECH LABS SECTOR B-3
    // =========================================================================

    render(renderer) {
        const ctx = renderer.ctx;
        const camX = this.camera.getRenderX();
        const camY = this.camera.getRenderY();

        this._renderInteriorArchitecture(ctx, renderer, camX, camY);
        this._renderStasisPodsAndProps(ctx, renderer, camX, camY);

        this._renderLaddersAndHazards(ctx, renderer, camX, camY);
        this._renderCheckpoints(ctx, renderer, camX, camY);
        this._renderMissionStations(ctx, renderer, camX, camY);
        this._renderPlatformsAndDestructibles(ctx, renderer, camX, camY);
        this._renderMovableCrates(ctx, renderer, camX, camY);
        this._renderAcidPits(ctx, renderer, camX, camY);
        this._renderSupplyPickups(ctx, renderer, camX, camY);

        if (this.arenaLocked) {
            this._renderArenaBarrier(ctx, camX, camY);
        }

        this.combat?.renderGroundDecals(ctx, camX, camY);

        for (const enemy of this.enemies) {
            if (enemy.x + enemy.width < camX - 150 || enemy.x > camX + renderer.width + 150) continue;
            enemy.render(ctx, camX, camY, renderer);
        }

        this.player?.render(ctx, camX, camY);
        this.combat?.render(ctx, camX, camY);

        this._renderCeilingLighting(ctx, renderer, camX, camY);
        this.player?.renderFlashlight(renderer, camX, camY);

        const inBioLab = camX > 7600;
        renderer.drawFog(inBioLab ? '75, 195, 115' : '110, 135, 155', inBioLab ? 0.56 : 0.40);
        renderer.drawVignette(0.74);
    }

    _renderInteriorArchitecture(ctx, renderer, camX, camY) {
        const inBlackout = camX >= 3700 && camX < 7900;
        const inBioLab = camX >= 7900;

        const wallGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
        if (inBioLab) {
            wallGrad.addColorStop(0, '#050c12');
            wallGrad.addColorStop(0.5, '#0d1b24');
            wallGrad.addColorStop(1, '#091418');
        } else if (inBlackout) {
            wallGrad.addColorStop(0, '#06070c');
            wallGrad.addColorStop(0.55, '#131620');
            wallGrad.addColorStop(1, '#0c0e15');
        } else {
            wallGrad.addColorStop(0, '#091017');
            wallGrad.addColorStop(0.5, '#1a2733');
            wallGrad.addColorStop(1, '#121b24');
        }
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, renderer.width, renderer.height);

        ctx.fillStyle = '#070b11';
        ctx.fillRect(0, 0, renderer.width, 72);
        ctx.fillStyle = '#162230';
        ctx.fillRect(0, 68, renderer.width, 14);

        const panelW = 360;
        const firstPanel = Math.floor(camX / panelW);
        const lastPanel = Math.floor((camX + renderer.width) / panelW) + 1;
        const atlas = this.engine.spriteAtlas;

        ctx.save();
        for (let p = firstPanel; p <= lastPanel; p++) {
            const worldX = p * panelW;
            const sx = Math.round(worldX - camX);

            ctx.fillStyle = '#0d141d';
            ctx.fillRect(sx, 80, 26, GROUND_Y - 80);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.strokeRect(sx + 26, 84, panelW - 26, GROUND_Y - 84);

            ctx.fillStyle = worldX >= 8200 ? '#112228' : '#18222d';
            ctx.fillRect(sx + 26, GROUND_Y - 145, panelW - 26, 145);
            ctx.fillStyle = worldX >= 8200 ? '#2fa866' : '#7b222c';
            ctx.fillRect(sx + 26, GROUND_Y - 148, panelW - 26, 5);

            if (p % 4 === 1 && worldX < 8000) {
                ctx.fillStyle = '#b8c4d0';
                ctx.strokeStyle = '#263240';
                ctx.lineWidth = 3;
                ctx.fillRect(sx + 70, 156, 220, 74);
                ctx.strokeRect(sx + 70, 156, 220, 74);

                ctx.fillStyle = '#b51924';
                ctx.fillRect(sx + 96, 174, 12, 38);
                ctx.fillRect(sx + 83, 187, 38, 12);

                ctx.fillStyle = '#151d26';
                ctx.font = 'bold 20px Impact, "Arial Black", sans-serif';
                ctx.fillText('HOSPITAL', sx + 136, 190);
                ctx.fillText('GENERAL', sx + 136, 214);
            } else if (p % 3 === 0 && worldX >= 8200) {
                if (atlas?.getExtImage()) {
                    atlas.drawSprite(ctx, 'prop_sign_biohazard', sx + 148, 158, 72, 76);
                }
                ctx.fillStyle = '#86ffad';
                ctx.font = 'bold 16px Consolas, monospace';
                ctx.fillText('BIOTECH LABS // B-3', sx + 96, 252);
            }

            if (p % 2 === 1 && worldX < 8200 && atlas?.getExtImage()) {
                atlas.drawSprite(ctx, 'vfx_blood_splat', sx + 268, GROUND_Y - 210, 56, 52, { alpha: 0.72 });
            }
        }
        ctx.restore();

        const gy = Math.round(GROUND_Y - camY);
        const floorGrad = ctx.createLinearGradient(0, gy, 0, renderer.height);
        floorGrad.addColorStop(0, inBioLab ? '#16262b' : '#1b2532');
        floorGrad.addColorStop(0.25, '#0c121a');
        floorGrad.addColorStop(1, '#04060a');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, gy, renderer.width, renderer.height - gy);

        ctx.fillStyle = inBioLab ? '#365864' : '#3a4b60';
        ctx.fillRect(0, gy, renderer.width, 5);
    }

    _renderStasisPodsAndProps(ctx, renderer, camX, camY) {
        const atlas = this.engine.spriteAtlas;

        for (const pod of this.stasisPods) {
            const sx = Math.round(pod.x - camX);
            const sy = Math.round(GROUND_Y - 330 - camY);
            if (sx + 180 < 0 || sx - 40 > renderer.width) continue;

            const glowCol = pod.broken ? 'rgba(72, 255, 118, 0.22)' : 'rgba(62, 255, 128, 0.36)';
            renderer.drawRadialGlow(sx + 72, sy + 165, 16, 175, glowCol);

            ctx.save();
            ctx.fillStyle = pod.broken ? 'rgba(35, 95, 58, 0.22)' : 'rgba(48, 225, 108, 0.24)';
            ctx.strokeStyle = pod.broken ? '#4f8f66' : '#6bff9c';
            ctx.lineWidth = 3;
            ctx.fillRect(sx, sy + 24, 144, 276);
            ctx.strokeRect(sx, sy + 24, 144, 276);

            ctx.fillStyle = '#1c2a38';
            ctx.fillRect(sx - 12, sy, 168, 26);
            ctx.fillRect(sx - 12, sy + 298, 168, 32);

            if (!pod.broken && pod.specimen && atlas?.isReady()) {
                const floatY = Math.sin(this.time * 2.4 + pod.x) * 6;
                atlas.drawFrame(ctx, pod.specimen, Math.floor(this.time * 4), sx + 72, sy + 282 + floatY, {
                    targetHeight: 118,
                    alpha: 0.78
                });
            }

            if (pod.broken) {
                ctx.strokeStyle = '#dcffe6';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(sx + 26, sy + 64);
                ctx.lineTo(sx + 84, sy + 148);
                ctx.lineTo(sx + 42, sy + 225);
                ctx.lineTo(sx + 112, sy + 286);
                ctx.stroke();
            }
            ctx.restore();
        }

        for (const prop of this.hospitalProps) {
            const sx = Math.round(prop.x - camX);
            const gy = Math.round(GROUND_Y - camY);
            if (sx + 200 < 0 || sx - 60 > renderer.width) continue;

            if (prop.kind === 'emergency_doors') {
                ctx.save();
                ctx.fillStyle = '#273240';
                ctx.strokeStyle = '#0e141c';
                ctx.lineWidth = 3;
                ctx.fillRect(sx, gy - 174, 142, 174);
                ctx.strokeRect(sx, gy - 174, 142, 174);
                ctx.beginPath();
                ctx.moveTo(sx + 71, gy - 174);
                ctx.lineTo(sx + 71, gy);
                ctx.stroke();

                ctx.fillStyle = '#0b1118';
                ctx.fillRect(sx + 20, gy - 144, 30, 52);
                ctx.fillRect(sx + 92, gy - 144, 30, 52);

                renderer.drawRadialGlow(sx + 71, gy - 196, 6, 82, 'rgba(255, 36, 48, 0.42)');
                ctx.fillStyle = '#c81926';
                ctx.fillRect(sx + 16, gy - 210, 110, 26);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 13px Consolas, monospace';
                ctx.fillText('EMERGENCIA', sx + 28, gy - 192);
                ctx.restore();
            } else if (prop.sprite && atlas?.isReady()) {
                if (prop.glow) {
                    renderer.drawRadialGlow(sx + prop.w * 0.5, gy - prop.h * 0.5, 4, 68, 'rgba(65, 255, 125, 0.28)');
                }
                atlas.drawSprite(ctx, prop.sprite, sx, gy - prop.h, prop.w, prop.h);
            }
        }
    }

    _renderLaddersAndHazards(ctx, renderer, camX, camY) {
        const atlas = this.engine.spriteAtlas;

        for (const lad of this.ladders) {
            const lx = Math.round(lad.x - camX);
            const ly = Math.round(lad.y - camY);
            if (lx + lad.width < -30 || lx > renderer.width + 30) continue;

            if (atlas?.isReady()) {
                const segH = 74;
                const count = Math.ceil(lad.height / segH);
                for (let s = 0; s < count; s++) {
                    const drawY = ly + s * segH;
                    const h = Math.min(segH, (ly + lad.height) - drawY);
                    atlas.drawSprite(ctx, 'prop_ladder', lx, drawY, lad.width, Math.max(24, h));
                }
            }
        }

        for (const hz of this.hazards) {
            const hx = Math.round(hz.x - camX);
            const hy = Math.round(hz.y - camY);
            if (hx + hz.width < -30 || hx > renderer.width + 30) continue;

            if (atlas?.isReady()) {
                atlas.drawSprite(ctx, 'prop_spikes', hx, hy, hz.width, hz.height);
            }
        }
    }

    _renderAcidPits(ctx, renderer, camX, camY) {
        for (const pit of this.acidPits) {
            const px = Math.round(pit.x - camX);
            const py = Math.round(pit.y - camY);
            if (px + pit.width < -40 || px > renderer.width + 40) continue;

            renderer.drawRadialGlow(px + pit.width * 0.5, py + 10, 10, pit.width * 0.65, 'rgba(68, 255, 110, 0.35)');

            ctx.save();
            ctx.fillStyle = '#121922';
            ctx.fillRect(px - 6, py + 6, pit.width + 12, 36);

            const acidGrad = ctx.createLinearGradient(0, py + 4, 0, py + 34);
            acidGrad.addColorStop(0, '#7dff96');
            acidGrad.addColorStop(0.45, '#27d85c');
            acidGrad.addColorStop(1, '#0b5222');
            ctx.fillStyle = acidGrad;
            ctx.fillRect(px, py + 6, pit.width, 28);

            ctx.fillStyle = '#eaffef';
            for (let b = 0; b < 5; b++) {
                const bx = px + 24 + b * ((pit.width - 48) / 4);
                const by = py + 10 + Math.sin(this.time * 6 + b * 1.7) * 4;
                ctx.beginPath();
                ctx.arc(bx, by, 3.2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
    }

    _renderCheckpoints(ctx, renderer, camX, camY) {
        const atlas = this.engine.spriteAtlas;
        const gy = Math.round(GROUND_Y - camY);

        for (const cp of this.checkpoints) {
            const cx = Math.round(cp.x - camX);
            if (cx < -160 || cx > renderer.width + 160) continue;

            renderer.drawRadialGlow(
                cx + 62,
                gy - 58,
                6,
                88,
                cp.reached ? 'rgba(56, 229, 125, 0.36)' : 'rgba(76, 201, 240, 0.30)'
            );

            if (atlas?.isReady()) {
                atlas.drawSprite(ctx, 'prop_work_light', cx - 6, gy - 98, 48, 98);
                atlas.drawSprite(ctx, 'prop_generator', cx + 28, gy - 58, 72, 58);
                atlas.drawSprite(ctx, 'prop_console', cx + 88, gy - 68, 66, 68);
            }

            ctx.save();
            ctx.font = 'bold 11px Consolas, monospace';
            const tag = cp.reached ? `✓ ${cp.label} [GUARDADO]` : `⚑ ${cp.label}`;
            ctx.fillStyle = '#04070c';
            ctx.fillText(tag, cx + 3, gy - 105);
            ctx.fillStyle = cp.reached ? '#47ff8c' : '#90e0ef';
            ctx.fillText(tag, cx + 2, gy - 106);
            ctx.restore();
        }
    }

    _renderMissionStations(ctx, renderer, camX, camY) {
        const atlas = this.engine.spriteAtlas;
        const gy = Math.round(GROUND_Y - camY);

        const px = Math.round(this.pickupStation.x - camX);
        if (px + 220 > 0 && px < renderer.width) {
            renderer.drawRadialGlow(px + 84, gy - 64, 8, 96, 'rgba(76, 201, 240, 0.36)');
            if (atlas?.isReady()) {
                atlas.drawSprite(ctx, 'prop_fence_bio', px - 8, gy - 96, 134, 96);
                atlas.drawSprite(ctx, 'prop_console', px + 14, gy - 72, 74, 72);
                atlas.drawSprite(ctx, 'prop_crate_military', px + 92, gy - 48, 56, 48);
            }

            ctx.save();
            ctx.font = 'bold 11px Consolas, monospace';
            if (!this.player?.hasPackage) {
                const bob = Math.sin(this.time * 4.5) * 4;
                if (atlas?.isReady()) {
                    atlas.drawSprite(ctx, 'pickup_package', px + 98, gy - 88 + bob, 46, 38);
                }
                ctx.fillStyle = '#04070c';
                ctx.fillText('[E] RECOGER SUERO — FARMACIA B-3', px - 7, gy - 111 + bob);
                ctx.fillStyle = '#90e0ef';
                ctx.fillText('[E] RECOGER SUERO — FARMACIA B-3', px - 8, gy - 112 + bob);
            } else {
                ctx.fillStyle = '#9fb2c8';
                ctx.fillText('✓ SUERO EN RUTA', px + 16, gy - 110);
            }
            ctx.restore();
        }

        const dx = Math.round(this.deliveryStation.x - camX);
        if (dx + 230 > 0 && dx < renderer.width) {
            renderer.drawRadialGlow(dx + 88, gy - 68, 10, 112, 'rgba(56, 229, 125, 0.38)');
            if (atlas?.isReady()) {
                atlas.drawSprite(ctx, 'prop_fence_bio', dx - 6, gy - 98, 138, 98);
                atlas.drawSprite(ctx, 'prop_console', dx + 22, gy - 74, 78, 74);
                atlas.drawSprite(ctx, 'prop_gas_tanks', dx + 108, gy - 78, 44, 78);
                atlas.drawSprite(ctx, 'prop_work_light', dx + 152, gy - 98, 48, 98);
            }

            ctx.save();
            ctx.font = 'bold 11px Consolas, monospace';
            if (!this.player?.packageDelivered) {
                const bob = Math.sin(this.time * 4.5) * 4;
                ctx.fillStyle = '#04070c';
                ctx.fillText('[E] ENTREGAR SUERO — AISLAMIENTO B-3', dx - 9, gy - 113 + bob);
                ctx.fillStyle = '#5cff9d';
                ctx.fillText('[E] ENTREGAR SUERO — AISLAMIENTO B-3', dx - 10, gy - 114 + bob);
            } else {
                ctx.fillStyle = '#5cff9d';
                ctx.fillText('✓ SUERO ENTREGADO EN B-3', dx + 8, gy - 112);
            }
            ctx.restore();
        }
    }

    _renderPlatformsAndDestructibles(ctx, renderer, camX, camY) {
        const atlas = this.engine.spriteAtlas;

        for (const plat of this.platforms) {
            if (plat.kind === 'ground') continue;
            const sx = Math.round(plat.x - camX);
            const sy = Math.round(plat.y - camY);
            if (sx + plat.width < -50 || sx > renderer.width + 50) continue;

            if (!atlas?.isReady()) continue;

            if (plat.kind === 'barrier_concrete') {
                atlas.drawSprite(ctx, 'prop_barrier_yellow', sx, sy - 6, plat.width, plat.height + 6);
            } else if (plat.kind === 'barrier_red') {
                atlas.drawSprite(ctx, 'prop_barrier_red', sx, sy - 8, plat.width, plat.height + 8);
            } else if (plat.kind === 'metal_crate') {
                atlas.drawSprite(ctx, 'prop_crate_metal_hd', sx, sy, plat.width, plat.height);
            } else if (plat.kind === 'scaffold') {
                const drawH = plat.drawH || (GROUND_Y - plat.y);
                const segW = Math.min(plat.width, 156);
                const cols = Math.max(1, Math.ceil(plat.width / segW));
                const tileW = Math.ceil(plat.width / cols);
                for (let c = 0; c < cols; c++) {
                    atlas.drawSprite(ctx, 'prop_scaffold', sx + c * tileW, sy - 4, tileW + 2, drawH + 4);
                }
            } else if (plat.kind.startsWith('veh_')) {
                const drawH = plat.drawH || 102;
                const vy = Math.round(GROUND_Y - drawH - camY);
                atlas.drawSprite(ctx, plat.kind, sx, vy, plat.width, drawH);
                if (Math.sin(this.time * 10 + plat.x) > 0) {
                    renderer.drawRadialGlow(sx + plat.width * 0.56, vy + 8, 3, 56, 'rgba(255, 38, 54, 0.58)');
                }
            }
        }

        for (const prop of this.destructibles) {
            if (prop.destroyed) continue;
            const sx = Math.round(prop.x - camX);
            const sy = Math.round(prop.y - camY);
            if (sx + prop.width < -30 || sx > renderer.width + 30) continue;

            if (!atlas?.isReady()) continue;

            if (prop.kind === 'barrel_red') {
                renderer.drawRadialGlow(sx + prop.width * 0.5, sy + prop.height * 0.5, 4, 42, 'rgba(255, 72, 36, 0.26)');
                atlas.drawSprite(ctx, 'prop_barrel_red', sx, sy, prop.width, prop.height);
            } else {
                atlas.drawSprite(ctx, 'prop_crate_wood_hd', sx, sy, prop.width, prop.height);
            }
        }
    }

    _renderMovableCrates(ctx, renderer, camX, camY) {
        const atlas = this.engine.spriteAtlas;
        if (!atlas?.isReady()) return;

        for (const crate of this.movableCrates) {
            const sx = Math.round(crate.x - camX);
            const sy = Math.round(crate.y - camY);
            if (sx + crate.width < -30 || sx > renderer.width + 30) continue;

            atlas.drawSprite(ctx, crate.sprite || 'prop_crate_metal_hd', sx, sy, crate.width, crate.height);

            if (this.player && !this.player.dead) {
                const dist = Math.abs((this.player.x + this.player.width * 0.5) - (crate.x + crate.width * 0.5));
                if (dist < 78 && Math.abs((this.player.y + this.player.height) - (crate.y + crate.height)) < 24) {
                    ctx.save();
                    ctx.font = 'bold 10px Consolas, monospace';
                    ctx.fillStyle = '#05080d';
                    ctx.fillText('⇄ CAJA MÓVIL', sx - 7, sy - 7);
                    ctx.fillStyle = '#90e0ef';
                    ctx.fillText('⇄ CAJA MÓVIL', sx - 8, sy - 8);
                    ctx.restore();
                }
            }
        }
    }

    _renderSupplyPickups(ctx, renderer, camX, camY) {
        const atlas = this.engine.spriteAtlas;

        for (const item of this.pickups) {
            if (item.taken) continue;
            const sx = Math.round(item.x - camX);
            const sy = Math.round(item.y - camY + Math.sin(this.time * 4 + item.x) * 3.5);
            if (sx < -40 || sx > renderer.width + 40) continue;

            let glowCol = 'rgba(245, 166, 35, 0.36)';
            let spriteKey = 'pickup_ammo';
            if (item.type === 'medkit') {
                glowCol = 'rgba(56, 229, 125, 0.38)';
                spriteKey = 'pickup_medkit';
            } else if (item.type === 'money') {
                glowCol = 'rgba(72, 255, 138, 0.36)';
                spriteKey = 'pickup_money';
            } else if (item.type === 'points') {
                glowCol = 'rgba(255, 215, 84, 0.42)';
                spriteKey = 'pickup_points';
            }

            renderer.drawRadialGlow(sx + 18, sy + 16, 4, 38, glowCol);
            if (atlas?.isReady()) {
                atlas.drawSprite(ctx, spriteKey, sx, sy, item.width, item.height);
            }
        }
    }

    _renderCeilingLighting(ctx, renderer, camX, camY) {
        for (let i = 0; i < this.ceilingLights.length; i++) {
            const light = this.ceilingLights[i];
            const lx = Math.round(light.x - camX);
            if (lx < -220 || lx > renderer.width + 220) continue;
            const ly = Math.round(74 - camY * 0.2);

            const flicker = Math.sin(this.time * 18 + i * 2.7) > 0.91 ? 0.38 : 1.0;

            ctx.fillStyle = '#1b2634';
            ctx.fillRect(lx - 42, ly, 84, 8);

            let tubeCol = `rgba(190, 235, 255, ${(0.85 * flicker).toFixed(2)})`;
            let coneCol = `rgba(165, 220, 255, ${(0.18 * flicker).toFixed(2)})`;

            if (light.mode === 'blackout_red') {
                tubeCol = `rgba(255, 48, 62, ${(0.88 * flicker).toFixed(2)})`;
                coneCol = `rgba(255, 38, 54, ${(0.22 * flicker).toFixed(2)})`;
            } else if (light.mode === 'biolab_green') {
                tubeCol = `rgba(110, 255, 155, ${(0.85 * flicker).toFixed(2)})`;
                coneCol = `rgba(72, 255, 128, ${(0.19 * flicker).toFixed(2)})`;
            }

            ctx.fillStyle = tubeCol;
            ctx.fillRect(lx - 34, ly + 6, 68, 4);
            renderer.drawLightCone(lx, ly + 10, Math.PI * 0.5, 0.62, 320, coneCol, 'rgba(0,0,0,0)');
        }
    }

    _renderArenaBarrier(ctx, camX, camY) {
        const bx = Math.round(ARENA_LOCK_X - camX);
        if (bx < -30 || bx > 1300) return;
        ctx.save();
        ctx.fillStyle = 'rgba(56, 229, 125, 0.30)';
        ctx.fillRect(bx, 0, 16, GROUND_Y - camY);
        ctx.strokeStyle = '#47ff8c';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(bx, 0, 16, GROUND_Y - camY);
        ctx.restore();
    }
}
