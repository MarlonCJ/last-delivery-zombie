/**
 * LevelSystem.js
 * Registro escalable de niveles, objetivos de entrega, recompensas y progresión secuencial.
 */

export const LEVEL_MANIFEST = Object.freeze([
    {
        id: 1,
        code: 'LEVEL_01',
        name: 'PRIMERA ENTREGA',
        subtitle: 'Distrito Central — Zona en Cuarentena Nocturna',
        difficulty: 'Normal',
        setting: 'Ciudad abandonada durante la noche: calles destruidas, vehículos abandonados e iluminación de emergencia.',
        pickupPoint: 'Puesto de Suministros Sur',
        deliveryPoint: 'Refugio Civil — Zona Segura Norte',
        objectives: [
            'Recibir el paquete sellado en el punto de recepción.',
            'Cruzar las calles infestadas y transportar la carga intacta.',
            'Entregar el paquete en la Zona Segura y derrotar al Jefe Final.'
        ],
        enemies: ['Zombi Normal', 'Jefe de Distrito (Boss Final)'],
        baseMoneyReward: 250,
        baseScoreReward: 1000
    },
    {
        id: 2,
        code: 'LEVEL_02',
        name: 'PABELLÓN DE URGENCIAS',
        subtitle: 'Hospital General — Bloque Quirúrgico',
        difficulty: 'Difícil',
        setting: 'Corredores médicos colapsados con cortes eléctricos y cepas aceleradas.',
        pickupPoint: 'Farmacia Blindada',
        deliveryPoint: 'Unidad de Aislamiento',
        objectives: [
            'Recuperar el suero estabilizador.',
            'Sobrevivir a los infectados rápidos.',
            'Completar la entrega y neutralizar la mutación alfa.'
        ],
        enemies: ['Zombi Normal', 'Zombi Rápido', 'Zombi Especial', 'Paciente Cero (Boss)'],
        baseMoneyReward: 450,
        baseScoreReward: 2000
    },
    {
        id: 3,
        code: 'LEVEL_03',
        name: 'ORIGEN BIOGEN',
        subtitle: 'Laboratorio Biogen — Sector Subterráneo B-3',
        difficulty: 'Pesadilla',
        setting: 'Instalación científica origen del accidente biológico con tanques mutagénicos rotos.',
        pickupPoint: 'Cámara Criogénica B-3',
        deliveryPoint: 'Helipuerto de Extracción',
        objectives: [
            'Extraer la muestra maestra del agente biológico.',
            'Sortear fugas químicas y criaturas mutantes.',
            'Derrotar a la Aberración Biogen en la plataforma de salida.'
        ],
        enemies: ['Zombi Rápido', 'Zombi Especial', 'Mutante B-3', 'Aberración Biogen (Boss)'],
        baseMoneyReward: 800,
        baseScoreReward: 4000
    }
]);

export class LevelSystem {
    constructor(saveSystem) {
        this.saveSystem = saveSystem;
    }

    getAllLevels() {
        return LEVEL_MANIFEST;
    }

    getLevelById(id) {
        return LEVEL_MANIFEST.find(lvl => lvl.id === id) || LEVEL_MANIFEST[0];
    }

    getCurrentLevel() {
        return this.getLevelById(this.saveSystem.state.player.currentLevel);
    }

    isLevelUnlocked(levelId) {
        if (levelId === 1) return true;
        return this.saveSystem.state.player.completedLevels.includes(levelId - 1);
    }
}
