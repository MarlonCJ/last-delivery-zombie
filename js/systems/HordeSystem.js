/**
 * HordeSystem.js
 * Evento de horda previo al Jefe Final de cada nivel.
 * - Nivel 1: 10 zombis. Cada nivel adicional suma 5 (Nivel 2: 15, Nivel 3: 20...).
 * - Mantiene un máximo de 5 zombis activos y repone uno por cada baja.
 * - Muestra el aviso "¡PREPÁRATE PARA LA HORDA!", progreso de bajas y, al terminar,
 *   una alerta WARNING con destellos rojos antes de invocar al Jefe Final.
 */

import { Zombie } from '../entities/Zombie.js';

export const HORDE_ACTIVE_LIMIT = 5;
export const HORDE_BASE_TOTAL = 10;
export const HORDE_TOTAL_STEP = 5;

// Nivel 1: solo caminantes de nivel 1 (hombre y mujer).
const HORDE_VARIANTS_BY_LEVEL = Object.freeze({
    1: ['walker', 'walker', 'walker', 'walker', 'walker', 'walker_female', 'walker_female', 'walker_female', 'walker_female', 'walker_female'],
    2: ['runner', 'runner', 'resistant', 'spitter', 'bomber', 'armored', 'leaper'],
    3: ['resistant', 'spitter', 'bomber', 'armored', 'leaper', 'brute'],
    4: ['spitter', 'bomber', 'armored', 'leaper', 'brute', 'brute']
});

export function getHordeTotalForLevel(levelId = 1) {
    const safeLevel = Math.max(1, Math.floor(Number(levelId) || 1));
    return HORDE_BASE_TOTAL + (safeLevel - 1) * HORDE_TOTAL_STEP;
}

function getVariantPool(levelId) {
    const safeLevel = Math.max(1, Math.floor(Number(levelId) || 1));
    return HORDE_VARIANTS_BY_LEVEL[safeLevel] || HORDE_VARIANTS_BY_LEVEL[4];
}

export class HordeSystem {
    constructor({
        levelId = 1,
        arenaMinX = 0,
        arenaMaxX = 1000,
        groundY = 590,
        spriteAtlas = null,
        audio = null,
        onSpawn = null,
        onWarning = null,
        onComplete = null
    } = {}) {
        this.levelId = Math.max(1, Math.floor(Number(levelId) || 1));
        this.arenaMinX = arenaMinX;
        this.arenaMaxX = arenaMaxX;
        this.groundY = groundY;
        this.spriteAtlas = spriteAtlas;
        this.audio = audio;

        this.onSpawn = onSpawn;
        this.onWarning = onWarning;
        this.onComplete = onComplete;

        this.total = getHordeTotalForLevel(this.levelId);
        this.maxActive = HORDE_ACTIVE_LIMIT;
        this.variantPool = getVariantPool(this.levelId);

        this.state = 'idle';
        this.timer = 0;
        this.spawnTimer = 0;
        this.spawnedCount = 0;
        this.killedCount = 0;
        this.activeZombies = new Set();

        this.introDuration = 2.4;
        this.warningDuration = 3.0;
        this.spawnInterval = 0.32;

        this.ui = {
            banner: document.getElementById('horde-banner'),
            title: document.getElementById('horde-title'),
            sub: document.getElementById('horde-sub'),
            counter: document.getElementById('horde-counter'),
            progress: document.getElementById('horde-progress-fill'),
            warning: document.getElementById('horde-warning'),
            flash: document.getElementById('horde-red-flash')
        };
    }

    start() {
        if (this.state !== 'idle') return false;

        this.state = 'intro';
        this.timer = this.introDuration;
        this.spawnTimer = 0;
        this.spawnedCount = 0;
        this.killedCount = 0;
        this.activeZombies.clear();

        this.audio?.playHordeHorn?.();
        this._showIntroBanner();
        return true;
    }

    stop() {
        this.state = 'idle';
        this.timer = 0;
        this.spawnTimer = 0;
        this.activeZombies.clear();
        this._hideAllUi();
    }

    isRunning() {
        return this.state === 'intro' || this.state === 'active' || this.state === 'warning';
    }

    getSnapshot() {
        return {
            state: this.state,
            levelId: this.levelId,
            total: this.total,
            killed: this.killedCount,
            spawned: this.spawnedCount,
            active: this.activeZombies.size,
            remaining: Math.max(0, this.total - this.killedCount),
            maxActive: this.maxActive
        };
    }

    update(dt, player) {
        if (this.state === 'intro') {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.state = 'active';
                this.spawnTimer = 0;
                this._refreshBanner();
            }
            return;
        }

        if (this.state === 'active') {
            this._pruneDeadZombies();
            this.spawnTimer -= dt;

            if (this.activeZombies.size < this.maxActive &&
                this.spawnedCount < this.total &&
                this.spawnTimer <= 0) {
                this._spawnZombie(player);
                this.spawnTimer = this.spawnInterval;
            }

            if (this.spawnedCount >= this.total &&
                this.killedCount >= this.total &&
                this.activeZombies.size === 0) {
                this._beginWarning();
            }
            return;
        }

        if (this.state === 'warning') {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.state = 'done';
                this._hideAllUi();
                this.onComplete?.();
            }
        }
    }

    onZombieKilled(zombie) {
        if (!zombie || !this.activeZombies.has(zombie)) return;
        this._registerKill(zombie);
    }

    _registerKill(zombie) {
        if (!this.activeZombies.has(zombie)) return;
        this.activeZombies.delete(zombie);
        this.killedCount += 1;
        this._refreshBanner();
    }

    _pruneDeadZombies() {
        for (const zombie of [...this.activeZombies]) {
            if (zombie.dead || zombie.removable) {
                this._registerKill(zombie);
            }
        }
    }

    _spawnZombie(player) {
        const variant = this.variantPool[Math.floor(Math.random() * this.variantPool.length)];
        const x = this._pickSpawnX(player);

        const zombie = new Zombie(variant, {
            x,
            y: this.groundY - 180,
            patrolMinX: this.arenaMinX + 24,
            patrolMaxX: this.arenaMaxX - 24,
            spriteAtlas: this.spriteAtlas
        });

        zombie.y = this.groundY - zombie.height;
        zombie.vx = 0;
        zombie.vy = 0;
        zombie.onGround = true;
        zombie.isHordeZombie = true;

        this.activeZombies.add(zombie);
        this.spawnedCount += 1;
        this.onSpawn?.(zombie);
        this._refreshBanner();
    }

    _pickSpawnX(player) {
        const minX = this.arenaMinX + 56;
        const maxX = Math.max(minX + 120, this.arenaMaxX - 72);
        const playerX = player ? player.x + player.width * 0.5 : (minX + maxX) * 0.5;
        const minDistance = 240;

        for (let i = 0; i < 24; i++) {
            const candidate = minX + Math.random() * (maxX - minX);
            if (Math.abs(candidate - playerX) >= minDistance) {
                return candidate;
            }
        }

        return playerX < (minX + maxX) * 0.5
            ? maxX - Math.random() * 180
            : minX + Math.random() * 180;
    }

    _beginWarning() {
        this.state = 'warning';
        this.timer = this.warningDuration;

        this.audio?.playHordeHorn?.();
        this._showWarningUi();
        this.onWarning?.();
    }

    _showIntroBanner() {
        const { banner, title, sub, counter, progress } = this.ui;
        if (!banner) return;

        banner.classList.remove('hidden');
        banner.classList.remove('is-warning');

        if (title) title.textContent = '¡PREPÁRATE PARA LA HORDA!';
        if (sub) sub.textContent = `${this.total} INFECTADOS · MÁX. ${this.maxActive} SIMULTÁNEOS`;
        if (counter) counter.textContent = `ELIMINADOS: 0 / ${this.total}`;
        if (progress) progress.style.width = '0%';

        this.ui.warning?.classList.add('hidden');
        this.ui.flash?.classList.add('hidden');
    }

    _refreshBanner() {
        if (this.state !== 'active') return;
        const { banner, title, sub, counter, progress } = this.ui;
        if (!banner) return;

        banner.classList.remove('hidden');
        if (title) title.textContent = 'HORDA EN CURSO';
        if (sub) {
            const remaining = Math.max(0, this.total - this.killedCount);
            sub.textContent = `ACTIVOS: ${this.activeZombies.size} · RESTANTES: ${remaining}`;
        }
        if (counter) counter.textContent = `ELIMINADOS: ${this.killedCount} / ${this.total}`;
        if (progress) {
            const ratio = this.total > 0 ? Math.min(1, this.killedCount / this.total) : 0;
            progress.style.width = `${Math.round(ratio * 100)}%`;
        }
    }

    _showWarningUi() {
        this.ui.banner?.classList.add('hidden');
        this.ui.warning?.classList.remove('hidden');
        this.ui.flash?.classList.remove('hidden');
    }

    _hideAllUi() {
        this.ui.banner?.classList.add('hidden');
        this.ui.warning?.classList.add('hidden');
        this.ui.flash?.classList.add('hidden');
    }
}
