# Guía Paso a Paso: Movimiento del Personaje (EDI)

**Juego:** Last Delivery Zombie  
**Protagonista:** EDI (Domiciliario)  
**Archivos principales involucrados:**
- `js/core/InputManager.js` (captura de teclado y ratón)
- `js/systems/SaveSystem.js` (configuración y guardado de teclas)
- `js/entities/Player.js` (lógica de movimiento, salto, esquive, escalada y animaciones)
- `js/core/Physics2D.js` (gravedad, aceleración y frenado)
- `js/core/CollisionSystem.js` (colisiones con suelo, plataformas y cajas)
- `js/core/DeliveryMeta.js` y `js/core/SpriteAtlas.js` (sprites HD simétricos de cada movimiento)

---

## Parte 1: Paso a paso para mover a EDI en el juego (Jugador)

### Paso 1: Entrar a la partida
1. Abre el juego en el navegador (`http://localhost:8080`).
2. En el **Menú Principal**, haz clic en **`INICIAR JUEGO`**.
3. Avanza o salta las **6 escenas de la Introducción** (`SIGUIENTE` / `ESPACIO` / `SALTAR`) y en la pantalla de preparación pulsa **`DESPLEGAR EN ZONA`**.
4. Haz clic una vez dentro del escenario si el navegador no tiene el foco activo.

---

### Paso 2: Caminar a la izquierda y a la derecha
- **Mover a la izquierda:** mantén presionada la tecla **`A`** o la **`Flecha Izquierda (←)`**.
- **Mover a la derecha:** mantén presionada la tecla **`D`** o la **`Flecha Derecha (→)`**.
- **Detenerse:** suelta la tecla direccional; EDI aplicará desaceleración suave hasta quedar en postura de espera (`idle`) mirando hacia la última dirección recorrida.
- **Velocidad al caminar:** `230 px/s`.

---

### Paso 3: Correr (Sprint)
1. Mantén presionada la dirección (**`A`/`D`** o **`←`/`→`**).
2. Sin soltar la dirección, mantén presionado **`Shift Izquierdo`** o **`Shift Derecho`**.
3. EDI cambiará automáticamente a la animación de carrera (`player_run`) y aumentará su velocidad máxima a **`345 px/s`**.

---

### Paso 4: Saltar (Salto corto y salto alto)
- **Teclas de salto:** **`W`**, **`Barra Espaciadora (ESPACIO)`** o **`Flecha Arriba (↑)`**.
- **Salto alto (máximo alcance):** mantén presionada la tecla de salto durante el ascenso (`jumpForce = -730 px/s`).
- **Salto corto controlado:** da un toque rápido a la tecla de salto y suéltala enseguida; el motor reduce la velocidad vertical ascendente (`vy *= 0.62`) para aterrizar antes con precisión.
- **Asistencias de control incluidas:**
  - *Coyote Time (`0.11 s`):* te permite saltar una fracción de segundo después de salir del borde de una plataforma.
  - *Jump Buffer (`0.11 s`):* si pulsas salto justo antes de tocar el suelo, EDI saltará automáticamente al aterrizar.

---

### Paso 5: Agacharse y cubrirse
1. Estando sobre suelo firme (fuera de una escalera), mantén presionada **`S`** o **`Flecha Abajo (↓)`**.
2. EDI adoptará postura baja (`crouch`):
   - Su caja de daño (*hurtbox*) se reduce verticalmente en `36 px` para esquivar proyectiles altos.
   - Puede desplazarse sigilosamente agachado a `98 px/s` y disparar desde una altura más baja.

---

### Paso 6: Rodar / Esquivar ataques (Voltereta táctica)
1. Estando en el suelo, pulsa **`C`** o **`Ctrl Izquierdo`** (opcionalmente manteniendo **`A`** o **`D`** para elegir dirección).
2. EDI ejecutará una voltereta rápida (`0.36 s`) a **`410–425 px/s`**.
3. **Ventaja clave:** otorga **`0.34 s` de invulnerabilidad** para atravesar o esquivar zombis sin recibir daño (enfriamiento de `0.80 s` entre volteretas).

---

### Paso 7: Subir y bajar escaleras / Empujar cajas (Escenarios urbanos)
- **Escaleras verticales:**
  1. Acércate a una escalera y mantén **`W` / `↑`** para subir o **`S` / `↓`** para bajar (`195 px/s`).
  2. Pulsa **`ESPACIO`** en mitad de la escalera si deseas soltarte saltando.
- **Cajas móviles:**
  1. Camina directamente contra el lateral de una caja empujable.
  2. EDI cambiará a la animación de empuje (`push`) y desplazará la caja a `122 px/s` para usarla como escalón o cobertura.

---

### Paso 8: Acciones de combate mientras te mueves
| Acción | Tecla por defecto | Descripción |
|---|---|---|
| **Atacar / Disparar** | **`F`** o **Clic izquierdo** | Dispara el arma equipada o golpea cuerpo a cuerpo en la dirección en que mira EDI |
| **Recargar arma** | **`R`** | Recarga el cargador usando la reserva de munición |
| **Cambiar de arma** | **`1`**, **`2`**, **`3`** o **`Q`** | Alterna entre las armas equipadas en la mochila |
| **Usar botiquín** | **`H`** | Recupera hasta `+55` puntos de salud instantáneamente |
| **Interactuar** | **`E`** | Recoge/entrega paquetes u objetivos del nivel |
| **Inventario / Pausa** | **`I`** / **`ESC`** | Abre la mochila táctica o pausa la partida |

---

### Paso 9: Cómo cambiar las teclas de movimiento
1. En el **Menú Principal** (o menú de pausa), abre **`OPCIONES`**.
2. Desplázate hasta la sección **Controles**.
3. Haz clic sobre el botón de la acción que quieras cambiar (por ejemplo, *Mover a la izquierda*, *Mover a la derecha* o *Saltar*).
4. Pulsa la nueva tecla deseada (o **`ESC`** para cancelar). El cambio se guarda automáticamente en `localStorage`.

---

## Parte 2: Paso a paso técnico en el código (Desarrollador)

Si deseas entender o modificar cómo se programa el movimiento de EDI por dentro, el motor ejecuta **6 etapas en cada fotograma (`dt`)**:

```text
Teclado/Ratón ──► InputManager.js ──► GameEngine.js (loop dt)
                                            │
                                            ▼
SpriteAtlas.js ◄── Camera2D.js ◄── Player.update(dt) + Physics2D + CollisionSystem
```

### Etapa 1: Captura de entrada (`js/core/InputManager.js`)
- Escucha los eventos `keydown` y `keyup` de `window`.
- Registra las teclas mantenidas en `this.keysDown` y las recién pulsadas en ese fotograma en `this.keysJustPressed`.
- Consulta el mapa de controles guardado en `SaveSystem.getControls()` mediante:
  - `input.isActionDown('moveLeft')` / `input.isActionDown('moveRight')`
  - `input.isActionJustPressed('jump')`

### Etapa 2: Cálculo de dirección y aceleración horizontal (`js/entities/Player.js`, líneas ~182–241)
En `Player.update(dt, ...)`:
1. Se calcula `moveDir` (`-1` izquierda, `0` quieto, `+1` derecha).
2. Se determina la velocidad objetivo (`targetTopSpeed`):
   - Agachado: `this.crouchSpeed` (`98`)
   - Corriendo con `Shift`: `this.runSpeed` (`345`)
   - Caminando normal: `this.walkSpeed` (`230`)
3. En lugar de cambiar `vx` de golpe, se interpola con `Physics2D.approach(this.vx, moveDir * targetTopSpeed, activeAccel * dt)` para lograr arranque progresivo (`accel = 3100`), giro reactivo (`4600`) y frenado firme (`decel = 4200`).

### Etapa 3: Salto y gravedad (`js/entities/Player.js`, líneas ~260–287 y `js/core/Physics2D.js`)
1. Si `onGround` es `true`, recarga `coyoteTimer = 0.11`.
2. Si se pulsa `jump`, activa `jumpBufferTimer = 0.11`.
3. Si ambos temporizadores son `> 0`, aplica `this.vy = this.jumpForce` (`-730`) y despega del suelo.
4. `Physics2D.applyGravity(this, dt)` suma la gravedad (`1650 px/s²` al subir y `1650 * 1.52` al caer para dar sensación de peso real, con límite terminal de `1080 px/s`).

### Etapa 4: Movimiento e intersección con el escenario (`_moveAndCollide`, líneas ~445–577)
1. **Eje X:** suma `this.x += this.vx * dt`, limita a los bordes del escenario (`16` hasta `worldWidth - 16 - this.width`) y resuelve colisiones AABB laterales contra plataformas sólidas y cajas móviles.
2. **Eje Y:** suma `this.y += this.vy * dt` y comprueba si los pies (`prevBottom`) aterrizan sobre el suelo (`GROUND_Y = 620` en Nivel 01) o sobre plataformas de un solo sentido (`oneWay: true`), fijando `this.y = plat.y - this.height`, `this.vy = 0` y `this.onGround = true`.

### Etapa 5: Selección de animación y renderizado simétrico (`_updateAnimationState` y `render`)
1. `_updateAnimationState(isSprinting)` asigna `this.animState` por prioridad:
   `dead` → `stun` → `hurt` → `roll` → `attack` → `climb` → `jump` → `fall` → `crouch` → `push` → `run` → `walk` → `idle`.
2. `stridePhase` avanza en proporción directa a `Math.abs(this.vx) * dt`, evitando que los pies patinen sobre el asfalto.
3. `SpriteAtlas.drawSpriteBottom(...)` dibuja el fotograma correspondiente de `assets/sprites/delivery_sprite_hd.png` usando las alturas de referencia de `js/core/DeliveryMeta.js` para mantener tamaño simétrico en todos los movimientos, invirtiendo horizontalmente (`flipX`) cuando `this.facing < 0`.

### Etapa 6: Seguimiento de cámara (`js/core/Camera2D.js`)
- En cada escena (`Level01.js` / `Level02.js`), `this.camera.follow(this.player, dt)` desplaza suavemente la vista horizontal dentro de `[0, worldWidth - 1280]` siguiendo la posición de EDI.

---

## Tabla rápida para ajustar la física de EDI

Si quieres que EDI se mueva más rápido, salte más alto o acelere distinto, edita estos valores en el constructor de `js/entities/Player.js` (líneas `25–35`):

| Propiedad en `Player.js` | Valor actual | Qué modifica |
|---|---|---|
| `this.walkSpeed` | `230` | Velocidad al caminar con `A` / `D` |
| `this.runSpeed` | `345` | Velocidad al correr manteniendo `Shift` |
| `this.crouchSpeed` | `98` | Velocidad caminando agachado con `S` |
| `this.climbSpeed` | `195` | Velocidad al subir/bajar escaleras |
| `this.pushSpeed` | `122` | Velocidad al empujar cajas |
| `this.accel` | `3100` | Rapidez con la que alcanza la velocidad máxima |
| `this.decel` | `4200` | Rapidez con la que frena al soltar la tecla |
| `this.jumpForce` | `-730` | Fuerza del salto (más negativo = salta más alto) |
| `this.fallGravityMult` | `1.52` | Peso de caída tras alcanzar la cima del salto |
