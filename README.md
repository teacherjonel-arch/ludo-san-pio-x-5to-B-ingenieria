# Ludo Matemático — Colegio San Pío X · 5.º B INGENIERÍA

Juego de Ludo matemático en red con Node.js, Express, Socket.IO y editor visual de ecuaciones.

## Persistencia online

Las preguntas se guardan en PostgreSQL mediante `DATABASE_URL`. El `render.yaml` incluido define el Web Service y una base PostgreSQL de Render llamada `ludo-5b-ingenieria-db`, y conecta automáticamente `DATABASE_URL` al servicio.

Al pulsar **Guardar cambios**, el servidor:
1. valida las preguntas;
2. actualiza la memoria del servidor;
3. guarda el contenido en PostgreSQL;
4. avisa a todos los clientes conectados con `questionsUpdated`.

Así, los cambios del administrador quedan disponibles para los alumnos y sobreviven a reinicios del servicio mientras la base de datos siga vinculada.

## Administrador

Contraseña: `1234`

El administrador inicia cerrado. La plataforma inicia directamente en **Jugar en red**.

## Editor de ecuaciones

El editor es visual, tipo Word. El usuario no necesita escribir LaTeX: puede editar directamente la fórmula y usar fracciones, potencias, raíces, funciones trigonométricas, matrices, sumatorias e integrales. La representación técnica se guarda internamente como LaTeX para poder mostrarla correctamente.

## Estructura

```text
data/questions.json
public/index.html
package.json
render.yaml
server.js
README.md
```
