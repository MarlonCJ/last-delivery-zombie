/**
 * MainMenu.js
 * Escena de portada principal de LAST DELIVERY ZOMBIE.
 * Renderiza en Canvas 2D la ciudad apocalíptica nocturna animada (protagonista,
 * Laboratorio Biogen, mutante colosal, helicóptero, zombis, lluvia e iluminación)
 * y coordina la interfaz interactiva del menú principal, Cómo Jugar, Opciones y Salir.
 */

export class MainMenu {
    constructor(engine) {
        this.engine = engine;
        this.time = 0;

        // Relámpagos atmosféricos
        this.lightningTimer = 4.2;
        this.lightningFlash = 0;
        this.lightningBolt = null;

        // Ventanas precalculadas de rascacielos para evitar cálculos aleatorios por frame
        this.buildings = this._createSkylineData();
        this.distantZombies = [
            { x: 355, y: 492, scale: 0.56, phase: 0.3 },
            { x: 425, y: 486, scale: 0.64, phase: 1.7 },
            { x: 785, y: 490, scale: 0.58, phase: 2.9 },
            { x: 835, y: 494, scale: 0.54, phase: 4.1 }
        ];

        // Referencias DOM
        this.menuOverlay = document.getElementById('main-menu-overlay');
        this.nameInput = document.getElementById('player-name-input');
        this.nameFeedback = document.getElementById('player-name-feedback');
        this.nameCard = document.getElementById('player-id-card');

        this.btnStart = document.getElementById('btn-start-game');
        this.btnHowTo = document.getElementById('btn-how-to-play');
        this.btnOptions = document.getElementById('btn-options');
        this.btnSound = document.getElementById('btn-toggle-sound');
        this.btnExit = document.getElementById('btn-exit-game');
        this.progressionBadge = document.getElementById('menu-progression-badge');

        this._bindMenuEvents();
    }

    _createSkylineData() {
        const specs = [
            { x: 20, w: 95, h: 250, brokenTop: true },
            { x: 125, w: 82, h: 195, brokenTop: false },
            { x: 245, w: 105, h: 285, brokenTop: true },
            { x: 360, w: 88, h: 215, brokenTop: false },
            { x: 465, w: 96, h: 240, brokenTop: true },
            { x: 735, w: 110, h: 230, brokenTop: false },
            { x: 855, w: 95, h: 265, brokenTop: true }
        ];

        return specs.map((b, idx) => {
            const windows = [];
            const cols = Math.floor((b.w - 18) / 16);
            const rows = Math.floor((b.h - 30) / 22);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const seed = (idx * 37 + r * 13 + c * 7) % 19;
                    if (seed < 4) {
                        windows.push({
                            rx: 10 + c * 16,
                            ry: 18 + r * 22,
                            color: seed === 0 ? 'rgba(215, 48, 48, 0.42)' : 'rgba(120, 155, 185, 0.14)'
                        });
                    }
                }
            }
            return { ...b, windows };
        });
    }

    _bindMenuEvents() {
        if (!this.menuOverlay) return;

        // Sonido hover en botones principales
        const buttons = [this.btnStart, this.btnHowTo, this.btnOptions, this.btnSound, this.btnExit];
        for (const btn of buttons) {
            if (!btn) continue;
            btn.addEventListener('pointerenter', () => this.engine.audio.playHover());
        }

        // Campo de nombre del protagonista
        if (this.nameInput) {
            this.nameInput.addEventListener('input', () => {
                const raw = this.nameInput.value;
                this.engine.saveSystem.setPlayerName(raw);
                this._clearNameError();
                this._updateSavedBadge();
            });

            this.nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this._handleStartGame();
                }
            });
        }

        // Botón INICIAR JUEGO
        this.btnStart?.addEventListener('click', () => {
            this._handleStartGame();
        });

        // Botón CÓMO JUGAR
        this.btnHowTo?.addEventListener('click', () => {
            this.engine.audio.playClick();
            window.dispatchEvent(new CustomEvent('ldz:open-modal', { detail: { modal: 'howto' } }));
        });

        // Botón OPCIONES
        this.btnOptions?.addEventListener('click', () => {
            this.engine.audio.playClick();
            window.dispatchEvent(new CustomEvent('ldz:open-modal', { detail: { modal: 'options' } }));
        });

        // Botón SONIDO: ON / OFF
        this.btnSound?.addEventListener('click', () => {
            const enabled = this.engine.saveSystem.toggleSound();
            if (enabled) {
                this.engine.audio.unlock();
                this.engine.audio.playClick();
            }
            this.syncSoundButtonUI();
        });

        // Botón SALIR
        this.btnExit?.addEventListener('click', () => {
            this.engine.audio.playClick();
            window.dispatchEvent(new CustomEvent('ldz:open-modal', { detail: { modal: 'exit' } }));
        });

        // Suscribirse a cambios en SaveSystem para mantener botón de sonido, credencial y progresión sincronizados
        this.engine.saveSystem.subscribe(() => {
            this.syncSoundButtonUI();
            this._updateSavedBadge();
            this._updateProgressionBadge();
        });
    }

    _updateProgressionBadge() {
        if (!this.progressionBadge) return;
        const lvl2Unlocked = this.engine.levels.isLevelUnlocked(2);
        if (lvl2Unlocked) {
            this.progressionBadge.textContent = '✓ NIVEL 01 SUPERADO — NIVEL 02: PABELLÓN DE URGENCIAS DESBLOQUEADO';
            this.progressionBadge.classList.add('is-unlocked');
        } else {
            this.progressionBadge.textContent = '🎯 MISIÓN ACTIVA: NIVEL 01 — PRIMERA ENTREGA (NV. 02 🔒 BLOQUEADO)';
            this.progressionBadge.classList.remove('is-unlocked');
        }
    }

    _handleStartGame() {
        const currentInput = this.nameInput ? this.nameInput.value : '';
        const savedName = this.engine.saveSystem.setPlayerName(currentInput);

        if (!savedName) {
            this.engine.audio.playError();
            if (this.nameCard) {
                this.nameCard.classList.remove('input-error-shake');
                void this.nameCard.offsetWidth; // Forzar reflow para reiniciar animación CSS
                this.nameCard.classList.add('input-error-shake');
            }
            if (this.nameFeedback) {
                this.nameFeedback.textContent = '⚠ Identificación obligatoria: introduce tu nombre de repartidor.';
                this.nameFeedback.classList.add('is-error');
            }
            this.nameInput?.focus();
            return;
        }

        this._clearNameError();
        this.engine.audio.unlock();
        this.engine.audio.playConfirm();

        // Siempre pasa por la Terminal Pre-Misión (briefing) tras la introducción para asignar las 3 armas antes de jugar
        this.engine.sceneManager.transitionTo('introduction', { playerName: savedName, targetScene: 'briefing' }, 0.55);
    }

    _clearNameError() {
        this.nameCard?.classList.remove('input-error-shake');
        this.nameFeedback?.classList.remove('is-error');
    }

    _updateSavedBadge() {
        if (!this.nameFeedback) return;
        const name = this.engine.saveSystem.getPlayerName();
        if (name) {
            this.nameFeedback.textContent = `✓ Credencial registrada en memoria local: ${name}`;
        } else {
            this.nameFeedback.textContent = 'Registra tu credencial para iniciar el turno nocturno.';
        }
    }

    syncSoundButtonUI() {
        if (!this.btnSound) return;
        const enabled = this.engine.saveSystem.isSoundEnabled();
        const statusEl = document.getElementById('sound-status-pill');
        const iconOn = document.getElementById('sound-icon-on');
        const iconOff = document.getElementById('sound-icon-off');

        if (statusEl) {
            statusEl.textContent = enabled ? 'ON' : 'OFF';
            statusEl.classList.toggle('is-on', enabled);
            statusEl.classList.toggle('is-off', !enabled);
        }
        if (iconOn) iconOn.classList.toggle('hidden', !enabled);
        if (iconOff) iconOff.classList.toggle('hidden', enabled);
    }

    enter() {
        this.time = 0;
        if (this.menuOverlay) {
            this.menuOverlay.classList.remove('hidden');
        }
        if (this.nameInput) {
            this.nameInput.value = this.engine.saveSystem.getPlayerName();
        }
        this._clearNameError();
        this._updateSavedBadge();
        this._updateProgressionBadge();
        this.syncSoundButtonUI();
        this.engine.audio.startAmbience('menu');
    }

    exit() {
        if (this.menuOverlay) {
            this.menuOverlay.classList.add('hidden');
        }
    }

    update(dt) {
        this.time += dt;
        this.engine.renderer.updateAtmosphere(dt);

        // Temporizador de relámpagos tormentosos
        this.lightningTimer -= dt;
        if (this.lightningTimer <= 0) {
            this.lightningTimer = 6.5 + Math.random() * 7.5;
            this.lightningFlash = 1.0;
            this._generateLightningBolt();
            this.engine.audio.playThunder();
        }

        if (this.lightningFlash > 0) {
            this.lightningFlash = Math.max(0, this.lightningFlash - dt * 2.8);
        }
    }

    _generateLightningBolt() {
        const startX = 960 + Math.random() * 220;
        const points = [{ x: startX, y: 0 }];
        let cx = startX;
        let cy = 0;
        while (cy < 260) {
            cx += (Math.random() - 0.5) * 48;
            cy += 26 + Math.random() * 24;
            points.push({ x: cx, y: cy });
        }
        this.lightningBolt = points;
    }

    render(renderer) {
        const ctx = renderer.ctx;
        const w = renderer.width;
        const h = renderer.height;
        const coverImg = this.engine.assets?.getImage('menu_cover');
        const cityImg = this.engine.assets?.getImage('city_bg');
        const atlas = this.engine.spriteAtlas;
        const hasCoverImg = Boolean(
            coverImg &&
            typeof ctx.drawImage === 'function' &&
            (coverImg.complete === undefined || coverImg.complete) &&
            (coverImg.naturalWidth === undefined || coverImg.naturalWidth > 0)
        );
        const hasCityImg = Boolean(
            cityImg &&
            typeof ctx.drawImage === 'function' &&
            (cityImg.complete === undefined || cityImg.complete) &&
            (cityImg.naturalWidth === undefined || cityImg.naturalWidth > 0)
        );

        // 1. Cielo tormentoso base
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.78);
        skyGrad.addColorStop(0, '#040811');
        skyGrad.addColorStop(0.45, '#0c1829');
        skyGrad.addColorStop(0.82, '#16263a');
        skyGrad.addColorStop(1, '#090c13');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        if (hasCoverImg) {
            // Portada ilustrada 2D Survival Horror de alta definición con movimiento de cámara sutil
            const driftX = Math.sin(this.time * 0.42) * 8;
            const driftY = Math.cos(this.time * 0.31) * 4;
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(coverImg, -14 + driftX, -8 + driftY, w + 28, h + 16);
            ctx.restore();

            // Destello eléctrico de tormenta sobre el horizonte
            if (this.lightningFlash > 0) {
                ctx.fillStyle = `rgba(195, 224, 255, ${(this.lightningFlash * 0.22).toFixed(3)})`;
                ctx.fillRect(0, 0, w, h * 0.62);
                this._drawLightningBolt(ctx);
            }

            // Haz móvil del reflector de cuarentena en el cielo
            renderer.drawLightCone(
                658 + driftX,
                92 + driftY,
                Math.PI * 0.34 + Math.sin(this.time * 0.68) * 0.11,
                0.20,
                430,
                'rgba(255, 238, 190, 0.16)',
                'rgba(255, 238, 190, 0)'
            );

            // Parpadeo cálido sobre el repartidor izquierdo y pulso carmesí en el complejo Biogen derecho
            const lampFlicker = Math.sin(this.time * 16.5) > 0.93 ? 0.68 : 1.0;
            renderer.drawRadialGlow(
                205 + driftX,
                165 + driftY,
                16,
                260,
                `rgba(255, 192, 92, ${(0.18 * lampFlicker).toFixed(3)})`
            );
            const alarmPulse = 0.16 + 0.10 * Math.abs(Math.sin(this.time * 2.6));
            renderer.drawRadialGlow(
                1065 + driftX,
                305 + driftY,
                18,
                210,
                `rgba(235, 36, 48, ${alarmPulse.toFixed(3)})`
            );

            // Contraste central suave detrás del título y botones para máxima legibilidad
            const centerShade = ctx.createRadialGradient(640, 395, 40, 640, 395, 430);
            centerShade.addColorStop(0, 'rgba(4, 7, 13, 0.50)');
            centerShade.addColorStop(0.68, 'rgba(4, 7, 13, 0.22)');
            centerShade.addColorStop(1, 'rgba(4, 7, 13, 0)');
            ctx.fillStyle = centerShade;
            ctx.fillRect(0, 0, w, h);
        } else if (hasCityImg && atlas?.isReady()) {
            if (this.lightningFlash > 0) {
                ctx.fillStyle = `rgba(195, 220, 255, ${(this.lightningFlash * 0.24).toFixed(3)})`;
                ctx.fillRect(0, 0, w, h * 0.65);
                this._drawLightningBolt(ctx);
            }
            const driftX = Math.sin(this.time * 0.35) * 12;
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(cityImg, -100 + driftX, 110, 1480, 493);
            ctx.restore();

            this._drawHelicopter(ctx, renderer);
            const centerShade = ctx.createRadialGradient(640, 385, 45, 640, 385, 520);
            centerShade.addColorStop(0, 'rgba(4, 7, 13, 0.58)');
            centerShade.addColorStop(1, 'rgba(4, 7, 13, 0.12)');
            ctx.fillStyle = centerShade;
            ctx.fillRect(0, 0, w, h);

            const streetY = 524;
            atlas.drawFrame(ctx, 'player_idle', Math.floor(this.time * 4.5), 240, streetY, {
                targetHeight: 120,
                flipX: false
            });
            atlas.drawFrame(ctx, 'znormal_walk', Math.floor(this.time * 5.2), 980, streetY, {
                targetHeight: 116,
                flipX: true
            });
            atlas.drawFrame(ctx, 'zfast_run', Math.floor(this.time * 8.5), 1100, streetY, {
                targetHeight: 114,
                flipX: true
            });
        } else {
            if (this.lightningFlash > 0) {
                ctx.fillStyle = `rgba(195, 220, 255, ${(this.lightningFlash * 0.24).toFixed(3)})`;
                ctx.fillRect(0, 0, w, h * 0.65);
                this._drawLightningBolt(ctx);
            }
            this._drawMoon(ctx, renderer, 838, 72);
            this._drawHelicopter(ctx, renderer);
            this._drawColossalMutant(ctx, renderer);
            this._drawDestroyedSkyline(ctx);
            this._drawBiogenLaboratory(ctx, renderer);
            renderer.drawFog('125, 160, 190', 0.9);
            this._drawDistantZombies(ctx);
            this._drawWetStreet(ctx, w, h);
            this._drawLeftRuinsAndLamp(ctx, renderer);
            this._drawRightFenceAndCar(ctx, renderer);
            this._drawForegroundZombie(ctx, 932, 560, 0.88, this.time * 2.1, true);
            this._drawForegroundZombie(ctx, 1130, 650, 1.36, this.time * 1.65 + 1.2, false);
        }

        // Lluvia intensa, niebla baja y viñeta cinematográfica
        renderer.drawFog('130, 150, 175', 0.46);
        renderer.drawRain(true);
        renderer.drawVignette(0.72);
    }

    _drawLightningBolt(ctx) {
        if (!this.lightningBolt || this.lightningFlash <= 0.15) return;
        ctx.save();
        ctx.strokeStyle = `rgba(230, 242, 255, ${(this.lightningFlash * 0.9).toFixed(3)})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#88c0ff';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        this.lightningBolt.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
    }

    _drawMoon(ctx, renderer, mx, my) {
        renderer.drawRadialGlow(mx, my, 18, 135, 'rgba(165, 215, 255, 0.24)', 'rgba(165, 215, 255, 0)');
        ctx.save();
        ctx.fillStyle = '#dceeff';
        ctx.beginPath();
        ctx.arc(mx, my, 34, 0, Math.PI * 2);
        ctx.fill();

        // Cráteres sutiles
        ctx.fillStyle = 'rgba(140, 175, 210, 0.38)';
        ctx.beginPath();
        ctx.arc(mx - 10, my - 8, 8, 0, Math.PI * 2);
        ctx.arc(mx + 12, my + 6, 10, 0, Math.PI * 2);
        ctx.arc(mx - 3, my + 14, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _drawHelicopter(ctx, renderer) {
        const hx = 955 + Math.sin(this.time * 0.45) * 28;
        const hy = 58 + Math.cos(this.time * 0.9) * 5;
        const beamAngle = Math.PI * 0.63 + Math.sin(this.time * 0.65) * 0.16;

        // Cono de luz del reflector
        renderer.drawLightCone(
            hx - 8,
            hy + 8,
            beamAngle,
            0.22,
            340,
            'rgba(195, 228, 255, 0.20)',
            'rgba(195, 228, 255, 0)'
        );

        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(-0.08);
        ctx.fillStyle = '#090f18';
        // Cabina
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cola
        ctx.fillRect(16, -3, 30, 4);
        ctx.fillRect(42, -10, 4, 12);
        // Patines
        ctx.strokeStyle = '#090f18';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-14, 11);
        ctx.lineTo(14, 11);
        ctx.stroke();

        // Rotor animado
        const rotorWidth = 38 * Math.abs(Math.cos(this.time * 28)) + 8;
        ctx.strokeStyle = 'rgba(210, 230, 250, 0.55)';
        ctx.beginPath();
        ctx.moveTo(-rotorWidth, -11);
        ctx.lineTo(rotorWidth, -11);
        ctx.stroke();
        ctx.restore();
    }

    _drawColossalMutant(ctx, renderer) {
        const breath = Math.sin(this.time * 1.4) * 4;
        const mx = 1135;
        const my = 185 + breath;

        // Resplandor carmesí detrás del laboratorio
        renderer.drawRadialGlow(mx - 20, my + 75, 20, 230, 'rgba(210, 28, 38, 0.28)', 'rgba(210, 28, 38, 0)');

        ctx.save();
        const silBrightness = 14 + Math.floor(this.lightningFlash * 35);
        ctx.fillStyle = `rgb(${silBrightness + 12}, ${silBrightness}, ${silBrightness + 8})`;

        // Torso y hombros descomunales
        ctx.beginPath();
        ctx.moveTo(985, 360);
        ctx.quadraticCurveTo(1005, 200 + breath, 1075, 165 + breath);
        ctx.quadraticCurveTo(1135, 145 + breath, 1205, 170 + breath);
        ctx.quadraticCurveTo(1265, 205 + breath, 1285, 350);
        ctx.closePath();
        ctx.fill();

        // Cabeza monstruosa
        ctx.beginPath();
        ctx.arc(1132, 118 + breath, 42, 0, Math.PI * 2);
        ctx.fill();

        // Mandíbula rugiente
        ctx.fillStyle = '#2a090d';
        ctx.beginPath();
        ctx.ellipse(1130, 140 + breath, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ojos rojos brillantes
        ctx.fillStyle = '#ff2a2a';
        ctx.shadowColor = '#ff1e1e';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(1117, 110 + breath, 4.2, 0, Math.PI * 2);
        ctx.arc(1144, 111 + breath, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _drawDestroyedSkyline(ctx) {
        const horizonY = 505;
        ctx.save();

        for (const b of this.buildings) {
            const topY = horizonY - b.h;
            ctx.fillStyle = '#0a111c';
            ctx.beginPath();
            ctx.moveTo(b.x, horizonY);
            ctx.lineTo(b.x, topY + (b.brokenTop ? 18 : 0));
            if (b.brokenTop) {
                ctx.lineTo(b.x + b.w * 0.32, topY);
                ctx.lineTo(b.x + b.w * 0.58, topY + 14);
                ctx.lineTo(b.x + b.w * 0.82, topY + 4);
            }
            ctx.lineTo(b.x + b.w, topY + (b.brokenTop ? 20 : 0));
            ctx.lineTo(b.x + b.w, horizonY);
            ctx.closePath();
            ctx.fill();

            for (const win of b.windows) {
                ctx.fillStyle = win.color;
                ctx.fillRect(b.x + win.rx, topY + win.ry, 9, 13);
            }
        }
        ctx.restore();
    }

    _drawBiogenLaboratory(ctx, renderer) {
        ctx.save();
        // Colina rocosa derecha
        ctx.fillStyle = '#090d14';
        ctx.beginPath();
        ctx.moveTo(820, 515);
        ctx.quadraticCurveTo(960, 415, 1280, 395);
        ctx.lineTo(1280, 520);
        ctx.closePath();
        ctx.fill();

        // Edificio principal LABORATORIO BIOGEN
        ctx.fillStyle = '#111824';
        ctx.strokeStyle = '#243042';
        ctx.lineWidth = 2;
        ctx.fillRect(945, 285, 310, 155);
        ctx.strokeRect(945, 285, 310, 155);

        // Antenas de telecomunicaciones con baliza roja parpadeante
        ctx.strokeStyle = '#1c2636';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(985, 285);
        ctx.lineTo(995, 205);
        ctx.lineTo(1005, 285);
        ctx.moveTo(1110, 285);
        ctx.lineTo(1120, 218);
        ctx.lineTo(1130, 285);
        ctx.stroke();

        const beaconAlpha = 0.45 + 0.55 * Math.abs(Math.sin(this.time * 3.2));
        renderer.drawRadialGlow(995, 205, 2, 24, `rgba(255, 45, 45, ${beaconAlpha.toFixed(2)})`);
        renderer.drawRadialGlow(1120, 218, 2, 20, `rgba(255, 45, 45, ${(1 - beaconAlpha * 0.6).toFixed(2)})`);

        // Ventanales iluminados en rojo emergencia
        for (let col = 0; col < 5; col++) {
            const wx = 968 + col * 54;
            ctx.fillStyle = 'rgba(215, 38, 48, 0.48)';
            ctx.fillRect(wx, 358, 34, 42);
        }

        // Rótulo LABORATORIO BIOGEN
        ctx.fillStyle = '#dce6f2';
        ctx.font = 'bold 16px Impact, "Arial Black", sans-serif';
        ctx.fillText('LABORATORIO', 1030, 318);
        ctx.fillText('BIOGEN', 1030, 338);

        // Símbolo de riesgo biológico simplificado
        ctx.strokeStyle = '#e0e8f0';
        ctx.lineWidth = 2.2;
        const bx = 998;
        const by = 322;
        for (let i = 0; i < 3; i++) {
            const ang = (i * Math.PI * 2) / 3 - Math.PI / 2;
            ctx.beginPath();
            ctx.arc(bx + Math.cos(ang) * 8, by + Math.sin(ang) * 8, 7, ang - 1.1, ang + 1.1);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawDistantZombies(ctx) {
        ctx.save();
        for (const z of this.distantZombies) {
            const sway = Math.sin(this.time * 2.2 + z.phase) * 3;
            ctx.save();
            ctx.translate(z.x + sway, z.y);
            ctx.scale(z.scale, z.scale);
            ctx.fillStyle = '#0d1520';

            // Cabeza
            ctx.beginPath();
            ctx.arc(0, -68, 10, 0, Math.PI * 2);
            ctx.fill();
            // Torso encorvado y piernas
            ctx.fillRect(-11, -56, 22, 34);
            ctx.fillRect(-10, -22, 8, 28);
            ctx.fillRect(3, -22, 8, 28);

            // Brillo ocular tenue
            ctx.fillStyle = 'rgba(255, 70, 70, 0.65)';
            ctx.fillRect(-4, -70, 2.5, 2.5);
            ctx.fillRect(2, -70, 2.5, 2.5);
            ctx.restore();
        }
        ctx.restore();
    }

    _drawWetStreet(ctx, w, h) {
        const streetTop = 505;
        const roadGrad = ctx.createLinearGradient(0, streetTop, 0, h);
        roadGrad.addColorStop(0, '#0b1018');
        roadGrad.addColorStop(0.4, '#0f1622');
        roadGrad.addColorStop(1, '#06080e');
        ctx.fillStyle = roadGrad;
        ctx.fillRect(0, streetTop, w, h - streetTop);

        // Reflejos húmedos ámbar (farola izquierda) y carmesí (luces de emergencia/sangre)
        ctx.save();
        const amberReflect = ctx.createRadialGradient(270, 620, 12, 270, 635, 220);
        amberReflect.addColorStop(0, 'rgba(255, 170, 65, 0.24)');
        amberReflect.addColorStop(1, 'rgba(255, 170, 65, 0)');
        ctx.fillStyle = amberReflect;
        ctx.fillRect(40, streetTop, 460, h - streetTop);

        const redReflect = ctx.createRadialGradient(690, 650, 15, 690, 660, 320);
        redReflect.addColorStop(0, 'rgba(215, 28, 42, 0.25)');
        redReflect.addColorStop(1, 'rgba(215, 28, 42, 0)');
        ctx.fillStyle = redReflect;
        ctx.fillRect(350, streetTop, 680, h - streetTop);

        // Grietas y charcos oscuros en el pavimento
        ctx.strokeStyle = 'rgba(4, 6, 10, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(310, 560);
        ctx.lineTo(395, 595);
        ctx.lineTo(440, 645);
        ctx.moveTo(760, 580);
        ctx.lineTo(845, 625);
        ctx.lineTo(815, 690);
        ctx.stroke();
        ctx.restore();
    }

    _drawLeftRuinsAndLamp(ctx, renderer) {
        ctx.save();
        // Poste de farola metálica izquierda
        ctx.strokeStyle = '#141b24';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(46, 540);
        ctx.lineTo(78, 25);
        ctx.quadraticCurveTo(155, 5, 255, 42);
        ctx.stroke();

        // Cabezal de la lámpara
        const lampX = 258;
        const lampY = 52;
        ctx.fillStyle = '#1b222c';
        ctx.beginPath();
        ctx.moveTo(lampX - 28, lampY);
        ctx.lineTo(lampX + 28, lampY);
        ctx.lineTo(lampX + 18, lampY - 14);
        ctx.lineTo(lampX - 18, lampY - 14);
        ctx.closePath();
        ctx.fill();

        // Parpadeo sutil de farola de emergencia
        const flicker = Math.sin(this.time * 17) > 0.92 ? 0.68 : 1.0;
        renderer.drawLightCone(
            lampX,
            lampY + 2,
            Math.PI * 0.52,
            0.52,
            490,
            `rgba(255, 185, 85, ${(0.24 * flicker).toFixed(3)})`,
            'rgba(255, 165, 60, 0)'
        );
        renderer.drawRadialGlow(lampX, lampY + 4, 4, 58, `rgba(255, 220, 140, ${(0.75 * flicker).toFixed(2)})`);

        // Estandarte rasgado de cuarentena ondeando
        const windWave = Math.sin(this.time * 2.6) * 6;
        ctx.fillStyle = '#8b2626';
        ctx.beginPath();
        ctx.moveTo(68, 145);
        ctx.lineTo(148, 168);
        ctx.lineTo(136 + windWave, 305);
        ctx.lineTo(108 + windWave * 0.7, 282);
        ctx.lineTo(84 + windWave, 315);
        ctx.lineTo(52 + windWave * 0.5, 285);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(25, 10, 10, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(102 + windWave * 0.3, 225, 16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    _drawRightFenceAndCar(ctx, renderer) {
        ctx.save();
        // Valla metálica de cuarentena
        ctx.strokeStyle = 'rgba(40, 52, 68, 0.65)';
        ctx.lineWidth = 1.2;
        for (let x = 920; x < 1280; x += 22) {
            ctx.beginPath();
            ctx.moveTo(x, 380);
            ctx.lineTo(x + 28, 520);
            ctx.moveTo(x + 28, 380);
            ctx.lineTo(x, 520);
            ctx.stroke();
        }

        // Postes de la valla y concertina superior
        ctx.strokeStyle = '#18202c';
        ctx.lineWidth = 4;
        for (let x = 930; x <= 1250; x += 105) {
            ctx.beginPath();
            ctx.moveTo(x, 368);
            ctx.lineTo(x, 525);
            ctx.stroke();
        }

        // Vehículo abandonado manchado de sangre
        const cx = 945;
        const cy = 468;
        ctx.fillStyle = '#9aa6b4';
        ctx.beginPath();
        ctx.moveTo(cx, cy + 45);
        ctx.lineTo(cx + 12, cy + 16);
        ctx.lineTo(cx + 52, cy);
        ctx.lineTo(cx + 128, cy);
        ctx.lineTo(cx + 162, cy + 18);
        ctx.lineTo(cx + 185, cy + 24);
        ctx.lineTo(cx + 185, cy + 52);
        ctx.lineTo(cx, cy + 52);
        ctx.closePath();
        ctx.fill();

        // Ventanillas oscuras rotas
        ctx.fillStyle = '#121a24';
        ctx.fillRect(cx + 56, cy + 6, 32, 16);
        ctx.fillRect(cx + 94, cy + 6, 34, 16);

        // Salpicaduras de sangre seca en carrocería
        ctx.fillStyle = 'rgba(138, 18, 24, 0.78)';
        ctx.beginPath();
        ctx.arc(cx + 42, cy + 32, 11, 0, Math.PI * 2);
        ctx.arc(cx + 115, cy + 34, 14, 0, Math.PI * 2);
        ctx.fill();

        // Ruedas
        ctx.fillStyle = '#0a0e14';
        ctx.beginPath();
        ctx.arc(cx + 38, cy + 52, 16, 0, Math.PI * 2);
        ctx.arc(cx + 146, cy + 52, 16, 0, Math.PI * 2);
        ctx.fill();

        // Luz intermitente de avería
        if (Math.sin(this.time * 5.2) > 0) {
            renderer.drawRadialGlow(cx + 6, cy + 32, 2, 26, 'rgba(255, 130, 35, 0.65)');
        }
        ctx.restore();
    }

    _drawForegroundZombie(ctx, x, y, scale, phase, isMidground) {
        const sway = Math.sin(phase) * 4;
        const armSwing = Math.cos(phase) * 6;

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        // Sombra en el asfalto
        ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
        ctx.beginPath();
        ctx.ellipse(0, 38, 28, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Piernas
        ctx.fillStyle = '#1c2430';
        ctx.fillRect(-16, -8, 11, 44);
        ctx.fillRect(6, -8, 11, 44);

        // Torso con ropa desgarrada
        ctx.save();
        ctx.translate(sway * 0.4, -46);
        ctx.rotate(-0.12);
        ctx.fillStyle = isMidground ? '#5b535c' : '#4a5864';
        ctx.fillRect(-20, 0, 40, 44);

        // Manchas de sangre en camisa
        ctx.fillStyle = '#7c141b';
        ctx.beginPath();
        ctx.arc(-4, 18, 9, 0, Math.PI * 2);
        ctx.arc(6, 28, 7, 0, Math.PI * 2);
        ctx.fill();

        // Brazos extendidos amenazantes
        ctx.fillStyle = '#657268';
        ctx.fillRect(-34, 8 + armSwing * 0.4, 18, 9);
        ctx.fillRect(16, 12 - armSwing * 0.4, 18, 9);

        // Cabeza zombi
        ctx.fillStyle = '#6d7a6e';
        ctx.beginPath();
        ctx.arc(-4, -14, 15, 0, Math.PI * 2);
        ctx.fill();

        // Cabello desgreñado
        ctx.fillStyle = '#15191e';
        ctx.beginPath();
        ctx.arc(-3, -18, 15, Math.PI, Math.PI * 2);
        ctx.fill();

        // Mandíbula abierta y sangre
        ctx.fillStyle = '#2d070a';
        ctx.fillRect(-13, -10, 10, 9);

        // Ojos infectados brillantes
        ctx.fillStyle = '#ff3b3b';
        ctx.fillRect(-12, -17, 3.5, 3.5);
        ctx.fillRect(-5, -17, 3.5, 3.5);
        ctx.restore();

        ctx.restore();
    }
}
