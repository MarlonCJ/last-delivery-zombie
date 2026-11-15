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
        enemies: ['Zombi Caminante (10 pts)', 'Zombi Corredor (25 pts)', 'Zombi Resistente (35 pts)', 'Zombi Vomitador (40 pts)', 'Zombi Bombero (45 pts)', 'Zombi Blindado (60 pts)', 'Boss Mutante (100 pts)'],
        baseMoneyReward: 250,
        baseScoreReward: 0
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
            'Sobrevivir a los infectados de élite y mutantes.',
            'Completar la entrega y neutralizar al Paciente Cero.'
        ],
        enemies: ['Caminante (10)', 'Corredor (25)', 'Resistente (35)', 'Vomitador (40)', 'Bombero (45)', 'Blindado (60)', 'Saltador (60)', 'Bruto Mutante (65)', 'Paciente Cero Boss (100 pts)'],
        baseMoneyReward: 450,
        baseScoreReward: 0
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
        enemies: ['Blindado (60)', 'Saltador (60)', 'Bruto Mutante (65)', 'Aberración Biogen Boss (100 pts)'],
        baseMoneyReward: 800,
        baseScoreReward: 0
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
