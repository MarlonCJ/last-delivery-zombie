/**
 * Level01.js
 * Primer Nivel Jugable Extendido: "PRIMERA ENTREGA" (10,400 px — 4 Sectores Urbanos).
 * Escenario urbano nocturno HD con profundidad simétrica 2.5D, vehículos y objetos
 * renderizados 100% mediante sprites pixel-art HD (ambulancias, patrullas, taxis, camiones,
 * andamios, generadores, consolas, paradas de autobús, cajas empujables, VFX en sprites),
 * sistema de 3 vidas con reaparición en Checkpoints, vida extra cada 10,000 pts
 * y 8 tipos de zombis.
 */

import { Camera2D } from '../core/Camera2D.js';
import { CollisionSystem } from '../core/CollisionSystem.js';
import { Player } from '../entities/Player.js';
import { Zombie } from '../entities/Zombie.js';
import { Boss } from '../entities/Boss.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { HordeSystem } from '../systems/HordeSystem.js';
import { LIFE_SCORE_INTERVAL } from '../systems/SaveSystem.js';

const WORLD_WIDTH = 10400;
const WORLD_HEIGHT = 720;
const GROUND_Y = 590;
const ARENA_LOCK_X = 9040;

export class Level01 {
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
        this.checkpoints = [];
        this.sectorSigns = [];
        this.scenicProps = [];
        this.streetLamps = [];
        this.pickups = [];
        this.combat = null;
        this.horde = null;
        this.hordeStarted = false;

        // Puntos clave de la misión de reparto con sprites reales (parada urbana + palé/consola)
        this.pickupStation = { x: 205, y: GROUND_Y - 124, width: 168, height: 124 };
        this.deliveryStation = { x: 9240, y: GROUND_Y - 128, width: 176, height: 128 };
        this._streetTileCanvas = null;

        // Estadísticas de la partida actual
        this.elapsedTime = 0;
        this.zombiesKilled = 0;
        this.moneyEarnedInRun = 0;
        this.scoreEarnedInRun = 0;
        this.startMoneySnapshot = 0;
        this.startScoreSnapshot = 0;
        this.lastCheckpointX = 80;

        // Estados de control de escena
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

        // Barra del Jefe Final
        this.bossBarWrap = document.getElementById('hud-boss-bar');
        this.bossNameText = document.getElementById('hud-boss-name');
        this.bossHealthFill = document.getElementById('hud-boss-fill');
        this.bossHealthText = document.getElementById('hud-boss-hp-text');

        // Submenús en partida (Inventario, Pausa, Victoria)
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
            this.engine.sceneManager.transitionTo('level01', {}, 0.35);
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
            this.engine.sceneManager.transitionTo('shop', { fromLevel: 1, nextScene: 'briefing' }, 0.45);
        });

        this.btnVictoryContinue?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.audio.playConfirm();
            this.victoryPanel?.classList.add('hidden');
            this.engine.sceneManager.transitionTo('briefing', { levelId: 2 }, 0.45);
        });
    }

    enter() {
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
            this.hudMissionHeader.textContent = '🎯 MISIÓN 01: PRIMERA ENTREGA';
        }
        if (this.victoryMissionTitle) {
            this.victoryMissionTitle.textContent = '¡MISIÓN COMPLETADA: PRIMERA ENTREGA!';
        }
        if (this.btnVictoryContinue) {
            this.btnVictoryContinue.textContent = 'PREPARAR ARMAS — NIVEL 02 ▶';
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
                    this.engine.economy.addMoney(25);
                    this.combat.spawnFloatingText(cx - 16, cy - 12, '+$25 BOTÍN', '#47ff8c');
                } else {
                    const equipped = this.engine.inventory.getEquippedWeapon();
                    const wId = equipped.type === 'ranged' ? equipped.id : 'pistol_9mm';
                    this.engine.inventory.addAmmo(wId, 14);
                    this.combat.spawnFloatingText(cx - 24, cy - 12, '+14 MUNICIÓN', '#ffd166');
                }
                this.engine.audio.playPickup();
            }
        });

        // Evento de horda previo al Jefe Final: 10 zombis en Nivel 01, 5 activos a la vez.
        this.horde = new HordeSystem({
            levelId: 1,
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
        this.engine.audio.startAmbience('menu');
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
        // Suelo principal + andamios escalables (prop_scaffold) + vehículos HD escalables (veh_ambulance, veh_police, veh_taxi, veh_truck)
        this.platforms = [
            { x: 0, y: GROUND_Y, width: WORLD_WIDTH, height: 150, kind: 'ground', oneWay: false },

            // SECTOR 1 (0 - 2700): Avenida Sur y Minimarket
            { x: 585, y: GROUND_Y - 52, width: 102, height: 52, kind: 'barrier_concrete', oneWay: false },
            { x: 735, y: GROUND_Y - 148, width: 268, height: 18, drawH: 148, kind: 'scaffold', oneWay: true },
            { x: 1150, y: GROUND_Y - 64, width: 72, height: 64, kind: 'metal_crate', oneWay: false },
            { x: 1475, y: GROUND_Y - 152, width: 286, height: 18, drawH: 152, kind: 'scaffold', oneWay: true },
            { x: 1895, y: GROUND_Y - 52, width: 102, height: 52, kind: 'barrier_red', oneWay: false },
            { x: 2135, y: GROUND_Y - 98, width: 232, height: 18, drawH: 102, kind: 'veh_ambulance', oneWay: true },
            { x: 2430, y: GROUND_Y - 154, width: 262, height: 18, drawH: 154, kind: 'scaffold', oneWay: true },

            // SECTOR 2 (2700 - 5600): Paso Elevado Comercial en Llamas
            { x: 2940, y: GROUND_Y - 64, width: 72, height: 64, kind: 'metal_crate', oneWay: false },
            { x: 3180, y: GROUND_Y - 150, width: 262, height: 18, drawH: 150, kind: 'scaffold', oneWay: true },
            { x: 3610, y: GROUND_Y - 76, width: 214, height: 18, drawH: 80, kind: 'veh_taxi', oneWay: true },
            { x: 4050, y: GROUND_Y - 150, width: 312, height: 18, drawH: 150, kind: 'scaffold', oneWay: true },
            { x: 4220, y: GROUND_Y - 274, width: 238, height: 18, drawH: 124, kind: 'scaffold', oneWay: true },
            { x: 4660, y: GROUND_Y - 94, width: 222, height: 18, drawH: 98, kind: 'veh_police', oneWay: true },
            { x: 5040, y: GROUND_Y - 154, width: 290, height: 18, drawH: 154, kind: 'scaffold', oneWay: true },
            { x: 5460, y: GROUND_Y - 52, width: 102, height: 52, kind: 'barrier_concrete', oneWay: false },

            // SECTOR 3 (5600 - 8900): Cordón Militar de Cuarentena Biogen
            { x: 5840, y: GROUND_Y - 64, width: 72, height: 64, kind: 'metal_crate', oneWay: false },
            { x: 6120, y: GROUND_Y - 152, width: 296, height: 18, drawH: 152, kind: 'scaffold', oneWay: true },
            { x: 6560, y: GROUND_Y - 106, width: 256, height: 18, drawH: 110, kind: 'veh_truck', oneWay: true },
            { x: 7140, y: GROUND_Y - 150, width: 320, height: 18, drawH: 150, kind: 'scaffold', oneWay: true },
            { x: 7310, y: GROUND_Y - 274, width: 235, height: 18, drawH: 124, kind: 'scaffold', oneWay: true },
            { x: 7755, y: GROUND_Y - 98, width: 232, height: 18, drawH: 102, kind: 'veh_ambulance', oneWay: true },
            { x: 8160, y: GROUND_Y - 152, width: 282, height: 18, drawH: 152, kind: 'scaffold', oneWay: true },
            { x: 8640, y: GROUND_Y - 64, width: 72, height: 64, kind: 'metal_crate', oneWay: false },
            { x: 8890, y: GROUND_Y - 52, width: 102, height: 52, kind: 'barrier_red', oneWay: false },

            // SECTOR 4 (9040 - 10400): Refugio Norte y Arena del Mutante B-3
            { x: 9480, y: GROUND_Y - 144, width: 218, height: 18, drawH: 144, kind: 'scaffold', oneWay: true },
            { x: 9920, y: GROUND_Y - 144, width: 218, height: 18, drawH: 144, kind: 'scaffold', oneWay: true }
        ];

        // Cajas móviles / empujables por el protagonista (animación player_push + soporte de salto/cobertura)
        this.movableCrates = [
            { x: 465, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_wood_hd' },
            { x: 1335, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_metal_hd' },
            { x: 2815, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_wood_hd' },
            { x: 3930, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_wood_hd' },
            { x: 5945, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_metal_hd' },
            { x: 7590, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_wood_hd' },
            { x: 9395, y: GROUND_Y - 56, width: 56, height: 56, vx: 0, vy: 0, sprite: 'prop_crate_metal_hd' }
        ];

        // Escaleras verticales escalables ([W] / [S]) con animación trasera HD player_climb_back
        this.ladders = [
            { x: 748, y: GROUND_Y - 148, width: 38, height: 148 },
            { x: 1490, y: GROUND_Y - 152, width: 38, height: 152 },
            { x: 2445, y: GROUND_Y - 154, width: 38, height: 154 },
            { x: 3195, y: GROUND_Y - 150, width: 38, height: 150 },
            { x: 4070, y: GROUND_Y - 150, width: 38, height: 150 },
            { x: 4240, y: GROUND_Y - 274, width: 38, height: 126 },
            { x: 5060, y: GROUND_Y - 154, width: 38, height: 154 },
            { x: 6140, y: GROUND_Y - 152, width: 38, height: 152 },
            { x: 7160, y: GROUND_Y - 150, width: 38, height: 150 },
            { x: 7330, y: GROUND_Y - 274, width: 38, height: 126 },
            { x: 8180, y: GROUND_Y - 152, width: 38, height: 152 },
            { x: 9498, y: GROUND_Y - 144, width: 38, height: 144 },
            { x: 10080, y: GROUND_Y - 144, width: 38, height: 144 }
        ];

        // Puestos de Control Intermedios (guardan punto de reaparición de vidas!)
        this.checkpoints = [
            { x: 3480, y: GROUND_Y - 96, width: 124, height: 96, label: 'CONTROL ALFA', reached: false },
            { x: 6850, y: GROUND_Y - 96, width: 124, height: 96, label: 'CONTROL BRAVO', reached: false }
        ];

        // Señalización urbana real con sprites HD (prop_sign_street, prop_traffic_light, prop_sign_stop)
        this.sectorSigns = [
            { x: 410, title: 'SECTOR 01', sub: 'AVENIDA SUR', sprite: 'prop_sign_street', w: 54, h: 104 },
            { x: 2770, title: 'SECTOR 02', sub: 'DISTRITO COMERCIAL', sprite: 'prop_traffic_light', w: 38, h: 112 },
            { x: 5710, title: 'SECTOR 03', sub: 'CORDÓN BIOGEN', sprite: 'prop_sign_stop', w: 52, h: 106 },
            { x: 9105, title: 'SECTOR 04', sub: 'REFUGIO NORTE', sprite: 'prop_sign_street', w: 54, h: 104 }
        ];

        // Cajas de madera destructibles, barriles explosivos y vehículos incendiables (vfx_car_explosion)
        this.destructibles = [
            { x: 686, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 955, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 1620, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false },
            { x: 1730, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 2580, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 3025, y: GROUND_Y - 72, width: 196, height: 72, kind: 'vehicle_wreck', sprite: 'veh_car', hp: 70, destroyed: false },
            { x: 3850, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false },
            { x: 4460, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 4930, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 5340, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 6025, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false },
            { x: 6390, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 7020, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 8045, y: GROUND_Y - 72, width: 196, height: 72, kind: 'vehicle_wreck', sprite: 'veh_car', hp: 70, destroyed: false },
            { x: 8510, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            // Barriles tácticos en la arena del Jefe Final
            { x: 9740, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 10220, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false }
        ];

        // Trampas de púas en el pavimento
        this.hazards = [
            { x: 1235, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 },
            { x: 2375, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 },
            { x: 3365, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 },
            { x: 4545, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 },
            { x: 5755, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 },
            { x: 7480, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 },
            { x: 8740, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 }
        ];

        // Decoración urbana 100% en sprites HD (hidrantes, contenedores, bancas, neumáticos, vallas bio, bolsas)
        this.scenicProps = [
            { x: 92, y: GROUND_Y - 88, w: 148, h: 88, sprite: 'prop_fence_wide' },
            { x: 382, y: GROUND_Y - 54, w: 32, h: 54, sprite: 'prop_hydrant' },
            { x: 1035, y: GROUND_Y - 76, w: 108, h: 76, sprite: 'prop_dumpster' },
            { x: 1412, y: GROUND_Y - 66, w: 40, h: 66, sprite: 'prop_electric_box', sparks: true },
            { x: 2015, y: GROUND_Y - 52, w: 58, h: 52, sprite: 'prop_trash_bags' },
            { x: 2695, y: GROUND_Y - 88, w: 124, h: 88, sprite: 'prop_fence_bio' },
            { x: 3300, y: GROUND_Y - 52, w: 92, h: 52, sprite: 'prop_bench' },
            { x: 3835, y: GROUND_Y - 66, w: 40, h: 66, sprite: 'prop_electric_box', sparks: true },
            { x: 4380, y: GROUND_Y - 56, w: 58, h: 56, sprite: 'prop_tires' },
            { x: 5210, y: GROUND_Y - 68, w: 98, h: 68, sprite: 'prop_wood_barricade' },
            { x: 5625, y: GROUND_Y - 88, w: 124, h: 88, sprite: 'prop_fence_bio' },
            { x: 6320, y: GROUND_Y - 66, w: 40, h: 66, sprite: 'prop_electric_box', sparks: true },
            { x: 6995, y: GROUND_Y - 66, w: 38, h: 66, sprite: 'prop_barrel_blue' },
            { x: 7980, y: GROUND_Y - 52, w: 58, h: 52, sprite: 'prop_trash_bags' },
            { x: 8420, y: GROUND_Y - 66, w: 40, h: 66, sprite: 'prop_electric_box', sparks: true },
            { x: 9175, y: GROUND_Y - 88, w: 124, h: 88, sprite: 'prop_fence_bio' },
            { x: 10285, y: GROUND_Y - 88, w: 148, h: 88, sprite: 'prop_fence_wide' }
        ];

        // Farolas urbanas con iluminación volumétrica
        this.streetLamps = [
            185, 665, 1215, 1785, 2355, 2910, 3490, 4020, 4620, 5180,
            5760, 6340, 6880, 7420, 7990, 8560, 9140, 9620, 10040
        ];

        // Pickups 100% en sprites HD (pickup_medkit, pickup_ammo, pickup_money, pickup_points)
        this.pickups = [
            { x: 865, y: GROUND_Y - 186, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 1615, y: GROUND_Y - 190, width: 36, height: 32, type: 'medkit', taken: false },
            { x: 2230, y: GROUND_Y - 134, width: 36, height: 30, type: 'money', taken: false },
            { x: 2545, y: GROUND_Y - 194, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 3295, y: GROUND_Y - 188, width: 36, height: 32, type: 'medkit', taken: false },
            { x: 4325, y: GROUND_Y - 312, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 4380, y: GROUND_Y - 312, width: 34, height: 32, type: 'points', taken: false },
            { x: 4755, y: GROUND_Y - 132, width: 36, height: 32, type: 'medkit', taken: false },
            { x: 5180, y: GROUND_Y - 192, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 6260, y: GROUND_Y - 190, width: 36, height: 32, type: 'medkit', taken: false },
            { x: 6670, y: GROUND_Y - 144, width: 36, height: 30, type: 'money', taken: false },
            { x: 7420, y: GROUND_Y - 312, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 7855, y: GROUND_Y - 134, width: 34, height: 32, type: 'points', taken: false },
            { x: 8290, y: GROUND_Y - 190, width: 36, height: 32, type: 'medkit', taken: false },
            { x: 9580, y: GROUND_Y - 182, width: 36, height: 32, type: 'ammo', taken: false },
            { x: 9995, y: GROUND_Y - 182, width: 36, height: 32, type: 'medkit', taken: false }
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

        // Nivel 1: únicamente caminantes de nivel 1, hombre y mujer.
        this.enemies = [
            // Sector 1: Avenida Sur
            new Zombie('walker', { x: 550, y: GROUND_Y - 104, patrolMinX: 500, patrolMaxX: 575, spriteAtlas: atlas }),
            new Zombie('walker_female', { x: 855, y: GROUND_Y - 102, patrolMinX: 730, patrolMaxX: 1110, spriteAtlas: atlas }),
            new Zombie('walker', { x: 1055, y: GROUND_Y - 104, patrolMinX: 890, patrolMaxX: 1135, spriteAtlas: atlas }),
            new Zombie('walker_female', { x: 1500, y: GROUND_Y - 102, patrolMinX: 1420, patrolMaxX: 1830, spriteAtlas: atlas }),
            new Zombie('walker', { x: 1790, y: GROUND_Y - 104, patrolMinX: 1550, patrolMaxX: 1875, spriteAtlas: atlas }),
            new Zombie('walker_female', { x: 2060, y: GROUND_Y - 102, patrolMinX: 2005, patrolMaxX: 2340, spriteAtlas: atlas }),

            // Sector 2: Distrito Comercial
            new Zombie('walker', { x: 2555, y: GROUND_Y - 104, patrolMinX: 2450, patrolMaxX: 2790, spriteAtlas: atlas }),
            new Zombie('walker_female', { x: 2860, y: GROUND_Y - 102, patrolMinX: 2730, patrolMaxX: 2930, spriteAtlas: atlas }),
            new Zombie('walker', { x: 3210, y: GROUND_Y - 104, patrolMinX: 3100, patrolMaxX: 3440, spriteAtlas: atlas }),
            new Zombie('walker_female', { x: 3820, y: GROUND_Y - 102, patrolMinX: 3680, patrolMaxX: 4160, spriteAtlas: atlas }),
            new Zombie('walker', { x: 4190, y: GROUND_Y - 104, patrolMinX: 4000, patrolMaxX: 4430, spriteAtlas: atlas }),
            new Zombie('walker_female', { x: 4410, y: GROUND_Y - 102, patrolMinX: 4220, patrolMaxX: 4520, spriteAtlas: atlas }),
            new Zombie('walker', { x: 4960, y: GROUND_Y - 104, patrolMinX: 4895, patrolMaxX: 5280, spriteAtlas: atlas }),
            new Zombie('walker_female', { x: 5380, y: GROUND_Y - 102, patrolMinX: 5210, patrolMaxX: 5450, spriteAtlas: atlas }),

            // Sector 3: Cordón Militar de Cuarentena
            new Zombie('walker', { x: 5710, y: GROUND_Y - 104, patrolMinX: 5620, patrolMaxX: 5825, spriteAtlas: atlas }),
            new Zombie('walker_female', { x: 6180, y: GROUND_Y - 102, patrolMinX: 6060, patrolMaxX: 6490, spriteAtlas: atlas }),
            new Zombie('walker', { x: 6460, y: GROUND_Y - 104, patrolMinX: 6220, patrolMaxX: 6680, spriteAtlas: atlas }),
            new Zombie('walker_female', { x: 6760, y: GROUND_Y - 102, patrolMinX: 6610, patrolMaxX: 6840, spriteAtlas: atlas }),
            new Zombie('walker', { x: 7180, y: GROUND_Y - 104, patrolMinX: 7040, patrolMaxX: 7440, spriteAtlas: atlas }),
            new Zombie('walker_female', { x: 7360, y: GROUND_Y - 102, patrolMinX: 7180, patrolMaxX: 7460, spriteAtlas: atlas }),
            new Zombie('walker', { x: 7710, y: GROUND_Y - 104, patrolMinX: 7630, patrolMaxX: 7960, spriteAtlas: atlas }),
            new Zombie('walker_female', { x: 8260, y: GROUND_Y - 102, patrolMinX: 8140, patrolMaxX: 8480, spriteAtlas: atlas }),
            new Zombie('walker', { x: 8590, y: GROUND_Y - 104, patrolMinX: 8420, patrolMaxX: 8630, spriteAtlas: atlas }),
            new Zombie('walker_female', { x: 8995, y: GROUND_Y - 102, patrolMinX: 8960, patrolMaxX: 9210, spriteAtlas: atlas }),
            new Zombie('walker', { x: 9130, y: GROUND_Y - 104, patrolMinX: 9010, patrolMaxX: 9230, spriteAtlas: atlas })
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
        // Solo muestra las 3 armas asignadas a la mochila ANTES de iniciar la partida
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
                this.combat.spawnHitParticles(x, y - 2, '#9db4cc', Math.max(3, Math.round(strength * 5)));
                if (Math.abs(y - GROUND_Y) <= 8 && strength > 0.45) {
                    this.combat.spawnWaterSplash(x, GROUND_Y);
                }
            }
        };

        const activeMinX = this.arenaLocked ? ARENA_LOCK_X : 0;
        this.camera.setBounds(activeMinX, WORLD_WIDTH);

        // 1. Actualizar Jugador (escaleras + cajas empujables + agacharse + rodar)
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

        // Gestión de las 3 vidas, reaparición en último Checkpoint o Game Over con transformación zombi y reseteo total
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
                        levelName: 'PRIMERA ENTREGA',
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

        // 2. Comprobar trampas de púas y puestos de control intermedios
        this._checkSpikeHazards();
        this._checkCheckpoints();

        // 3. Interacciones de Misión (Recoger paquete / Entregar paquete con E)
        this._checkMissionInteractions();

        // 4. Recogida de suministros (botiquines, munición, dinero y monedas de puntos)
        this._checkSupplyPickups();

        // 5. Actualizar Enemigos y Jefe Final
        for (const enemy of this.enemies) {
            enemy.update(dt, this.player, this.platforms, WORLD_WIDTH, combatCallbacks);
        }
        this.enemies = this.enemies.filter(e => !e.removable);

        // 6. Actualizar Sistema de Combate + VFX en sprites
        this.combat.update(dt, this.player, this.enemies, this.platforms, this.destructibles, this.movableCrates);

        // 6.1. Evento de horda: repone zombis y avanza hacia la alerta del Jefe Final
        this.horde?.update(dt, this.player);

        // 7. Actualizar Cámara y HUD
        this.camera.follow(this.player, dt);
        this._syncHud();
    }

    _checkSpikeHazards() {
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
    }

    _checkCheckpoints() {
        for (const cp of this.checkpoints) {
            if (cp.reached) continue;
            if (CollisionSystem.intersectsAABB(this.player, cp)) {
                cp.reached = true;
                this.lastCheckpointX = cp.x + 12;
                this.engine.audio.playPickup();
                this.engine.economy.addMoney(30);
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 35);
                this.engine.inventory.addAmmo('pistol_9mm', 14);
                this.combat.spawnFloatingText(
                    cp.x - 24,
                    cp.y - 18,
                    `✓ CHECKPOINT ${cp.label}: GUARDADO (+35 SALUD / +$30)`,
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
                this.engine.economy.addMoney(25);
                this.combat.spawnFloatingText(
                    this.player.x,
                    this.player.y - 18,
                    '📦 PAQUETE RECIBIDO (+$25 BONO)',
                    '#ffd166'
                );
            }
        }

        if (!this.player.packageDelivered && CollisionSystem.intersectsAABB(this.player, deliveryZone)) {
            if (interactPressed) {
                if (!this.player.hasPackage) {
                    this.engine.audio.playError();
                    this.combat.spawnFloatingText(
                        this.player.x - 30,
                        this.player.y - 18,
                        '⚠ PRIMERO RECOGE EL PAQUETE AL INICIO',
                        '#ff5c66'
                    );
                    return;
                }

                this.player.packageDelivered = true;
                this.lastCheckpointX = ARENA_LOCK_X + 54;
                this.engine.audio.playPickup();
                this.engine.economy.addMoney(60);
                this.combat.spawnFloatingText(
                    this.player.x - 20,
                    this.player.y - 24,
                    '✓ ENTREGA REGISTRADA (+$60) — ¡HORDA DE INFECTADOS DETECTADA!',
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
        this.camera.shake(12, 0.45);

        this.boss = new Boss({
            x: 10120,
            y: GROUND_Y - 156,
            arenaMinX: ARENA_LOCK_X + 20,
            arenaMaxX: WORLD_WIDTH - 24,
            audio: this.engine.audio,
            spriteAtlas: this.engine.spriteAtlas,
            variant: 1
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
                    this.engine.economy.addMoney(40);
                    this.combat.spawnFloatingText(item.x, item.y - 10, '+$40 EFECTIVO', '#47ff8c');
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

        const levelInfo = this.engine.levels.getLevelById(1);
        this.moneyEarnedInRun = this.engine.economy.getMoney() - this.startMoneySnapshot;

        this.engine.economy.addMoney(levelInfo.baseMoneyReward);
        if (levelInfo.baseScoreReward > 0) {
            this.engine.economy.addScore(levelInfo.baseScoreReward);
        }
        this.scoreEarnedInRun = this.engine.economy.getScore() - this.startScoreSnapshot;

        this.engine.saveSystem.completeLevel(1, [
            'machete_combat',
            'revolver_magnum',
            'shotgun_combat',
            'smg_tactical'
        ]);
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
                if (this.hudPackageState) this.hudPackageState.textContent = 'Pendiente de recoger';
                if (this.hudObjectiveText) {
                    this.hudObjectiveText.textContent = this.player.x > 420
                        ? '⬅ Regresa al Puesto Sur (izquierda) y pulsa [E]'
                        : 'Recibe el paquete en el Puesto Sur [Tecla E]';
                }
                if (this.hudProgressFill) this.hudProgressFill.style.width = '4%';
            } else if (!this.player.packageDelivered) {
                if (this.hudPackageState) this.hudPackageState.textContent = 'En posesión (Intacto)';
                const distLeft = Math.max(0, Math.round((this.deliveryStation.x - this.player.x) / 10));
                if (this.hudObjectiveText) {
                    this.hudObjectiveText.textContent = `Lleva el paquete al Refugio Norte (${distLeft}m) [E]`;
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
                            this.hudObjectiveText.textContent = '⚠ WARNING: JEFE FINAL APROXIMÁNDOSE';
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
                    if (this.hudPackageState) this.hudPackageState.textContent = '✓ Entregado en Refugio';
                    if (this.hudObjectiveText) this.hudObjectiveText.textContent = '¡Derrota al Jefe: Mutante de Laboratorio B-3!';
                    if (this.hudProgressFill) this.hudProgressFill.style.width = '100%';
                }
            } else {
                if (this.hudObjectiveText) this.hudObjectiveText.textContent = '¡Misión completada con éxito!';
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
    // RENDERIZADO HD 2.5D CON SPRITES REALES (CERO OBJETOS PROCEDURALES PLANOS)
    // =========================================================================

    render(renderer) {
        const ctx = renderer.ctx;
        const camX = this.camera.getRenderX();
        const camY = this.camera.getRenderY();

        // PLANO 1: Cielo tormentoso, luna llena y horizonte lejano
        this._renderFarSkylineParallax(ctx, renderer, camX);

        // PLANO 2: Distrito urbano medio envuelto en bruma azul nocturna
        this._renderMidCityParallax(ctx, renderer, camX);

        // PLANO 3: Fondo ilustrado HD city_street_hd.png a escala humana simétrica
        this._renderMainStreetBackdrop(ctx, renderer, camX, camY);

        // PLANO 4: Sprites de escenario, estaciones, checkpoints, vehículos, andamios, cajas móviles y pickups
        this._renderScenicPropsAndLadders(ctx, renderer, camX, camY);
        this._renderCheckpointsAndSigns(ctx, renderer, camX, camY);
        this._renderMissionStations(ctx, renderer, camX, camY);
        this._renderPlatformsAndDestructibles(ctx, renderer, camX, camY);
        this._renderMovableCrates(ctx, renderer, camX, camY);
        this._renderSupplyPickups(ctx, renderer, camX, camY);

        if (this.arenaLocked) {
            this._renderArenaBarrier(ctx, camX, camY);
        }

        // Charcos de sangre en el suelo (vfx_blood_pool)
        this.combat?.renderGroundDecals(ctx, camX, camY);

        // Entidades vivas y combate
        for (const enemy of this.enemies) {
            if (enemy.x + enemy.width < camX - 150 || enemy.x > camX + renderer.width + 150) continue;
            enemy.render(ctx, camX, camY, renderer);
        }

        this.player?.render(ctx, camX, camY);
        this.combat?.render(ctx, camX, camY);

        // Iluminación volumétrica de farolas y linterna del protagonista
        this._renderStreetLampLights(ctx, renderer, camX, camY);
        this.player?.renderFlashlight(renderer, camX, camY);

        // Atmósfera final
        renderer.drawFog('115, 145, 180', 0.48);
        this._renderGroundAtmosphereShade(ctx, renderer);
        renderer.drawRain(true);
        renderer.drawVignette(0.70);
    }

    _renderFarSkylineParallax(ctx, renderer, camX) {
        const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
        sky.addColorStop(0, '#03060c');
        sky.addColorStop(0.5, '#091322');
        sky.addColorStop(1, '#121b2a');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, renderer.width, renderer.height);

        const moonX = 920 - camX * 0.035;
        const moonY = 76;
        renderer.drawRadialGlow(moonX, moonY, 16, 155, 'rgba(165, 215, 255, 0.24)');
        ctx.fillStyle = '#e2f0ff';
        ctx.beginPath();
        ctx.arc(moonX, moonY, 31, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#060b14';
        for (let i = 0; i < 24; i++) {
            const bx = Math.round(i * 175 - camX * 0.16);
            const bh = 180 + ((i * 61) % 155);
            if (bx + 150 < 0 || bx > renderer.width) continue;
            ctx.fillRect(bx, GROUND_Y - bh - 95, 138, bh + 95);

            if (i % 4 === 2) {
                const firePulse = 0.22 + 0.08 * Math.sin(this.time * 5 + i);
                renderer.drawRadialGlow(bx + 68, GROUND_Y - bh - 85, 8, 95, `rgba(255, 92, 28, ${firePulse.toFixed(2)})`);
            }
        }
    }

    _renderMidCityParallax(ctx, renderer, camX) {
        ctx.save();
        ctx.fillStyle = 'rgba(10, 17, 29, 0.86)';
        for (let i = 0; i < 28; i++) {
            const mx = Math.round(i * 230 - camX * 0.42);
            const mh = 175 + ((i * 43) % 120);
            if (mx + 195 < 0 || mx > renderer.width) continue;
            ctx.fillRect(mx, GROUND_Y - mh - 35, 182, mh + 35);

            ctx.fillStyle = 'rgba(180, 210, 240, 0.07)';
            for (let wy = GROUND_Y - mh - 12; wy < GROUND_Y - 60; wy += 36) {
                ctx.fillRect(mx + 24, wy, 16, 20);
                ctx.fillRect(mx + 78, wy, 16, 20);
                ctx.fillRect(mx + 132, wy, 16, 20);
            }
            ctx.fillStyle = 'rgba(10, 17, 29, 0.86)';
        }
        ctx.restore();
    }

    _getSeamlessStreetTile(cityImg) {
        if (this._streetTileCanvas) return this._streetTileCanvas;
        if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;

        const tileW = 1480;
        const imgH = 493;
        const roofPad = 62;
        const canvasH = imgH + roofPad;

        const off = document.createElement('canvas');
        off.width = tileW;
        off.height = canvasH;
        const octx = typeof off.getContext === 'function' ? off.getContext('2d') : null;
        if (!octx || typeof octx.drawImage !== 'function') return null;

        octx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in octx) octx.imageSmoothingQuality = 'high';

        octx.drawImage(cityImg, 0, roofPad, tileW, imgH);

        const moonMask = octx.createRadialGradient(756, roofPad + 52, 8, 756, roofPad + 52, 74);
        moonMask.addColorStop(0, 'rgba(9, 19, 34, 0.96)');
        moonMask.addColorStop(0.65, 'rgba(11, 22, 38, 0.78)');
        moonMask.addColorStop(1, 'rgba(11, 22, 38, 0)');
        octx.fillStyle = moonMask;
        octx.fillRect(670, roofPad, 175, 130);

        octx.save();
        octx.globalCompositeOperation = 'destination-out';
        const skyFade = octx.createLinearGradient(0, roofPad, 0, roofPad + 58);
        skyFade.addColorStop(0, 'rgba(0, 0, 0, 1)');
        skyFade.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
        skyFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
        octx.fillStyle = skyFade;
        octx.fillRect(334, roofPad, 988, 60);
        octx.restore();

        octx.fillStyle = '#1b171c';
        octx.fillRect(0, 22, 336, roofPad - 18);
        octx.fillStyle = '#2b2226';
        octx.fillRect(0, 16, 342, 10);
        octx.fillStyle = '#12161f';
        octx.fillRect(46, 2, 78, 16);
        octx.fillRect(205, 6, 52, 12);

        octx.fillStyle = '#1a171d';
        octx.fillRect(1322, 24, tileW - 1322, roofPad - 20);
        octx.fillStyle = '#2a2228';
        octx.fillRect(1316, 18, tileW - 1316, 10);
        octx.fillStyle = '#121720';
        octx.fillRect(1368, 4, 66, 16);

        this._streetTileCanvas = off;
        return off;
    }

    _renderMainStreetBackdrop(ctx, renderer, camX, camY) {
        const cityImg = this.engine.assets?.getImage('city_bg');

        if (cityImg && typeof ctx.drawImage === 'function' && (cityImg.complete === undefined || cityImg.complete) && (cityImg.naturalWidth === undefined || cityImg.naturalWidth > 0)) {
            const tileW = 1480;
            const imgH = 493;
            const roofPad = 62;
            const curbOffset = 414;
            const streetTile = this._getSeamlessStreetTile(cityImg);
            const drawSource = streetTile || cityImg;
            const drawH = streetTile ? (imgH + roofPad) : imgH;
            const topY = Math.round(GROUND_Y - curbOffset - (streetTile ? roofPad : 0) - camY * 0.35);

            const firstTile = Math.floor(camX / tileW);
            const lastTile = Math.floor((camX + renderer.width) / tileW) + 1;

            ctx.save();
            ctx.imageSmoothingEnabled = true;
            if ('imageSmoothingQuality' in ctx) {
                ctx.imageSmoothingQuality = 'high';
            }

            for (let t = firstTile; t <= lastTile; t++) {
                const drawX = Math.round(t * tileW - camX);
                const mirror = Math.abs(t) % 2 === 1;

                if (mirror) {
                    ctx.save();
                    ctx.translate(drawX + tileW, topY);
                    ctx.scale(-1, 1);
                    ctx.drawImage(drawSource, 0, 0, tileW, drawH);
                    ctx.restore();
                } else {
                    ctx.drawImage(drawSource, drawX, topY, tileW, drawH);
                }

                const seamGrad = ctx.createLinearGradient(drawX - 36, 0, drawX + 36, 0);
                seamGrad.addColorStop(0, 'rgba(4, 7, 12, 0)');
                seamGrad.addColorStop(0.5, 'rgba(4, 7, 12, 0.58)');
                seamGrad.addColorStop(1, 'rgba(4, 7, 12, 0)');
                ctx.fillStyle = seamGrad;
                ctx.fillRect(drawX - 36, topY + 14, 72, drawH - 14);
            }

            ctx.restore();

            const bottomFillY = topY + drawH;
            if (bottomFillY < renderer.height) {
                ctx.fillStyle = '#05070b';
                ctx.fillRect(0, bottomFillY, renderer.width, renderer.height - bottomFillY);
            }
        } else {
            ctx.fillStyle = '#0d121a';
            ctx.fillRect(0, GROUND_Y - camY, renderer.width, 150);
            ctx.fillStyle = '#222d3f';
            ctx.fillRect(0, GROUND_Y - camY, renderer.width, 6);
        }

        const sy = Math.round(GROUND_Y - camY);
        ctx.save();
        for (let i = 0; i < this.streetLamps.length; i++) {
            const lx = Math.round(this.streetLamps[i] - camX);
            if (lx < -180 || lx > renderer.width + 180) continue;
            const isRed = i % 3 === 1;
            const puddleGrad = ctx.createRadialGradient(lx + 18, sy + 6, 4, lx + 18, sy + 8, 95);
            puddleGrad.addColorStop(0, isRed ? 'rgba(255, 48, 62, 0.24)' : 'rgba(255, 188, 82, 0.24)');
            puddleGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = puddleGrad;
            ctx.fillRect(lx - 80, sy - 2, 195, 22);
        }
        ctx.restore();
    }

    _renderScenicPropsAndLadders(ctx, renderer, camX, camY) {
        const atlas = this.engine.spriteAtlas;

        for (const prop of this.scenicProps) {
            const sx = Math.round(prop.x - camX);
            const sy = Math.round(prop.y - camY);
            if (sx + prop.w < -40 || sx > renderer.width + 40) continue;

            if (atlas?.isReady()) {
                atlas.drawSprite(ctx, prop.sprite, sx, sy, prop.w, prop.h);
            }
            if (prop.sparks && Math.sin(this.time * 19 + prop.x) > 0.90) {
                renderer.drawRadialGlow(sx + prop.w * 0.5, sy + 22, 2, 38, 'rgba(110, 215, 255, 0.72)');
                if (atlas?.getExtImage()) {
                    atlas.drawSprite(ctx, 'vfx_electric_arc', sx - 8, sy + 6, 54, 34);
                }
            }
        }

        for (let i = 0; i < this.streetLamps.length; i++) {
            const lx = Math.round(this.streetLamps[i] - camX);
            if (lx < -80 || lx > renderer.width + 80) continue;
            if (atlas?.isReady()) {
                atlas.drawSprite(ctx, 'prop_streetlamp', lx - 12, Math.round(GROUND_Y - 188 - camY), 74, 188);
            }
        }

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

    _renderCheckpointsAndSigns(ctx, renderer, camX, camY) {
        const atlas = this.engine.spriteAtlas;

        // Señales urbanas con sprites reales (prop_sign_street, prop_traffic_light, prop_sign_stop)
        for (const sign of this.sectorSigns) {
            const sx = Math.round(sign.x - camX);
            const sy = Math.round(GROUND_Y - sign.h - camY);
            if (sx < -140 || sx > renderer.width + 140) continue;

            if (atlas?.isReady()) {
                atlas.drawSprite(ctx, sign.sprite, sx, sy, sign.w, sign.h);
            }
            ctx.save();
            ctx.font = 'bold 10px Consolas, monospace';
            ctx.fillStyle = '#05080d';
            ctx.fillText(`${sign.title} · ${sign.sub}`, sx - 17, sy - 7);
            ctx.fillStyle = '#ffd166';
            ctx.fillText(`${sign.title} · ${sign.sub}`, sx - 18, sy - 8);
            ctx.restore();
        }

        // Checkpoints renderizados con generador eléctrico + consola táctica + reflector de obra en sprites HD
        for (const cp of this.checkpoints) {
            const cx = Math.round(cp.x - camX);
            const gy = Math.round(GROUND_Y - camY);
            if (cx < -160 || cx > renderer.width + 160) continue;

            renderer.drawRadialGlow(
                cx + 62,
                gy - 58,
                6,
                88,
                cp.reached ? 'rgba(56, 229, 125, 0.36)' : 'rgba(245, 166, 35, 0.30)'
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
            ctx.fillStyle = cp.reached ? '#47ff8c' : '#ffd166';
            ctx.fillText(tag, cx + 2, gy - 106);
            ctx.restore();
        }
    }

    _renderMissionStations(ctx, renderer, camX, camY) {
        const atlas = this.engine.spriteAtlas;
        const gy = Math.round(GROUND_Y - camY);

        // Puesto Sur de Recepción: parada urbana prop_bus_stop + palé cubierto prop_pallet_tarp + paquete pickup_package
        const px = Math.round(this.pickupStation.x - camX);
        if (px + 220 > 0 && px < renderer.width) {
            renderer.drawRadialGlow(px + 84, gy - 64, 8, 96, 'rgba(245, 166, 35, 0.34)');
            if (atlas?.isReady()) {
                atlas.drawSprite(ctx, 'prop_bus_stop', px - 12, gy - 122, 198, 122);
                atlas.drawSprite(ctx, 'prop_pallet_tarp', px + 12, gy - 62, 78, 62);
            }

            ctx.save();
            ctx.font = 'bold 11px Consolas, monospace';
            if (!this.player?.hasPackage) {
                const bob = Math.sin(this.time * 4.5) * 4;
                if (atlas?.isReady()) {
                    atlas.drawSprite(ctx, 'pickup_package', px + 108, gy - 48 + bob, 46, 38);
                }
                ctx.fillStyle = '#04070c';
                ctx.fillText('[E] RECIBIR PAQUETE — DESPACHO SUR', px - 9, gy - 131 + bob);
                ctx.fillStyle = '#ffe082';
                ctx.fillText('[E] RECIBIR PAQUETE — DESPACHO SUR', px - 10, gy - 132 + bob);
            } else {
                ctx.fillStyle = '#9fb2c8';
                ctx.fillText('✓ PAQUETE EN RUTA', px + 26, gy - 130);
            }
            ctx.restore();
        }

        // Refugio Norte de Entrega: parada blindada prop_bus_stop + consola prop_console + cartel biohazard + reflector
        const dx = Math.round(this.deliveryStation.x - camX);
        if (dx + 230 > 0 && dx < renderer.width) {
            renderer.drawRadialGlow(dx + 88, gy - 68, 10, 112, 'rgba(56, 229, 125, 0.36)');
            if (atlas?.isReady()) {
                atlas.drawSprite(ctx, 'prop_bus_stop', dx - 10, gy - 124, 202, 124);
                atlas.drawSprite(ctx, 'prop_console', dx + 22, gy - 72, 74, 72);
                atlas.drawSprite(ctx, 'prop_sign_biohazard', dx + 132, gy - 98, 42, 44);
                atlas.drawSprite(ctx, 'prop_work_light', dx + 168, gy - 98, 48, 98);
            }

            ctx.save();
            ctx.font = 'bold 11px Consolas, monospace';
            if (!this.player?.packageDelivered) {
                const bob = Math.sin(this.time * 4.5) * 4;
                ctx.fillStyle = '#04070c';
                ctx.fillText('[E] ENTREGAR PAQUETE — REFUGIO NORTE', dx - 11, gy - 133 + bob);
                ctx.fillStyle = '#5cff9d';
                ctx.fillText('[E] ENTREGAR PAQUETE — REFUGIO NORTE', dx - 12, gy - 134 + bob);
            } else {
                ctx.fillStyle = '#5cff9d';
                ctx.fillText('✓ PAQUETE ENTREGADO EN REFUGIO', dx + 4, gy - 132);
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
                // Andamios metálicos reales en sprite (prop_scaffold) en lugar de barras procedurales
                const drawH = plat.drawH || (GROUND_Y - plat.y);
                const segW = Math.min(plat.width, 156);
                const cols = Math.max(1, Math.ceil(plat.width / segW));
                const tileW = Math.ceil(plat.width / cols);
                for (let c = 0; c < cols; c++) {
                    atlas.drawSprite(ctx, 'prop_scaffold', sx + c * tileW, sy - 4, tileW + 2, drawH + 4);
                }
            } else if (plat.kind.startsWith('veh_')) {
                // Vehículos pixel-art HD reales: veh_ambulance, veh_police, veh_taxi, veh_truck
                const drawH = plat.drawH || 98;
                const vy = Math.round(GROUND_Y - drawH - camY);
                atlas.drawSprite(ctx, plat.kind, sx, vy, plat.width, drawH);

                if (plat.kind === 'veh_ambulance' || plat.kind === 'veh_police') {
                    const pulse = Math.sin(this.time * 10 + plat.x);
                    if (pulse > 0) {
                        renderer.drawRadialGlow(sx + plat.width * 0.56, vy + 8, 3, 56, 'rgba(255, 38, 54, 0.58)');
                    } else if (plat.kind === 'veh_police') {
                        renderer.drawRadialGlow(sx + plat.width * 0.48, vy + 8, 3, 56, 'rgba(56, 148, 255, 0.58)');
                    }
                }
            }
        }

        for (const prop of this.destructibles) {
            if (prop.destroyed) continue;
            const sx = Math.round(prop.x - camX);
            const sy = Math.round(prop.y - camY);
            if (sx + prop.width < -40 || sx > renderer.width + 40) continue;

            if (!atlas?.isReady()) continue;

            if (prop.kind === 'barrel_red') {
                renderer.drawRadialGlow(sx + prop.width * 0.5, sy + prop.height * 0.5, 4, 42, 'rgba(255, 72, 36, 0.24)');
                atlas.drawSprite(ctx, 'prop_barrel_red', sx, sy, prop.width, prop.height);
            } else if (prop.kind === 'vehicle_wreck') {
                atlas.drawSprite(ctx, prop.sprite || 'veh_car', sx, sy, prop.width, prop.height);
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

            atlas.drawSprite(ctx, crate.sprite || 'prop_crate_wood_hd', sx, sy, crate.width, crate.height);

            if (this.player && !this.player.dead) {
                const dist = Math.abs((this.player.x + this.player.width * 0.5) - (crate.x + crate.width * 0.5));
                if (dist < 78 && Math.abs((this.player.y + this.player.height) - (crate.y + crate.height)) < 24) {
                    ctx.save();
                    ctx.font = 'bold 10px Consolas, monospace';
                    ctx.fillStyle = '#05080d';
                    ctx.fillText('⇄ CAJA MÓVIL', sx - 7, sy - 7);
                    ctx.fillStyle = '#ffd166';
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

    _renderStreetLampLights(ctx, renderer, camX, camY) {
        for (let i = 0; i < this.streetLamps.length; i++) {
            const lx = Math.round(this.streetLamps[i] - camX);
            if (lx < -180 || lx > renderer.width + 180) continue;
            const ly = Math.round(GROUND_Y - 176 - camY);

            const flicker = Math.sin(this.time * 15 + i * 3.1) > 0.92 ? 0.58 : 1;
            const isRedEmergency = i % 3 === 1;
            const coneColor = isRedEmergency
                ? `rgba(255, 48, 58, ${(0.21 * flicker).toFixed(2)})`
                : `rgba(255, 192, 92, ${(0.22 * flicker).toFixed(2)})`;

            renderer.drawLightCone(lx + 44, ly + 8, Math.PI * 0.5, 0.58, 220, coneColor, 'rgba(0,0,0,0)');
            renderer.drawRadialGlow(lx + 44, ly + 8, 3, 36, coneColor);
        }
    }

    _renderGroundAtmosphereShade(ctx, renderer) {
        ctx.save();
        const fgBottom = ctx.createLinearGradient(0, renderer.height - 52, 0, renderer.height);
        fgBottom.addColorStop(0, 'rgba(2, 4, 8, 0)');
        fgBottom.addColorStop(1, 'rgba(2, 4, 8, 0.86)');
        ctx.fillStyle = fgBottom;
        ctx.fillRect(0, renderer.height - 52, renderer.width, 52);
        ctx.restore();
    }

    _renderArenaBarrier(ctx, camX, camY) {
        const bx = Math.round(ARENA_LOCK_X - camX);
        if (bx < -30 || bx > 1300) return;
        ctx.save();
        ctx.fillStyle = 'rgba(224, 30, 43, 0.34)';
        ctx.fillRect(bx, 0, 14, GROUND_Y - camY);
        ctx.strokeStyle = '#ff3b4a';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, 0, 14, GROUND_Y - camY);
        ctx.restore();
    }
}
