/**
 * AudioManager.js
 * Motor de sonido de alto impacto basado exclusivamente en Web Audio API.
 * Incluye cadena de compresión dinámica + saturación armónica cálida para que
 * disparos, explosiones, golpes viscerales, casquillos, empuje de cajas y rugidos
 * suenen contundentes, duros y realistas sin dependencias externas.
 */

export class AudioManager {
    constructor(saveSystem) {
        this.saveSystem = saveSystem;
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.sfxBus = null;
        this.compressor = null;

        this.noiseBuffer = null;      // Ruido marrón-rosado (lluvia, truenos, sub-explosiones)
        this.whiteNoiseBuffer = null; // Ruido blanco de alta presión (disparos reales, chispas, impactos)
        this.ambientNodes = null;
        this.pulseTimer = null;
        this.currentAmbienceMode = 'none';

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

    _makeSaturationCurve(amount = 28) {
        const samples = 1024;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
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
        this.sfxBus = this.ctx.createGain();
        this.sfxBus.gain.value = 1.48; // Ganancia extra de pegada para efectos duros

        const shaper = this.ctx.createWaveShaper();
        shaper.curve = this._makeSaturationCurve(26);
        shaper.oversample = '2x';

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -14;
        this.compressor.knee.value = 10;
        this.compressor.ratio.value = 6.5;
        this.compressor.attack.value = 0.002;
        this.compressor.release.value = 0.14;

        this.musicGain.connect(this.masterGain);
        this.sfxBus.connect(shaper);
        shaper.connect(this.compressor);
        this.compressor.connect(this.sfxGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this._createNoiseBuffers();
        this.syncVolumes();
        return true;
    }

    _createNoiseBuffers() {
        if (!this.ctx) return;
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * 3;

        const brownBuf = this.ctx.createBuffer(1, length, sampleRate);
        const whiteBuf = this.ctx.createBuffer(1, length, sampleRate);
        const brownData = brownBuf.getChannelData(0);
        const whiteData = whiteBuf.getChannelData(0);

        let lastOut = 0;
        for (let i = 0; i < length; i++) {
            const white = Math.random() * 2 - 1;
            whiteData[i] = white;
            brownData[i] = (lastOut + 0.045 * white) / 1.045;
            lastOut = brownData[i];
            brownData[i] *= 2.8;
        }
        this.noiseBuffer = brownBuf;
        this.whiteNoiseBuffer = whiteBuf;
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

    startAmbience(mode = 'menu') {
        if (this.currentAmbienceMode === mode && this.ambientNodes) return;
        this.stopAmbience();
        this.currentAmbienceMode = mode;

        if (!this._ensureContext() || this.ctx.state === 'suspended') return;

        const now = this.ctx.currentTime;
        const envGain = this.ctx.createGain();
        envGain.gain.setValueAtTime(0.001, now);
        envGain.gain.linearRampToValueAtTime(1.0, now + 1.5);
        envGain.connect(this.musicGain);

        const rainSource = this.ctx.createBufferSource();
        rainSource.buffer = this.noiseBuffer;
        rainSource.loop = true;

        const rainFilter = this.ctx.createBiquadFilter();
        rainFilter.type = 'bandpass';
        rainFilter.frequency.value = mode === 'intro' ? 680 : 950;
        rainFilter.Q.value = 0.65;

        const rainGain = this.ctx.createGain();
        rainGain.gain.value = mode === 'menu' ? 0.22 : 0.12;

        rainSource.connect(rainFilter);
        rainFilter.connect(rainGain);
        rainGain.connect(envGain);
        rainSource.start(now);

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.value = mode === 'intro' ? 41.2 : 36.71;
        osc2.frequency.value = mode === 'intro' ? 43.65 : 55.0;

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

        const scale = mode === 'intro'
            ? [164.81, 174.61, 196.0, 220.0, 146.83]
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
        osc.frequency.setValueAtTime(560, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.035);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.045);
    }

    playClick() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.075);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.085);
    }

    playConfirm() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;

        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(130, now);
        sub.frequency.exponentialRampToValueAtTime(34, now + 0.65);
        subGain.gain.setValueAtTime(0.55, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        sub.connect(subGain);
        subGain.connect(this.sfxBus);
        sub.start(now);
        sub.stop(now + 0.72);

        const metal = this.ctx.createOscillator();
        const metalGain = this.ctx.createGain();
        metal.type = 'sawtooth';
        metal.frequency.setValueAtTime(520, now);
        metal.frequency.exponentialRampToValueAtTime(155, now + 0.35);
        metalGain.gain.setValueAtTime(0.22, now);
        metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        metal.connect(metalGain);
        metalGain.connect(this.sfxBus);
        metal.start(now);
        metal.stop(now + 0.4);
    }

    playError() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.setValueAtTime(105, now + 0.09);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.24);
    }

    playThunder() {
        if (!this._canPlaySfx() || !this.noiseBuffer) return;
        const now = this.ctx.currentTime;

        // Chasquido eléctrico inicial del relámpago
        if (this.whiteNoiseBuffer) {
            const crack = this.ctx.createBufferSource();
            crack.buffer = this.whiteNoiseBuffer;
            const cFilter = this.ctx.createBiquadFilter();
            cFilter.type = 'bandpass';
            cFilter.frequency.setValueAtTime(1850, now);
            const cGain = this.ctx.createGain();
            cGain.gain.setValueAtTime(0.45, now);
            cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            crack.connect(cFilter);
            cFilter.connect(cGain);
            cGain.connect(this.sfxBus);
            crack.start(now);
            crack.stop(now + 0.2);
        }

        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(340, now);
        filter.frequency.exponentialRampToValueAtTime(52, now + 2.1);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.linearRampToValueAtTime(0.58, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxBus);
        src.start(now);
        src.stop(now + 2.25);
    }

    playTypewriter() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(820 + Math.random() * 180, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.028);
    }

    playIntroChapterCue(chapterIndex) {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        switch (chapterIndex) {
            case 0:
            case 1: {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(chapterIndex === 0 ? 587.33 : 659.25, now);
                osc.frequency.exponentialRampToValueAtTime(293.66, now + 0.55);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc.connect(gain);
                gain.connect(this.sfxBus);
                osc.start(now);
                osc.stop(now + 0.62);
                break;
            }
            case 2: {
                for (let i = 0; i < 2; i++) {
                    const start = now + i * 0.42;
                    const alarm = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    alarm.type = 'sawtooth';
                    alarm.frequency.setValueAtTime(660, start);
                    alarm.frequency.linearRampToValueAtTime(420, start + 0.32);
                    gain.gain.setValueAtTime(0.22, start);
                    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
                    alarm.connect(gain);
                    gain.connect(this.sfxBus);
                    alarm.start(start);
                    alarm.stop(start + 0.36);
                }
                break;
            }
            case 3:
            case 5:
                this.playThunder();
                break;
            case 4:
            case 6: {
                for (let beat = 0; beat < 2; beat++) {
                    const t = now + beat * 0.24;
                    const thump = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    thump.type = 'sine';
                    thump.frequency.setValueAtTime(beat === 0 ? 86 : 68, t);
                    thump.frequency.exponentialRampToValueAtTime(28, t + 0.18);
                    gain.gain.setValueAtTime(beat === 0 ? 0.48 : 0.34, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
                    thump.connect(gain);
                    gain.connect(this.sfxBus);
                    thump.start(t);
                    thump.stop(t + 0.22);
                }
                break;
            }
            default:
                break;
        }
    }

    // --- Efectos de Combate Duros y Realistas (Balística Multicapa) ---

    playShoot(weaponId = 'pistol_9mm') {
        if (!this._canPlaySfx() || !this.whiteNoiseBuffer) return;
        const now = this.ctx.currentTime;

        if (weaponId === 'flamethrower_bio') {
            const jet = this.ctx.createBufferSource();
            jet.buffer = this.noiseBuffer || this.whiteNoiseBuffer;
            const flt = this.ctx.createBiquadFilter();
            flt.type = 'bandpass';
            flt.frequency.setValueAtTime(520, now);
            flt.Q.value = 0.55;
            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.46, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
            jet.connect(flt);
            flt.connect(g);
            g.connect(this.sfxBus);
            jet.start(now);
            jet.stop(now + 0.2);
            return;
        }

        const isShotgun = weaponId === 'shotgun_combat';
        const isHeavy = isShotgun || weaponId === 'revolver_magnum' || weaponId === 'rifle_bio';

        // Capa 1: Crack supersónico de pólvora (ruido blanco de alta energía)
        const crack = this.ctx.createBufferSource();
        crack.buffer = this.whiteNoiseBuffer;
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.setValueAtTime(isShotgun ? 1350 : (isHeavy ? 1750 : 2200), now);
        hp.Q.value = 0.65;

        const dur = isShotgun ? 0.30 : (isHeavy ? 0.22 : 0.16);
        const crackGain = this.ctx.createGain();
        crackGain.gain.setValueAtTime(isShotgun ? 0.92 : (isHeavy ? 0.78 : 0.64), now);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        crack.connect(hp);
        hp.connect(crackGain);
        crackGain.connect(this.sfxBus);
        crack.start(now);
        crack.stop(now + dur + 0.02);

        // Capa 2: Cuerpo de presión sub-grave en el pecho (golpe seco de recámara)
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = isHeavy ? 'sawtooth' : 'triangle';
        sub.frequency.setValueAtTime(isShotgun ? 165 : (isHeavy ? 195 : 230), now);
        sub.frequency.exponentialRampToValueAtTime(34, now + (isShotgun ? 0.19 : 0.13));
        subGain.gain.setValueAtTime(isShotgun ? 0.85 : 0.65, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + (isShotgun ? 0.20 : 0.14));
        sub.connect(subGain);
        subGain.connect(this.sfxBus);
        sub.start(now);
        sub.stop(now + 0.22);

        // Capa 3: Retroceso mecánico de corredera metálica + caída de casquillo de latón
        const slide = this.ctx.createOscillator();
        const slideGain = this.ctx.createGain();
        slide.type = 'square';
        slide.frequency.setValueAtTime(1480, now + 0.025);
        slide.frequency.exponentialRampToValueAtTime(520, now + 0.065);
        slideGain.gain.setValueAtTime(0.18, now + 0.025);
        slideGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
        slide.connect(slideGain);
        slideGain.connect(this.sfxBus);
        slide.start(now + 0.025);
        slide.stop(now + 0.075);

        this.playShellCasing(0.16 + Math.random() * 0.08);
    }

    playShellCasing(delay = 0.16) {
        if (!this._canPlaySfx()) return;
        const t = this.ctx.currentTime + delay;
        const ping = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        ping.type = 'sine';
        const baseFreq = 3200 + Math.random() * 750;
        ping.frequency.setValueAtTime(baseFreq, t);
        ping.frequency.exponentialRampToValueAtTime(baseFreq * 1.18, t + 0.035);
        g.gain.setValueAtTime(0.09, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        ping.connect(g);
        g.connect(this.sfxBus);
        ping.start(t);
        ping.stop(t + 0.05);
    }

    playMelee(weaponId = 'flashlight_melee') {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const isBlade = weaponId === 'machete_combat';

        // Silbido cortante del aire
        if (this.whiteNoiseBuffer) {
            const whoosh = this.ctx.createBufferSource();
            whoosh.buffer = this.whiteNoiseBuffer;
            const bp = this.ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(isBlade ? 2400 : 780, now);
            bp.frequency.exponentialRampToValueAtTime(isBlade ? 920 : 260, now + 0.14);
            bp.Q.value = isBlade ? 1.8 : 0.9;
            const wg = this.ctx.createGain();
            wg.gain.setValueAtTime(0.48, now);
            wg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            whoosh.connect(bp);
            bp.connect(wg);
            wg.connect(this.sfxBus);
            whoosh.start(now);
            whoosh.stop(now + 0.16);
        }

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isBlade ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(isBlade ? 540 : 310, now);
        osc.frequency.exponentialRampToValueAtTime(68, now + 0.14);
        gain.gain.setValueAtTime(0.46, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.16);
    }

    playEmptyClip() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1180, now);
        osc.frequency.setValueAtTime(720, now + 0.025);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.065);
    }

    playReload() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        [0, 0.15, 0.32].forEach((offset, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = idx === 2 ? 'square' : 'triangle';
            osc.frequency.setValueAtTime(idx === 0 ? 320 : (idx === 1 ? 560 : 880), now + offset);
            osc.frequency.exponentialRampToValueAtTime(idx === 0 ? 170 : (idx === 1 ? 790 : 480), now + offset + 0.065);
            gain.gain.setValueAtTime(0.28, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.075);
            osc.connect(gain);
            gain.connect(this.sfxBus);
            osc.start(now + offset);
            osc.stop(now + offset + 0.08);
        });
    }

    playJump() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(155, now);
        osc.frequency.exponentialRampToValueAtTime(340, now + 0.11);
        gain.gain.setValueAtTime(0.24, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.13);
    }

    playRoll() {
        if (!this._canPlaySfx() || !this.whiteNoiseBuffer) return;
        const now = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.whiteNoiseBuffer;
        const flt = this.ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(920, now);
        flt.frequency.exponentialRampToValueAtTime(180, now + 0.24);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.36, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        src.connect(flt);
        flt.connect(g);
        g.connect(this.sfxBus);
        src.start(now);
        src.stop(now + 0.26);
    }

    playCratePush() {
        if (!this._canPlaySfx() || !this.noiseBuffer) return;
        const now = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const flt = this.ctx.createBiquadFilter();
        flt.type = 'bandpass';
        flt.frequency.setValueAtTime(220, now);
        flt.Q.value = 1.4;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.38, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        src.connect(flt);
        flt.connect(g);
        g.connect(this.sfxBus);
        src.start(now);
        src.stop(now + 0.24);
    }

    playHurt() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.24);
        gain.gain.setValueAtTime(0.56, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.27);

        if (this.whiteNoiseBuffer) {
            const smack = this.ctx.createBufferSource();
            smack.buffer = this.whiteNoiseBuffer;
            const bp = this.ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(980, now);
            const sg = this.ctx.createGain();
            sg.gain.setValueAtTime(0.45, now);
            sg.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
            smack.connect(bp);
            bp.connect(sg);
            sg.connect(this.sfxBus);
            smack.start(now);
            smack.stop(now + 0.12);
        }
    }

    playEnemyHit(armored = false) {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;

        if (armored) {
            const clang = this.ctx.createOscillator();
            const cg = this.ctx.createGain();
            clang.type = 'square';
            clang.frequency.setValueAtTime(1650, now);
            clang.frequency.exponentialRampToValueAtTime(620, now + 0.09);
            cg.gain.setValueAtTime(0.34, now);
            cg.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            clang.connect(cg);
            cg.connect(this.sfxBus);
            clang.start(now);
            clang.stop(now + 0.11);
        }

        // Impacto carnal húmedo + golpe óseo grave
        const thud = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        thud.type = 'triangle';
        thud.frequency.setValueAtTime(185, now);
        thud.frequency.exponentialRampToValueAtTime(46, now + 0.11);
        gain.gain.setValueAtTime(0.48, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        thud.connect(gain);
        gain.connect(this.sfxBus);
        thud.start(now);
        thud.stop(now + 0.13);

        if (this.whiteNoiseBuffer) {
            const splat = this.ctx.createBufferSource();
            splat.buffer = this.whiteNoiseBuffer;
            const bp = this.ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.setValueAtTime(1150, now);
            bp.Q.value = 1.1;
            const sg = this.ctx.createGain();
            sg.gain.setValueAtTime(0.36, now);
            sg.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
            splat.connect(bp);
            bp.connect(sg);
            sg.connect(this.sfxBus);
            splat.start(now);
            splat.stop(now + 0.09);
        }
    }

    playEnemyDeath() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;

        const groan = this.ctx.createOscillator();
        const groan2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        groan.type = 'sawtooth';
        groan2.type = 'square';
        groan.frequency.setValueAtTime(145, now);
        groan.frequency.linearRampToValueAtTime(42, now + 0.38);
        groan2.frequency.setValueAtTime(98, now);
        groan2.frequency.linearRampToValueAtTime(32, now + 0.38);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(580, now);

        gain.gain.setValueAtTime(0.44, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.40);

        groan.connect(filter);
        groan2.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxBus);
        groan.start(now);
        groan2.start(now);
        groan.stop(now + 0.42);
        groan2.stop(now + 0.42);
    }

    playExplosion() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;

        // Onda de choque sub-baja masiva
        const boom = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        boom.type = 'sine';
        boom.frequency.setValueAtTime(140, now);
        boom.frequency.exponentialRampToValueAtTime(22, now + 0.72);
        bGain.gain.setValueAtTime(0.95, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        boom.connect(bGain);
        bGain.connect(this.sfxBus);
        boom.start(now);
        boom.stop(now + 0.78);

        // Detonación pirotécnica rasgada
        if (this.whiteNoiseBuffer) {
            const blast = this.ctx.createBufferSource();
            blast.buffer = this.whiteNoiseBuffer;
            const lp = this.ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.setValueAtTime(1600, now);
            lp.frequency.exponentialRampToValueAtTime(95, now + 0.85);
            const nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(0.88, now);
            nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.88);
            blast.connect(lp);
            lp.connect(nGain);
            nGain.connect(this.sfxBus);
            blast.start(now);
            blast.stop(now + 0.9);
        }
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
            gain.gain.setValueAtTime(0.24, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
            osc.connect(gain);
            gain.connect(this.sfxBus);
            osc.start(t);
            osc.stop(t + 0.17);
        });
    }

    playExtraLife() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const t = now + i * 0.085;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.32, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
            osc.connect(gain);
            gain.connect(this.sfxBus);
            osc.start(t);
            osc.stop(t + 0.30);
        });
    }

    playCheckpointRespawn() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        [261.63, 392.0, 523.25].forEach((freq, i) => {
            const t = now + i * 0.09;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.28, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
            osc.connect(g);
            g.connect(this.sfxBus);
            osc.start(t);
            osc.stop(t + 0.28);
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
            gain.gain.setValueAtTime(0.28, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
            osc.connect(gain);
            gain.connect(this.sfxBus);
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
        osc1.frequency.setValueAtTime(96, now);
        osc1.frequency.linearRampToValueAtTime(38, now + 0.92);
        osc2.frequency.setValueAtTime(68, now);
        osc2.frequency.linearRampToValueAtTime(29, now + 0.92);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0.02, now);
        gain.gain.linearRampToValueAtTime(0.58, now + 0.10);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.96);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxBus);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.98);
        osc2.stop(now + 0.98);
    }

    playBossSlam() {
        if (!this._canPlaySfx()) return;
        this.playExplosion();
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
            gain.gain.setValueAtTime(0.30, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
            osc.connect(gain);
            gain.connect(this.sfxBus);
            osc.start(t);
            osc.stop(t + 0.48);
        });
    }

    playGameOver() {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        [220, 196, 164.81, 123.47].forEach((freq, idx) => {
            const t = now + idx * 0.22;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.28, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.44);
            osc.connect(gain);
            gain.connect(this.sfxBus);
            osc.start(t);
            osc.stop(t + 0.46);
        });
    }

    playZombieTransformation() {
        if (!this._canPlaySfx()) return;
        this.playGameOver();
        const now = this.ctx.currentTime + 0.35;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const flt = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(112, now);
        osc1.frequency.exponentialRampToValueAtTime(36, now + 1.25);
        osc2.frequency.setValueAtTime(79, now);
        osc2.frequency.exponentialRampToValueAtTime(27, now + 1.25);
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(520, now);
        g.gain.setValueAtTime(0.01, now);
        g.gain.linearRampToValueAtTime(0.62, now + 0.18);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
        osc1.connect(flt);
        osc2.connect(flt);
        flt.connect(g);
        g.connect(this.sfxBus);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.35);
        osc2.stop(now + 1.35);
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
