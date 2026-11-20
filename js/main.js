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
    const exitStandbyScreen = document.getElementById('exit-standby-screen');

    const closeAllModals = () => {
        if (input.isCapturingKey()) {
            input.cancelRebind();
        }
        modalHowTo?.classList.add('hidden');
        modalOptions?.classList.add('hidden');
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
    const optFullscreenToggle = document.getElementById('opt-fullscreen-toggle');

    // --- Pantalla completa ---
    const docEl = document.documentElement;
    const fullscreenSupported = Boolean(docEl?.requestFullscreen || docEl?.webkitRequestFullscreen);
    const isFullscreen = () => Boolean(document.fullscreenElement || document.webkitFullscreenElement);

    const syncFullscreenUI = () => {
        if (!optFullscreenToggle) return;
        if (!fullscreenSupported) {
            optFullscreenToggle.textContent = 'NO DISPONIBLE';
            optFullscreenToggle.disabled = true;
            optFullscreenToggle.classList.remove('is-on', 'is-off');
            return;
        }
        const active = isFullscreen();
        optFullscreenToggle.textContent = active ? 'ACTIVADA (ON)' : 'DESACTIVADA (OFF)';
        optFullscreenToggle.classList.toggle('is-on', active);
        optFullscreenToggle.classList.toggle('is-off', !active);
    };

    const toggleFullscreen = async () => {
        if (!fullscreenSupported) return;
        try {
            if (isFullscreen()) {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            } else if (docEl.requestFullscreen) {
                await docEl.requestFullscreen();
            } else if (docEl.webkitRequestFullscreen) {
                docEl.webkitRequestFullscreen();
            }
        } catch (err) {
            console.warn('[Main] No se pudo cambiar el modo de pantalla completa.', err);
        }
        engine.renderer?.resize?.();
        syncFullscreenUI();
    };

    optFullscreenToggle?.addEventListener('click', () => {
        audio.playClick();
        toggleFullscreen();
    });

    const onFullscreenChange = () => {
        engine.renderer?.resize?.();
        syncFullscreenUI();
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

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

        syncFullscreenUI();
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
                resetSaveFeedback.textContent = 'Pulsa de nuevo para borrar todo el progreso guardado.';
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

        syncOptionsUIFromSave();
        refreshHowToControls();
    });

    // --- SALIR: guarda y cierra el juego inmediatamente ---
    const performExit = () => {
        saveSystem.save();
        audio.stopIntroCues?.();
        audio.stopAmbience();
        if (audio.destroy) {
            audio.destroy();
        } else if (audio.ctx && typeof audio.ctx.close === 'function') {
            audio.ctx.close().catch(() => {});
        }
        engine.stop();
        closeAllModals();

        if (isFullscreen() && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }

        // Intentar cerrar la ventana/pestaña directamente dentro del gesto del usuario
        try {
            window.open('', '_self');
            window.close();
        } catch (_) {}
        try {
            window.close();
        } catch (_) {}

        // Si el navegador bloquea window.close() en pestañas abiertas manualmente,
        // descargamos el juego navegando a about:blank y mostramos el cierre definitivo.
        exitStandbyScreen?.classList.remove('hidden');
        const mainOverlay = document.getElementById('main-menu-overlay');
        mainOverlay?.classList.add('hidden');

        window.setTimeout(() => {
            if (!window.closed && window.location && typeof window.location.replace === 'function') {
                window.location.replace('about:blank');
            }
        }, 90);
    };

    window.addEventListener('ldz:exit-game', performExit);

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
            const anyOpen = [modalHowTo, modalOptions].some(
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
    audioManager.preloadLibrary();
    const economySystem = new EconomySystem(saveSystem);
    const levelSystem = new LevelSystem(saveSystem);
    const inventorySystem = new InventorySystem(saveSystem);
    const shopSystem = new ShopSystem(saveSystem, economySystem, inventorySystem);
    const sceneManager = new SceneManager();

    // 2. Precarga inicial de recursos gráficos en alta definición (portada ilustrada HD, atlas HD 4x, atlas extendido HD 2x y fondo urbano HD)
    await assetLoader.preload([
        { key: 'menu_cover', type: 'image', src: 'assets/backgrounds/menu_cover_hd.jpg' },
        { key: 'level01_bg', type: 'image', src: 'assets/backgrounds/level01_road_hd.jpg?v=5' },
        { key: 'intro_scene_01', type: 'image', src: 'assets/intro/intro_scene01.jpg' },
        { key: 'intro_scene_02', type: 'image', src: 'assets/intro/intro_scene02.jpg' },
        { key: 'intro_scene_03', type: 'image', src: 'assets/intro/intro_scene03.jpg' },
        { key: 'intro_scene_04', type: 'image', src: 'assets/intro/intro_scene04.jpg' },
        { key: 'intro_scene_05', type: 'image', src: 'assets/intro/intro_scene05.jpg' },
        { key: 'intro_scene_06', type: 'image', src: 'assets/intro/intro_scene06.jpg' },
        { key: 'game_atlas', type: 'image', src: 'assets/sprites/game_atlas_hd.png?v=2' },
        { key: 'game_atlas_ext', type: 'image', src: 'assets/sprites/game_atlas_ext_hd.png?v=2' },
        { key: 'zombie_walker', type: 'image', src: 'assets/sprites/zombie_walker_hd.png' },
        { key: 'zombie_walker_female', type: 'image', src: 'assets/sprites/zombie_walker_female_hd.png' },
        { key: 'delivery_sprite', type: 'image', src: 'assets/sprites/delivery_sprite_hd.png?v=4' },
        { key: 'portrait_faces', type: 'image', src: 'assets/portraits/edi_faces_hd.png' },
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
