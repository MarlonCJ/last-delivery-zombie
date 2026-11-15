/**
 * ZombieWalkerMeta.js
 * Hoja de sprites HD del Zombi Caminante (Z-01).
 * La hoja tiene 8 columnas x 6 filas (2048x1536) y cada fotograma se recorta
 * a su caja visible para alinear los pies y evitar espacio transparente.
 *
 * Filas:
 *   0. Reposo / respiración (8 frames)
 *   1. Caminar (8 frames)
 *   2. Correr (8 frames)
 *   3. Atacar (8 frames)
 *   4. Recibir daño / tambalearse (8 frames)
 *   5. Morir / desplomarse (8 frames)
 *
 * La altura de referencia es común a todas las animaciones para que el
 * personaje conserve la misma escala al caminar, atacar o caer.
 */

export const ZOMBIE_WALKER_META = {
    imageKey: 'zombie_walker',
    animations: {
        z01_idle: [
            { x: 76, y: 58, w: 101, h: 176 },
            { x: 335, y: 59, w: 94, h: 174 },
            { x: 592, y: 59, w: 93, h: 175 },
            { x: 845, y: 63, w: 98, h: 171 },
            { x: 1102, y: 59, w: 96, h: 175 },
            { x: 1358, y: 59, w: 95, h: 175 },
            { x: 1616, y: 56, w: 94, h: 178 },
            { x: 1871, y: 59, w: 95, h: 174 }
        ],
        z01_walk: [
            { x: 78, y: 325, w: 95, h: 164 },
            { x: 337, y: 324, w: 93, h: 166 },
            { x: 589, y: 326, w: 102, h: 164 },
            { x: 841, y: 329, w: 110, h: 162 },
            { x: 1104, y: 326, w: 96, h: 164 },
            { x: 1363, y: 326, w: 89, h: 165 },
            { x: 1605, y: 331, w: 117, h: 159 },
            { x: 1863, y: 329, w: 112, h: 161 }
        ],
        z01_run: [
            { x: 71, y: 593, w: 115, h: 153 },
            { x: 312, y: 596, w: 140, h: 150 },
            { x: 566, y: 595, w: 149, h: 151 },
            { x: 817, y: 598, w: 155, h: 148 },
            { x: 1087, y: 598, w: 130, h: 147 },
            { x: 1340, y: 595, w: 136, h: 150 },
            { x: 1591, y: 596, w: 145, h: 149 },
            { x: 1854, y: 592, w: 133, h: 154 }
        ],
        z01_attack: [
            { x: 84, y: 854, w: 85, h: 148 },
            { x: 327, y: 856, w: 112, h: 146 },
            { x: 570, y: 854, w: 139, h: 148 },
            { x: 813, y: 852, w: 166, h: 151 },
            { x: 1073, y: 849, w: 157, h: 153 },
            { x: 1332, y: 857, w: 152, h: 145 },
            { x: 1583, y: 872, w: 159, h: 130 },
            { x: 1867, y: 857, w: 105, h: 145 }
        ],
        z01_hurt: [
            { x: 86, y: 1103, w: 85, h: 155 },
            { x: 340, y: 1104, w: 88, h: 155 },
            { x: 586, y: 1099, w: 108, h: 159 },
            { x: 839, y: 1104, w: 115, h: 154 },
            { x: 1104, y: 1118, w: 94, h: 140 },
            { x: 1361, y: 1129, w: 90, h: 129 },
            { x: 1613, y: 1133, w: 97, h: 125 },
            { x: 1864, y: 1139, w: 107, h: 118 }
        ],
        z01_dead: [
            { x: 85, y: 1381, w: 84, h: 132 },
            { x: 333, y: 1394, w: 101, h: 119 },
            { x: 583, y: 1413, w: 112, h: 101 },
            { x: 834, y: 1424, w: 124, h: 90 },
            { x: 1073, y: 1441, w: 158, h: 73 },
            { x: 1319, y: 1456, w: 174, h: 58 },
            { x: 1570, y: 1465, w: 187, h: 49 },
            { x: 1836, y: 1469, w: 167, h: 45 }
        ]
    },
    refHeights: {
        z01_idle: 176,
        z01_walk: 176,
        z01_run: 176,
        z01_attack: 176,
        z01_hurt: 176,
        z01_dead: 176
    }
};
