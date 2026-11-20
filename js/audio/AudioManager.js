/**
 * AudioManager.js
 * Motor híbrido de sonido y música ambientada para LAST DELIVERY ZOMBIE.
 * Vincula la librería descargada en `assets/audio/` (pistas musicales de terror/acción,
 * lluvia nocturna y 21 efectos de sonido reales para las 6 escenas de Introducción y el
 * combate) con el mezclador dinámico de Web Audio API y respaldos procedurales instantáneos.
 */

export const AUDIO_LIBRARY = Object.freeze({
    // Pistas musicales y ambiente continuo
    music_menu: 'assets/audio/music_menu.mp3',
    music_intro: 'assets/audio/music_intro.mp3',
    music_gameplay: 'assets/audio/music_gameplay.mp3',
    amb_rain_night: 'assets/audio/amb_rain_night.ogg',

    // Efectos narrativos de las 6 escenas de Introducción
    sfx_phone_ring: 'assets/audio/sfx_phone_ring.mp3',
    sfx_motorcycle: 'assets/audio/sfx_motorcycle.ogg',
    sfx_hospital_beep: 'assets/audio/sfx_hospital_beep.ogg',
    sfx_car_pass: 'assets/audio/sfx_car_pass.ogg',
    sfx_car_crash: 'assets/audio/sfx_car_crash.wav',
    sfx_thunder: 'assets/audio/sfx_thunder.ogg',
    sfx_siren: 'assets/audio/sfx_siren.ogg',

    // Efectos de combate, armas, zombis e interfaz
    sfx_pistol: 'assets/audio/sfx_pistol.wav',
    sfx_shotgun: 'assets/audio/sfx_shotgun.ogg',
    sfx_reload: 'assets/audio/sfx_reload.mp3',
    sfx_melee: 'assets/audio/sfx_melee.mp3',
    sfx_zombie_groan: 'assets/audio/sfx_zombie_groan.mp3',
    sfx_zombie_death: 'assets/audio/sfx_zombie_death.wav',
    sfx_zombie_roar: 'assets/audio/sfx_zombie_roar.ogg',
    sfx_zombie_hit: 'assets/audio/sfx_zombie_hit.mp3',
    sfx_explosion: 'assets/audio/sfx_explosion.ogg',
    sfx_pickup: 'assets/audio/sfx_pickup.ogg',
    sfx_heal: 'assets/audio/sfx_heal.ogg',
    sfx_victory: 'assets/audio/sfx_victory.mp3',
    sfx_gameover: 'assets/audio/sfx_gameover.ogg',
    sfx_ui_click: 'assets/audio/sfx_ui_click.wav'
});

const STREAM_KEYS = new Set([
    'music_menu',
    'music_intro',
    'music_gameplay',
    'amb_rain_night'
]);

const AMBIENCE_PRESETS = Object.freeze({
    menu: { musicKey: 'music_menu', musicScale: 0.68, rainScale: 0.28, rate: 1.0 },
    intro: { musicKey: 'music_intro', musicScale: 0.72, rainScale: 0.22, rate: 1.0 },
    gameplay: { musicKey: 'music_gameplay', musicScale: 0.66, rainScale: 0.20, rate: 1.0 },
    gameover: { musicKey: 'music_intro', musicScale: 0.52, rainScale: 0.30, rate: 0.88 }
});

export class AudioManager {
    constructor(saveSystem) {
        this.saveSystem = saveSystem;
        this.ctx = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.sfxBus = null;
        this.sampleBus = null;
        this.compressor = null;

        this.noiseBuffer = null;
        this.whiteNoiseBuffer = null;
        this.ambientNodes = null;
        this.pulseTimer = null;
        this.currentAmbienceMode = 'none';

        // Caché de buffers decodificados (SFX) y streams HTMLAudioElement (Música/Lluvia)
        this.rawAudioData = new Map();
        this.sfxBuffers = new Map();
        this.streamElements = new Map();
        this._activeStreams = [];
        this._preloadStarted = false;
        this._decodingInFlight = new Set();

        // Control de escenas de introducción y cooldown de gruñidos
        this._activeIntroSources = [];
        this._introTimers = [];
        this._lastGroanAt = 0;

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
        this.stopIntroCues();
        this.stopAmbience();
        for (const el of this.streamElements.values()) {
            try {
                el.pause();
                el.src = '';
            } catch (_) {}
        }
        this.streamElements.clear();
        if (this.ctx && this.ctx.state !== 'closed') {
            this.ctx.close().catch?.(() => {});
        }
    }

    /**
     * Inicia la descarga asíncrona en segundo plano de todos los efectos y pistas
     * almacenados en `assets/audio/` sin bloquear el arranque visual del juego.
     */
    async preloadLibrary() {
        if (this._preloadStarted) return;
        this._preloadStarted = true;

        // 1. Preparar elementos de streaming para música y lluvia si el entorno es navegador
        if (typeof window !== 'undefined' && typeof window.Audio === 'function') {
            for (const key of STREAM_KEYS) {
                const src = AUDIO_LIBRARY[key];
                if (!src || this.streamElements.has(key)) continue;
                try {
                    const audioEl = new window.Audio(src);
                    audioEl.loop = true;
                    audioEl.preload = 'auto';
                    audioEl.volume = 0;
                    this.streamElements.set(key, audioEl);
                } catch (_) {}
            }
        }

        // 2. Descargar buffers binarios de todos los efectos de sonido (SFX)
        if (typeof fetch !== 'function') return;

        const sfxEntries = Object.entries(AUDIO_LIBRARY).filter(([k]) => !STREAM_KEYS.has(k));
        await Promise.allSettled(
            sfxEntries.map(async ([key, src]) => {
                try {
                    const res = await fetch(src);
                    if (!res.ok) return;
                    const arr = await res.arrayBuffer();
                    if (arr && arr.byteLength > 64) {
                        this.rawAudioData.set(key, arr);
                        if (this.ctx) {
                            await this._decodeSingleBuffer(key);
                        }
                    }
                } catch (_) {}
            })
        );
    }

    async _decodePendingBuffers() {
        if (!this.ctx) return;
        for (const key of this.rawAudioData.keys()) {
            if (!this.sfxBuffers.has(key) && !this._decodingInFlight.has(key)) {
                this._decodeSingleBuffer(key);
            }
        }
    }

    async _decodeSingleBuffer(key) {
        if (!this.ctx || this.sfxBuffers.has(key) || this._decodingInFlight.has(key)) return;
        const raw = this.rawAudioData.get(key);
        if (!raw) return;

        this._decodingInFlight.add(key);
        try {
            const copy = raw.slice(0);
            const decoded = await this.ctx.decodeAudioData(copy);
            if (decoded) {
                this.sfxBuffers.set(key, decoded);
            }
        } catch (_) {
            // Si algún códec falla en un navegador específico, se mantiene el sintetizador de respaldo
        } finally {
            this._decodingInFlight.delete(key);
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
        if (this.ctx) {
            this._decodePendingBuffers();
            return true;
        }
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
        this.sfxBus.gain.value = 1.38;

        // Bus limpio para muestras descargadas (sin distorsión de waveshaper)
        this.sampleBus = this.ctx.createGain();
        this.sampleBus.gain.value = 1.12;

        const shaper = this.ctx.createWaveShaper();
        shaper.curve = this._makeSaturationCurve(24);
        shaper.oversample = '2x';

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -14;
        this.compressor.knee.value = 10;
        this.compressor.ratio.value = 5.5;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.14;

        this.musicGain.connect(this.masterGain);
        this.sfxBus.connect(shaper);
        shaper.connect(this.compressor);
        this.sampleBus.connect(this.compressor);
        this.compressor.connect(this.sfxGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this._createNoiseBuffers();
        this.syncVolumes();
        this._decodePendingBuffers();
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
        this._ensureContext();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().then(() => {
                this._resumeDesiredAmbience();
            }).catch(() => {});
        } else {
            this._resumeDesiredAmbience();
        }
    }

    _resumeDesiredAmbience() {
        if (this.currentAmbienceMode === 'none') return;
        if (this._activeStreams.length > 0) {
            const settings = this.saveSystem.getSettings();
            if (settings.soundEnabled) {
                for (const item of this._activeStreams) {
                    if (item.el.paused) {
                        item.el.play().catch(() => {});
                    }
                }
            }
            this.syncVolumes();
            return;
        }
        if (!this.ambientNodes) {
            const desiredMode = this.currentAmbienceMode;
            this.currentAmbienceMode = 'none';
            this.startAmbience(desiredMode);
        }
    }

    syncVolumes() {
        const settings = this.saveSystem.getSettings();
        const targetMaster = settings.soundEnabled ? settings.masterVolume : 0;

        if (this.ctx && this.masterGain) {
            const now = this.ctx.currentTime;
            this.masterGain.gain.setTargetAtTime(targetMaster, now, 0.04);
            this.musicGain.gain.setTargetAtTime(settings.musicVolume, now, 0.04);
            this.sfxGain.gain.setTargetAtTime(settings.sfxVolume, now, 0.04);
        }

        // Sincronizar pistas musicales descargadas (HTMLAudioElement)
        for (const item of this._activeStreams) {
            const vol = Math.max(0, Math.min(1, targetMaster * settings.musicVolume * item.scale));
            item.el.volume = vol;
            if (!settings.soundEnabled && !item.el.paused) {
                item.el.pause();
            } else if (settings.soundEnabled && item.el.paused) {
                item.el.play().catch(() => {});
            }
        }
    }

    /**
     * Reproduce un efecto de sonido real descargado desde `this.sfxBuffers`.
     * Devuelve `true` si la muestra descargada se reprodujo, o `false` si aún está decodificando.
     */
    _playSample(key, options = {}) {
        if (!this._canPlaySfx() || !this.sampleBus) return false;
        const buffer = this.sfxBuffers.get(key);
        if (!buffer) {
            this._decodeSingleBuffer(key);
            return false;
        }

        const {
            volume = 0.85,
            rate = 1.0,
            offset = 0,
            maxDuration = 0,
            delay = 0,
            trackIntro = false
        } = options;

        const startAt = this.ctx.currentTime + Math.max(0, delay);
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.playbackRate.setValueAtTime(rate, startAt);

        const gain = this.ctx.createGain();
        const safeOffset = Math.min(Math.max(0, offset), Math.max(0, buffer.duration - 0.05));
        const naturalDur = Math.max(0.05, (buffer.duration - safeOffset) / Math.max(0.25, rate));
        const playDur = maxDuration > 0 ? Math.min(naturalDur, maxDuration) : naturalDur;

        gain.gain.setValueAtTime(volume, startAt);
        if (maxDuration > 0 && naturalDur > maxDuration) {
            const fadeStart = startAt + Math.max(0.04, playDur - 0.28);
            gain.gain.setValueAtTime(volume, fadeStart);
            gain.gain.exponentialRampToValueAtTime(0.001, startAt + playDur);
        }

        src.connect(gain);
        gain.connect(this.sampleBus);
        src.start(startAt, safeOffset);
        src.stop(startAt + playDur + 0.03);

        if (trackIntro) {
            const entry = { src, gain };
            this._activeIntroSources.push(entry);
            src.onended = () => {
                const idx = this._activeIntroSources.indexOf(entry);
                if (idx !== -1) this._activeIntroSources.splice(idx, 1);
            };
        }

        return true;
    }

    stopIntroCues() {
        for (const timerId of this._introTimers) {
            window.clearTimeout(timerId);
        }
        this._introTimers.length = 0;

        if (!this.ctx) {
            this._activeIntroSources.length = 0;
            return;
        }

        const now = this.ctx.currentTime;
        const active = [...this._activeIntroSources];
        this._activeIntroSources.length = 0;

        for (const item of active) {
            try {
                item.gain.gain.cancelScheduledValues(now);
                item.gain.gain.setValueAtTime(Math.max(0.001, item.gain.gain.value), now);
                item.gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
                item.src.stop(now + 0.14);
            } catch (_) {}
        }
    }

    startAmbience(mode = 'menu') {
        const normalizedMode = AMBIENCE_PRESETS[mode] ? mode : 'menu';
        if (this.currentAmbienceMode === normalizedMode && (this._activeStreams.length > 0 || this.ambientNodes)) {
            this.syncVolumes();
            return;
        }

        this.stopAmbience();
        this.currentAmbienceMode = normalizedMode;

        const preset = AMBIENCE_PRESETS[normalizedMode];
        const musicEl = this.streamElements.get(preset.musicKey);
        const rainEl = this.streamElements.get('amb_rain_night');

        // 1. Usar pistas reales descargadas (música ambientada + lluvia nocturna)
        if (musicEl) {
            const settings = this.saveSystem.getSettings();
            const master = settings.soundEnabled ? settings.masterVolume : 0;

            this._activeStreams = [{ el: musicEl, scale: preset.musicScale }];
            if (rainEl) {
                this._activeStreams.push({ el: rainEl, scale: preset.rainScale });
            }

            for (const item of this._activeStreams) {
                try {
                    if (item.el === musicEl) {
                        item.el.playbackRate = preset.rate || 1.0;
                    }
                    item.el.volume = Math.max(0, Math.min(1, master * settings.musicVolume * item.scale));
                    if (settings.soundEnabled) {
                        item.el.play().catch(() => {});
                    }
                } catch (_) {}
            }
            return;
        }

        // 2. Respaldo procedural Web Audio (entornos sin Audio HTML o mientras carga)
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
        rainFilter.frequency.value = normalizedMode === 'intro' ? 680 : 950;
        rainFilter.Q.value = 0.65;

        const rainGain = this.ctx.createGain();
        rainGain.gain.value = normalizedMode === 'menu' ? 0.22 : 0.12;

        rainSource.connect(rainFilter);
        rainFilter.connect(rainGain);
        rainGain.connect(envGain);
        rainSource.start(now);

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.value = normalizedMode === 'intro' ? 41.2 : 36.71;
        osc2.frequency.value = normalizedMode === 'intro' ? 43.65 : 55.0;

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

        const scale = normalizedMode === 'intro'
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

        if (this._activeStreams.length > 0) {
            for (const item of this._activeStreams) {
                try {
                    item.el.pause();
                } catch (_) {}
            }
            this._activeStreams = [];
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

    // --- Efectos de Interfaz, Clima e Introducción ---

    playHover() {
        if (!this._canPlaySfx()) return;
        if (this._playSample('sfx_ui_click', { volume: 0.22, rate: 1.5, maxDuration: 0.09 })) return;

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
        if (this._playSample('sfx_ui_click', { volume: 0.64, rate: 1.05, maxDuration: 0.22 })) return;

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
        this._playSample('sfx_ui_click', { volume: 0.72, rate: 0.84, maxDuration: 0.28 });

        const now = this.ctx.currentTime;
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(130, now);
        sub.frequency.exponentialRampToValueAtTime(34, now + 0.65);
        subGain.gain.setValueAtTime(0.50, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        sub.connect(subGain);
        subGain.connect(this.sfxBus);
        sub.start(now);
        sub.stop(now + 0.72);
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

    playThunder(trackIntro = false) {
        if (!this._canPlaySfx()) return;
        if (this._playSample('sfx_thunder', { volume: 0.82, rate: 0.96 + Math.random() * 0.08, maxDuration: 4.2, trackIntro })) {
            return;
        }
        if (!this.noiseBuffer) return;
        const now = this.ctx.currentTime;

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

    /**
     * Reproduce la ambientación sonora específica de cada una de las 6 páginas de cómic
     * de la Introducción protagonizada por EDI, deteniendo primero cualquier efecto previo.
     */
    playIntroSceneCue(cueKey) {
        this.stopIntroCues();
        if (!this._canPlaySfx()) return;

        const schedule = (delayMs, fn) => {
            const id = window.setTimeout(fn, delayMs);
            this._introTimers.push(id);
        };

        switch (cueKey) {
            case 'call': {
                // Escena 1: Llamada entrante de domicilios + arranque de la motocicleta de EDI
                const playedRing = this._playSample('sfx_phone_ring', { volume: 0.84, maxDuration: 2.8, trackIntro: true });
                if (!playedRing) this.playIntroChapterCue(1);
                schedule(1250, () => {
                    this._playSample('sfx_motorcycle', { volume: 0.72, rate: 1.0, maxDuration: 3.1, trackIntro: true });
                });
                break;
            }
            case 'lab': {
                // Escena 2: Monitor del Hospital General e indicaciones urgentes del paquete
                const playedBeep = this._playSample('sfx_hospital_beep', { volume: 0.72, rate: 1.0, maxDuration: 2.2, trackIntro: true });
                if (!playedBeep) this.playIntroChapterCue(2);
                schedule(680, () => {
                    this._playSample('sfx_hospital_beep', { volume: 0.56, rate: 1.18, maxDuration: 1.5, trackIntro: true });
                });
                break;
            }
            case 'road': {
                // Escena 3: La moto se queda sin gasolina + el automóvil pasa a toda velocidad
                this._playSample('sfx_motorcycle', { volume: 0.76, rate: 0.80, maxDuration: 2.3, trackIntro: true });
                schedule(820, () => {
                    const playedCar = this._playSample('sfx_car_pass', { volume: 0.88, rate: 1.0, maxDuration: 3.2, trackIntro: true });
                    if (!playedCar) this.playIntroChapterCue(3);
                });
                break;
            }
            case 'crash': {
                // Escena 4: Accidente violento del vehículo en la carretera + trueno nocturno
                const playedCrash = this._playSample('sfx_car_crash', { volume: 0.92, rate: 0.96, maxDuration: 2.5, trackIntro: true });
                if (!playedCrash) this.playExplosion();
                schedule(320, () => {
                    this.playThunder(true);
                });
                break;
            }
            case 'shot': {
                // Escena 5: Los muertos se levantan entre los restos + disparo de emergencia
                this._playSample('sfx_zombie_groan', { volume: 0.86, rate: 0.95, maxDuration: 2.6, trackIntro: true });
                schedule(620, () => {
                    const shotPlayed = this._playSample('sfx_pistol', { volume: 0.88, rate: 1.0, maxDuration: 1.6, trackIntro: true });
                    if (!shotPlayed) this.playShoot('pistol_9mm');
                });
                break;
            }
            case 'outbreak': {
                // Escena 6: Sirena de emergencia en la ciudad + rugido de la infección expandiéndose
                const sirenPlayed = this._playSample('sfx_siren', { volume: 0.74, rate: 1.0, maxDuration: 3.8, trackIntro: true });
                if (!sirenPlayed) this.playIntroChapterCue(6);
                schedule(480, () => {
                    this._playSample('sfx_zombie_roar', { volume: 0.84, rate: 0.90, maxDuration: 3.0, trackIntro: true });
                });
                break;
            }
            default:
                break;
        }
    }

    playIntroChapterCue(chapterIndex) {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;
        switch (chapterIndex) {
            case 0:
            case 1: {
                if (this._playSample('sfx_phone_ring', { volume: 0.8, maxDuration: 2.4, trackIntro: true })) return;
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
                if (this._playSample('sfx_hospital_beep', { volume: 0.72, maxDuration: 2.0, trackIntro: true })) return;
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
                if (!this._playSample('sfx_car_pass', { volume: 0.85, maxDuration: 2.8, trackIntro: true })) {
                    this.playThunder(true);
                }
                break;
            case 5:
                this.playThunder(true);
                break;
            case 4:
            case 6: {
                if (this._playSample('sfx_siren', { volume: 0.72, maxDuration: 3.2, trackIntro: true })) return;
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

    // --- Efectos de Combate, Armas y Zombis ---

    playShoot(weaponId = 'pistol_9mm') {
        if (!this._canPlaySfx()) return;
        const now = this.ctx.currentTime;

        if (weaponId === 'flamethrower_bio') {
            if (!this.whiteNoiseBuffer) return;
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
        const jitter = 0.96 + Math.random() * 0.08;

        let playedSample = false;
        if (isShotgun) {
            playedSample = this._playSample('sfx_shotgun', { volume: 0.96, rate: jitter, maxDuration: 1.4 });
        } else if (isHeavy) {
            playedSample = this._playSample('sfx_pistol', { volume: 0.92, rate: 0.82 * jitter, maxDuration: 1.3 });
            this._playSample('sfx_shotgun', { volume: 0.45, rate: 1.15, maxDuration: 0.9 });
        } else {
            playedSample = this._playSample('sfx_pistol', { volume: 0.86, rate: jitter, maxDuration: 1.1 });
        }

        if (playedSample) {
            this.playShellCasing(0.16 + Math.random() * 0.08);
            return;
        }

        if (!this.whiteNoiseBuffer) return;

        // Respaldo balístico procedural
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
        const isBlade = weaponId === 'machete_combat';
        const rate = (isBlade ? 1.02 : 0.84) + (Math.random() * 0.08 - 0.04);

        if (this._playSample('sfx_melee', { volume: 0.86, rate, maxDuration: 0.65 })) {
            return;
        }

        const now = this.ctx.currentTime;
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
        this._playSample('sfx_ui_click', { volume: 0.55, rate: 1.35, maxDuration: 0.12 });
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1180, now);
        osc.frequency.setValueAtTime(720, now + 0.025);
        gain.gain.setValueAtTime(0.20, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.065);
    }

    playReload() {
        if (!this._canPlaySfx()) return;
        if (this._playSample('sfx_reload', { volume: 0.86, rate: 0.98 + Math.random() * 0.05, maxDuration: 1.5 })) {
            return;
        }
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

    playZombieGroan(volume = 0.60) {
        if (!this._canPlaySfx()) return;
        const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (nowMs - this._lastGroanAt < 1400) return;
        this._lastGroanAt = nowMs;

        const rate = 0.88 + Math.random() * 0.24;
        this._playSample('sfx_zombie_groan', { volume, rate, maxDuration: 2.3 });
    }

    playHurt() {
        if (!this._canPlaySfx()) return;
        this._playSample('sfx_zombie_hit', { volume: 0.86, rate: 0.78, maxDuration: 0.7 });

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.24);
        gain.gain.setValueAtTime(0.42, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
        osc.connect(gain);
        gain.connect(this.sfxBus);
        osc.start(now);
        osc.stop(now + 0.27);
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

        if (this._playSample('sfx_zombie_hit', { volume: 0.76, rate: 0.92 + Math.random() * 0.18, maxDuration: 0.55 })) {
            return;
        }

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
    }

    playEnemyDeath() {
        if (!this._canPlaySfx()) return;
        if (this._playSample('sfx_zombie_death', { volume: 0.85, rate: 0.90 + Math.random() * 0.18, maxDuration: 1.8 })) {
            return;
        }

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
        const samplePlayed = this._playSample('sfx_explosion', { volume: 0.96, rate: 0.94 + Math.random() * 0.10, maxDuration: 2.8 });

        const now = this.ctx.currentTime;
        const boom = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        boom.type = 'sine';
        boom.frequency.setValueAtTime(140, now);
        boom.frequency.exponentialRampToValueAtTime(22, now + 0.72);
        bGain.gain.setValueAtTime(samplePlayed ? 0.55 : 0.95, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
        boom.connect(bGain);
        bGain.connect(this.sfxBus);
        boom.start(now);
        boom.stop(now + 0.78);

        if (!samplePlayed && this.whiteNoiseBuffer) {
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
        if (this._playSample('sfx_pickup', { volume: 0.78, rate: 1.0 + Math.random() * 0.08, maxDuration: 0.9 })) {
            return;
        }
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
        this._playSample('sfx_victory', { volume: 0.70, rate: 1.18, maxDuration: 1.4 });
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
            const t = now + i * 0.085;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.26, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
            osc.connect(gain);
            gain.connect(this.sfxBus);
            osc.start(t);
            osc.stop(t + 0.30);
        });
    }

    playCheckpointRespawn() {
        if (!this._canPlaySfx()) return;
        this._playSample('sfx_heal', { volume: 0.74, rate: 1.08, maxDuration: 1.2 });
        const now = this.ctx.currentTime;
        [261.63, 392.0, 523.25].forEach((freq, i) => {
            const t = now + i * 0.09;
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            g.gain.setValueAtTime(0.24, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
            osc.connect(g);
            g.connect(this.sfxBus);
            osc.start(t);
            osc.stop(t + 0.28);
        });
    }

    playHeal() {
        if (!this._canPlaySfx()) return;
        if (this._playSample('sfx_heal', { volume: 0.82, rate: 1.0, maxDuration: 1.3 })) {
            return;
        }
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
        if (this._playSample('sfx_zombie_roar', { volume: 0.96, rate: 0.82, maxDuration: 3.2 })) {
            return;
        }

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
        if (this._playSample('sfx_victory', { volume: 0.92, rate: 1.0, maxDuration: 3.6 })) {
            return;
        }
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
        if (this._playSample('sfx_gameover', { volume: 0.88, rate: 0.92, maxDuration: 4.5 })) {
            return;
        }
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
        this._playSample('sfx_zombie_roar', { volume: 0.85, rate: 0.84, delay: 0.35, maxDuration: 2.8 });
    }

    /**
     * Alarma de emergencia y rugido para el evento de horda y la alerta previa al Jefe.
     */
    playHordeHorn() {
        if (!this._canPlaySfx()) return;
        const sirenOk = this._playSample('sfx_siren', { volume: 0.80, rate: 0.96, maxDuration: 3.4 });
        this._playSample('sfx_zombie_roar', { volume: 0.78, rate: 0.88, delay: 0.28, maxDuration: 2.6 });
        if (sirenOk) return;

        const now = this.ctx.currentTime;
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(980, now);
        filter.frequency.exponentialRampToValueAtTime(240, now + 1.55);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.52, now + 0.12);
        gain.gain.setValueAtTime(0.52, now + 0.72);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(92, now);
        osc1.frequency.exponentialRampToValueAtTime(52, now + 1.65);
        osc2.frequency.setValueAtTime(138, now);
        osc2.frequency.exponentialRampToValueAtTime(78, now + 1.65);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxBus);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.85);
        osc2.stop(now + 1.85);
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
