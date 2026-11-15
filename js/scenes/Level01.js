/**
 * Level01.js
 * Primer Nivel Jugable Extendido: "PRIMERA ENTREGA" (10,400 px — 4 Sectores Urbanos).
 * Escenario urbano nocturno HD con profundidad multicapa 2.5D (5 planos de parallax),
 * fondo ilustrado city_street_hd.png a pantalla completa sin cortes, puestos de control
 * intermedios, pasarelas dobles escalables, cajas destructibles, barriles explosivos,
 * 4 variantes de infectados y Jefe Final (Mutante de Laboratorio B-3).
 */

import { Camera2D } from '../core/Camera2D.js';
import { CollisionSystem } from '../core/CollisionSystem.js';
import { Player } from '../entities/Player.js';
import { Zombie } from '../entities/Zombie.js';
import { Boss } from '../entities/Boss.js';
import { CombatSystem } from '../systems/CombatSystem.js';

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
        this.destructibles = [];
        this.hazards = [];
        this.checkpoints = [];
        this.sectorSigns = [];
        this.scenicProps = [];
        this.streetLamps = [];
        this.foregroundPillars = [];
        this.pickups = [];
        this.combat = null;

        // Puntos clave de la misión de reparto con escala simétrica respecto al jugador (120 px)
        this.pickupStation = { x: 220, y: GROUND_Y - 124, width: 118, height: 124 };
        this.deliveryStation = { x: 9280, y: GROUND_Y - 136, width: 138, height: 136 };
        this._streetTileCanvas = null;

        // Estadísticas de la partida actual
        this.elapsedTime = 0;
        this.zombiesKilled = 0;
        this.moneyEarnedInRun = 0;
        this.scoreEarnedInRun = 0;
        this.startMoneySnapshot = 0;
        this.startScoreSnapshot = 0;

        // Estados de control de escena
        this.paused = false;
        this.inventoryOpen = false;
        this.levelCompleted = false;
        this.defeatTimer = 0;
        this.bossSpawned = false;
        this.arenaLocked = false;
        this.time = 0;
        this._lastAvatarKey = '';

        this._cacheDomElements();
        this._bindHudEvents();
    }

    _cacheDomElements() {
        this.hudOverlay = document.getElementById('hud-overlay');
        this.hudMissionHeader = document.getElementById('hud-mission-header');
        this.hudAvatarCanvas = document.getElementById('hud-avatar-canvas');
        this.hudPlayerName = document.getElementById('hud-player-name');
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
            this.engine.sceneManager.transitionTo('shop', { fromLevel: 1, nextScene: 'level02' }, 0.45);
        });

        this.btnVictoryContinue?.addEventListener('click', () => {
            if (!this.isSceneActive) return;
            this.engine.audio.playConfirm();
            this.victoryPanel?.classList.add('hidden');
            this.engine.sceneManager.transitionTo('level02', {}, 0.45);
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
        this.bossSpawned = false;
        this.arenaLocked = false;
        this.boss = null;
        this._lastAvatarKey = '';

        if (this.hudMissionHeader) {
            this.hudMissionHeader.textContent = '🎯 MISIÓN 01: PRIMERA ENTREGA';
        }
        if (this.victoryMissionTitle) {
            this.victoryMissionTitle.textContent = '¡MISIÓN COMPLETADA: PRIMERA ENTREGA!';
        }
        if (this.btnVictoryContinue) {
            this.btnVictoryContinue.textContent = 'CONTINUAR AL NIVEL 02 ▶';
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
            onEnemyKilled: (enemy) => {
                if (!enemy.isBoss) {
                    this.zombiesKilled += 1;
                } else {
                    this._handleBossDefeated();
                }
            },
            onCrateBroken: (crate, cx, cy) => {
                if (crate.loot === 'money') {
                    this.engine.economy.addMoney(20);
                    this.combat.spawnFloatingText(cx - 16, cy - 12, '+$20 BOTÍN', '#47ff8c');
                } else {
                    this.engine.inventory.addAmmo('pistol_9mm', 14);
                    this.combat.spawnFloatingText(cx - 24, cy - 12, '+14 MUNICIÓN', '#ffd166');
                }
                this.engine.audio.playPickup();
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
        this.hudOverlay?.classList.add('hidden');
        this.inventoryPanel?.classList.add('hidden');
        this.pausePanel?.classList.add('hidden');
        this.victoryPanel?.classList.add('hidden');
    }

    _buildWorldGeometry() {
        // Suelo principal y plataformas tácticas multinivel a lo largo de los 4 sectores (10,400 px)
        this.platforms = [
            { x: 0, y: GROUND_Y, width: WORLD_WIDTH, height: 150, kind: 'ground', oneWay: false },

            // SECTOR 1 (0 - 2700): Avenida Sur y Minimarket
            { x: 585, y: GROUND_Y - 52, width: 98, height: 52, kind: 'barrier_concrete', oneWay: false },
            { x: 735, y: GROUND_Y - 148, width: 265, height: 18, kind: 'rooftop_walkway', oneWay: true },
            { x: 1150, y: GROUND_Y - 66, width: 72, height: 66, kind: 'metal_crate', oneWay: false },
            { x: 1475, y: GROUND_Y - 154, width: 285, height: 18, kind: 'rooftop_walkway', oneWay: true },
            { x: 1895, y: GROUND_Y - 52, width: 98, height: 52, kind: 'barrier_concrete', oneWay: false },
            { x: 2150, y: GROUND_Y - 96, width: 205, height: 96, kind: 'ambulance', oneWay: false },
            { x: 2430, y: GROUND_Y - 156, width: 260, height: 18, kind: 'rooftop_walkway', oneWay: true },

            // SECTOR 2 (2700 - 5600): Paso Elevado Comercial en Llamas (doble altura)
            { x: 2940, y: GROUND_Y - 66, width: 72, height: 66, kind: 'metal_crate', oneWay: false },
            { x: 3180, y: GROUND_Y - 152, width: 260, height: 18, kind: 'rooftop_walkway', oneWay: true },
            { x: 3720, y: GROUND_Y - 52, width: 98, height: 52, kind: 'barrier_concrete', oneWay: false },
            { x: 4050, y: GROUND_Y - 150, width: 310, height: 18, kind: 'rooftop_walkway', oneWay: true },
            { x: 4220, y: GROUND_Y - 276, width: 240, height: 18, kind: 'rooftop_walkway', oneWay: true },
            { x: 4680, y: GROUND_Y - 96, width: 205, height: 96, kind: 'ambulance', oneWay: false },
            { x: 5040, y: GROUND_Y - 156, width: 290, height: 18, kind: 'rooftop_walkway', oneWay: true },
            { x: 5460, y: GROUND_Y - 52, width: 98, height: 52, kind: 'barrier_concrete', oneWay: false },

            // SECTOR 3 (5600 - 8900): Cordón Militar de Cuarentena Biogen
            { x: 5840, y: GROUND_Y - 66, width: 72, height: 66, kind: 'metal_crate', oneWay: false },
            { x: 6120, y: GROUND_Y - 154, width: 295, height: 18, kind: 'rooftop_walkway', oneWay: true },
            { x: 6620, y: GROUND_Y - 52, width: 98, height: 52, kind: 'barrier_concrete', oneWay: false },
            { x: 7140, y: GROUND_Y - 150, width: 320, height: 18, kind: 'rooftop_walkway', oneWay: true },
            { x: 7310, y: GROUND_Y - 274, width: 235, height: 18, kind: 'rooftop_walkway', oneWay: true },
            { x: 7770, y: GROUND_Y - 96, width: 205, height: 96, kind: 'ambulance', oneWay: false },
            { x: 8160, y: GROUND_Y - 154, width: 280, height: 18, kind: 'rooftop_walkway', oneWay: true },
            { x: 8640, y: GROUND_Y - 66, width: 72, height: 66, kind: 'metal_crate', oneWay: false },
            { x: 8890, y: GROUND_Y - 52, width: 98, height: 52, kind: 'barrier_concrete', oneWay: false },

            // SECTOR 4 (9040 - 10400): Refugio Norte y Arena del Mutante B-3
            { x: 9480, y: GROUND_Y - 144, width: 215, height: 18, kind: 'rooftop_walkway', oneWay: true },
            { x: 9920, y: GROUND_Y - 144, width: 215, height: 18, kind: 'rooftop_walkway', oneWay: true }
        ];

        // Escaleras verticales escalables ([W] / [S]) incluyendo tramos a segundo piso
        this.ladders = [
            { x: 748, y: GROUND_Y - 148, width: 38, height: 148 },
            { x: 1490, y: GROUND_Y - 154, width: 38, height: 154 },
            { x: 2445, y: GROUND_Y - 160, width: 38, height: 160 },
            { x: 3195, y: GROUND_Y - 152, width: 38, height: 152 },
            { x: 4070, y: GROUND_Y - 150, width: 38, height: 150 },
            { x: 4240, y: GROUND_Y - 276, width: 38, height: 128 },
            { x: 5060, y: GROUND_Y - 158, width: 38, height: 158 },
            { x: 6140, y: GROUND_Y - 156, width: 38, height: 156 },
            { x: 7160, y: GROUND_Y - 150, width: 38, height: 150 },
            { x: 7330, y: GROUND_Y - 274, width: 38, height: 126 },
            { x: 8180, y: GROUND_Y - 156, width: 38, height: 156 },
            { x: 9498, y: GROUND_Y - 144, width: 38, height: 144 },
            { x: 10080, y: GROUND_Y - 144, width: 38, height: 144 }
        ];

        // Puestos de Control Intermedios (restauran salud parcial y munición al cruzarlos)
        this.checkpoints = [
            { x: 3520, y: GROUND_Y - 102, width: 78, height: 102, label: 'CONTROL ALFA', reached: false },
            { x: 6840, y: GROUND_Y - 102, width: 78, height: 102, label: 'CONTROL BRAVO', reached: false }
        ];

        // Carteles urbanos de referencia por distrito
        this.sectorSigns = [
            { x: 410, title: 'SECTOR 01', sub: 'AVENIDA SUR' },
            { x: 2820, title: 'SECTOR 02', sub: 'DISTRITO COMERCIAL' },
            { x: 5710, title: 'SECTOR 03', sub: 'CORDÓN DE CUARENTENA' },
            { x: 9100, title: 'SECTOR 04', sub: 'ZONA SEGURA NORTE' }
        ];

        // Cajas de madera destructibles y Barriles Rojos Explosivos (18 en total)
        this.destructibles = [
            { x: 686, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 955, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 1620, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false },
            { x: 1730, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 2580, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 3060, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 3890, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false },
            { x: 4460, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 4930, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 5340, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 6010, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false },
            { x: 6440, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 7020, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'money', destroyed: false },
            { x: 7620, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 8060, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false },
            { x: 8510, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            // Barriles tácticos en la arena del Jefe Final
            { x: 9740, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
            { x: 10220, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false }
        ];

        // Trampas de púas en el pavimento (7 zonas de riesgo)
        this.hazards = [
            { x: 1275, y: GROUND_Y - 26, width: 112, height: 26, damage: 16 },
            { x: 2310, y: GROUND_Y - 26, width: 112, height: 26, damage: 16 },
            { x: 3360, y: GROUND_Y - 26, width: 112, height: 26, damage: 16 },
            { x: 4560, y: GROUND_Y - 26, width: 112, height: 26, damage: 16 },
            { x: 5915, y: GROUND_Y - 26, width: 112, height: 26, damage: 16 },
            { x: 7480, y: GROUND_Y - 26, width: 112, height: 26, damage: 16 },
            { x: 8740, y: GROUND_Y - 26, width: 112, height: 26, damage: 16 }
        ];

        // Elementos ambientales del SpriteAtlas distribuidos a lo largo de 10,400 px
        this.scenicProps = [
            { x: 138, y: GROUND_Y - 96, w: 84, h: 96, sprite: 'prop_fence' },
            { x: 352, y: GROUND_Y - 32, w: 58, h: 32, sprite: 'prop_rubble' },
            { x: 1052, y: GROUND_Y - 96, w: 84, h: 96, sprite: 'prop_fence' },
            { x: 1398, y: GROUND_Y - 66, w: 40, h: 66, sprite: 'prop_electric_box', sparks: true },
            { x: 1995, y: GROUND_Y - 32, w: 58, h: 32, sprite: 'prop_rubble' },
            { x: 2740, y: GROUND_Y - 96, w: 84, h: 96, sprite: 'prop_fence' },
            { x: 3630, y: GROUND_Y - 66, w: 40, h: 66, sprite: 'prop_electric_box', sparks: true },
            { x: 4380, y: GROUND_Y - 32, w: 58, h: 32, sprite: 'prop_rubble' },
            { x: 5220, y: GROUND_Y - 96, w: 84, h: 96, sprite: 'prop_fence' },
            { x: 6320, y: GROUND_Y - 66, w: 40, h: 66, sprite: 'prop_electric_box', sparks: true },
            { x: 6940, y: GROUND_Y - 96, w: 84, h: 96, sprite: 'prop_fence' },
            { x: 7980, y: GROUND_Y - 32, w: 58, h: 32, sprite: 'prop_rubble' },
            { x: 8420, y: GROUND_Y - 66, w: 40, h: 66, sprite: 'prop_electric_box', sparks: true },
            { x: 9190, y: GROUND_Y - 96, w: 84, h: 96, sprite: 'prop_fence' },
            { x: 10300, y: GROUND_Y - 96, w: 84, h: 96, sprite: 'prop_fence' }
        ];

        // Farolas urbanas con iluminación volumétrica (20 farolas)
        this.streetLamps = [
            185, 665, 1215, 1785, 2355, 2910, 3490, 4020, 4620, 5180,
            5760, 6340, 6880, 7420, 7990, 8560, 9140, 9620, 10040
        ];

        // Pilares desenfocados de primerísimo plano (parallax 1.26x)
        this.foregroundPillars = [
            420, 1220, 2040, 2880, 3740, 4580, 5440, 6280, 7120, 7960, 8820, 9680, 10480, 11320, 12180
        ];

        // Suministros tácticos en tejados y rutas elevadas (12 puntos)
        this.pickups = [
            { x: 865, y: GROUND_Y - 186, width: 32, height: 32, type: 'ammo', taken: false },
            { x: 1615, y: GROUND_Y - 192, width: 32, height: 32, type: 'medkit', taken: false },
            { x: 2545, y: GROUND_Y - 198, width: 32, height: 32, type: 'ammo', taken: false },
            { x: 3295, y: GROUND_Y - 190, width: 32, height: 32, type: 'medkit', taken: false },
            { x: 4330, y: GROUND_Y - 314, width: 32, height: 32, type: 'ammo', taken: false },
            { x: 4380, y: GROUND_Y - 314, width: 32, height: 32, type: 'medkit', taken: false },
            { x: 5180, y: GROUND_Y - 196, width: 32, height: 32, type: 'ammo', taken: false },
            { x: 6260, y: GROUND_Y - 194, width: 32, height: 32, type: 'medkit', taken: false },
            { x: 7420, y: GROUND_Y - 312, width: 32, height: 32, type: 'ammo', taken: false },
            { x: 8290, y: GROUND_Y - 194, width: 32, height: 32, type: 'medkit', taken: false },
            { x: 9580, y: GROUND_Y - 182, width: 32, height: 32, type: 'ammo', taken: false },
            { x: 9995, y: GROUND_Y - 182, width: 32, height: 32, type: 'medkit', taken: false }
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

        // 27 infectados de tamaño humano simétrico con dificultad creciente por sector
        this.enemies = [
            // Sector 1: Primer contacto (zombis normales y primer corredor)
            new Zombie('normal', { x: 535, y: GROUND_Y - 104, patrolMinX: 460, patrolMaxX: 575, spriteAtlas: atlas }),
            new Zombie('normal', { x: 845, y: GROUND_Y - 104, patrolMinX: 720, patrolMaxX: 1100, spriteAtlas: atlas }),
            new Zombie('normal', { x: 1035, y: GROUND_Y - 104, patrolMinX: 880, patrolMaxX: 1125, spriteAtlas: atlas }),
            new Zombie('normal', { x: 1470, y: GROUND_Y - 104, patrolMinX: 1410, patrolMaxX: 1830, spriteAtlas: atlas }),
            new Zombie('fast', { x: 1770, y: GROUND_Y - 100, patrolMinX: 1540, patrolMaxX: 1870, spriteAtlas: atlas }),
            new Zombie('normal', { x: 2045, y: GROUND_Y - 104, patrolMinX: 1995, patrolMaxX: 2135, spriteAtlas: atlas }),
            new Zombie('special', { x: 2540, y: GROUND_Y - 110, patrolMinX: 2450, patrolMaxX: 2790, spriteAtlas: atlas }),

            // Sector 2: Distrito Comercial en Llamas (oleadas mixtas y azoteas)
            new Zombie('normal', { x: 2810, y: GROUND_Y - 104, patrolMinX: 2710, patrolMaxX: 2925, spriteAtlas: atlas }),
            new Zombie('fast', { x: 3140, y: GROUND_Y - 100, patrolMinX: 3030, patrolMaxX: 3340, spriteAtlas: atlas }),
            new Zombie('normal', { x: 3820, y: GROUND_Y - 104, patrolMinX: 3790, patrolMaxX: 4160, spriteAtlas: atlas }),
            new Zombie('fast', { x: 4180, y: GROUND_Y - 100, patrolMinX: 3980, patrolMaxX: 4440, spriteAtlas: atlas }),
            new Zombie('special', { x: 4410, y: GROUND_Y - 110, patrolMinX: 4220, patrolMaxX: 4535, spriteAtlas: atlas }),
            new Zombie('normal', { x: 4950, y: GROUND_Y - 104, patrolMinX: 4895, patrolMaxX: 5280, spriteAtlas: atlas }),
            new Zombie('fast', { x: 5190, y: GROUND_Y - 100, patrolMinX: 4960, patrolMaxX: 5420, spriteAtlas: atlas }),
            new Zombie('spitter', { x: 5380, y: GROUND_Y - 104, patrolMinX: 5210, patrolMaxX: 5450, spriteAtlas: atlas }),

            // Sector 3: Cordón Militar de Cuarentena (alta densidad, escupidores y explosivos)
            new Zombie('normal', { x: 5720, y: GROUND_Y - 104, patrolMinX: 5620, patrolMaxX: 5830, spriteAtlas: atlas }),
            new Zombie('fast', { x: 6180, y: GROUND_Y - 100, patrolMinX: 6050, patrolMaxX: 6490, spriteAtlas: atlas }),
            new Zombie('special', { x: 6390, y: GROUND_Y - 110, patrolMinX: 6150, patrolMaxX: 6580, spriteAtlas: atlas }),
            new Zombie('normal', { x: 6730, y: GROUND_Y - 104, patrolMinX: 6685, patrolMaxX: 6820, spriteAtlas: atlas }),
            new Zombie('fast', { x: 7160, y: GROUND_Y - 100, patrolMinX: 7020, patrolMaxX: 7440, spriteAtlas: atlas }),
            new Zombie('spitter', { x: 7350, y: GROUND_Y - 104, patrolMinX: 7180, patrolMaxX: 7460, spriteAtlas: atlas }),
            new Zombie('special', { x: 7685, y: GROUND_Y - 110, patrolMinX: 7610, patrolMaxX: 7755, spriteAtlas: atlas }),
            new Zombie('fast', { x: 8140, y: GROUND_Y - 100, patrolMinX: 8010, patrolMaxX: 8460, spriteAtlas: atlas }),
            new Zombie('normal', { x: 8340, y: GROUND_Y - 104, patrolMinX: 8120, patrolMaxX: 8580, spriteAtlas: atlas }),
            new Zombie('special', { x: 8555, y: GROUND_Y - 110, patrolMinX: 8420, patrolMaxX: 8625, spriteAtlas: atlas }),
            new Zombie('fast', { x: 8995, y: GROUND_Y - 100, patrolMinX: 8960, patrolMaxX: 9220, spriteAtlas: atlas }),
            new Zombie('normal', { x: 9120, y: GROUND_Y - 104, patrolMinX: 8990, patrolMaxX: 9250, spriteAtlas: atlas })
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
        const owned = this.engine.inventory.getPurchasedWeapons();
        const equippedId = this.engine.inventory.getEquippedWeapon().id;

        owned.forEach((weapon, idx) => {
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
            onPlayerMelee: (box, dmg, kb) => this.combat.handlePlayerMelee(box, dmg, kb, this.enemies, this.destructibles, this.player),
            onEnemyMeleeHit: (enemy, plr, dmg) => this.combat.handleEnemyMeleeHit(enemy, plr, dmg),
            onToxicExplosion: (zombie, plr) => this.combat.handleToxicExplosion(zombie, plr, this.enemies),
            onBossSlam: (boss) => this.combat.handleBossSlam(boss),
            onFloatingText: (x, y, text, color) => this.combat.spawnFloatingText(x, y, text, color),
            onLandImpact: (x, y, strength) => {
                this.combat.spawnHitParticles(x, y - 2, '#9db4cc', Math.max(3, Math.round(strength * 6)));
            }
        };

        const activeMinX = this.arenaLocked ? ARENA_LOCK_X : 0;
        this.camera.setBounds(activeMinX, WORLD_WIDTH);

        // 1. Actualizar Jugador (incluyendo escaleras verticales)
        this.player.update(dt, this.engine.input, this.platforms, WORLD_WIDTH, combatCallbacks, this.ladders);
        if (this.arenaLocked && this.player.x < activeMinX + 16) {
            this.player.x = activeMinX + 16;
            this.player.vx = 0;
        }

        if (this.player.dead) {
            this.defeatTimer += dt;
            this.camera.follow(this.player, dt);
            if (this.defeatTimer >= 1.55) {
                this.engine.sceneManager.transitionTo('gameOver', {
                    retryScene: 'level01',
                    levelName: 'PRIMERA ENTREGA',
                    zombiesKilled: this.zombiesKilled,
                    timeSeconds: this.elapsedTime
                }, 0.5);
            }
            this._syncHud();
            return;
        }

        // 2. Comprobar trampas de púas y puestos de control intermedios
        this._checkSpikeHazards();
        this._checkCheckpoints();

        // 3. Interacciones de Misión (Recoger paquete / Entregar paquete con E)
        this._checkMissionInteractions();

        // 4. Recogida de suministros (botiquines y munición)
        this._checkSupplyPickups();

        // 5. Actualizar Enemigos y Jefe Final
        for (const enemy of this.enemies) {
            enemy.update(dt, this.player, this.platforms, WORLD_WIDTH, combatCallbacks);
        }
        this.enemies = this.enemies.filter(e => !e.removable);

        // 6. Actualizar Sistema de Combate
        this.combat.update(dt, this.player, this.enemies, this.platforms, this.destructibles);

        // 7. Actualizar Cámara y HUD
        this.camera.follow(this.player, dt);
        this._syncHud();
    }

    _checkSpikeHazards() {
        for (const hz of this.hazards) {
            const hitbox = { x: hz.x + 8, y: hz.y + 8, width: hz.width - 16, height: hz.height - 8 };
            if (CollisionSystem.intersectsAABB(this.player, hitbox)) {
                if (this.player.takeDamage(hz.damage, hz.x + hz.width * 0.5)) {
                    this.camera.shake(7, 0.2);
                    this.combat.spawnHitParticles(this.player.x + 20, this.player.y + 62, '#d91e2a', 8);
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
                this.engine.audio.playPickup();
                this.engine.economy.addScore(150);
                this.player.health = Math.min(this.player.maxHealth, this.player.health + 30);
                this.engine.inventory.addAmmo('pistol_9mm', 14);
                this.combat.spawnFloatingText(
                    cp.x - 24,
                    cp.y - 18,
                    `✓ ${cp.label}: +30 SALUD / +14 BALAS`,
                    '#47ff8c'
                );
            }
        }
    }

    _checkMissionInteractions() {
        const interactPressed = this.engine.input.isActionJustPressed('interact');

        const pickupZone = {
            x: this.pickupStation.x - 26,
            y: this.pickupStation.y - 20,
            width: this.pickupStation.width + 52,
            height: this.pickupStation.height + 24
        };

        const deliveryZone = {
            x: this.deliveryStation.x - 28,
            y: this.deliveryStation.y - 20,
            width: this.deliveryStation.width + 56,
            height: this.deliveryStation.height + 24
        };

        if (!this.player.hasPackage && CollisionSystem.intersectsAABB(this.player, pickupZone)) {
            if (interactPressed) {
                this.player.hasPackage = true;
                this.engine.audio.playPickup();
                this.engine.economy.addScore(150);
                this.combat.spawnFloatingText(
                    this.player.x,
                    this.player.y - 18,
                    '📦 PAQUETE RECIBIDO (+150 PTS)',
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
                this.engine.audio.playPickup();
                this.engine.economy.addScore(350);
                this.combat.spawnFloatingText(
                    this.player.x - 20,
                    this.player.y - 24,
                    '✓ ENTREGA REGISTRADA — ¡MUTANTE B-3 DETECTADO!',
                    '#47ff8c'
                );
                this._triggerBossEncounter();
            }
        }
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
                } else {
                    const equipped = this.engine.inventory.getEquippedWeapon();
                    const targetWeapon = equipped.type === 'ranged' ? equipped.id : 'pistol_9mm';
                    const spec = this.engine.inventory.getWeaponSpec(targetWeapon);
                    const amount = spec.magazineSize * 2;
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
        this.engine.economy.addScore(levelInfo.baseScoreReward);
        this.scoreEarnedInRun = this.engine.economy.getScore() - this.startScoreSnapshot;

        this.engine.saveSystem.completeLevel(1, ['shotgun_combat', 'smg_tactical']);
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
                if (this.hudPackageState) this.hudPackageState.textContent = '✓ Entregado en Refugio';
                if (this.hudObjectiveText) this.hudObjectiveText.textContent = '¡Derrota al Jefe: Mutante de Laboratorio B-3!';
                if (this.hudProgressFill) this.hudProgressFill.style.width = '100%';
            } else {
                if (this.hudObjectiveText) this.hudObjectiveText.textContent = '¡Misión completada con éxito!';
            }
        }

        if (this.hudMoney) this.hudMoney.textContent = `$${this.engine.economy.getMoney()}`;
        if (this.hudScore) this.hudScore.textContent = `${this.engine.economy.getScore()}`;

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
    // RENDERIZADO HD 2.5D EN 5 PLANOS DE PROFUNDIDAD
    // =========================================================================

    render(renderer) {
        const ctx = renderer.ctx;
        const camX = this.camera.getRenderX();
        const camY = this.camera.getRenderY();

        // PLANO 1 (0.05x - 0.16x): Cielo tormentoso, luna llena y horizonte lejano
        this._renderFarSkylineParallax(ctx, renderer, camX);

        // PLANO 2 (0.42x): Distrito urbano medio envuelto en bruma azul nocturna
        this._renderMidCityParallax(ctx, renderer, camX);

        // PLANO 3 (1.0x): Fondo ilustrado HD city_street_hd.png a pantalla completa sin cortes
        this._renderMainStreetBackdrop(ctx, renderer, camX, camY);

        // PLANO 4 (1.0x Jugable): Estaciones, puestos de control, escaleras, plataformas y suministros
        this._renderScenicPropsAndLadders(ctx, renderer, camX, camY);
        this._renderCheckpointsAndSigns(ctx, renderer, camX, camY);
        this._renderMissionStations(ctx, renderer, camX, camY);
        this._renderPlatformsAndDestructibles(ctx, renderer, camX, camY);
        this._renderSupplyPickups(ctx, renderer, camX, camY);

        if (this.arenaLocked) {
            this._renderArenaBarrier(ctx, camX, camY);
        }

        // Entidades vivas y combate
        for (const enemy of this.enemies) {
            if (enemy.x + enemy.width < camX - 140 || enemy.x > camX + renderer.width + 140) continue;
            enemy.render(ctx, camX, camY, renderer);
        }

        this.player?.render(ctx, camX, camY);
        this.combat?.render(ctx, camX, camY);

        // Iluminación volumétrica de farolas y linterna del protagonista
        this._renderStreetLampLights(ctx, renderer, camX, camY);
        this.player?.renderFlashlight(renderer, camX, camY);

        // Atmósfera final: niebla baja, lluvia y viñeta cinematográfica (sin barras verticales intrusivas)
        renderer.drawFog('115, 145, 180', 0.50);
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

        // 1. Dibujar manzana urbana a escala humana simétrica (1480x493: puertas ~128px, autos ~91px, personajes 120px)
        octx.drawImage(cityImg, 0, roofPad, tileW, imgH);

        // 2. Ocultar luna repetida del tile para que solo brille la luna única del cielo principal
        const moonMask = octx.createRadialGradient(756, roofPad + 52, 8, 756, roofPad + 52, 74);
        moonMask.addColorStop(0, 'rgba(9, 19, 34, 0.96)');
        moonMask.addColorStop(0.65, 'rgba(11, 22, 38, 0.78)');
        moonMask.addColorStop(1, 'rgba(11, 22, 38, 0)');
        octx.fillStyle = moonMask;
        octx.fillRect(670, roofPad, 175, 130);

        // 3. Fundido suave del borde superior del cielo hacia el cielo nocturno dinámico (cero costuras horizontales)
        octx.save();
        octx.globalCompositeOperation = 'destination-out';
        const skyFade = octx.createLinearGradient(0, roofPad, 0, roofPad + 58);
        skyFade.addColorStop(0, 'rgba(0, 0, 0, 1)');
        skyFade.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
        skyFade.addColorStop(1, 'rgba(0, 0, 0, 0)');
        octx.fillStyle = skyFade;
        octx.fillRect(334, roofPad, 988, 60);
        octx.restore();

        // 4. Remate arquitectónico superior (cornisa y parapeto de azotea) para los edificios laterales
        // Edificio izquierdo (Minimarket)
        octx.fillStyle = '#1b171c';
        octx.fillRect(0, 22, 336, roofPad - 18);
        octx.fillStyle = '#2b2226';
        octx.fillRect(0, 16, 342, 10);
        octx.fillStyle = '#12161f';
        octx.fillRect(46, 2, 78, 16);
        octx.fillRect(205, 6, 52, 12);

        // Edificio derecho
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
            // Escala urbana simétrica: tileW=1480, imgH=493 (curbOffset=414 => puertas ~128px y sedán ~91px frente a jugador de 120px)
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

                // Sombra suave de callejón en la unión entre manzanas urbanas
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

        // Reflejos dinámicos de charcos sobre el asfalto mojado
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
            if (prop.sparks && Math.sin(this.time * 19 + prop.x) > 0.94) {
                renderer.drawRadialGlow(sx + prop.w * 0.5, sy + 24, 2, 34, 'rgba(110, 215, 255, 0.65)');
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
            } else {
                ctx.fillStyle = '#7a542e';
                ctx.fillRect(lx, ly, lad.width, lad.height);
            }
        }

        for (const hz of this.hazards) {
            const hx = Math.round(hz.x - camX);
            const hy = Math.round(hz.y - camY);
            if (hx + hz.width < -30 || hx > renderer.width + 30) continue;

            if (atlas?.isReady()) {
                atlas.drawSprite(ctx, 'prop_spikes', hx, hy, hz.width, hz.height);
            } else {
                ctx.fillStyle = '#9aa5b4';
                ctx.fillRect(hx, hy, hz.width, hz.height);
            }
        }
    }

    _renderCheckpointsAndSigns(ctx, renderer, camX, camY) {
        for (const sign of this.sectorSigns) {
            const sx = Math.round(sign.x - camX);
            const sy = Math.round(GROUND_Y - 142 - camY);
            if (sx < -160 || sx > renderer.width + 160) continue;

            ctx.save();
            ctx.fillStyle = '#1b2432';
            ctx.fillRect(sx + 54, sy + 42, 6, 100);
            ctx.fillStyle = 'rgba(12, 18, 28, 0.92)';
            ctx.strokeStyle = '#3b4e68';
            ctx.lineWidth = 2;
            ctx.fillRect(sx, sy, 122, 44);
            ctx.strokeRect(sx, sy, 122, 44);
            ctx.fillStyle = '#f5a623';
            ctx.font = 'bold 10px Consolas, monospace';
            ctx.fillText(sign.title, sx + 10, sy + 16);
            ctx.fillStyle = '#dce6f2';
            ctx.fillText(sign.sub, sx + 10, sy + 32);
            ctx.restore();
        }

        for (const cp of this.checkpoints) {
            const cx = Math.round(cp.x - camX);
            const cy = Math.round(cp.y - camY);
            if (cx < -120 || cx > renderer.width + 120) continue;

            const col = cp.reached ? '#38e57d' : '#f5a623';
            renderer.drawRadialGlow(
                cx + 39,
                cy + 24,
                4,
                68,
                cp.reached ? 'rgba(56, 229, 125, 0.34)' : 'rgba(245, 166, 35, 0.28)'
            );

            ctx.save();
            ctx.fillStyle = 'rgba(12, 20, 28, 0.92)';
            ctx.strokeStyle = col;
            ctx.lineWidth = 2;
            ctx.fillRect(cx, cy, cp.width, cp.height);
            ctx.strokeRect(cx, cy, cp.width, cp.height);
            ctx.fillStyle = col;
            ctx.font = 'bold 10px Consolas, monospace';
            ctx.fillText(cp.reached ? '✓ ACTIVO' : 'RADIO', cx + 12, cy + 22);
            ctx.fillStyle = '#d6e4f5';
            ctx.fillText(cp.label.split(' ')[1], cx + 14, cy + 40);
            ctx.restore();
        }
    }

    _renderMissionStations(ctx, renderer, camX, camY) {
        const atlas = this.engine.spriteAtlas;

        const px = Math.round(this.pickupStation.x - camX);
        const py = Math.round(this.pickupStation.y - camY);
        if (px + 150 > 0 && px < renderer.width) {
            ctx.fillStyle = 'rgba(16, 24, 36, 0.92)';
            ctx.strokeStyle = '#f5a623';
            ctx.lineWidth = 2.5;
            ctx.fillRect(px, py, this.pickupStation.width, this.pickupStation.height);
            ctx.strokeRect(px, py, this.pickupStation.width, this.pickupStation.height);

            ctx.fillStyle = '#f5a623';
            ctx.font = 'bold 11px Consolas, monospace';
            ctx.fillText('DESPACHO SUR', px + 14, py + 20);

            if (!this.player?.hasPackage) {
                const bob = Math.sin(this.time * 4.5) * 4;
                renderer.drawRadialGlow(px + 55, py + 62, 8, 64, 'rgba(245, 166, 35, 0.42)');
                if (atlas?.isReady()) {
                    atlas.drawSprite(ctx, 'icon_package', px + 31, py + 42 + bob, 48, 41);
                } else {
                    ctx.fillStyle = '#ba8750';
                    ctx.fillRect(px + 38, py + 52 + bob, 34, 28);
                }
                ctx.fillStyle = '#ffe082';
                ctx.fillText('[E] RECIBIR PAQUETE', px - 8, py - 12 + bob);
            } else {
                ctx.fillStyle = '#9fb2c8';
                ctx.fillText('✓ EN RUTA', px + 24, py + 64);
            }
        }

        const dx = Math.round(this.deliveryStation.x - camX);
        const dy = Math.round(this.deliveryStation.y - camY);
        if (dx + 170 > 0 && dx < renderer.width) {
            ctx.fillStyle = 'rgba(13, 30, 22, 0.92)';
            ctx.strokeStyle = '#38e57d';
            ctx.lineWidth = 2.5;
            ctx.fillRect(dx, dy, this.deliveryStation.width, this.deliveryStation.height);
            ctx.strokeRect(dx, dy, this.deliveryStation.width, this.deliveryStation.height);

            renderer.drawRadialGlow(dx + 65, dy + 42, 10, 95, 'rgba(56, 229, 125, 0.32)');
            ctx.fillStyle = '#38e57d';
            ctx.font = 'bold 12px Consolas, monospace';
            ctx.fillText('REFUGIO NORTE', dx + 18, dy + 24);

            if (atlas?.isReady()) {
                atlas.drawSprite(ctx, 'icon_backpack', dx + 43, dy + 44, 44, 46, { alpha: 0.9 });
            }

            if (!this.player?.packageDelivered) {
                const bob = Math.sin(this.time * 4.5) * 4;
                ctx.fillStyle = '#5cff9d';
                ctx.fillText('[E] ENTREGAR PAQUETE', dx - 8, dy - 12 + bob);
            } else {
                ctx.fillStyle = '#5cff9d';
                ctx.fillText('✓ PAQUETE ENTREGADO', dx - 4, dy - 12);
            }
        }
    }

    _renderPlatformsAndDestructibles(ctx, renderer, camX, camY) {
        const atlas = this.engine.spriteAtlas;

        for (const plat of this.platforms) {
            if (plat.kind === 'ground') continue;
            const sx = Math.round(plat.x - camX);
            const sy = Math.round(plat.y - camY);
            if (sx + plat.width < -30 || sx > renderer.width + 30) continue;

            if (plat.kind === 'barrier_concrete' && atlas?.isReady()) {
                atlas.drawSprite(ctx, 'prop_barrier_concrete', sx, sy - 6, plat.width, plat.height + 6);
            } else if (plat.kind === 'metal_crate' && atlas?.isReady()) {
                atlas.drawSprite(ctx, 'prop_crate_metal', sx, sy, plat.width, plat.height);
            } else if (plat.kind === 'rooftop_walkway') {
                ctx.fillStyle = 'rgba(8, 12, 18, 0.65)';
                ctx.fillRect(sx + 10, sy + plat.height, 10, GROUND_Y - plat.y - plat.height);
                ctx.fillRect(sx + plat.width - 20, sy + plat.height, 10, GROUND_Y - plat.y - plat.height);

                ctx.strokeStyle = '#38465a';
                ctx.lineWidth = 2;
                ctx.strokeRect(sx + 4, sy - 24, plat.width - 8, 24);

                ctx.fillStyle = '#263244';
                ctx.strokeStyle = '#7386a0';
                ctx.fillRect(sx, sy, plat.width, plat.height);
                ctx.strokeRect(sx, sy, plat.width, plat.height);

                ctx.fillStyle = '#e09b24';
                for (let stripeX = sx + 6; stripeX < sx + plat.width - 14; stripeX += 24) {
                    ctx.fillRect(stripeX, sy + 4, 12, 4);
                }
            } else if (plat.kind === 'ambulance') {
                ctx.fillStyle = '#cfd9e3';
                ctx.strokeStyle = '#0a0e15';
                ctx.lineWidth = 2.5;
                ctx.fillRect(sx, sy, plat.width, plat.height);
                ctx.strokeRect(sx, sy, plat.width, plat.height);

                ctx.fillStyle = '#c81e2b';
                ctx.fillRect(sx + 10, sy + 30, plat.width - 20, 12);
                ctx.fillRect(sx + 44, sy + 14, 10, 28);
                ctx.fillRect(sx + 35, sy + 23, 28, 10);

                ctx.fillStyle = '#111926';
                ctx.fillRect(sx + plat.width - 44, sy + 10, 34, 24);

                ctx.fillStyle = '#080b10';
                ctx.beginPath();
                ctx.arc(sx + 34, sy + plat.height - 2, 15, 0, Math.PI * 2);
                ctx.arc(sx + plat.width - 36, sy + plat.height - 2, 15, 0, Math.PI * 2);
                ctx.fill();

                if (Math.sin(this.time * 9) > 0) {
                    renderer.drawRadialGlow(sx + plat.width - 32, sy - 4, 2, 42, 'rgba(255, 38, 52, 0.55)');
                }
            } else {
                ctx.fillStyle = '#3a4658';
                ctx.fillRect(sx, sy, plat.width, plat.height);
            }
        }

        for (const prop of this.destructibles) {
            if (prop.destroyed) continue;
            const sx = Math.round(prop.x - camX);
            const sy = Math.round(prop.y - camY);
            if (sx + prop.width < -30 || sx > renderer.width + 30) continue;

            if (prop.kind === 'barrel_red') {
                renderer.drawRadialGlow(sx + prop.width * 0.5, sy + prop.height * 0.5, 4, 42, 'rgba(255, 72, 36, 0.24)');
                if (atlas?.isReady()) {
                    atlas.drawSprite(ctx, 'prop_barrel_red', sx, sy, prop.width, prop.height);
                } else {
                    ctx.fillStyle = '#c8232c';
                    ctx.fillRect(sx, sy, prop.width, prop.height);
                }
            } else {
                if (atlas?.isReady()) {
                    atlas.drawSprite(ctx, 'prop_crate_wood', sx, sy, prop.width, prop.height);
                } else {
                    ctx.fillStyle = '#7c5329';
                    ctx.fillRect(sx, sy, prop.width, prop.height);
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

            if (item.type === 'medkit') {
                renderer.drawRadialGlow(sx + 16, sy + 16, 4, 38, 'rgba(56, 229, 125, 0.36)');
                if (atlas?.isReady()) {
                    atlas.drawSprite(ctx, 'icon_medkit', sx, sy, item.width, item.height);
                } else {
                    ctx.fillStyle = '#eef4f8';
                    ctx.fillRect(sx, sy, item.width, item.height);
                }
            } else {
                renderer.drawRadialGlow(sx + 16, sy + 16, 4, 38, 'rgba(245, 166, 35, 0.36)');
                ctx.fillStyle = '#283627';
                ctx.strokeStyle = '#f5a623';
                ctx.lineWidth = 2;
                ctx.fillRect(sx, sy + 3, item.width, item.height - 6);
                ctx.strokeRect(sx, sy + 3, item.width, item.height - 6);
                ctx.fillStyle = '#ffd166';
                ctx.font = 'bold 10px Consolas, monospace';
                ctx.fillText('AMMO', sx + 4, sy + 20);
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
