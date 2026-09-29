# Ludo Matemático — Colegio San Pío X · 5.º B INGENIERÍA

Juego de Ludo matemático en red con Node.js, Express y Socket.IO.

## Administración

La administración de problemas está protegida por contraseña: `1234`.

El editor de ecuaciones usa un campo matemático visual basado en MathLive, con apariencia de editor de ecuaciones tipo Word. El usuario no necesita escribir ni ver código LaTeX: las expresiones se guardan internamente en formato matemático y se muestran visualmente en el juego.

Herramientas incluidas: fracciones, potencias, raíces, raíces n-ésimas, paréntesis, π, seno, coseno, tangente, matriz 2×2, sumatoria e integral.

## Estructura

- `public/index.html` — interfaz y juego.
- `data/questions.json` — banco de preguntas.
- `server.js` — servidor Express + Socket.IO.
- `package.json` — dependencias.
- `render.yaml` — configuración de Render.

## Nota

MathLive se carga desde CDN en el navegador para proporcionar la edición matemática visual. El formato LaTeX se usa solamente como representación interna, no como interfaz del usuario.
