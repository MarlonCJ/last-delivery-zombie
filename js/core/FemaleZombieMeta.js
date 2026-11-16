/**
 * FemaleZombieMeta.js
 * Hoja de sprites HD del Zombi Caminante Femenino (Z-01F).
 *
 * La hoja original (1448x1086) trae fondo negro opaco; el PNG del proyecto ya
 * está recortado con transparencia. Se divide en 8 columnas x 6 filas de
 * celdas de 181x181 px y cada fotograma se recorta a su caja alfa exacta
 * para alinear los pies.
 *
 * Filas:
 *   0. Reposo / respiración (8 frames)
 *   1. Caminar (8 frames)
 *   2. Correr (8 frames)
 *   3. Atacar (8 frames)
 *   4. Recibir daño / tambalearse (8 frames)
 *   5. Morir / desplomarse (8 frames)
 *
 * La altura de referencia es común (142 px) para conservar el mismo tamaño
 * que el caminante masculino dentro del juego.
 */

export const FEMALE_ZOMBIE_META = {
    imageKey: 'zombie_walker_female',
    naturalWidth: 1448,
    animations: {
        z01f_idle: [
            { x: 53, y: 26, w: 73, h: 142 },
            { x: 236, y: 28, w: 73, h: 139 },
            { x: 417, y: 28, w: 74, h: 139 },
            { x: 599, y: 28, w: 74, h: 140 },
            { x: 781, y: 28, w: 73, h: 139 },
            { x: 961, y: 28, w: 73, h: 139 },
            { x: 1143, y: 28, w: 73, h: 139 },
            { x: 1325, y: 28, w: 72, h: 139 }
        ],
        z01f_walk: [
            { x: 53, y: 220, w: 73, h: 129 },
            { x: 233, y: 220, w: 75, h: 129 },
            { x: 409, y: 222, w: 89, h: 127 },
            { x: 588, y: 223, w: 89, h: 125 },
            { x: 779, y: 222, w: 76, h: 127 },
            { x: 964, y: 223, w: 71, h: 127 },
            { x: 1134, y: 225, w: 88, h: 124 },
            { x: 1313, y: 225, w: 90, h: 124 }
        ],
        z01f_run: [
            { x: 50, y: 408, w: 82, h: 122 },
            { x: 219, y: 410, w: 99, h: 121 },
            { x: 399, y: 410, w: 108, h: 121 },
            { x: 574, y: 411, w: 116, h: 119 },
            { x: 768, y: 410, w: 99, h: 120 },
            { x: 947, y: 410, w: 101, h: 120 },
            { x: 1122, y: 410, w: 112, h: 118 },
            { x: 1309, y: 410, w: 102, h: 121 }
        ],
        z01f_attack: [
            { x: 55, y: 589, w: 70, h: 122 },
            { x: 233, y: 589, w: 77, h: 122 },
            { x: 403, y: 590, w: 99, h: 121 },
            { x: 572, y: 588, w: 135, h: 123 },
            { x: 756, y: 588, w: 128, h: 123 },
            { x: 942, y: 594, w: 117, h: 117 },
            { x: 1121, y: 597, w: 114, h: 114 },
            { x: 1325, y: 591, w: 76, h: 120 }
        ],
        z01f_hurt: [
            { x: 55, y: 764, w: 62, h: 127 },
            { x: 238, y: 769, w: 71, h: 122 },
            { x: 403, y: 768, w: 89, h: 122 },
            { x: 583, y: 770, w: 97, h: 120 },
            { x: 781, y: 772, w: 73, h: 119 },
            { x: 960, y: 780, w: 73, h: 110 },
            { x: 1142, y: 782, w: 74, h: 108 },
            { x: 1321, y: 787, w: 80, h: 103 }
        ],
        z01f_dead: [
            { x: 55, y: 955, w: 71, h: 117 },
            { x: 232, y: 965, w: 79, h: 107 },
            { x: 408, y: 982, w: 90, h: 90 },
            { x: 584, y: 998, w: 100, h: 74 },
            { x: 756, y: 1014, w: 125, h: 58 },
            { x: 934, y: 1026, w: 135, h: 46 },
            { x: 1111, y: 1034, w: 143, h: 38 },
            { x: 1294, y: 1035, w: 140, h: 37 }
        ]
    },
    refHeights: {
        z01f_idle: 142,
        z01f_walk: 142,
        z01f_run: 142,
        z01f_attack: 142,
        z01f_hurt: 142,
        z01f_dead: 142
    }
};
