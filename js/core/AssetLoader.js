/**
 * AssetLoader.js
 * Gestor asíncrono de precarga y caché de recursos (imágenes, spritesheets y audio).
 * Incluye control de memoria y manejo tolerante a errores de red/archivo.
 */

export class AssetLoader {
    constructor() {
        this.images = new Map();
        this.audioBuffers = new Map();
        this.errors = [];
        this.loadedCount = 0;
        this.totalCount = 0;
    }

    getProgress() {
        if (this.totalCount === 0) return 1;
        return this.loadedCount / this.totalCount;
    }

    /**
     * Precarga un manifiesto de recursos:
     * [{ key: 'hero', type: 'image', src: 'assets/sprites/hero.png' }, ...]
     */
    async preload(manifest = [], onProgress = null) {
        this.errors = [];
        this.loadedCount = 0;
        this.totalCount = manifest.length;

        if (this.totalCount === 0) {
            if (onProgress) onProgress(1);
            return { ok: true, errors: [] };
        }

        const tasks = manifest.map(async (item) => {
            try {
                if (item.type === 'image') {
                    await this.loadImage(item.key, item.src);
                } else if (item.type === 'audio' && item.audioContext) {
                    await this.loadAudioBuffer(item.key, item.src, item.audioContext);
                }
            } catch (err) {
                this.errors.push({ key: item.key, src: item.src, error: err.message });
                console.warn(`[AssetLoader] Recurso no disponible (${item.key}: ${item.src}):`, err.message);
            } finally {
                this.loadedCount += 1;
                if (onProgress) {
                    onProgress(this.getProgress(), item.key);
                }
            }
        });

        await Promise.all(tasks);
        return {
            ok: this.errors.length === 0,
            errors: [...this.errors]
        };
    }

    loadImage(key, src) {
        if (this.images.has(key)) {
            return Promise.resolve(this.images.get(key));
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.decoding = 'async';
            img.onload = () => {
                this.images.set(key, img);
                resolve(img);
            };
            img.onerror = () => {
                reject(new Error(`Fallo al cargar imagen: ${src}`));
            };
            img.src = src;
        });
    }

    async loadAudioBuffer(key, src, audioContext) {
        if (this.audioBuffers.has(key)) {
            return this.audioBuffers.get(key);
        }

        const response = await fetch(src);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} al cargar audio: ${src}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await audioContext.decodeAudioData(arrayBuffer);
        this.audioBuffers.set(key, decoded);
        return decoded;
    }

    getImage(key) {
        return this.images.get(key) || null;
    }

    getAudioBuffer(key) {
        return this.audioBuffers.get(key) || null;
    }

    releaseImage(key) {
        const img = this.images.get(key);
        if (img) {
            img.src = '';
            this.images.delete(key);
        }
    }

    clear() {
        for (const key of this.images.keys()) {
            this.releaseImage(key);
        }
        this.audioBuffers.clear();
        this.errors = [];
        this.loadedCount = 0;
        this.totalCount = 0;
    }
}
