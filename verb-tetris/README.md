# 🟦 Verb Tetris: Misiones Cotidianas

Un videojuego educativo en HTML5 que combina la mecánica clásica del **Tetris**
con la práctica de **conjugación verbal en español (nivel A1)** para estudiantes
rusos. Todo el juego usa **HTML5, CSS3 y JavaScript vanilla (ES6+ con módulos
ES)** — sin librerías ni frameworks externos.

---

## 🚀 Cómo ejecutarlo

Los módulos ES requieren servirse a través de HTTP (no funcionan con `file://`).
Recomendado: un servidor local (por ejemplo, la extensión **Live Server** de
VS Code), o desde una terminal dentro de la carpeta del juego:

```bash
# Opción 1: Python
python3 -m http.server 8080
# Abre: http://localhost:8080

# Opción 2: Node
npx serve .
```

Luego abre `http://localhost:8080` (o `http://localhost:8080/index.html`).

---

## 🎮 Cómo se juega

1. Aparece una **frase en español con un hueco** (`____`) y **una columna
   dorada** resaltada en el tablero.
2. Deja caer la pieza (cuyas celdas contienen verbos conjugados) de modo que la
   **celda con el verbo correcto** aterrice en la **columna dorada**.
3. Si aciertas, **toda la fila se elimina** (¡combo por apilamiento!), ganas
   monedas y aparece una nueva frase.
4. Si colocas un verbo incorrecto en la columna dorada, **pierdes una vida**, la
   pantalla tiembla y verás la **pista/traducción en ruso**.
5. Las piezas que caen en otras columnas simplemente se apilan: añaden presión
   estratégica.

### Controles

| Tecla                | Acción                     |
| -------------------- | -------------------------- |
| `←` / `→`            | Mover la pieza             |
| `↑` (o `X`)          | Rotar la pieza             |
| `↓`                  | Bajar más rápido (soft)    |
| `ESPACIO`            | Soltar la pieza (hard drop)|
| `ESC`                | Pausa / cerrar ventana     |
| `M`                  | Silenciar / activar sonido |
| Clic en el tablero   | Eliminador de errores (si está activo) |

---

## 🗺️ Las 6 misiones

1. 🛒 **En el supermercado**
2. 🍽️ **En el restaurante**
3. 🏨 **En el hotel**
4. 💊 **En la farmacia**
5. 🗺️ **Pidiendo direcciones**
6. 👕 **De compras (ropa)**

Cada misión tiene **10 frases** con su verbo correcto, 3 distractores, la
columna objetivo y una pista en ruso. Completar una misión da **+50 monedas**,
una estrella y desbloquea la siguiente. El **Mapa de Misiones** muestra el
recorrido (⭐ completada, ▶️ actual, 🔒 bloqueada).

---

## 🪙 Progresión, monedas y tienda

- **+10 monedas** por fila eliminada · **+25 de bono** por eliminar 2 a la vez.
- **3 vidas** por partida (mejora: hasta 5 corazones).
- **Experiencia:** cada acierto suma 1 XP; cada 10 XP subes de nivel, lo que
  acelera la caída y multiplica las monedas (x1, x1.2, x1.4…).
- **Tienda (accesible desde el menú o la pausa):**
  1. ❤️ **Corazón Extra** (50) — +1 vida al inicio (máx. 5).
  2. 💡 **Pista Visual** (30) — ilumina la pieza correcta en dorado 15 s.
  3. 🧹 **Eliminador de Errores** (40) — haz clic en un bloque para borrarlo.
  4. 🚀 **Multiplicador Permanente** (100) — duplica las monedas para siempre.
- Al completar ciertas misiones se desbloquean recompensas automáticas: **temas
  de colores** (Retro, Fiesta, Neón Rey) y el **Modo Zen** (caída más lenta).

Todo el progreso (monedas, mejoras, nivel, misiones completadas, tema activo)
se guarda automáticamente en el **`localStorage`**.

---

## 📁 Estructura de archivos (módulos ES)

```
verb-tetris/
├── index.html            # Punto de entrada (HUD, modales, enlaces a CSS/JS)
├── styles.css            # Estilos, animaciones y diseño responsive
└── src/
    ├── main.js           # Inicializa el juego, el bucle de animación y conecta todo
    ├── config/
    │   └── phrases.js    # Banco de 60 frases organizado por las 6 misiones
    ├── game/
    │   ├── board.js      # Tablero (matriz, colisiones, eliminación de filas)
    │   └── pieces.js     # Piezas (formas, rotación, asignación de verbos, temas)
    ├── ui/
    │   ├── renderer.js   # Dibujo en el <canvas> (grid, piezas, animaciones, columna)
    │   └── interface.js  # Interfaz HTML (HUD, modales de tienda/mapa, toasts)
    └── system/
        ├── state.js      # Estado global + persistencia en localStorage
        ├── progression.js# Progresión por misiones (avanzar, completar, desbloquear)
        └── sound.js      # Efectos de sonido con Web Audio API
```

> El tablero, las piezas, la cuadrícula y las animaciones se dibujan **solo en
> el `<canvas>`**; el HUD, los botones y las ventanas modales usan **HTML/CSS**.
