/**
 * Projectile.js
 * Entidad ligera para proyectiles balísticos del jugador y ondas de choque del Jefe Final.
 */

export class Projectile {
    constructor({
        x,
        y,
        vx,
        vy = 0,
        damage = 30,
        maxDistance = 680,
        owner = 'player', // 'player' | 'boss'
        width = 12,
        height = 4,
        color = '#ffe082',
        knockback = 140,
        piercing = false,
        gravity = 0
    }) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.gravity = gravity;
        this.width = width;
        this.height = height;
        this.damage = damage;
        this.maxDistance = maxDistance;
        this.traveled = 0;
        this.owner = owner;
        this.color = color;
        this.knockback = knockback;
        this.piercing = piercing;
        this.active = true;
        this.hitTargets = new Set();
    }

    update(dt) {
        if (!this.active) return;
        if (this.gravity !== 0) {
            this.vy += this.gravity * dt;
        }
        const dx = this.vx * dt;
        const dy = this.vy * dt;
        this.x += dx;
        this.y += dy;
        this.traveled += Math.hypot(dx, dy);

        if (this.traveled >= this.maxDistance) {
            this.active = false;
        }
    }

    render(ctx, cameraX, cameraY) {
        if (!this.active) return;
        const sx = Math.round(this.x - cameraX);
        const sy = Math.round(this.y - cameraY);

        ctx.save();
        if (this.owner === 'player') {
            // Estela luminosa de bala
            const dir = Math.sign(this.vx) || 1;
            const grad = ctx.createLinearGradient(sx - dir * 24, sy, sx + this.width, sy);
            grad.addColorStop(0, 'rgba(255, 190, 70, 0)');
            grad.addColorStop(1, this.color);
            ctx.fillStyle = grad;
            ctx.fillRect(sx - (dir > 0 ? 22 : 0), sy, 22 + this.width, this.height);

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx, sy + 1, this.width * 0.6, Math.max(2, this.height - 2));
        } else if (this.owner === 'enemy') {
            // Esfera corrosiva bio-ácida de mutantes escupidores y Paciente Cero
            const r = Math.max(6, this.width * 0.5);
            const cx = sx + r;
            const cy = sy + r;
            ctx.fillStyle = 'rgba(72, 255, 118, 0.34)';
            ctx.beginPath();
            ctx.arc(cx - Math.sign(this.vx) * 6, cy, r * 1.35, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = this.color || '#58ff7a';
            ctx.shadowColor = '#46ff6e';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#eaffef';
            ctx.beginPath();
            ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.38, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Onda sísmica a ras de suelo del Boss Final
            ctx.fillStyle = this.color || 'rgba(235, 35, 52, 0.88)';
            ctx.shadowColor = this.color || '#ff2638';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.moveTo(sx, sy + this.height);
            ctx.lineTo(sx + this.width * 0.5, sy);
            ctx.lineTo(sx + this.width, sy + this.height);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}
