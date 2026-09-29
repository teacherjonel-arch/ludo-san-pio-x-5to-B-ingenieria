# Ludo Matemático — Colegio San Pío X · 5.º B INGENIERÍA

Juego de Ludo matemático en red con Node.js, Express y Socket.IO.

## Estructura de preguntas
- Álgebra: 6 casillas blancas → 1 pregunta por casilla.
- Aritmética: 6 casillas blancas → 1 pregunta por casilla.
- Geometría: 6 casillas blancas → 1 pregunta por casilla.
- Trigonometría: 6 casillas blancas → 1 pregunta por casilla.
- Habilidad Matemática: 4 preguntas independientes.

Las expresiones matemáticas se muestran con notación matemática renderizada.

## Ejecutar
```bash
npm install
npm start
```


## Administrador
El administrador está protegido por contraseña. Contraseña inicial: `1234`. Las preguntas se pueden editar desde el navegador; el editor matemático usa formato visual y guarda las fórmulas en LaTeX para renderizarlas con MathJax.


## Edición online

El administrador permite seleccionar Álgebra, Aritmética, Geometría, Trigonometría y Habilidad Matemática. Cada casilla muestra una vista previa en tiempo real de la pregunta y sus alternativas. El editor de ecuaciones permite insertar y modificar fórmulas visualmente y guardarlas como LaTeX para MathJax.


## Editor de ecuaciones v8
Los botones del editor usan MathLive executeCommand/insert con fallback a setValue para asegurar que herramientas como sin, cos, tan, fracciones, raíces y matrices se inserten incluso si el comando programático no devuelve un cambio.


### Editor de ecuaciones
El administrador incluye un editor robusto que no depende de que MathLive cargue desde un CDN. Las herramientas insertan expresiones LaTeX directamente en el campo y MathJax muestra una vista previa visual. Se pueden editar ecuaciones existentes, agregar nuevas ecuaciones y modificar alternativas.


### Editor de ecuaciones visual
La administración incluye un editor matemático visual propio: fracciones, potencias, raíces, trigonometría, matrices, sumatorias e integrales se editan directamente en pantalla sin mostrar código LaTeX. El formato LaTeX se usa únicamente como representación interna al guardar.
