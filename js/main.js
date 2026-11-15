/**
 * main.js
 * Punto de entrada principal de LAST DELIVERY ZOMBIE.
 * Inicializa la arquitectura modular del motor, los sistemas persistentes,
 * los modales globales (Cómo Jugar, Opciones, Salir) y arranca el bucle de juego.
 */

import { SaveSystem } from './systems/SaveSystem.js';
import { EconomySystem } from './systems/EconomySystem.js';
import { LevelSystem } from './systems/LevelSystem.js';
import { InventorySystem } from './systems/InventorySystem.js';
import { ShopSystem } from './systems/ShopSystem.js';
import { AssetLoader } from './core/AssetLoader.js';
import { SpriteAtlas } from './core/SpriteAtlas.js';
import { InputManager, formatKeyCode } from './core/InputManager.js';
import { Renderer2D } from './core/Renderer2D.js';
import { SceneManager } from './core/SceneManager.js';
import { GameEngine } from './core/GameEngine.js';
import { AudioManager } from './audio/AudioManager.js';
import { MainMenu } from './scenes/MainMenu.js';
import { Introduction } from './scenes/Introduction.js';
import { BriefingScene } from './scenes/BriefingScene.js';
import { Level01 } from './scenes/Level01.js';
import { Level02 } from './scenes/Level02.js';
import { Shop } from './scenes/Shop.js';
import { GameOver } from './scenes/GameOver.js';

const CONTROL_ACTION_META = [
    { action: 'moveLeft', label: 'Mover a la izquierda' },
    { action: 'moveRight', label: 'Mover a la derecha' },
    { action: 'jump', label: 'Saltar' },
    { action: 'interact', label: 'Interactuar (recoger / entregar)' },
    { action: 'attack', label: 'Atacar o disparar' },
    { action: 'reload', label: 'Recargar arma' },
    { action: 'inventory', label: 'Abrir inventario' },
    { action: 'pause', label: 'Pausar partida' }
];

function setupGlobalModals(engine) {
    const { saveSystem, input, audio } = engine;

    const modalHowTo = document.getElementById('modal-how-to-play');
    const modalOptions = document.getElementById('modal-options');
    const modalExit = document.getElementById('modal-exit');
    const exitStandbyScreen = document.getElementById('exit-standby-screen');

    const closeAllModals = () => {
        if (input.isCapturingKey()) {
            input.cancelRebind();
        }
        modalHowTo?.classList.add('hidden');
        modalOptions?.classList.add('hidden');
        modalExit?.classList.add('hidden');
    };

    // --- Sincronización dinámica de la tabla de controles en "CÓMO JUGAR" ---
    const refreshHowToControls = () => {
        const moveKeys = `${input.getFormattedActionKeys('moveLeft')}  /  ${input.getFormattedActionKeys('moveRight')}`;
        const mapping = {
            'howto-key-move': moveKeys,
            'howto-key-jump': input.getFormattedActionKeys('jump'),
            'howto-key-interact': input.getFormattedActionKeys('interact'),
            'howto-key-attack': input.getFormattedActionKeys('attack'),
            'howto-key-reload': input.getFormattedActionKeys('reload'),
            'howto-key-inventory': input.getFormattedActionKeys('inventory'),
            'howto-key-pause': input.getFormattedActionKeys('pause')
        };

        for (const [id, text] of Object.entries(mapping)) {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        }
    };

    // Pestañas del manual CÓMO JUGAR
    const howToTabs = document.querySelectorAll('[data-howto-tab]');
    const howToPanels = document.querySelectorAll('[data-howto-panel]');
    howToTabs.forEach(tab => {
        tab.addEventListener('pointerenter', () => audio.playHover());
        tab.addEventListener('click', () => {
            audio.playClick();
            const target = tab.getAttribute('data-howto-tab');
            howToTabs.forEach(t => t.classList.toggle('active', t === tab));
            howToPanels.forEach(p => {
                p.classList.toggle('hidden', p.getAttribute('data-howto-panel') !== target);
            });
        });
    });

    // --- Sincronización y eventos del menú OPCIONES ---
    const optSoundToggle = document.getElementById('opt-sound-toggle');
    const optMasterSlider = document.getElementById('opt-master-volume');
    const optMusicSlider = document.getElementById('opt-music-volume');
    const optSfxSlider = document.getElementById('opt-sfx-volume');
    const optMasterVal = document.getElementById('opt-master-val');
    const optMusicVal = document.getElementById('opt-music-val');
    const optSfxVal = document.getElementById('opt-sfx-val');
    const optParticles = document.getElementById('opt-particle-quality');
    const optShowFps = document.getElementById('opt-show-fps');
    const controlsListContainer = document.getElementById('opt-controls-list');
    const btnResetControls = document.getElementById('btn-reset-controls');
    const btnResetSave = document.getElementById('btn-reset-save');
    const resetSaveFeedback = document.getElementById('opt-reset-feedback');

    const renderRebindRows = () => {
        if (!controlsListContainer) return;
        controlsListContainer.innerHTML = '';
        const currentControls = saveSystem.getControls();

        for (const item of CONTROL_ACTION_META) {
            const row = document.createElement('div');
            row.className = 'rebind-row';

            const label = document.createElement('span');
            label.className = 'rebind-label';
            label.textContent = item.label;

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'rebind-btn';
            const codes = currentControls[item.action] || [];
            btn.textContent = codes.map(formatKeyCode).join(' / ');

            if (item.action === 'pause') {
                btn.disabled = true;
                btn.title = 'La tecla ESC está reservada para pausa y navegación segura.';
            } else {
                btn.addEventListener('pointerenter', () => audio.playHover());
                btn.addEventListener('click', () => {
                    audio.playClick();
                    document.querySelectorAll('.rebind-btn').forEach(b => b.classList.remove('listening'));
                    btn.classList.add('listening');
                    btn.textContent = 'PULSA UNA TECLA... [ESC CANCELA]';

                    input.captureNextKey(
                        (newCode) => {
                            saveSystem.setControlBinding(item.action, [newCode]);
                            audio.playClick();
                            renderRebindRows();
                            refreshHowToControls();
                        },
                        () => {
                            renderRebindRows();
                        }
                    );
                });
            }

            row.appendChild(label);
            row.appendChild(btn);
            controlsListContainer.appendChild(row);
        }
    };

    const syncOptionsUIFromSave = () => {
        const s = saveSystem.getSettings();
        if (optSoundToggle) {
            optSoundToggle.textContent = s.soundEnabled ? 'ACTIVADO (ON)' : 'SILENCIADO (OFF)';
            optSoundToggle.classList.toggle('is-on', s.soundEnabled);
            optSoundToggle.classList.toggle('is-off', !s.soundEnabled);
        }
        if (optMasterSlider) optMasterSlider.value = String(Math.round(s.masterVolume * 100));
        if (optMusicSlider) optMusicSlider.value = String(Math.round(s.musicVolume * 100));
        if (optSfxSlider) optSfxSlider.value = String(Math.round(s.sfxVolume * 100));

        if (optMasterVal) optMasterVal.textContent = `${Math.round(s.masterVolume * 100)}%`;
        if (optMusicVal) optMusicVal.textContent = `${Math.round(s.musicVolume * 100)}%`;
        if (optSfxVal) optSfxVal.textContent = `${Math.round(s.sfxVolume * 100)}%`;

        if (optParticles) optParticles.value = s.particleQuality;
        if (optShowFps) optShowFps.checked = s.showFps;

        renderRebindRows();
    };

    optSoundToggle?.addEventListener('click', () => {
        const enabled = saveSystem.toggleSound();
        if (enabled) {
            audio.unlock();
            audio.playClick();
        }
        syncOptionsUIFromSave();
    });

    const handleVolumeInput = () => {
        const masterVolume = Number(optMasterSlider?.value ?? 80) / 100;
        const musicVolume = Number(optMusicSlider?.value ?? 65) / 100;
        const sfxVolume = Number(optSfxSlider?.value ?? 85) / 100;
        saveSystem.setVolumes({ masterVolume, musicVolume, sfxVolume });

        if (optMasterVal) optMasterVal.textContent = `${Math.round(masterVolume * 100)}%`;
        if (optMusicVal) optMusicVal.textContent = `${Math.round(musicVolume * 100)}%`;
        if (optSfxVal) optSfxVal.textContent = `${Math.round(sfxVolume * 100)}%`;
    };

    optMasterSlider?.addEventListener('input', handleVolumeInput);
    optMusicSlider?.addEventListener('input', handleVolumeInput);
    optSfxSlider?.addEventListener('input', handleVolumeInput);

    optParticles?.addEventListener('change', () => {
        audio.playClick();
        saveSystem.setParticleQuality(optParticles.value);
    });

    optShowFps?.addEventListener('change', () => {
        audio.playClick();
        saveSystem.setShowFps(optShowFps.checked);
    });

    btnResetControls?.addEventListener('click', () => {
        audio.playClick();
        saveSystem.resetControls();
        renderRebindRows();
        refreshHowToControls();
    });

    let confirmResetPending = false;
    btnResetSave?.addEventListener('click', () => {
        if (!confirmResetPending) {
            confirmResetPending = true;
            audio.playError();
            btnResetSave.textContent = '¿CONFIRMAR BORRADO DE PERFIL?';
            if (resetSaveFeedback) {
                resetSaveFeedback.textContent = 'Pulsa de nuevo para borrar nombre y progreso guardado.';
            }
            return;
        }

        confirmResetPending = false;
        saveSystem.resetAllProgress(false);
        audio.playClick();
        btnResetSave.textContent = 'BORRAR DATOS GUARDADOS';
        if (resetSaveFeedback) {
            resetSaveFeedback.textContent = '✓ Datos locales restablecidos a valores de fábrica.';
        }

        const nameInput = document.getElementById('player-name-input');
        if (nameInput) nameInput.value = '';
        const nameFeedback = document.getElementById('player-name-feedback');
        if (nameFeedback) {
            nameFeedback.textContent = 'Registra tu credencial para iniciar el turno nocturno.';
            nameFeedback.classList.remove('is-error');
        }
        syncOptionsUIFromSave();
        refreshHowToControls();
    });

    // --- Modal SALIR y pantalla de sesión finalizada ---
    const btnConfirmExit = document.getElementById('btn-confirm-exit');
    const btnReconnect = document.getElementById('btn-reconnect-game');

    btnConfirmExit?.addEventListener('click', () => {
        saveSystem.save();
        audio.stopAmbience();
        engine.stop();
        closeAllModals();

        // Intentar cerrar pestaña si fue abierta mediante script; en caso contrario mostrar pantalla segura de salida
        try {
            window.close();
        } catch (_) {}

        exitStandbyScreen?.classList.remove('hidden');
    });

    btnReconnect?.addEventListener('click', () => {
        exitStandbyScreen?.classList.add('hidden');
        engine.start();
        audio.unlock();
        audio.playConfirm();
        engine.sceneManager.switchImmediate('mainMenu');
    });

    // Botones genéricos de cierre de modal
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('pointerenter', () => audio.playHover());
        btn.addEventListener('click', () => {
            audio.playClick();
            confirmResetPending = false;
            if (btnResetSave) btnResetSave.textContent = 'BORRAR DATOS GUARDADOS';
            if (resetSaveFeedback) resetSaveFeedback.textContent = '';
            closeAllModals();
        });
    });

    // Cerrar modal con tecla ESC (si no se está capturando tecla para controles)
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !input.isCapturingKey()) {
            const anyOpen = [modalHowTo, modalOptions, modalExit].some(
                el => el && !el.classList.contains('hidden')
            );
            if (anyOpen) {
                e.preventDefault();
                input.keysJustPressed.delete('Escape');
                audio.playClick();
                closeAllModals();
            }
        }
    });

    // Escuchar eventos disparados desde las escenas
    window.addEventListener('ldz:open-modal', (event) => {
        const target = event.detail?.modal;
        closeAllModals();

        if (target === 'howto') {
            refreshHowToControls();
            modalHowTo?.classList.remove('hidden');
        } else if (target === 'options') {
            confirmResetPending = false;
            if (btnResetSave) btnResetSave.textContent = 'BORRAR DATOS GUARDADOS';
            if (resetSaveFeedback) resetSaveFeedback.textContent = '';
            syncOptionsUIFromSave();
            modalOptions?.classList.remove('hidden');
        } else if (target === 'exit') {
            modalExit?.classList.remove('hidden');
        }
    });

    refreshHowToControls();
    syncOptionsUIFromSave();
}

async function bootstrap() {
    const canvas = document.getElementById('game-canvas');
    const stageElement = document.getElementById('game-stage');

    if (!canvas || !stageElement) {
        console.error('[Main] No se encontraron los elementos base del escenario.');
        return;
    }

    // 1. Inicializar sistemas base y persistencia
    const saveSystem = new SaveSystem();
    const assetLoader = new AssetLoader();
    const renderer = new Renderer2D(canvas, stageElement, saveSystem);
    const inputManager = new InputManager(saveSystem, canvas);
    const audioManager = new AudioManager(saveSystem);
    const economySystem = new EconomySystem(saveSystem);
    const levelSystem = new LevelSystem(saveSystem);
    const inventorySystem = new InventorySystem(saveSystem);
    const shopSystem = new ShopSystem(saveSystem, economySystem, inventorySystem);
    const sceneManager = new SceneManager();

    // 2. Precarga inicial de recursos gráficos en alta definición (portada ilustrada HD, atlas HD 4x y fondo urbano HD)
    await assetLoader.preload([
        { key: 'menu_cover', type: 'image', src: 'assets/backgrounds/menu_cover_hd.jpg' },
        { key: 'game_atlas', type: 'image', src: 'assets/sprites/game_atlas_hd.png' },
        { key: 'city_bg', type: 'image', src: 'assets/backgrounds/city_street_hd.png' }
    ]);
    const spriteAtlas = new SpriteAtlas(assetLoader);

    // 3. Crear instancia del motor principal
    const engine = new GameEngine({
        renderer,
        sceneManager,
        inputManager,
        saveSystem,
        audioManager,
        economySystem,
        levelSystem,
        inventorySystem,
        shopSystem,
        assetLoader,
        spriteAtlas
    });

    // 4. Registrar todas las escenas modulares
    sceneManager.register('mainMenu', new MainMenu(engine));
    sceneManager.register('introduction', new Introduction(engine));
    sceneManager.register('briefing', new BriefingScene(engine));
    sceneManager.register('level01', new Level01(engine));
    sceneManager.register('level02', new Level02(engine));
    sceneManager.register('shop', new Shop(engine));
    sceneManager.register('gameOver', new GameOver(engine));

    // 5. Configurar modales interactivos globales
    setupGlobalModals(engine);

    // 6. Iniciar portada principal y bucle de tiempo real
    sceneManager.switchImmediate('mainMenu');
    engine.start();
}

window.addEventListener('DOMContentLoaded', bootstrap);
