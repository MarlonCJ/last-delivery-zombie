/**
 * Introduction.js
 * Secuencia de historia introductoria de LAST DELIVERY ZOMBIE protagonizada por EDI,
 * presentada a través de las 6 páginas oficiales de cómic en orden narrativo:
 *   1. Escena 1: El Encargo
 *   2. Escena 2: Edi recibe el paquete e indicaciones
 *   3. Escena 3: Se vara en el camino
 *   4. Escena 4: Accidente en la carretera
 *   5. Escena 5: Los muertos se levantan
 *   6. Escena 6: La infección se expande
 */

const STORY_SCENES = Object.freeze([
    {
        imageKey: 'intro_scene_01',
        tag: 'ESCENA 01 / 06',
        title: 'EL ENCARGO',
        cue: 'call'
    },
    {
        imageKey: 'intro_scene_02',
        tag: 'ESCENA 02 / 06',
        title: 'EDI RECIBE EL PAQUETE E INDICACIONES',
        cue: 'lab'
    },
    {
        imageKey: 'intro_scene_03',
        tag: 'ESCENA 03 / 06',
        title: 'SE VARA EN EL CAMINO',
        cue: 'road'
    },
    {
        imageKey: 'intro_scene_04',
        tag: 'ESCENA 04 / 06',
        title: 'ACCIDENTE EN LA CARRETERA',
        cue: 'crash'
    },
    {
        imageKey: 'intro_scene_05',
        tag: 'ESCENA 05 / 06',
        title: 'LOS MUERTOS SE LEVANTAN',
        cue: 'shot'
    },
    {
        imageKey: 'intro_scene_06',
        tag: 'ESCENA 06 / 06',
        title: 'LA INFECCIÓN SE EXPANDE',
        cue: 'outbreak'
    }
]);

const SCENE_DURATION = 10.5;
const BOTTOM_BAR_HEIGHT = 54;

export class Introduction {
    constructor(engine) {
        this.engine = engine;
        this.time = 0;
        this.sceneTime = 0;
        this.slides = STORY_SCENES;
        this.currentIndex = 0;
        this.finished = false;
        this.slideFade = 1;
        this.targetScene = 'briefing';

        // Referencias DOM
        this.overlay = document.getElementById('intro-overlay');
        this.clickStage = document.getElementById('intro-comic-click-area');
        this.chapterTag = document.getElementById('intro-chapter-tag');
        this.chapterTitle = document.getElementById('intro-chapter-title');
        this.dotsContainer = document.getElementById('intro-progress-dots');
        this.btnPrev = document.getElementById('btn-intro-prev');
        this.btnNext = document.getElementById('btn-intro-next');
        this.btnSkip = document.getElementById('btn-intro-skip');

        this._bindEvents();
    }

    _bindEvents() {
        this.btnPrev?.addEventListener('pointerenter', () => this.engine.audio.playHover());
        this.btnNext?.addEventListener('pointerenter', () => this.engine.audio.playHover());
        this.btnSkip?.addEventListener('pointerenter', () => this.engine.audio.playHover());

        this.btnPrev?.addEventListener('click', () => {
            if (this.currentIndex > 0 && !this.finished) {
                this.engine.audio.playClick();
                this._goToSlide(this.currentIndex - 1);
            }
        });

        this.btnNext?.addEventListener('click', () => {
            this._advanceScene();
        });

        this.clickStage?.addEventListener('click', () => {
            this._advanceScene();
        });

        this.btnSkip?.addEventListener('click', () => {
            this.engine.audio.playClick();
            this._finishIntroduction();
        });
    }

    enter(params = {}) {
        this.targetScene = params.targetScene || 'briefing';
        this.currentIndex = 0;
        this.time = 0;
        this.sceneTime = 0;
        this.finished = false;

        this.overlay?.classList.remove('hidden');
        this._renderDots();
        this.engine.audio.startAmbience('intro');
        this._goToSlide(0);
    }

    exit() {
        this.engine.audio?.stopIntroCues?.();
        this.overlay?.classList.add('hidden');
    }

    _renderDots() {
        if (!this.dotsContainer) return;
        this.dotsContainer.innerHTML = '';
        this.slides.forEach((slide, idx) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'intro-dot';
            dot.setAttribute('aria-label', `Ir a ${slide.tag}: ${slide.title}`);
            dot.addEventListener('click', () => {
                if (this.finished) return;
                this.engine.audio.playClick();
                this._goToSlide(idx);
            });
            this.dotsContainer.appendChild(dot);
        });
    }

    _goToSlide(index) {
        this.currentIndex = Math.max(0, Math.min(this.slides.length - 1, index));
        this.sceneTime = 0;
        this.slideFade = 0;

        const slide = this.slides[this.currentIndex];
        if (this.chapterTag) this.chapterTag.textContent = slide.tag;
        if (this.chapterTitle) this.chapterTitle.textContent = slide.title;

        if (this.btnPrev) {
            this.btnPrev.disabled = this.currentIndex === 0;
        }
        if (this.btnNext) {
            const isLast = this.currentIndex === this.slides.length - 1;
            this.btnNext.textContent = isLast ? '¡INICIAR MISIÓN! ▶' : 'SIGUIENTE ▸';
        }

        if (this.dotsContainer) {
            Array.from(this.dotsContainer.children).forEach((dot, idx) => {
                dot.classList.toggle('active', idx === this.currentIndex);
                dot.classList.toggle('completed', idx < this.currentIndex);
            });
        }

        this._playSceneAudioCue(slide.cue);
    }

    _playSceneAudioCue(cue) {
        const audio = this.engine.audio;
        if (!audio) return;
        if (typeof audio.playIntroSceneCue === 'function') {
            audio.playIntroSceneCue(cue);
            return;
        }
        switch (cue) {
            case 'call':
                audio.playIntroChapterCue?.(1);
                break;
            case 'lab':
                audio.playIntroChapterCue?.(2);
                break;
            case 'road':
                audio.playIntroChapterCue?.(3);
                break;
            case 'crash':
                audio.playThunder?.();
                break;
            case 'shot':
                audio.playShoot?.('pistol_9mm');
                break;
            case 'outbreak':
                audio.playIntroChapterCue?.(6);
                break;
            default:
                break;
        }
    }

    _advanceScene() {
        if (this.finished) return;
        if (this.currentIndex < this.slides.length - 1) {
            this.engine.audio.playClick();
            this._goToSlide(this.currentIndex + 1);
        } else {
            this.engine.audio.playConfirm();
            this._finishIntroduction();
        }
    }

    _finishIntroduction() {
        if (this.finished) return;
        this.finished = true;
        this.engine.saveSystem.markIntroSeen(true);
        this.engine.sceneManager.transitionTo(this.targetScene || 'briefing', {}, 0.45);
    }

    update(dt) {
        this.time += dt;
        this.sceneTime += dt;
        this.engine.renderer.updateAtmosphere(dt);

        const modalOpen = document.querySelector('.modal-backdrop:not(.hidden)');
        if (!modalOpen && !this.finished) {
            if (this.engine.input.isKeyJustPressed('Escape')) {
                this.engine.audio.playClick();
                this._finishIntroduction();
                return;
            }
            if (
                this.engine.input.isKeyJustPressed('Space') ||
                this.engine.input.isKeyJustPressed('Enter') ||
                this.engine.input.isKeyJustPressed('ArrowRight') ||
                this.engine.input.isKeyJustPressed('KeyD')
            ) {
                this._advanceScene();
                return;
            }
            if (
                (this.engine.input.isKeyJustPressed('ArrowLeft') || this.engine.input.isKeyJustPressed('KeyA')) &&
                this.currentIndex > 0
            ) {
                this.engine.audio.playClick();
                this._goToSlide(this.currentIndex - 1);
                return;
            }
        }

        if (this.slideFade < 1) {
            this.slideFade = Math.min(1, this.slideFade + dt * 3.4);
        }

        if (!this.finished && this.sceneTime >= SCENE_DURATION) {
            if (this.currentIndex < this.slides.length - 1) {
                this._goToSlide(this.currentIndex + 1);
            } else {
                this._finishIntroduction();
            }
        }
    }

    render(renderer) {
        const ctx = renderer.ctx;
        const stageW = renderer.width;
        const stageH = renderer.height;
        const availH = stageH - BOTTOM_BAR_HEIGHT;

        renderer.clear('#04060a');

        const slide = this.slides[this.currentIndex];
        const img = slide ? this.engine.assets?.getImage(slide.imageKey) : null;
        const hasImg = Boolean(
            img &&
            typeof ctx.drawImage === 'function' &&
            (img.complete === undefined || img.complete) &&
            (img.naturalWidth === undefined || img.naturalWidth > 0)
        );

        if (hasImg) {
            const natW = img.naturalWidth || 1024;
            const natH = img.naturalHeight || 576;
            const padX = 16;
            const padY = 6;
            const maxW = stageW - padX * 2;
            const maxH = availH - padY * 2;

            const fitScale = Math.min(maxW / natW, maxH / natH);
            // Ligero asentamiento cinematográfico inicial sin recortar las viñetas
            const settleZoom = 1 + (1 - this.slideFade) * 0.015;
            const drawW = Math.round(natW * fitScale * settleZoom);
            const drawH = Math.round(natH * fitScale * settleZoom);
            const drawX = Math.round((stageW - drawW) * 0.5);
            const drawY = Math.round((availH - drawH) * 0.5);

            ctx.save();
            ctx.globalAlpha = Math.max(0.08, this.slideFade);
            ctx.imageSmoothingEnabled = true;
            if ('imageSmoothingQuality' in ctx) {
                ctx.imageSmoothingQuality = 'high';
            }

            // Marco limpio alrededor de la página de cómic
            ctx.fillStyle = '#000000';
            ctx.fillRect(drawX - 4, drawY - 4, drawW + 8, drawH + 8);
            ctx.drawImage(img, drawX, drawY, drawW, drawH);

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(drawX - 0.5, drawY - 0.5, drawW + 1, drawH + 1);
            ctx.restore();
        }

        // Barra fina de progreso temporal sobre el panel de controles inferior
        const progress = Math.max(0, Math.min(1, this.sceneTime / SCENE_DURATION));
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(0, availH - 3, stageW, 3);
        ctx.fillStyle = '#e01e2b';
        ctx.fillRect(0, availH - 3, Math.round(stageW * progress), 3);
        ctx.restore();
    }
}
