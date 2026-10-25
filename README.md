# 🎮 NEXUS ARENA 3D — Juego de Disparos 3D en Primera Persona

[![Jugar en Vivo - GitHub Pages](https://img.shields.io/badge/%F0%9F%8E%AE_JUGAR_EN_VIVO-GitHub_Pages-00f0ff?style=for-the-badge&logo=github&logoColor=black)](https://jotechno.github.io/3d-shooter-game/)
[![Repositorio GitHub](https://img.shields.io/badge/GitHub-3d--shooter--game-181717?style=for-the-badge&logo=github)](https://github.com/Jotechno/3d-shooter-game)

**NEXUS ARENA 3D** es un juego de disparos en primera persona (FPS) en 3D para navegador donde te enfrentas en una arena cibernética estilo neón contra **NEXUS-9**, un droide táctico controlado por Inteligencia Artificial.

🌐 **Sitio Web en Vivo (GitHub Pages):** [**https://jotechno.github.io/3d-shooter-game/**](https://jotechno.github.io/3d-shooter-game/)

---

## ✨ Características Principales

- **Entorno 3D en Primera Persona**: Arena futurista renderizada en tiempo real con iluminación dinámica, texturas procedurales, cúpula estelar, 12 pilares de cobertura con colisiones suaves y estaciones de potenciadores (botiquines de salud y núcleos de sobrecarga).
- **Oponente IA con Máquina de Estados Táctica (`NEXUS-9`)**:
  - **Combate Táctico (*Strafe*)**: Mantiene la distancia óptima mientras se desplaza lateralmente y dispara ráfagas de plasma con predicción de movimiento.
  - **Flanqueo**: Rodea obstáculos cuando pierde la línea de visión con el jugador.
  - **Maniobra Evasiva**: Ejecuta impulsos laterales rápidos cuando recibe fuego concentrado.
  - **Búsqueda de Cobertura**: Se repliega detrás de los pilares cuando su escudo colapsa.
  - **3 Niveles de Dificultad**: *Recluta (Fácil)*, *Veterano (Normal)* y *Élite Cyber (Difícil)*.
- **Arsenal de 3 Armas Energéticas**:
  1. **Rifle de Pulso NX-1**: Alta cadencia de fuego y consumo equilibrado.
  2. **Cañón de Riel VORTEX**: Disparo de hiper-velocidad y alto daño perforante.
  3. **Dispersor TRIPLE-X**: Disparo triple en abanico ideal para combate a corta y media distancia.
- **Banda Sonora Synthwave y Efectos Procedurales**: Secuenciador musical estilo *Synthwave / Outrun* a 124 BPM y efectos de sonido generados 100% en tiempo real mediante **Web Audio API** (sin archivos de audio externos).
- **HUD Táctico Completo**: Radar 2D en tiempo real con cono de visión, indicadores de salud y escudo, *hitmarkers*, indicador de teclas en vivo y registro de eventos de combate.

---

## 🕹️ Controles del Juego

| Tecla | Acción |
| :--- | :--- |
| **`Flecha Arriba (↑)`** / **`W`** | Avanzar hacia adelante |
| **`Flecha Abajo (↓)`** / **`S`** | Retroceder |
| **`Flecha Izquierda (←)`** / **`Flecha Derecha (→)`** | Girar la vista del personaje a la izquierda / derecha |
| **`Barra Espaciadora (ESPACIO)`** | Disparar el arma equipada (pulsar o mantener presionado) |
| **`A` / `D`** o **`Q` / `E`** | Desplazamiento lateral (*Strafe*) |
| **`1` / `2` / `3`** | Cambiar entre *Rifle de Pulso*, *Cañón de Riel* y *Dispersor* |
| **`SHIFT`** | Impulso táctico evasivo (*Dash*) |
| **`ENTER`** | Iniciar partida desde la pantalla principal |
| **`R`** | Reiniciar partida rápidamente |

---

## 🛠️ Tecnologías Empleadas

- **HTML5**: Estructura semántica del sitio web, HUD interactivo y modales de configuración.
- **CSS3**: Diseño *Cyberpunk / Neon Sci-Fi*, animaciones de interfaz, efectos de pantalla (daño, curación, sobrecarga) y diseño responsivo.
- **Canvas 2D & WebGL (Three.js)**: Renderizado 3D en primera persona, generación procedural de texturas en `<canvas>` y radar táctico 2D en tiempo real.
- **JavaScript Vanilla (ES6+)**: Lógica de física y colisiones circulares/AABB, máquina de estados de la IA, sistema de partículas y bucle de juego.
- **Web Audio API**: Síntesis de sonido procedural y secuenciador musical *Synthwave* multipista en tiempo real.

---

## 📂 Estructura del Proyecto

```text
.
├── index.html       # Página principal, interfaz HUD y menús del juego
├── styles.css       # Estilos visuales cyberpunk, animaciones y HUD
├── game.js          # Controlador principal del juego, física, controles y radar 2D
├── arena.js         # Escenario 3D, texturas procedurales, colisiones y potenciadores
├── ai.js            # Modelo 3D y máquina de estados táctica del oponente IA (NEXUS-9)
├── weapons.js       # Armas 3D en primera persona, proyectiles y partículas
├── audio.js         # Sintetizador de efectos y secuenciador musical Synthwave
└── lib/
    └── three.min.js # Motor WebGL Three.js local
```

---

## 🚀 Ejecución Local

Puedes abrir el archivo `index.html` directamente en cualquier navegador moderno o servirlo con un servidor estático local:

```bash
python -m http.server 8080
```

Luego visita `http://localhost:8080` en tu navegador.
