/**
 * InputManager.js
 * Sistema centralizado de entrada por teclado y puntero.
 * Soporta mapeo configurable de acciones y reasignación interactiva de controles.
 */

const KEY_LABELS = Object.freeze({
    Space: 'ESPACIO',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Escape: 'ESC',
    Enter: 'ENTER',
    ShiftLeft: 'SHIFT IZQ',
    ShiftRight: 'SHIFT DER',
    ControlLeft: 'CTRL IZQ',
    ControlRight: 'CTRL DER',
    Tab: 'TAB',
    Backspace: 'BORRAR'
});

export function formatKeyCode(code) {
    if (!code) return '---';
    if (KEY_LABELS[code]) return KEY_LABELS[code];
    if (code.startsWith('Key')) return code.slice(3).toUpperCase();
    if (code.startsWith('Digit')) return code.slice(5);
    return code.toUpperCase();
}

export class InputManager {
    constructor(saveSystem, canvas) {
        this.saveSystem = saveSystem;
        this.canvas = canvas;

        this.keysDown = new Set();
        this.keysJustPressed = new Set();
        this.keysJustReleased = new Set();

        this.pointer = {
            x: 640,
            y: 360,
            down: false,
            justPressed: false
        };

        this.rebindCallback = null;
        this.rebindCancelCallback = null;

        this._onKeyDown = this._handleKeyDown.bind(this);
        this._onKeyUp = this._handleKeyUp.bind(this);
        this._onBlur = this._handleBlur.bind(this);
        this._onPointerMove = this._handlePointerMove.bind(this);
        this._onPointerDown = this._handlePointerDown.bind(this);
        this._onPointerUp = this._handlePointerUp.bind(this);

        this._attachListeners();
    }

    _attachListeners() {
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
        window.addEventListener('blur', this._onBlur);

        if (this.canvas) {
            this.canvas.addEventListener('pointermove', this._onPointerMove);
            this.canvas.addEventListener('pointerdown', this._onPointerDown);
            window.addEventListener('pointerup', this._onPointerUp);
        }
    }

    destroy() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
        window.removeEventListener('blur', this._onBlur);
        if (this.canvas) {
            this.canvas.removeEventListener('pointermove', this._onPointerMove);
            this.canvas.removeEventListener('pointerdown', this._onPointerDown);
            window.removeEventListener('pointerup', this._onPointerUp);
        }
    }

    _isTypingInField(target) {
        if (!target || !target.tagName) return false;
        const tag = target.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
    }

    _handleKeyDown(event) {
        // Modo captura de tecla para reconfigurar controles en Opciones
        if (this.rebindCallback) {
            event.preventDefault();
            event.stopPropagation();

            if (event.code === 'Escape') {
                const cancelCb = this.rebindCancelCallback;
                this.cancelRebind();
                if (cancelCb) cancelCb();
                return;
            }

            const cb = this.rebindCallback;
            this.cancelRebind();
            cb(event.code);
            return;
        }

        // No interceptar escritura dentro del campo de nombre u otros inputs
        if (this._isTypingInField(event.target)) {
            return;
        }

        const code = event.code;
        if (!this.keysDown.has(code)) {
            this.keysJustPressed.add(code);
        }
        this.keysDown.add(code);

        // Evitar scroll accidental con flechas o barra espaciadora fuera de inputs
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
            event.preventDefault();
        }
    }

    _handleKeyUp(event) {
        const code = event.code;
        this.keysDown.delete(code);
        this.keysJustReleased.add(code);
    }

    _handleBlur() {
        this.keysDown.clear();
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
        this.pointer.down = false;
        this.pointer.justPressed = false;
    }

    _handlePointerMove(event) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        this.pointer.x = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
        this.pointer.y = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
    }

    _handlePointerDown(event) {
        this._handlePointerMove(event);
        this.pointer.down = true;
        this.pointer.justPressed = true;
    }

    _handlePointerUp() {
        this.pointer.down = false;
    }

    /**
     * Captura la siguiente tecla pulsada para reasignar una acción.
     */
    captureNextKey(onCaptured, onCancelled = null) {
        this.rebindCallback = onCaptured;
        this.rebindCancelCallback = onCancelled;
    }

    cancelRebind() {
        this.rebindCallback = null;
        this.rebindCancelCallback = null;
    }

    isCapturingKey() {
        return Boolean(this.rebindCallback);
    }

    isKeyDown(code) {
        return this.keysDown.has(code);
    }

    isKeyJustPressed(code) {
        return this.keysJustPressed.has(code);
    }

    isActionDown(action) {
        const codes = this.saveSystem.getControls()[action] || [];
        return codes.some(code => this.keysDown.has(code));
    }

    isActionJustPressed(action) {
        const codes = this.saveSystem.getControls()[action] || [];
        return codes.some(code => this.keysJustPressed.has(code));
    }

    getFormattedActionKeys(action) {
        const codes = this.saveSystem.getControls()[action] || [];
        return codes.map(formatKeyCode).join(' / ');
    }

    /**
     * Limpia estados transitorios al final de cada fotograma lógico.
     */
    endFrame() {
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
        this.pointer.justPressed = false;
    }
}
