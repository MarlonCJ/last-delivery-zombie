/**
 * LevelSystem.js
 * Registro escalable de niveles, objetivos de entrega, recompensas y progresión secuencial.
 */

export const LEVEL_MANIFEST = Object.freeze([
    {
        id: 1,
        code: 'LEVEL_01',
        name: 'EMBOSCADA EN LA CARRETERA',
        subtitle: 'Carretera Nocturna — Lugar del Accidente',
        difficulty: 'Normal (Contrarreloj 01:00)',
        setting: 'Carretera nocturna a las afueras de la ciudad junto a la moto de EDI y el vehículo volcado.',
        pickupPoint: 'Motocicleta de EDI',
        deliveryPoint: 'Zona del Accidente Despejada',
        objectives: [
            'Enfrenta y elimina a los 5 zombis en la carretera.',
            'Completa el combate antes de que se agote el tiempo límite de 1 minuto (01:00).',
            'Sobrevive para guardar tu progreso y desbloquear el Nivel 02.'
        ],
        enemies: ['5 Zombis en Carretera (Caminantes y Corredores)'],
        baseMoneyReward: 250,
        baseScoreReward: 100
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
