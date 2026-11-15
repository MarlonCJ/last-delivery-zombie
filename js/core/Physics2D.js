/**
 * Physics2D.js
 * Módulo matemático y físico 2D base (gravedad, velocidad terminal y fricción).
 * Preparado para la simulación de entidades en Fase 3.
 */

export const PHYSICS_CONSTANTS = Object.freeze({
    GRAVITY: 1650,             // px/s² (ascenso firme)
    FALL_GRAVITY_MULT: 1.52,   // multiplicador de peso real al caer
    MAX_FALL_SPEED: 1080,      // px/s
    GROUND_FRICTION: 0.84,
    AIR_RESISTANCE: 0.96
});

export class Physics2D {
    static applyGravity(body, dt, gravity = PHYSICS_CONSTANTS.GRAVITY) {
        if (!body || body.ignoreGravity) return;
        const currentVy = body.vy || 0;
        const weightMult = currentVy > 0 ? (body.fallGravityMult ?? PHYSICS_CONSTANTS.FALL_GRAVITY_MULT) : 1.0;
        body.vy = Math.min(
            PHYSICS_CONSTANTS.MAX_FALL_SPEED,
            currentVy + gravity * weightMult * dt
        );
    }

    static integrate(body, dt) {
        if (!body) return;
        body.x += (body.vx || 0) * dt;
        body.y += (body.vy || 0) * dt;
    }

    static approach(current, target, maxDelta) {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }
        return current + Math.sign(target - current) * maxDelta;
    }
}
