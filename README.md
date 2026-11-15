# LAST DELIVERY ZOMBIE

Videojuego 2D **Survival Horror** de plataformas desarrollado íntegramente con tecnologías web nativas (**HTML5, Canvas 2D, CSS3, JavaScript Vanilla ES6+ y Web Audio API**), sin frameworks ni dependencias externas.

## Ejecución Local

Dado que el proyecto utiliza **ES Modules (`type="module"`)**, debe abrirse mediante cualquier servidor HTTP estático local:

### Opción 1: Servidor estático incluido (Node.js nativo, 0 dependencias)
```bash
node server.mjs
```
Luego abre `http://localhost:8080` en el navegador.

### Opción 2: Extensión Live Server (VS Code)
Haz clic derecho sobre `index.html` y selecciona **"Open with Live Server"**.

### Opción 3: Python 3
```bash
python -m http.server 8080
```

## Estado Actual del Desarrollo
- **Fase 1 (Fundación):** Completada y verificada.
- **Fase 2 (Interfaz e Introducción Narrativa):** Completada y verificada.
- **Fase 3 (Jugabilidad):** Personaje controlable con 8 estados de animación, saltos, gravedad, colisiones AABB y cámara 2D dinámica.
- **Fase 4 (Primer Nivel — *Primera Entrega*):** Escenario nocturno completo, recogida y entrega de paquete (`E`), zombis normales/rápidos/especiales, combate cuerpo a cuerpo y a distancia, Jefe Final (*El Demoledor de Cuarentena*), HUD, pausa, inventario, derrota y pantalla de resultados.
- **Fase 5 (Progresión y Tienda):** Sistema económico dual (Puntos y Dinero) y Tienda funcional desbloqueada al completar el Nivel 01.
