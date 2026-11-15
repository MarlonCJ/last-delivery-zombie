/**
 * AudioManager.js
 * Motor de sonido nativo basado exclusivamente en Web Audio API.
 * Genera música ambiental Survival Horror, lluvia atmosférica, truenos,
 * efectos de interfaz y efectos narrativos sin requerir librerías externas.
 */

export class AudioManager {
    constructor(saveSystem) {
        this.saveSystem = saveSystem;
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        this.noiseBuffer = null;
        this.ambientNodes = null;
        this.pulseTimer = null;
        this.currentAmbienceMode = 'none'; // 'none' | 'menu' | 'intro' | 'briefing'

        this._unlockHandler = this.unlock.bind(this);
        window.addEventListener('pointerdown', this._unlockHandler, { passive: true });
        window.addEventListener('keydown', this._unlockHandler, { passive: true });

        this._unsubscribeSave = this.saveSystem.subscribe(() => {
            this.syncVolumes();
        });
    }

    destroy() {
        window.removeEventListener('pointerdown', this._unlockHandler);
        window.removeEventListener('keydown', this._unlockHandler);
        if (this._unsubscribeSave) this._unsubscribeSave();
        this.stopAmbience();
        if (this.ctx && this.ctx.state !== 'closed') {
            this.ctx.close();
        }
    }

    _ensureContext() {
        if (this.ctx) return true;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            if (!this._unsupportedWarned) {
                this._unsupportedWarned = true;
                console.warn('[AudioManager] Web Audio API no soportada en este navegador.');
            }
            return false;
        }

        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this._createNoiseBuffer();
        this.syncVolumes();
        return true;
    }

    _createNoiseBuffer() {
        if (!this.ctx) return;
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * 3; // 3 segundos en bucle
        const buffer = this.ctx.createBuffer(1, length, sampleRate);
        const data = buffer.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < length; i++) {
            const white = Math.random() * 2 - 1;
            // Ruido marrón-rosado suave ideal para lluvia y truenos
            data[i] = (lastOut + 0.045 * white) / 1.045;
            lastOut = data[i];
            data[i] *= 2.6;
        }
        this.noiseBuffer = buffer;
    }

    unlock() {
        if (!this._ensureContext()) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
                if (this.currentAmbienceMode !== 'none' && !this.ambientNodes) {
                    const desiredMode = this.currentAmbienceMode;
                    this.currentAmbienceMode = 'none';
                    this.startAmbience(desiredMode);
                }
            }).catch(() => {});
        } else if (this.currentAmbienceMode !== 'none' && !this.ambientNodes) {
            const desiredMode = this.currentAmbienceMode;
            this.currentAmbienceMode = 'none';
            this.startAmbience(desiredMode);
        }
    }

    syncVolumes() {
        if (!this.ctx || !this.masterGain) return;
        const settings = this.saveSystem.getSettings();
        const now = this.ctx.currentTime;
        const targetMaster = settings.soundEnabled ? settings.masterVolume : 0;

        this.masterGain.gain.setTargetAtTime(targetMaster, now, 0.04);
        this.musicGain.gain.setTargetAtTime(settings.musicVolume, now, 0.04);
        this.sfxGain.gain.setTargetAtTime(settings.sfxVolume, now, 0.04);
    }

    /**
     * Inicia el paisaje sonoro ambiental según la escena activa.
     */
    startAmbience(mode = 'menu') {
        if (this.currentAmbienceMode === mode && this.ambientNodes) return;
        this.stopAmbience();
        this.currentAmbienceMode = mode;

        if (!this._ensureContext() || this.ctx.state === 'suspended') {
            // Se activará automáticamente en el primer gesto del usuario
            return;
        }

        const now = this.ctx.currentTime;
        const envGain = this.ctx.createGain();
        envGain.gain.setValueAtTime(0.001, now);
        envGain.gain.linearRampToValueAtTime(1.0, now + 1.5);
        envGain.connect(this.musicGain);

        // 1. Capa de lluvia nocturna filtrada
        const rainSource = this.ctx.createBufferSource();
        rainSource.buffer = this.noiseBuffer;
        rainSource.loop = true;

        const rainFilter = this.ctx.createBiquadFilter();
        rainFilter.type = 'bandpass';
        rainFilter.frequency.value = mode === 'intro' ? 680 : 950;
        rainFilter.Q.value = 0.65;

        const rainGain = this.ctx.createGain();
        rainGain.gain.value = mode === 'menu' ? 0.22 : 0.11;

        rainSource.connect(rainFilter);
        rainFilter.connect(rainGain);
        rainGain.connect(envGain);
        rainSource.start(now);

        // 2. Drone grave Survival Horror (D1 + disonancia sutil)
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.value = mode === 'intro' ? 41.2 : 36.71; // E1 / D1
        osc2.frequency.value = mode === 'intro' ? 43.65 : 55.0; // F1 / A1

        const droneFilter = this.ctx.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = 135;

        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 0.14;
        lfoGain.gain.value = 48;
        lfo.connect(lfoGain);
        lfoGain.connect(droneFilter.frequency);

        const droneGain = this.ctx.createGain();
        droneGain.gain.value = 0.24;

        osc1.connect(droneFilter);
        osc2.connect(droneFilter);
        droneFilter.connect(droneGain);
        droneGain.connect(envGain);

        osc1.start(now);
        osc2.start(now);
        lfo.start(now);

        this.ambientNodes = {
            envGain,
            sources: [rainSource, osc1, osc2, lfo]
        };

        // 3. Notas melódicas sombrías periódicas
        const scale = mode === 'intro'
            ? [164.81, 174.61, 196.0, 220.0, 146.83] // Frigio oscuro
            : [146.83, 155.56, 174.61, 220.0, 130.81];
        let step = 0;

        this.pulseTimer = window.setInterval(() => {
            if (!this.ctx || this.ctx.state !== 'running' || !this.saveSystem.isSoundEnabled()) return;
            const freq = scale[step % scale.length];
            step += 1;
            this._playDarkPadNote(freq, 3.1, 0.08);
        }, 3800);
    }

    stopAmbience() {
        if (this.pulseTimer) {
            window.clearInterval(this.pulseTimer);
            this.pulseTimer = null;
        }

        if (this.ambientNodes && this.ctx) {
            const now = this.ctx.currentTime;
            const nodes = this.ambientNodes;
            this.ambientNodes = null;
            try {
                nodes.envGain.gain.cancelScheduledValues(now);
                nodes.envGain.gain.setValueAtTime(nodes.envGain.gain.value, now);
                nodes.envGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
                window.setTimeout(() => {
                    for (const src of nodes.sources) {
                        try { src.stop(); } catch (_) {}
                    }
                    try { nodes.envGain.disconnect(); } catch (_) {}
                }, 400);
            } catch (_) {}
        }
        this.currentAmbienceMode = 'none';
    }

    _playDarkPadNote(freq, duration = 2.8, peakGain = 0.08) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 0.992, now + duration);

        filter.type = 'lowpass';
        filter.frequency.value = 600;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(peakGain, now + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + duration + 0.05);
    }

    // --- Efectos de Interfaz y Ambiente ---

    playHover() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.035);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.045);
    }

    playClick() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.075);

        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.085);
    }

    playConfirm() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;

        // Impacto cinemático grave
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(115, now);
        sub.frequency.exponentialRampToValueAtTime(34, now + 0.65);

        subGain.gain.setValueAtTime(0.36, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        sub.connect(subGain);
        subGain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + 0.72);

        // Golpe metálico agudo
        const metal = this.ctx.createOscillator();
        const metalGain = this.ctx.createGain();
        metal.type = 'sawtooth';
        metal.frequency.setValueAtTime(440, now);
        metal.frequency.exponentialRampToValueAtTime(146.8, now + 0.35);

        metalGain.gain.setValueAtTime(0.11, now);
        metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        metal.connect(metalGain);
        metalGain.connect(this.sfxGain);
        metal.start(now);
        metal.stop(now + 0.4);
    }

    playError() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(145, now);
        osc.frequency.setValueAtTime(110, now + 0.09);

        gain.gain.setValueAtTime(0.16, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.24);
    }

    playThunder() {
        if (!this._canPlaySfx() || !this.noiseBuffer) return;
        const now = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(240, now);
        filter.frequency.exponentialRampToValueAtTime(55, now + 1.9);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        src.start(now);
        src.stop(now + 2.05);
    }

    playTypewriter() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(780 + Math.random() * 180, now);

        gain.gain.setValueAtTime(0.024, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.022);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.025);
    }

    /**
     * Efectos sonoros específicos para cada capítulo de la Introducción Narrativa.
     */
    playIntroChapterCue(chapterIndex) {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;

        switch (chapterIndex) {
            case 0: // Laboratorio Biogen
            case 1: { // Experimento Neurológico
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(chapterIndex === 0 ? 587.33 : 659.25, now);
                osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.55);
                gain.gain.setValueAtTime(0.09, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc.connect(gain);
                gain.connect(this.sfxGain);
                osc.start(now);
                osc.stop(now + 0.62);
                break;
            }
            case 2: { // Accidente Biológico: alarma de contención
                for (let i = 0; i < 2; i++) {
                    const start = now + i * 0.42;
                    const alarm = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    alarm.type = 'sawtooth';
                    alarm.frequency.setValueAtTime(620, start);
                    alarm.frequency.linearRampToValueAtTime(420, start + 0.32);
                    gain.gain.setValueAtTime(0.09, start);
                    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
                    alarm.connect(gain);
                    gain.connect(this.sfxGain);
                    alarm.start(start);
                    alarm.stop(start + 0.36);
                }
                break;
            }
            case 3: // Propagación
            case 5: { // Colapso de la sociedad
                this.playThunder();
                break;
            }
            case 4: // Transformación humana: latido tenso
            case 6: { // Presentación del protagonista
                for (let beat = 0; beat < 2; beat++) {
                    const t = now + beat * 0.24;
                    const thump = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    thump.type = 'sine';
                    thump.frequency.setValueAtTime(beat === 0 ? 78 : 64, t);
                    thump.frequency.exponentialRampToValueAtTime(28, t + 0.18);
                    gain.gain.setValueAtTime(beat === 0 ? 0.28 : 0.2, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                    thump.connect(gain);
                    gain.connect(this.sfxGain);
                    thump.start(t);
                    thump.stop(t + 0.22);
                }
                break;
            }
            default:
                break;
        }
    }

    // --- Efectos de Jugabilidad y Combate (Fase 3 / Fase 4) ---

    playShoot(weaponId = 'pistol_9mm') {
        if (!this._canPlaySfx() || !this.noiseBuffer) return;
        const now = this.ctx.currentTime;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(weaponId === 'shotgun_combat' ? 680 : 1250, now);
        filter.Q.value = 0.7;

        const dur = weaponId === 'shotgun_combat' ? 0.24 : 0.14;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(weaponId === 'shotgun_combat' ? 0.42 : 0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + dur + 0.02);

        // Golpe grave del disparo
        const punch = this.ctx.createOscillator();
        const punchGain = this.ctx.createGain();
        punch.type = 'triangle';
        punch.frequency.setValueAtTime(weaponId === 'shotgun_combat' ? 140 : 195, now);
        punch.frequency.exponentialRampToValueAtTime(42, now + 0.11);
        punchGain.gain.setValueAtTime(0.3, now);
        punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        punch.connect(punchGain);
        punchGain.connect(this.sfxGain);
        punch.start(now);
        punch.stop(now + 0.13);
    }

    playMelee() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.12);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.14);
    }

    playEmptyClip() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(920, now);
        osc.frequency.setValueAtTime(640, now + 0.025);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    playReload() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        [0, 0.16].forEach((offset, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(idx === 0 ? 360 : 540, now + offset);
            osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 190 : 780, now + offset + 0.06);
            gain.gain.setValueAtTime(0.14, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.07);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + offset);
            osc.stop(now + offset + 0.08);
        });
    }

    playJump() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(165, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.11);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    playHurt() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(58, now + 0.22);
        gain.gain.setValueAtTime(0.26, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    playEnemyHit() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(52, now + 0.09);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.11);
    }

    playEnemyDeath() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(135, now);
        osc.frequency.linearRampToValueAtTime(46, now + 0.32);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.36);
    }

    playPickup() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        [440, 587.33, 880].forEach((freq, i) => {
            const t = now + i * 0.075;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.13, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.17);
        });
    }

    playHeal() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        [392, 523.25].forEach((freq, i) => {
            const t = now + i * 0.1;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.16, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.24);
        });
    }

    playBossRoar() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(92, now);
        osc1.frequency.linearRampToValueAtTime(44, now + 0.85);
        osc2.frequency.setValueAtTime(68, now);
        osc2.frequency.linearRampToValueAtTime(33, now + 0.85);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420, now);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.32, now + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.92);
        osc2.stop(now + 0.92);
    }

    playBossSlam() {
        if (!this._canPlaySfx()) return;
        this.playThunder();
        const now = this.ctx.currentTime;
        const sub = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(98, now);
        sub.frequency.exponentialRampToValueAtTime(26, now + 0.48);
        gain.gain.setValueAtTime(0.38, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        sub.connect(gain);
        gain.connect(this.sfxGain);
        sub.start(now);
        sub.stop(now + 0.52);
    }

    playVictory() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        [293.66, 369.99, 440, 587.33].forEach((freq, idx) => {
            const t = now + idx * 0.13;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.18, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.48);
        });
    }

    playGameOver() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        [220, 196, 174.61, 146.83].forEach((freq, idx) => {
            const t = now + idx * 0.22;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.14, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(t);
            osc.stop(t + 0.45);
        });
    }

    _canPlaySfx() {
        this.unlock();
        return Boolean(
            this.ctx &&
            this.ctx.state === 'running' &&
            this.saveSystem.isSoundEnabled()
        );
    }
}
