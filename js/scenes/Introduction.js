/**
 * Introduction.js
 * Cinemática introductoria corta y de alto impacto visual en 3 actos (~13.5s total).
 * Emplea encuadre panorámico letterbox, movimiento de cámara Ken Burns, iluminación dinámica,
 * fondo urbano real y animaciones en vivo del SpriteAtlas, con opción de salto inmediato.
 */

export class Introduction {
    constructor(engine) {
        this.engine = engine;
        this.time = 0;
        this.actTime = 0;
        this.slides = [];
        this.currentIndex = 0;
        this.finished = false;

        // Escritura fluida tipo subtítulo cinematográfico y avance cómodo de lectura
        this.revealedChars = 0;
        this.charTimer = 0;
        this.charsPerSecond = 52;
        this.slideFade = 1;
        this.autoAdvanceTimer = 0;
        this.autoAdvanceDelay = 4.0;

        // Referencias DOM
        this.overlay = document.getElementById('intro-overlay');
        this.chapterTag = document.getElementById('intro-chapter-tag');
        this.chapterTitle = document.getElementById('intro-chapter-title');
        this.chapterText = document.getElementById('intro-chapter-text');
        this.dotsContainer = document.getElementById('intro-progress-dots');
        this.btnPrev = document.getElementById('btn-intro-prev');
        this.btnNext = document.getElementById('btn-intro-next');
        this.btnSkip = document.getElementById('btn-intro-skip');

        this._bindEvents();
    }

    _buildSlides(playerName) {
        const courier = playerName || 'Alex';
        return [
            {
                tag: 'ACTO I / III — LABORATORIO BIOGEN (03:14 AM)',
                title: 'LA FUGA DEL SECTOR B-3',
                text: 'Un accidente fracturó los cilindros del agente neuro-biológico B-3. El gas verde mutó a la población en zombis voraces y engendró aberraciones letales.'
            },
            {
                tag: 'ACTO II / III — CUARENTENA FALLIDA',
                title: 'LA CAÍDA DE LA METRÓPOLI',
                text: 'En pocas horas la red eléctrica y las comunicaciones colapsaron. Las calles quedaron aisladas bajo la lluvia, el fuego y las hordas de infectados.'
            },
            {
                tag: `ACTO III / III — TURNO NOCTURNO: ${courier.toUpperCase()}`,
                title: `EL ÚLTIMO REPARTIDOR: ${courier.toUpperCase()}`,
                text: `Mientras la ciudad arde, ${courier} asegura su mochila de reparto. Cada paquete entregado entre refugios es la única esperanza de los supervivientes.`
            }
        ];
    }

    _bindEvents() {
        this.btnPrev?.addEventListener('pointerenter', () => this.engine.audio.playHover());
        this.btnNext?.addEventListener('pointerenter', () => this.engine.audio.playHover());
        this.btnSkip?.addEventListener('pointerenter', () => this.engine.audio.playHover());

        this.btnPrev?.addEventListener('click', () => {
            if (this.currentIndex > 0) {
                this.engine.audio.playClick();
                this._goToSlide(this.currentIndex - 1);
            }
        });

        this.btnNext?.addEventListener('click', () => {
            this._advanceOrReveal();
        });

        this.btnSkip?.addEventListener('click', () => {
            this.engine.audio.playClick();
            this._finishIntroduction();
        });
    }

    enter(params = {}) {
        const playerName = params.playerName || this.engine.saveSystem.getPlayerName() || 'Alex';
        this.targetScene = params.targetScene || 'level01';
        this.slides = this._buildSlides(playerName);
        this.currentIndex = 0;
        this.time = 0;
        this.actTime = 0;
        this.finished = false;

        if (this.overlay) {
            this.overlay.classList.remove('hidden');
        }

        this._renderDots();
        this.engine.audio.startAmbience('intro');
        this._goToSlide(0);
    }

    exit() {
        if (this.overlay) {
            this.overlay.classList.add('hidden');
        }
    }

    _renderDots() {
        if (!this.dotsContainer) return;
        this.dotsContainer.innerHTML = '';
        this.slides.forEach((_, idx) => {
            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = 'intro-dot';
            dot.setAttribute('aria-label', `Ir al acto ${idx + 1}`);
            dot.addEventListener('click', () => {
                this.engine.audio.playClick();
                this._goToSlide(idx);
            });
            this.dotsContainer.appendChild(dot);
        });
    }

    _goToSlide(index) {
        this.currentIndex = Math.max(0, Math.min(this.slides.length - 1, index));
        this.actTime = 0;
        this.revealedChars = 0;
        this.charTimer = 0;
        this.slideFade = 0;
        this.autoAdvanceTimer = 0;

        const slide = this.slides[this.currentIndex];
        if (this.chapterTag) this.chapterTag.textContent = slide.tag;
        if (this.chapterTitle) this.chapterTitle.textContent = slide.title;
        if (this.chapterText) this.chapterText.textContent = '';

        if (this.btnPrev) {
            this.btnPrev.disabled = this.currentIndex === 0;
        }
        this._updateNextButtonLabel();

        if (this.dotsContainer) {
            Array.from(this.dotsContainer.children).forEach((dot, idx) => {
                dot.classList.toggle('active', idx === this.currentIndex);
                dot.classList.toggle('completed', idx < this.currentIndex);
            });
        }

        // Efecto sonoro dramático por acto
        if (this.currentIndex === 0) {
            this.engine.audio.playIntroChapterCue(2);
        } else if (this.currentIndex === 1) {
            this.engine.audio.playThunder?.();
        } else {
            this.engine.audio.playIntroChapterCue(6);
        }
    }

    _updateNextButtonLabel() {
        if (!this.btnNext) return;
        const slide = this.slides[this.currentIndex];
        const isTyping = slide && this.revealedChars < slide.text.length;
        const isLast = this.currentIndex === this.slides.length - 1;

        if (isTyping) {
            this.btnNext.textContent = 'COMPLETAR ▸';
        } else if (isLast) {
            this.btnNext.textContent = '¡INICIAR MISIÓN! ▶';
        } else {
            this.btnNext.textContent = 'SIGUIENTE ACTO ▸';
        }
    }

    _advanceOrReveal() {
        const slide = this.slides[this.currentIndex];
        if (!slide || this.finished) return;

        if (this.revealedChars < slide.text.length) {
            this.revealedChars = slide.text.length;
            if (this.chapterText) this.chapterText.textContent = slide.text;
            this.engine.audio.playClick();
            this._updateNextButtonLabel();
            return;
        }

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
        this.engine.sceneManager.transitionTo(this.targetScene || 'level01', {}, 0.45);
    }

    update(dt) {
        this.time += dt;
        this.actTime += dt;
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
                this.engine.input.isKeyJustPressed('ArrowRight')
            ) {
                this._advanceOrReveal();
                return;
            }
            if (this.engine.input.isKeyJustPressed('ArrowLeft') && this.currentIndex > 0) {
                this.engine.audio.playClick();
                this._goToSlide(this.currentIndex - 1);
                return;
            }
        }

        if (this.slideFade < 1) {
            this.slideFade = Math.min(1, this.slideFade + dt * 2.8);
        }

        const slide = this.slides[this.currentIndex];
        if (!slide || this.finished) return;

        if (this.revealedChars < slide.text.length) {
            this.charTimer += dt * this.charsPerSecond;
            const addChars = Math.floor(this.charTimer);
            if (addChars > 0) {
                this.charTimer -= addChars;
                const prev = this.revealedChars;
                this.revealedChars = Math.min(slide.text.length, this.revealedChars + addChars);
                if (this.chapterText) {
                    this.chapterText.textContent = slide.text.slice(0, this.revealedChars);
                }
                if (Math.floor(this.revealedChars / 4) > Math.floor(prev / 4)) {
                    this.engine.audio.playTypewriter();
                }
                if (this.revealedChars >= slide.text.length) {
                    this._updateNextButtonLabel();
                }
            }
        } else {
            this.autoAdvanceTimer += dt;
            if (this.autoAdvanceTimer >= this.autoAdvanceDelay) {
                if (this.currentIndex < this.slides.length - 1) {
                    this._goToSlide(this.currentIndex + 1);
                } else {
                    // Al concluir el Acto III arranca directamente el Nivel 01 como cinemática real
                    this._finishIntroduction();
                }
            }
        }
    }

    render(renderer) {
        const ctx = renderer.ctx;
        renderer.clear('#04060b');

        ctx.save();
        ctx.globalAlpha = this.slideFade;

        if (this.currentIndex === 0) {
            this._renderAct01BioBreach(ctx, renderer);
        } else if (this.currentIndex === 1) {
            this._renderAct02CityFall(ctx, renderer);
        } else {
            this._renderAct03LastCourier(ctx, renderer);
        }

        ctx.restore();

        // Bandas panorámicas Letterbox cinematográficas (superior e inferior)
        ctx.fillStyle = '#020306';
        ctx.fillRect(0, 0, renderer.width, 62);

        const bottomGrad = ctx.createLinearGradient(0, 440, 0, 720);
        bottomGrad.addColorStop(0, 'rgba(2, 4, 8, 0)');
        bottomGrad.addColorStop(0.32, 'rgba(2, 4, 8, 0.88)');
        bottomGrad.addColorStop(1, '#020306');
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(0, 440, renderer.width, 280);

        // Líneas sutiles de monitor / película 35mm
        ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
        for (let y = 64; y < 520; y += 4) {
            ctx.fillRect(0, y, renderer.width, 1);
        }

        renderer.drawVignette(0.76);
    }

    /**
     * ACTO I: Cámara de contención rota en Biogen B-3, gas mutagénico y despertar del Mutante.
     */
    _renderAct01BioBreach(ctx, renderer) {
        const atlas = this.engine.spriteAtlas;
        const zoom = 1 + Math.min(0.08, this.actTime * 0.016);
        const alarm = 0.35 + 0.65 * Math.abs(Math.sin(this.time * 5.8));

        ctx.save();
        ctx.translate(640, 290);
        ctx.scale(zoom, zoom);
        ctx.translate(-640, -290);

        // Fondo industrial subterráneo del Sector B-3
        const bg = ctx.createLinearGradient(0, 50, 0, 540);
        bg.addColorStop(0, '#07111a');
        bg.addColorStop(0.6, '#0d1a24');
        bg.addColorStop(1, '#060c10');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1280, 720);

        // Vigas blindadas y tuberías de laboratorio
        ctx.fillStyle = '#0c1620';
        for (let x = 70; x < 1240; x += 220) {
            ctx.fillRect(x, 55, 42, 440);
        }
        ctx.fillStyle = '#142230';
        ctx.fillRect(0, 445, 1280, 90);

        // Alarma giratoria roja superior
        renderer.drawRadialGlow(640, 105, 12, 420, `rgba(255, 28, 42, ${(0.34 * alarm).toFixed(2)})`);

        // Dos cápsulas laterales intactas + Cápsula central fracturada con el Mutante B-3
        const pods = [290, 640, 990];
        pods.forEach((px, idx) => {
            const broken = idx === 1;
            const glowCol = broken ? 'rgba(80, 255, 110, 0.34)' : 'rgba(55, 200, 235, 0.18)';
            renderer.drawRadialGlow(px, 275, 18, broken ? 240 : 145, glowCol);

            ctx.fillStyle = broken ? 'rgba(55, 225, 95, 0.16)' : 'rgba(38, 150, 195, 0.14)';
            ctx.strokeStyle = broken ? '#7dff9b' : '#3ea8cc';
            ctx.lineWidth = 3;
            ctx.fillRect(px - 76, 130, 152, 285);
            ctx.strokeRect(px - 76, 130, 152, 285);

            // Tapas metálicas del biorreactor
            ctx.fillStyle = '#1b2836';
            ctx.fillRect(px - 88, 108, 176, 24);
            ctx.fillRect(px - 88, 412, 176, 26);

            if (broken && atlas?.isReady()) {
                // El Mutante de Laboratorio golpeando el cristal desde dentro
                const fIdx = Math.floor(this.time * 5) % 4;
                atlas.drawFrame(ctx, 'boss_attack', fIdx, px, 410, { targetHeight: 168 });
            } else if (!broken && atlas?.isReady()) {
                atlas.drawFrame(ctx, idx === 0 ? 'znormal_walk' : 'zspecial_prepare', Math.floor(this.time * 4), px, 405, {
                    targetHeight: 118,
                    alpha: 0.68
                });
            }

            // Grietas en la cápsula central
            if (broken) {
                ctx.strokeStyle = '#ebfff0';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(px - 28, 165);
                ctx.lineTo(px + 14, 235);
                ctx.lineTo(px - 34, 295);
                ctx.lineTo(px + 42, 368);
                ctx.stroke();
            }
        });

        // Barriles de riesgo biológico junto a las columnas
        if (atlas?.isReady()) {
            atlas.drawSprite(ctx, 'prop_barrel_red', 140, 382, 46, 64);
            atlas.drawSprite(ctx, 'prop_barrel_red', 192, 386, 44, 60);
            atlas.drawSprite(ctx, 'prop_electric_box', 1110, 250, 42, 68);
        }

        // Nubes de gas mutagénico verde expandiéndose
        for (let g = 0; g < 6; g++) {
            const gx = 640 + Math.sin(this.time * 1.5 + g * 1.1) * (80 + g * 38);
            const gy = 320 - g * 24 + Math.cos(this.time * 2.1 + g) * 16;
            renderer.drawRadialGlow(gx, gy, 10, 115 + g * 14, 'rgba(72, 255, 112, 0.16)');
        }

        ctx.fillStyle = `rgba(255, 48, 58, ${alarm.toFixed(2)})`;
        ctx.font = 'bold 20px Impact, "Arial Black", sans-serif';
        ctx.fillText('⚠ ALERTA BIOLÓGICA // SECTOR B-3 COMPROMETIDO', 84, 98);

        ctx.restore();
    }

    /**
     * ACTO II: Panorámica cinemática sobre la ciudad destruida con horda zombi avanzando bajo la lluvia.
     */
    _renderAct02CityFall(ctx, renderer) {
        const atlas = this.engine.spriteAtlas;
        const cityImg = this.engine.assets?.getImage('city_bg');
        const panX = this.actTime * 38;

        ctx.save();
        if (cityImg && cityImg.complete && cityImg.naturalWidth > 0) {
            // Dibujar ciudad apocalíptica en alta escala panorámica con paneo suave
            const drawW = 1520;
            const drawH = 506;
            const offsetX = -Math.min(220, panX);
            ctx.drawImage(cityImg, offsetX, 46, drawW, drawH);
        } else {
            ctx.fillStyle = '#0a121d';
            ctx.fillRect(0, 0, 1280, 720);
        }

        // Destello ocasional de relámpago sobre los edificios en llamas
        const flash = Math.sin(this.actTime * 5.2) > 0.92 ? 0.22 : 0;
        if (flash > 0) {
            ctx.fillStyle = `rgba(200, 225, 255, ${flash})`;
            ctx.fillRect(0, 50, 1280, 480);
        }

        // Resplandor de incendios en azoteas y farola callejera
        renderer.drawRadialGlow(860 - panX * 0.4, 175, 15, 180, 'rgba(255, 95, 25, 0.30)');
        renderer.drawRadialGlow(390 - panX * 0.4, 175, 10, 190, 'rgba(255, 185, 80, 0.26)');

        // Horda de zombis reales de proporción simétrica caminando y corriendo por la avenida mojada
        const groundY = 482;
        if (atlas?.isReady()) {
            const horde = [
                { anim: 'znormal_walk', x: 310 + this.actTime * 26, h: 116, speed: 6.2, off: 0 },
                { anim: 'zspecial_walk', x: 520 + this.actTime * 22, h: 124, speed: 5.5, off: 2 },
                { anim: 'zfast_run', x: 690 + this.actTime * 58, h: 114, speed: 12.5, off: 1 },
                { anim: 'znormal_walk', x: 880 + this.actTime * 28, h: 118, speed: 6.8, off: 3 },
                { anim: 'zfast_run', x: 180 + this.actTime * 52, h: 114, speed: 11.8, off: 4 }
            ];
            for (const z of horde) {
                atlas.drawFrame(ctx, z.anim, Math.floor(this.time * z.speed + z.off), z.x, groundY, {
                    targetHeight: z.h,
                    flipX: false
                });
            }
        }

        renderer.drawFog('125, 155, 185', 0.72);
        renderer.drawRain(true);
        ctx.restore();
    }

    /**
     * ACTO III: Presentación heroica del Domiciliario cruzando la calle infestada con su paquete.
     */
    _renderAct03LastCourier(ctx, renderer) {
        const atlas = this.engine.spriteAtlas;
        const cityImg = this.engine.assets?.getImage('city_bg');
        const zoom = 1.04 - Math.min(0.04, this.actTime * 0.009);

        ctx.save();
        ctx.translate(640, 280);
        ctx.scale(zoom, zoom);
        ctx.translate(-640, -280);

        if (cityImg && cityImg.complete && cityImg.naturalWidth > 0) {
            ctx.drawImage(cityImg, -90, 48, 1460, 486);
            ctx.fillStyle = 'rgba(5, 9, 16, 0.36)';
            ctx.fillRect(0, 48, 1280, 490);
        } else {
            ctx.fillStyle = '#08101c';
            ctx.fillRect(0, 0, 1280, 720);
        }

        const heroX = 470 + this.actTime * 34;
        const groundY = 472;

        // Cono cálido de linterna cortando la noche frente al protagonista
        renderer.drawLightCone(
            heroX + 26,
            groundY - 58,
            0.03,
            0.42,
            450,
            'rgba(255, 232, 155, 0.36)',
            'rgba(255, 210, 115, 0)'
        );

        if (atlas?.isReady()) {
            // Protagonista corriendo/disparando con escala simétrica exclusiva del nuevo sprite HD (114 px)
            const shootingMoment = this.actTime > 1.5 && this.actTime < 2.9;
            if (shootingMoment) {
                const shootCount = Math.max(1, atlas.getFrameCount('player_shoot'));
                const f = Math.floor((this.actTime - 1.5) * 9) % shootCount;
                atlas.drawFrame(ctx, 'player_shoot', f, heroX, groundY, { targetHeight: 114 });
                if (f === 4 || f === 5) {
                    renderer.drawRadialGlow(heroX + 64, groundY - 76, 4, 98, 'rgba(255, 220, 95, 0.45)');
                }
            } else {
                atlas.drawFrame(ctx, 'player_run', Math.floor(this.time * 12), heroX, groundY, { targetHeight: 114 });
            }

            // Infectados acechando al borde del haz de luz derecho con proporción humana simétrica
            atlas.drawFrame(ctx, 'znormal_attack', Math.floor(this.time * 6.5), 930 - this.actTime * 18, groundY, {
                targetHeight: 114,
                flipX: true
            });
            atlas.drawFrame(ctx, 'zfast_run', Math.floor(this.time * 11), 1065 - this.actTime * 28, groundY + 4, {
                targetHeight: 112,
                flipX: true
            });

            // Retrato en primer plano cinematográfico del Protagonista (busto proporcional del nuevo sprite HD)
            renderer.drawRadialGlow(195, 265, 20, 175, 'rgba(224, 38, 52, 0.25)');
            atlas.drawSprite(ctx, 'portrait_hero_bust', 115, 162, 160, 192, { alpha: 0.98 });
            atlas.drawSprite(ctx, 'icon_package', 248, 304, 54, 46);
        }

        renderer.drawRain(true);
        ctx.restore();
    }
}
