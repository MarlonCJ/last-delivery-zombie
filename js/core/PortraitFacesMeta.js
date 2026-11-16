/**
 * PortraitFacesMeta.js
 * Coordenadas del retrato del repartidor (6 expresiones) en una lámina 6×1.
 *
 * Lámina: assets/portraits/edi_faces_hd.png  (1536 × 214 px)
 * Orden de las caras: tranquilo, serio, dolor, risa/descanso, rabia, cansado.
 * Cada celda mide 256 × 214 px.
 */

export const PORTRAIT_FACES_META = {
    imageKey: 'portrait_faces',
    src: 'assets/portraits/edi_faces_hd.png',
    cell: { w: 256, h: 214 },

    moods: {
        calm: { col: 0, row: 0, label: 'Tranquilo' },
        serious: { col: 1, row: 0, label: 'Serio' },
        pain: { col: 2, row: 0, label: 'Dolor' },
        laugh: { col: 3, row: 0, label: 'Risa / Descanso' },
        rage: { col: 4, row: 0, label: 'Rabia' },
        tired: { col: 5, row: 0, label: 'Cansado' }
    }
};
