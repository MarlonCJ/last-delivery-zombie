/**
 * CollisionSystem.js
 * Detección y resolución optimizada de colisiones AABB (Axis-Aligned Bounding Box)
 * preparada para plataformas, jugador, enemigos y proyectiles en Fase 3 y Fase 4.
 */

export class CollisionSystem {
    static intersectsAABB(a, b) {
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    static containsPoint(box, px, py) {
        return (
            px >= box.x &&
            px <= box.x + box.width &&
            py >= box.y &&
            py <= box.y + box.height
        );
    }

    /**
     * Resuelve la penetración mínima entre un cuerpo dinámico y un obstáculo estático.
     * Retorna banderas de contacto { top, bottom, left, right }.
     */
    static resolveDynamicVsStatic(dynamicBox, staticBox) {
        const contacts = { top: false, bottom: false, left: false, right: false };
        if (!CollisionSystem.intersectsAABB(dynamicBox, staticBox)) {
            return contacts;
        }

        const overlapLeft = (dynamicBox.x + dynamicBox.width) - staticBox.x;
        const overlapRight = (staticBox.x + staticBox.width) - dynamicBox.x;
        const overlapTop = (dynamicBox.y + dynamicBox.height) - staticBox.y;
        const overlapBottom = (staticBox.y + staticBox.height) - dynamicBox.y;

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
            if (overlapLeft < overlapRight) {
                dynamicBox.x -= overlapLeft;
                dynamicBox.vx = 0;
                contacts.right = true;
            } else {
                dynamicBox.x += overlapRight;
                dynamicBox.vx = 0;
                contacts.left = true;
            }
        } else {
            if (overlapTop < overlapBottom) {
                dynamicBox.y -= overlapTop;
                dynamicBox.vy = 0;
                contacts.bottom = true;
            } else {
                dynamicBox.y += overlapBottom;
                dynamicBox.vy = 0;
                contacts.top = true;
            }
        }

        return contacts;
    }
}
