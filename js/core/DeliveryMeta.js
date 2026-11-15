/**
 * DeliveryMeta.js
 * Atlas exclusivo y simétrico del personaje principal (Delivery).
 * Generado a partir de los 71 sprites aislados de alta definición compartidos por el usuario,
 * sin residuos de frames vecinos, con anclaje anatómico horizontal (anchorX) y alturas de
 * referencia calibradas por proporción corporal para garantizar tamaño 100% simétrico
 * al cambiar entre cualquiera de las animaciones.
 */

export const DELIVERY_META = {
    imageKey: 'delivery_sprite',
    naturalWidth: 2048,
    naturalHeight: 936,
    animations: {
    "player_idle": [
        {
            "x": 16,
            "y": 16,
            "w": 81,
            "h": 150,
            "anchorX": 0.557,
            "sx": 1.07
        },
        {
            "x": 113,
            "y": 16,
            "w": 80,
            "h": 149,
            "anchorX": 0.535,
            "sx": 1.07
        },
        {
            "x": 209,
            "y": 16,
            "w": 79,
            "h": 148,
            "anchorX": 0.542,
            "sx": 1.07
        },
        {
            "x": 304,
            "y": 16,
            "w": 78,
            "h": 149,
            "anchorX": 0.539,
            "sx": 1.07
        },
        {
            "x": 398,
            "y": 16,
            "w": 75,
            "h": 149,
            "anchorX": 0.538,
            "sx": 1.07
        },
        {
            "x": 489,
            "y": 16,
            "w": 75,
            "h": 148,
            "anchorX": 0.541,
            "sx": 1.07
        }
    ],
    "player_walk": [
        {
            "x": 580,
            "y": 16,
            "w": 99,
            "h": 142,
            "anchorX": 0.487,
            "sx": 1.04
        },
        {
            "x": 695,
            "y": 16,
            "w": 98,
            "h": 139,
            "anchorX": 0.498,
            "sx": 1.04
        },
        {
            "x": 809,
            "y": 16,
            "w": 76,
            "h": 139,
            "anchorX": 0.479,
            "sx": 1.04
        },
        {
            "x": 901,
            "y": 16,
            "w": 78,
            "h": 140,
            "anchorX": 0.472,
            "sx": 1.04
        },
        {
            "x": 995,
            "y": 16,
            "w": 72,
            "h": 141,
            "anchorX": 0.437,
            "sx": 1.04
        },
        {
            "x": 1083,
            "y": 16,
            "w": 87,
            "h": 141,
            "anchorX": 0.516,
            "sx": 1.04
        },
        {
            "x": 1186,
            "y": 16,
            "w": 91,
            "h": 142,
            "anchorX": 0.497,
            "sx": 1.04
        }
    ],
    "player_run": [
        {
            "x": 16,
            "y": 182,
            "w": 120,
            "h": 136,
            "anchorX": 0.437
        },
        {
            "x": 152,
            "y": 182,
            "w": 108,
            "h": 132,
            "anchorX": 0.539
        },
        {
            "x": 276,
            "y": 182,
            "w": 101,
            "h": 118,
            "anchorX": 0.427
        },
        {
            "x": 393,
            "y": 182,
            "w": 106,
            "h": 125,
            "anchorX": 0.419
        },
        {
            "x": 515,
            "y": 182,
            "w": 113,
            "h": 123,
            "anchorX": 0.431
        },
        {
            "x": 644,
            "y": 182,
            "w": 106,
            "h": 127,
            "anchorX": 0.391
        }
    ],
    "player_jump": [
        {
            "x": 766,
            "y": 182,
            "w": 78,
            "h": 96,
            "anchorX": 0.454
        },
        {
            "x": 860,
            "y": 182,
            "w": 83,
            "h": 109,
            "anchorX": 0.386
        },
        {
            "x": 959,
            "y": 182,
            "w": 75,
            "h": 98,
            "anchorX": 0.468
        },
        {
            "x": 1050,
            "y": 182,
            "w": 85,
            "h": 93,
            "anchorX": 0.507
        }
    ],
    "player_fall": [
        {
            "x": 1050,
            "y": 182,
            "w": 85,
            "h": 93,
            "anchorX": 0.507
        },
        {
            "x": 1151,
            "y": 182,
            "w": 82,
            "h": 113,
            "anchorX": 0.395
        }
    ],
    "player_crouch": [
        {
            "x": 766,
            "y": 182,
            "w": 78,
            "h": 96,
            "anchorX": 0.454
        },
        {
            "x": 1249,
            "y": 182,
            "w": 78,
            "h": 92,
            "anchorX": 0.469
        }
    ],
    "player_roll": [
        {
            "x": 766,
            "y": 182,
            "w": 78,
            "h": 96,
            "anchorX": 0.454
        },
        {
            "x": 959,
            "y": 182,
            "w": 75,
            "h": 98,
            "anchorX": 0.468
        },
        {
            "x": 1050,
            "y": 182,
            "w": 85,
            "h": 93,
            "anchorX": 0.507
        },
        {
            "x": 1249,
            "y": 182,
            "w": 78,
            "h": 92,
            "anchorX": 0.469
        }
    ],
    "player_melee": [
        {
            "x": 16,
            "y": 334,
            "w": 134,
            "h": 131,
            "anchorX": 0.583
        },
        {
            "x": 166,
            "y": 334,
            "w": 114,
            "h": 146,
            "anchorX": 0.539
        },
        {
            "x": 296,
            "y": 334,
            "w": 125,
            "h": 142,
            "anchorX": 0.533
        },
        {
            "x": 437,
            "y": 334,
            "w": 147,
            "h": 147,
            "anchorX": 0.614
        },
        {
            "x": 600,
            "y": 334,
            "w": 170,
            "h": 129,
            "anchorX": 0.341,
            "scale": 0.95
        },
        {
            "x": 786,
            "y": 334,
            "w": 126,
            "h": 128,
            "anchorX": 0.435
        },
        {
            "x": 928,
            "y": 334,
            "w": 118,
            "h": 126,
            "anchorX": 0.448
        },
        {
            "x": 1062,
            "y": 334,
            "w": 113,
            "h": 125,
            "anchorX": 0.542
        }
    ],
    "player_recoil": [
        {
            "x": 1191,
            "y": 334,
            "w": 94,
            "h": 119,
            "anchorX": 0.497
        },
        {
            "x": 1301,
            "y": 334,
            "w": 100,
            "h": 120,
            "anchorX": 0.506
        },
        {
            "x": 449,
            "y": 637,
            "w": 79,
            "h": 114,
            "anchorX": 0.531
        }
    ],
    "player_shoot": [
        {
            "x": 16,
            "y": 497,
            "w": 115,
            "h": 124,
            "anchorX": 0.374
        },
        {
            "x": 147,
            "y": 497,
            "w": 112,
            "h": 124,
            "anchorX": 0.386
        },
        {
            "x": 275,
            "y": 497,
            "w": 109,
            "h": 123,
            "anchorX": 0.383
        },
        {
            "x": 400,
            "y": 497,
            "w": 104,
            "h": 123,
            "anchorX": 0.384
        },
        {
            "x": 520,
            "y": 497,
            "w": 150,
            "h": 123,
            "anchorX": 0.3
        },
        {
            "x": 686,
            "y": 497,
            "w": 149,
            "h": 124,
            "anchorX": 0.3
        },
        {
            "x": 851,
            "y": 497,
            "w": 101,
            "h": 124,
            "anchorX": 0.415
        },
        {
            "x": 968,
            "y": 497,
            "w": 101,
            "h": 124,
            "anchorX": 0.411
        },
        {
            "x": 1085,
            "y": 497,
            "w": 105,
            "h": 123,
            "anchorX": 0.371
        },
        {
            "x": 1206,
            "y": 497,
            "w": 106,
            "h": 123,
            "anchorX": 0.393
        }
    ],
    "player_hurt": [
        {
            "x": 113,
            "y": 637,
            "w": 84,
            "h": 128,
            "anchorX": 0.574
        },
        {
            "x": 213,
            "y": 637,
            "w": 90,
            "h": 129,
            "anchorX": 0.504
        },
        {
            "x": 319,
            "y": 637,
            "w": 114,
            "h": 122,
            "anchorX": 0.543
        }
    ],
    "player_stun": [
        {
            "x": 319,
            "y": 637,
            "w": 114,
            "h": 122,
            "anchorX": 0.543
        },
        {
            "x": 449,
            "y": 637,
            "w": 79,
            "h": 114,
            "anchorX": 0.531
        },
        {
            "x": 544,
            "y": 637,
            "w": 79,
            "h": 126,
            "anchorX": 0.554
        }
    ],
    "player_dead": [
        {
            "x": 639,
            "y": 637,
            "w": 88,
            "h": 115,
            "anchorX": 0.434
        },
        {
            "x": 743,
            "y": 637,
            "w": 111,
            "h": 97,
            "anchorX": 0.469
        },
        {
            "x": 870,
            "y": 637,
            "w": 124,
            "h": 83,
            "anchorX": 0.484
        },
        {
            "x": 1010,
            "y": 637,
            "w": 113,
            "h": 66,
            "anchorX": 0.475
        },
        {
            "x": 1139,
            "y": 637,
            "w": 162,
            "h": 51,
            "anchorX": 0.482,
            "scale": 0.84
        },
        {
            "x": 1317,
            "y": 637,
            "w": 263,
            "h": 48,
            "anchorX": 0.428,
            "scale": 0.64
        }
    ],
    "player_climb": [
        {
            "x": 16,
            "y": 782,
            "w": 74,
            "h": 127,
            "anchorX": 0.529
        },
        {
            "x": 106,
            "y": 782,
            "w": 83,
            "h": 126,
            "anchorX": 0.514
        },
        {
            "x": 205,
            "y": 782,
            "w": 75,
            "h": 130,
            "anchorX": 0.475
        },
        {
            "x": 296,
            "y": 782,
            "w": 75,
            "h": 129,
            "anchorX": 0.523
        },
        {
            "x": 387,
            "y": 782,
            "w": 76,
            "h": 130,
            "anchorX": 0.584
        },
        {
            "x": 479,
            "y": 782,
            "w": 69,
            "h": 128,
            "anchorX": 0.614
        }
    ],
    "player_push": [
        {
            "x": 656,
            "y": 782,
            "w": 89,
            "h": 120,
            "anchorX": 0.444
        },
        {
            "x": 761,
            "y": 782,
            "w": 107,
            "h": 114,
            "anchorX": 0.389
        },
        {
            "x": 884,
            "y": 782,
            "w": 120,
            "h": 105,
            "anchorX": 0.388
        },
        {
            "x": 1020,
            "y": 782,
            "w": 116,
            "h": 106,
            "anchorX": 0.379
        },
        {
            "x": 1152,
            "y": 782,
            "w": 104,
            "h": 105,
            "anchorX": 0.405
        },
        {
            "x": 1272,
            "y": 782,
            "w": 69,
            "h": 108,
            "anchorX": 0.473
        }
    ]
},
    sprites: {
    "portrait_hero_bust": {
        "x": 16,
        "y": 16,
        "w": 81,
        "h": 96
    },
    "face_normal": {
        "x": 26,
        "y": 14,
        "w": 70,
        "h": 70
    },
    "face_focused": {
        "x": 25,
        "y": 495,
        "w": 68,
        "h": 68
    },
    "face_hurt": {
        "x": 127,
        "y": 635,
        "w": 68,
        "h": 68
    },
    "face_surprised": {
        "x": 224,
        "y": 635,
        "w": 68,
        "h": 68
    },
    "face_tired": {
        "x": 457,
        "y": 635,
        "w": 68,
        "h": 68
    },
    "face_dead": {
        "x": 643,
        "y": 635,
        "w": 68,
        "h": 68
    }
},
    refHeights: {
    "player_idle": 149,
    "player_walk": 142,
    "player_run": 133,
    "player_jump": 135,
    "player_fall": 135,
    "player_crouch": 135,
    "player_roll": 135,
    "player_melee": 136,
    "player_recoil": 130,
    "player_shoot": 130,
    "player_hurt": 130,
    "player_stun": 130,
    "player_dead": 130,
    "player_climb": 130,
    "player_push": 127
}
};
