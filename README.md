# Ludo Matemático · Colegio San Pío X · 5.º B

Versión online basada en el HTML original de 5.º B.

## Incluye
- Juego multijugador con Socket.IO (2 a 4 jugadores).
- Las preguntas del archivo original de 5.º B se conservan en `questions.json`.
- Las imágenes incrustadas de las preguntas se conservan en Base64.
- Administrador de preguntas con contraseña `1234` por defecto.
- Sincronización de preguntas entre jugadores mediante el servidor.
- Preparado para GitHub + Render.

## Render
1. Sube este proyecto a GitHub.
2. Crea un Web Service en Render.
3. Build: `npm install`
4. Start: `npm start`
5. Variable opcional: `ADMIN_PASSWORD`.

### Importante
Render Free no garantiza persistencia de archivos locales durante reinicios/redeploys. Para conservar cambios del administrador de forma permanente conviene añadir una base de datos posteriormente.
