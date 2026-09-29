# Ludo Matemático San Pío X — Online + PostgreSQL

Versión preparada para Render + PostgreSQL.

## Archivos

- `server.js` — servidor Node/Express/Socket.IO y persistencia PostgreSQL.
- `public/index.html` — juego y administrador.
- `package.json` — incluye `pg` para PostgreSQL.
- `render.yaml` — configura `DATABASE_URL` desde `ludo-5b-ingenieria-db`.
- `data/questions.json` — copia local/semilla; en Render PostgreSQL es la fuente persistente.

## Persistencia

El servidor crea la tabla `ludo_questions` automáticamente.

- Si la fila 1 ya existe, carga las preguntas desde PostgreSQL.
- Si no existe, copia `data/questions.json` a PostgreSQL una sola vez.
- El botón **Guardar cambios** del administrador usa `PUT /api/admin/questions` y guarda primero en PostgreSQL.
- Si PostgreSQL no está disponible, el servidor no inicia para evitar aparentar que los cambios se guardaron cuando no fue así.

## Render

Servicio web: `ludo-san-pio-x-5to-b-ingenieria`
Base de datos: `ludo-5b-ingenieria-db`

La variable necesaria es:

`DATABASE_URL`

Debe apuntar a la Internal Database URL de la base de datos de Render. Si se usa `render.yaml`, Render puede enlazarla mediante `fromDatabase`.

## Prueba después del deploy

1. Abrir el Ludo.
2. Entrar al administrador con la contraseña configurada en el servidor.
3. Cambiar una pregunta.
4. Pulsar **Guardar cambios**.
5. Debe aparecer `✓ Cambios guardados en PostgreSQL`.
6. Recargar la página.
7. Entrar nuevamente al administrador y comprobar el cambio.
8. Como prueba final, reiniciar/redeployar el servicio y comprobar que el cambio continúa.

No se deben borrar las tablas de PostgreSQL ni crear otra base de datos.
