# Portada principal (menú)

**Imagen:** `assets/backgrounds/menu_cover_hd.jpg` (1671 × 941 px, JPEG de alta calidad)
**Escena:** `js/scenes/MainMenu.js`
**Estilos:** `css/menu.css`
**Canvas:** `#game-canvas` (1280 × 720 lógicos)

---

## 1. Qué se hizo

- La ilustración del repartidor en moto con el título **LAST DELIVERY ZOMBIE** ya incorporado sustituye a la portada anterior.
- El logotipo SVG del menú (`.brand-header`) se oculta, porque el título ya está impreso en la imagen y duplicarlo tapaba la ilustración.
- El panel del menú (credencial + botones) se movió al **lateral izquierdo**, sobre un fondo de cristal oscuro, para no tapar al protagonista, el título ni la horda de zombis de la derecha.
- Se conservan los efectos atmosféricos: deriva de cámara, destello lejano de tormenta, luces azul/rojo de la patrulla, resplandor lunar, faro de la moto, lluvia, niebla y viñeta.

---

## 2. Encuadre de la imagen

En `MainMenu.render()` la portada se dibuja con encuadre tipo *cover*: se escala lo justo para llenar el canvas y se recorta el sobrante, manteniendo la proporción de la imagen.

```js
const scale = Math.max((w + 28) / srcW, (h + 16) / srcH);
const drawW = srcW * scale;
const drawH = srcH * scale;
const drawX = (w - drawW) * 0.5 + driftX;
const drawY = (h - drawH) * 0.5 + driftY;
ctx.drawImage(coverImg, drawX, drawY, drawW, drawH);
```

- `+28` y `+16` son el margen extra para que la deriva de cámara (`±8 px` horizontal, `±4 px` vertical) nunca descubra los bordes.
- Al ser *cover*, cualquier imagen con otra proporción se recorta por los lados o por arriba/abajo en lugar de deformarse.

### Cambiar la portada en el futuro

1. Guarda la nueva imagen como `assets/backgrounds/menu_cover_hd.jpg` (misma ruta y nombre).
2. Mantén una proporción cercana a 16:9 para que el recorte sea mínimo.
3. No hace falta tocar código: `js/main.js` ya precarga la clave `menu_cover`.

Si cambias el nombre o la extensión, actualiza esta línea en `js/main.js`:

```js
{ key: 'menu_cover', type: 'image', src: 'assets/backgrounds/menu_cover_hd.jpg' },
```

---

## 3. Distribución del menú

```css
#main-menu-overlay {
    align-items: flex-start;
    justify-content: center;
    padding-left: 30px;
}

.brand-header { display: none; }

.menu-center-stack {
    width: 340px;
    padding: 11px;
    background: linear-gradient(180deg, rgba(8, 12, 20, 0.86), rgba(6, 9, 15, 0.82));
    border: 1px solid rgba(112, 141, 178, 0.28);
    border-left: 3px solid rgba(224, 30, 43, 0.88);
    backdrop-filter: blur(3px);
}
```

- El panel ocupa la franja izquierda y deja libre el centro (protagonista y linterna) y la derecha (zombis).
- El canal alfa del fondo es alto para garantizar la legibilidad de la credencial y los botones sobre cualquier zona de la ilustración.
- En el canvas se añade un degradado lateral izquierdo (`menuShade`) que oscurece esa franja y otro inferior (`bottomShade`) para que el pie de versión se lea.

### Si quieres recuperar el logotipo SVG

Elimina o cambia `display: none` en `.brand-header`. Ten en cuenta que volverá a duplicar el título de la imagen y a ocupar la parte superior central.

---

## 4. Archivos implicados

| Archivo | Cambio |
|---|---|
| `assets/backgrounds/menu_cover_hd.jpg` | Nueva ilustración de portada |
| `js/scenes/MainMenu.js` | Encuadre *cover*, luces adaptadas y sombreados laterales |
| `css/menu.css` | Panel a la izquierda, logotipo SVG oculto y fondo de cristal |

---

## 5. Verificación realizada

- La portada carga sin errores (`menu_cover_hd.jpg`, 200 OK).
- El título de la imagen se ve completo y no aparece duplicado por el SVG.
- El protagonista, la linterna y los zombis permanecen visibles; el panel solo cubre la franja izquierda.
- `INICIAR JUEGO`, `CÓMO JUGAR` y `OPCIONES` siguen funcionando (se abrieron y cerraron sus modales).
- La partida arranca correctamente hasta el HUD del Nivel 01, sin errores en consola.
- La deriva de cámara no descubre los bordes gracias al margen extra del encuadre.
