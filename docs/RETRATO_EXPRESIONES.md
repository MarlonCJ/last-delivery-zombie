# Retrato reactivo del repartidor (6 expresiones)

**Lámina:** `assets/portraits/edi_faces_hd.png` (1536 × 214 px, 6 caras de 256 × 214)
**Sistema:** `js/systems/PortraitSystem.js`
**Metadatos:** `js/core/PortraitFacesMeta.js`
**Canvas del HUD:** `#hud-avatar-canvas` (116 × 116 internos, 52 × 52 en pantalla)

---

## 1. Qué hace

El retrato de la esquina superior izquierda cambia de expresión según lo que le ocurre al jugador. El cambio tiene un fundido de 180 ms y el borde del marco cambia de color.

| Expresión | Cuándo se activa | Duración |
|---|---|---|
| **Tranquilo** (`calm`) | Sin amenazas cerca y con el paquete aún sin recoger | Permanente |
| **Serio** (`serious`) | Hay un zombi o el jefe a menos de **460 px**, o el jugador lleva el paquete | Mientras dure |
| **Dolor** (`pain`) | El jugador recibe daño (`hurtAnimTimer` / aturdimiento) | 950 ms + destello rojo |
| **Rabia** (`rage`) | El jugador dispara o ataca cuerpo a cuerpo, y al eliminar un zombi | 1200 ms al matar |
| **Risa / Descanso** (`laugh`) | Curación, checkpoint, recogida del paquete, entrega y jefe derrotado | 1500–5000 ms |
| **Cansado** (`tired`) | Salud igual o inferior al **30 %** | Mientras dure |
| **Apagado** (`dead`) | Salud a 0 (se dibuja sobre la cara de cansado, desaturada) | Hasta reaparecer |

**Prioridad:** `dead > pain > rage > laugh > tired > serious > calm`.
Una expresión de mayor prioridad no se interrumpe con otra menor (por ejemplo, una curación no corta la cara de dolor).

---

## 2. Flujo de funcionamiento

```
Juego (Level01 / Level02)
  └── _syncHud()  →  _renderHudAvatar()
        └── portrait.update(player, { enemiesNear })
              ├── resuelve la expresión según la salud y las acciones
              ├── aplica expresiones temporales (notify)
              └── repinta el canvas solo si cambió, si hay fundido o si hay pulso
```

- `_hasNearbyThreat()` (en cada nivel) recorre `this.enemies` y devuelve `true` si alguno está a menos de 460 px.
- `onEnemyKilled` del `CombatSystem` llama a `portrait.notify('rage')`.
- Los checkpoints, la recogida/entrega del paquete y la victoria llaman a `portrait.notify('laugh', …)`.
- La curación se detecta automáticamente comparando la salud con el frame anterior (sirve para botiquines y reapariciones).

---

## 3. Archivos implicados

| Archivo | Cambio |
|---|---|
| `assets/portraits/edi_faces_hd.png` | Nueva lámina 6×1 sin las etiquetas de texto |
| `js/core/PortraitFacesMeta.js` | Coordenadas de cada cara |
| `js/systems/PortraitSystem.js` | Máquina de estados y dibujo en el canvas |
| `js/main.js` | Precarga `portrait_faces` |
| `js/scenes/Level01.js` | Instancia, activadores y `_hasNearbyThreat()` |
| `js/scenes/Level02.js` | Instancia, activadores y `_hasNearbyThreat()` |
| `css/game.css` | Colores del borde por expresión (`mood-*`) |

---

## 4. Cómo ajustar los tiempos

En `js/systems/PortraitSystem.js`:

```js
const FADE_MS = 180;   // duración del fundido entre caras
const FLASH_MS = 150;  // destello rojo al recibir daño

const HOLD_MS = {
    pain: 950,    // cuánto se queda la cara de dolor
    rage: 1200,   // cuánto se queda la cara de rabia al matar
    laugh: 1900   // cuánto se queda la cara de risa
};
```

### Umbrales de expresión

Dentro de `_resolve()`:

```js
if (player.hurtAnimTimer > 0.04 || player.stunTimer > 0) return 'pain';
if (player.attackAnimTimer > 0) return 'rage';

const ratio = player.health / Math.max(1, player.maxHealth);
if (ratio <= 0.30) return 'tired';          // ← % de salud para "cansado"
if (enemiesNear || player.hasPackage) return 'serious';  // ← amenaza/paquete
return 'calm';
```

La distancia de "enemigo cerca" está en cada nivel:

```js
if (Math.abs(enemy.x - px) < 460) return true;   // ← radio en píxeles
```

---

## 5. Cómo añadir un nuevo activador

Desde cualquier escena, con el retrato ya creado:

```js
// Forzar una expresión concreta durante 2 segundos
this.portrait?.notify('laugh', 2000);
```

`notify` ignora la petición si hay una expresión de mayor prioridad activa.

---

## 6. Cómo cambiar o ampliar las caras

La lámina es una tira horizontal de 6 celdas iguales. Para sustituir una cara:

1. Prepara la imagen a **1536 × 214** (6 celdas de 256 × 214) o ajusta `cell` en `PortraitFacesMeta.js`.
2. Mantén el orden: `calm, serious, pain, laugh, rage, tired`.
3. Guarda en `assets/portraits/edi_faces_hd.png`.
4. Si cambias el tamaño, actualiza `cell` en el meta; el sistema escala automáticamente con recorte tipo *cover*.

Para añadir una expresión nueva:

1. Añade la celda en `PORTRAIT_FACES_META.moods`.
2. Añade su entrada en `MOOD_PRIORITY`, `HOLD_MS` (opcional) y `TINTS` del sistema.
3. Añade la clase CSS `mood-<nombre>` en `css/game.css`.

---

## 7. Colores del marco

`PortraitSystem._applyRing()` pone una clase `mood-*` en `.hud-avatar`:

| Expresión | Color del borde |
|---|---|
| Tranquilo | Ámbar `#f5a623` |
| Serio | Azul acero `#6ea8d8` |
| Cansado | Gris azulado `#7d8ca3` |
| Risa | Verde `#47ff8c` |
| Rabia | Naranja rojizo `#ff5a24` |
| Dolor | Rojo `#ff3b46` |
| Apagado | Rojizo oscuro `#5a2027` |

---

## 8. Rendimiento

- El canvas solo se repinta cuando cambia la expresión, durante el fundido, durante el destello o mientras dura el pulso de dolor/rabia.
- El tamaño de dibujo es 116 × 116 px: coste despreciable incluso repintando a 60 fps.
- La viñeta se calcula una sola vez y se cachea.
- Mientras la lámina carga, se usa como respaldo la cara antigua del atlas (`face_*`), así que el HUD nunca queda vacío.

---

## 9. Verificación realizada

- Sin errores en consola al cargar el juego.
- El retrato se pinta en el HUD (píxel central con tono de piel, no vacío).
- Secuencia observada durante una partida real:
  `calm → serious` (al acercarse a un zombi) `→ pain` (al recibir un golpe) `→ rage` (al disparar) `→ serious`.
- Capturas revisadas con las caras de **tranquilo**, **serio** y **rabia** visibles y con el borde cambiando de color.
