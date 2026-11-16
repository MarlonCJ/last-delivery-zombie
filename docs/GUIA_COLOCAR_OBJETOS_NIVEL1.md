# Guía: cómo colocar objetos en el Nivel 1

**Juego:** Last Delivery Zombie
**Archivo a editar:** `js/scenes/Level01.js` → método `_buildWorldGeometry()` (líneas ~309–470)
**Base de referencia:** commit `c3d898b`

---

## 0. Aviso previo: la hoja nueva de objetos no está instalada

Actualmente **no** existen en el proyecto:

- `assets/sprites/objetos_actualizados_hd.png`
- `js/core/ObjetosMeta.js`

`SpriteAtlas` solo resuelve sprites en el orden `delivery → base → ext`. Por lo tanto, si colocas claves pertenecientes a la hoja nueva (`prop_cable_spool`, `prop_camera`, `prop_ac_unit`, etc.), **no se dibujarán**: no hay error en consola, simplemente no aparecen.

Para colocar objetos **hoy**, usa únicamente las claves del catálogo (sección 9).

---

## 1. Dónde se colocan los objetos

Todo está en un único método:

```
js/scenes/Level01.js
  └── _buildWorldGeometry()   // líneas ~309–470
```

Dentro de ese método hay listas independientes. No hace falta tocar el código de render: los renderizadores ya leen estas listas.

| Lista | Línea aprox. | ¿Colisiona? | Para qué sirve |
|---|---|---|---|
| `this.platforms` | 311 | Sí (sólido / pisable) | Suelo, andamios, barreras, cajas fijas, vehículos |
| `this.movableCrates` | 350 | Sí (empujable) | Cajas que el jugador puede mover |
| `this.ladders` | 361 | Sí (escalable) | Escaleras verticales |
| `this.checkpoints` | 378 | No | Puntos de guardado |
| `this.sectorSigns` | 384 | No | Letreros de sector |
| `this.destructibles` | 392 | Sí (disparables) | Cajas de madera, barriles, coches calcinados |
| `this.hazards` | 414 | Sí (daño) | Trampas de púas |
| `this.scenicProps` | 425 | No | Decoración urbana |
| `this.streetLamps` | 446 | No | Farolas (solo posiciones X) |
| `this.pickups` | 452 | Sí (recogible) | Botiquines, munición, dinero, puntos |

---

## 2. Sistema de coordenadas

| Concepto | Valor |
|---|---|
| Ancho del mundo | `0` a `10400` en X |
| Altura del mundo | `720` |
| Nivel del suelo | `GROUND_Y = 590` |
| Conversión a pantalla | `pantalla = mundo − cámara` (lo hace el motor) |

### Regla de oro

En todas las listas, la `y` es la **esquina superior** del objeto. Se calcula desde el suelo hacia arriba:

```js
y: GROUND_Y - altura
```

Ejemplo: un objeto de 88 px de alto → `y: GROUND_Y - 88`.

Si pones `y: GROUND_Y`, el objeto queda enterrado y solo se ve la punta. Si pones una `y` demasiado alta, queda flotando en el aire.

---

## 3. Colocar un objeto DECORATIVO (sin colisión)

**Dónde:** `this.scenicProps` (línea ~425)
**Formato:** `{ x, y, w, h, sprite }`
**Opcional:** `sparks: true` (chispazo eléctrico, solo tiene sentido con `prop_electric_box`)

### Ejemplo: contenedor en x = 2600

Paso 1 — elige el sprite del catálogo. Para este ejemplo: `prop_dumpster`.
Paso 2 — define el tamaño. `prop_dumpster` se usa a 108×76.
Paso 3 — añade la línea dentro del array:

```js
{ x: 2600, y: GROUND_Y - 76, w: 108, h: 76, sprite: 'prop_dumpster' },
```

Paso 4 — guarda y recarga el juego. El contenedor aparece apoyado en el suelo en esa X.

> Los decorativos **no bloquean** al jugador, a los zombis ni a las balas. Se dibujan detrás de plataformas, destructibles, pickups y personajes.

---

## 4. Colocar un objeto SÓLIDO o PISABLE

**Dónde:** `this.platforms` (línea ~311)
**Formato:** `{ x, y, width, height, kind, oneWay, drawH? }`

### ⚠️ Solo se dibujan estos `kind`

```
barrier_concrete
barrier_red
metal_crate
scaffold
veh_ambulance
veh_police
veh_taxi
veh_truck
```

Si usas un `kind` distinto, **creas una pared invisible** (colisiona pero no se dibuja). Para un `kind` nuevo hay que añadir una rama en `_renderPlatformsAndDestructibles()` (línea ~1416).

### Ejemplo A — andamio (se puede subir)

```js
{ x: 6900, y: GROUND_Y - 150, width: 280, height: 18, drawH: 150, kind: 'scaffold', oneWay: true },
```

- `y` = superficie donde se para el jugador.
- `height: 18` = grosor de la plataforma de colisión.
- `drawH: 150` = altura visual del sprite (se dibuja de `y − 4` hacia abajo).
- `oneWay: true` = se puede atravesar desde abajo y aterrizar encima.

**Si añades un andamio, añade también su escalera** en `this.ladders`, o será inalcanzable:

```js
{ x: 6915, y: GROUND_Y - 150, width: 38, height: 150 },
```

### Ejemplo B — caja sólida (bloquea el paso)

```js
{ x: 7290, y: GROUND_Y - 64, width: 72, height: 64, kind: 'metal_crate', oneWay: false },
```

### Ejemplo C — vehículo pisable

```js
{ x: 7360, y: GROUND_Y - 98, width: 232, height: 18, drawH: 102, kind: 'veh_ambulance', oneWay: true },
```

**Detalle importante de los vehículos:** el sprite se dibuja **desde el suelo** y crece hacia arriba `drawH` píxeles, mientras que la colisión (la superficie donde se para el jugador) está en `y`.

Por eso `y` debe coincidir con la parte superior del sprite:

```js
y = GROUND_Y - drawH
```

Si subes `drawH` a 148, sube también `y` a `GROUND_Y - 148`. Si no lo haces, el jugador queda flotando dentro del coche.

---

## 5. Colocar un objeto DESTRUIBLE

**Dónde:** `this.destructibles` (línea ~392)
**Formato:** `{ x, y, width, height, kind, hp, loot, destroyed: false }`

### Barril explosivo (46×64)

```js
{ x: 7230, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
```

### Caja de madera con botín (54×52)

```js
{ x: 7300, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false },
```

- `loot`: `'ammo'` o `'money'`.
- `destroyed: false` es **obligatorio**: el motor lo cambia a `true` al romperse. Si lo omites, el objeto nace destruido.

### Coche calcinado (destructible grande)

```js
{ x: 8045, y: GROUND_Y - 72, width: 196, height: 72, kind: 'vehicle_wreck', sprite: 'veh_car', hp: 70, destroyed: false },
```

---

## 6. Colocar un PICKUP

**Dónde:** `this.pickups` (línea ~452)
**Formato:** `{ x, y, width, height, type, taken: false }`

```js
{ x: 7210, y: GROUND_Y - 190, width: 36, height: 32, type: 'medkit', taken: false },
```

- `type`: `'ammo'` | `'medkit'` | `'money'` | `'points'`.
- `taken: false` es **obligatorio** (igual que `destroyed`).
- La `y` es la posición de flotación; el render le suma un vaivén de ±3.5 px.
- Para ponerlo sobre una plataforma: `y = plataforma.y - 40`.
- `width`/`height` ≈ `36×32` en todos los tipos (los de dinero usan `36×30`).

---

## 7. Colocar trampas de púas

**Dónde:** `this.hazards` (línea ~414)
**Formato:** `{ x, y, width, height, damage }`

```js
{ x: 7295, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 },
```

- Mantén `92×26` y `damage: 16` para conservar el equilibrio.
- No las pongas en una ruta obligatoria sin salida: deben poder saltarse.

---

## 8. Colocar letreros de sector

**Dónde:** `this.sectorSigns` (línea ~384)
**Formato:** `{ x, title, sub, sprite, w, h }`

```js
{ x: 9105, title: 'SECTOR 04', sub: 'REFUGIO NORTE', sprite: 'prop_sign_street', w: 54, h: 104 },
```

El letrero se dibuja apoyado en el suelo automáticamente (`GROUND_Y - h`), y el texto aparece encima.

---

## 9. Catálogo de sprites que funcionan hoy

### Decoración (`scenicProps`)

```
prop_fence_wide        prop_fence_bio        prop_fence
prop_hydrant           prop_dumpster         prop_electric_box
prop_trash_bags        prop_bench            prop_tires
prop_wood_barricade    prop_barrel_blue      prop_sign_street
prop_traffic_light     prop_sign_stop        prop_gas_tanks
prop_cone              prop_sawhorse         prop_barrier_bloody
prop_sign_biohazard    prop_bus_stop         prop_pallet_tarp
prop_work_light        prop_generator        prop_console
prop_crates_stack      prop_crate_military   prop_scaffold
prop_metal_stairs      prop_barrier_yellow   prop_rubble
```

### Vehículos

```
veh_car   veh_taxi   veh_ambulance   veh_police   veh_truck
```

### Pickups

```
pickup_ammo   pickup_medkit   pickup_money   pickup_points   pickup_package
```

### Ya usados por el sistema (no los dupliques)

```
prop_ladder      prop_spikes      prop_streetlamp
prop_barrel_red  prop_crate_wood_hd  prop_crate_metal_hd
```

---

## 10. Capas: qué se dibuja delante de qué

Orden real de dibujo dentro de `render()` (líneas ~1028–1033):

```
1. scenicProps                 ← fondo (detrás de todo)
2. checkpoints y letreros
3. estaciones de misión
4. platforms + destructibles    ← delante de la decoración
5. movableCrates
6. pickups
7. enemigos → jugador → combate/VFX
8. iluminación, niebla, lluvia, viñeta
```

**Consecuencia práctica:** si pones una banca decorativa delante de un andamio, la banca se verá **detrás**. Para que un objeto tape a otro, debe ir en una lista posterior.

---

## 11. Reglas para no romper el nivel

1. **No solapar X** con elementos existentes:
   - checkpoints en `3480` y `6850`
   - estaciones de misión
   - escaleras (`ladders`)
   - zonas de patrulla de enemigos (`patrolMinX` / `patrolMaxX`)
   - farolas (`streetLamps`)
2. **No bloquear el paso completo:** deja al menos ~120 px libres para pasar o saltar.
3. **No coloques nada en `x > 9040`** antes de la arena del jefe: ahí se cierra la barrera.
4. **No salgas del mundo:** `x ≥ 0` y `x + ancho ≤ 10400`.
5. **Mantén la proporción:** el jugador mide ~108 px. Referencias: banca 52, contenedor 76, coche 100–150, andamio 150+.
6. **No reutilices** claves reservadas por el sistema (sección 9).

---

## 12. Mapa de sectores (dónde ubicar)

| Sector | Rango X | Tema |
|---|---|---|
| 1 | 0 – 2700 | Avenida Sur / minimarket |
| 2 | 2700 – 5600 | Distrito comercial en llamas |
| 3 | 5600 – 8900 | Cordón militar Biogen |
| 4 | 8900 – 10400 | Refugio Norte / arena del jefe |

Huecos visuales más vacíos hoy: **~3300–4000**, **~5300–5600**, **~6600–6900**, **~8600–8900**.

Posiciones de farolas (referencia para no tapar la luz): `185, 665, 1215, 1785, 2355, 2910, 3490, 4020, 4620, 5180, 5760, 6340, 6880, 7420, 7990, 8560, 9140, 9620, 10040`.

---

## 13. Cómo verificar

1. Levanta el servidor local en la carpeta del proyecto (por ejemplo `http://localhost:8080`).
2. Abre el juego y entra al **Nivel 1**.
3. Pulsa `F12` → pestaña **Console**: debe estar vacía (sin `SyntaxError` ni errores de sprite).
4. Camina hasta la zona nueva y comprueba:
   - el objeto está apoyado en el suelo (no flotando ni enterrado),
   - se ve en la capa correcta respecto a los demás objetos,
   - si es sólido: el jugador choca con él y puede saltar encima,
   - si es destructible: se rompe al dispararle y suelta el botín,
   - si es pickup: se recoge al pasar por encima,
   - ningún enemigo atraviesa la geometría de forma extraña.

### Diagnóstico rápido

| Síntoma | Causa probable |
|---|---|
| No aparece nada | Clave de sprite inexistente (catálogo, sección 9) |
| Aparece enterrado | `y` mal calculada; usa `GROUND_Y - h` |
| Flota en el aire | `y` demasiado alta |
| Pared invisible | `kind` no soportado por el render (sección 4) |
| Nace destruido / recogido | Falta `destroyed: false` o `taken: false` |
| Tapa al jugador | Está en una lista posterior a las entidades (revisa sección 10) |

---

## 14. Plantilla rápida para copiar

```js
// ─── NUEVOS OBJETOS ───────────────────────────────────────────
// Decoración
{ x: 0, y: GROUND_Y - 76, w: 108, h: 76, sprite: 'prop_dumpster' },

// Plataforma pisable (andamio)
{ x: 0, y: GROUND_Y - 150, width: 280, height: 18, drawH: 150, kind: 'scaffold', oneWay: true },
{ x: 0, y: GROUND_Y - 150, width: 38, height: 150 },   // escalera, en this.ladders

// Obstáculo sólido
{ x: 0, y: GROUND_Y - 64, width: 72, height: 64, kind: 'metal_crate', oneWay: false },

// Destructible
{ x: 0, y: GROUND_Y - 64, width: 46, height: 64, kind: 'barrel_red', hp: 30, destroyed: false },
{ x: 0, y: GROUND_Y - 52, width: 54, height: 52, kind: 'crate_wood', hp: 35, loot: 'ammo', destroyed: false },

// Trampa
{ x: 0, y: GROUND_Y - 26, width: 92, height: 26, damage: 16 },

// Pickup
{ x: 0, y: GROUND_Y - 190, width: 36, height: 32, type: 'medkit', taken: false },
```

Cambia solo la `x` (y la `y` si cambias la altura) y tendrás un objeto nuevo sin tocar nada más.

---

## 15. Sobre la hoja nueva de objetos

Para poder colocar los objetos de `objetos actualizados.png` primero hay que **reinstalar la hoja**:

1. Copiarla a `assets/sprites/objetos_actualizados_hd.png`.
2. Limpiar el velo semitransparente del fondo (alfa ≈ 10–30), o se verá una capa lechosa en el juego.
3. Crear `js/core/ObjetosMeta.js` con las coordenadas de cada objeto de la hoja.
4. Añadir la imagen al preload en `js/main.js`.
5. Conectarla en `js/core/SpriteAtlas.js` con prioridad `delivery → objetos → base → ext`.

Hasta completar esos cinco pasos, las claves de la hoja nueva no renderizan.
