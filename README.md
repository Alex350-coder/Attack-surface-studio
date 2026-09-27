# Attack Surface Studio

**Plataforma de grafo de conocimiento para reconocimiento y evaluación de superficie de ataque.**

Orquesta herramientas de seguridad externas (Nmap, ffuf, Nuclei), normaliza su salida heterogénea
a un único modelo de grafo, y convierte la evidencia acumulada de un diagnóstico —escaneos,
hallazgos manuales, capturas, notas, reportes— en un cuerpo de conocimiento navegable y consultable.

> El grafo de conocimiento es el producto. Las herramientas de seguridad son solo fuentes de datos:
> cada adaptador produce exactamente tres cosas —**Nodos**, **Aristas** y **Metadatos**— y eso es lo
> que leen la interfaz, los reportes y el asistente de IA.

![Landing de Attack Surface Studio](screenshots/01-landing.png)

---

## Índice

- [Cómo funciona](#cómo-funciona)
- [Capturas de pantalla](#capturas-de-pantalla)
- [Stack tecnológico](#stack-tecnológico)
- [Puesta en marcha](#puesta-en-marcha)
- [Variables de entorno](#variables-de-entorno)
- [Adaptadores y control de alcance](#adaptadores-y-control-de-alcance)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Testing](#testing)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Documentación](#documentación)

---

## Cómo funciona

El flujo es deliberadamente simple y verificable de punta a punta:

1. **Registras un proyecto** con un alcance (`scope`) explícito de objetivos autorizados.
2. **Lanzas una ejecución** eligiendo un adaptador de herramienta y un objetivo.
3. **El orquestador valida el alcance** antes de ejecutar nada. Si el objetivo no está en el
   `scope`, la ejecución se rechaza con `403 SCOPE_VIOLATION`.
4. **El adaptador normaliza la salida** a nodos y aristas (`child_process` en local, Docker en modo
   remoto) y un worker BullMQ la persiste en PostgreSQL.
5. **El grafo se vuelve navegable**: activos, hallazgos, relaciones y su cronología.

El control de alcance no es decorativo: se comprueba **antes de la ejecución**, no después.

---

## Capturas de pantalla

Todas las capturas son de la aplicación en ejecución, con datos reales generados a través de la
API y de la interfaz.

### Acceso y proyectos

<table>
  <tr>
    <td width="50%"><img src="screenshots/02-login.png" alt="Pantalla de inicio de sesión"></td>
    <td width="50%"><img src="screenshots/03-register.png" alt="Pantalla de registro"></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><sub>Inicio de sesión y registro</sub></td>
  </tr>
</table>

<table>
  <tr>
    <td width="50%"><img src="screenshots/04-projects-vacio.png" alt="Estado inicial sin proyectos"></td>
    <td width="50%"><img src="screenshots/09-proyectos.png" alt="Lista de proyectos con un proyecto"></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><sub>Estado vacío y lista de proyectos</sub></td>
  </tr>
</table>

### Ejecuciones de herramientas

| Formulario y estado inicial | Detalle de la ejecución |
|---|---|
| <img src="screenshots/06-runs-vacio.png" alt="Pestaña Runs sin ejecuciones"> | <img src="screenshots/11-run-detalle.png" alt="Detalle de la ejecución"> |

La vista de Runs muestra el formulario de ejecución (adaptador + objetivo) y el historial completo
de ejecuciones con su estado y su duración.

<img src="screenshots/10-runs.png" alt="Pestaña Runs con historial de ejecuciones">

### Grafo de conocimiento

Todo proyecto arranca sin descubrimientos, y se va llenando a medida que se ejecutan herramientas:

| Proyecto recién creado | Grafo con activos y hallazgo |
|---|---|
| <img src="screenshots/05-grafo-sin-datos.png" alt="Proyecto recién creado sin descubrimientos"> | <img src="screenshots/12-grafo.png" alt="Grafo con activos y hallazgo"> |

Y el detalle de un nodo concreto:

<img src="screenshots/13-grafo-nodo.png" alt="Panel de detalle del nodo seleccionado">

> El grafo se renderiza en la vista **Timeline**, que es la que monta el motor de grafo con
> dimensiones correctas. Ver [Limitaciones conocidas](#limitaciones-conocidas).

### Evidencia, reportes, asistente y ajustes

| Evidencia sin archivos | Evidencia del proyecto |
|---|---|
| <img src="screenshots/07-evidencia-vacia.png" alt="Pestaña Evidence vacía"> | <img src="screenshots/14-evidencia.png" alt="Pestaña Evidence"> |

| Reportes sin generar | Asistente de IA |
|---|---|
| <img src="screenshots/08-reportes-vacio.png" alt="Pestaña Reports vacía"> | <img src="screenshots/15-assistant.png" alt="Pestaña Assistant"> |

El alcance autorizado del proyecto se gestiona desde la pestaña de ajustes:

<img src="screenshots/16-settings-scope.png" alt="Pestaña Settings con el scope del proyecto">

Y el constructor de reportes permite seleccionar los nodos del grafo que se incluirán:

<img src="screenshots/17-report-builder.png" alt="Constructor de reportes">

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4, React Flow, Zustand, TanStack Query |
| Backend | NestJS, TypeScript, Drizzle ORM, BullMQ (cola de trabajos con Redis) |
| Base de datos | PostgreSQL 16 |
| Ejecución de herramientas | `child_process` (local) / `dockerode` (Docker) tras un registro de adaptadores |
| Autenticación | JWT (access corto + refresh rotativo), hash de contraseña Argon2id |
| Testing | Vitest + Supertest (integración), Playwright (E2E) |

---

## Puesta en marcha

### Requisitos previos

- Node.js 20+
- [pnpm](https://pnpm.io/) 9
- Docker (para PostgreSQL y Redis)

### 1. Bases de datos

```bash
cp .env.example .env      # completa los valores antes de usar nada que no sea local
docker compose up -d      # PostgreSQL en :5432, Redis en :6379
```

El esquema se aplica automáticamente en el primer arranque gracias a
[`db/init`](db/init) (montado como `docker-entrypoint-initdb.d`). Si necesitas reaplicar
migraciones de forma explícita, usa `pnpm migrate` desde `server/`.

### 2. Backend (`server/`)

```bash
cd server
pnpm install
cp .env.example .env      # DATABASE_URL, JWT_*, REDIS_URL, STORAGE_ROOT...
pnpm migrate
pnpm seed                  # opcional: carga un proyecto de ejemplo
pnpm start:dev             # API en http://localhost:3001
```

> **Aviso sobre `pnpm seed`:** el usuario demo que crea el seed (`demo@attacksurfacestudio.dev`)
> se genera con un hash de contraseña literal (`seed-placeholder`) que no es un hash Argon2id
> válido, así que **no se puede iniciar sesión con él**. El seed sí sirve para tener un proyecto con
> 26 nodos y 20 aristas que consultar. Para probar la aplicación, regístrate con una cuenta nueva
> desde la interfaz.

El worker es un proceso separado y es quien ejecuta los trabajos de la cola:

```bash
pnpm start:worker:dev
```

> **El worker es obligatorio.** La API encola los trabajos, pero sin el worker ninguna ejecución
> avanza. Si lanzas una ejecución y se queda en `queued`, casi siempre es esto.

Para ejecutar en modo producción, compila primero y usa los scripts sin watcher:

```bash
pnpm build && pnpm start        # en una terminal
pnpm build && pnpm start:worker # en otra
```

### 3. Frontend (`client/`)

```bash
cd client
pnpm install
cp .env.example .env           # NEXT_PUBLIC_API_URL=http://localhost:3001
pnpm dev                       # http://localhost:3000
```

Para un build de producción: `pnpm build && pnpm start`.

> `client/AGENTS.md` es un archivo generado y versionado por `next dev`. Si ejecutas el frontend con
> `next start` evitas que se reescriba.

### 4. Verificar que todo está en pie

```bash
curl http://localhost:3001/api/v1/health
# {"success":true,"data":{"status":"ok","database":"up"}}
```

Después abre [http://localhost:3000](http://localhost:3000), regístrate y acabarás en `/app`.

### Puertos

| Servicio | Puerto |
|---|---|
| Frontend (Next.js) | 3000 |
| API (NestJS) | 3001 |
| PostgreSQL | 5432 (configurable con `POSTGRES_PORT`) |
| Redis | 6379 (configurable con `REDIS_PORT`) |

---

## Variables de entorno

| Archivo | Variables |
|---|---|
| `.env` (raíz) | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`, `APP_DB_USER`, `APP_DB_PASSWORD` |
| `server/.env` | `PORT`, `CORS_ORIGINS`, `DATABASE_URL`, `APP_DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `REDIS_URL`, `STORAGE_ROOT`, `THROTTLE_TTL_MS`, `THROTTLE_LIMIT`, `NVIDIA_*` |
| `client/.env` | `NEXT_PUBLIC_API_URL` |

`server/` y `client/` son proyectos pnpm independientes: no hay workspace en la raíz, así que los
comandos se ejecutan dentro de cada directorio.

`NVIDIA_API_KEY` es opcional. Sin ella el asistente de IA no puede responder.

---

## Adaptadores y control de alcance

Los adaptadores registrados son `stub`, `nmap`, `ffuf` y `nuclei`. El adaptador `stub` genera
salida determinista sin tocar la red, y es el recomendado para desarrollo y para las pruebas
automatizadas.

Cada ejecución exige que el objetivo esté autorizado en el `scope` del proyecto
(`includes` / `excludes`, con entradas de tipo hostname, dominio comodín, IP o CIDR). Un proyecto
sin scope no puede ejecutar nada:

```
POST /api/v1/projects/:id/runs
→ 403 {"error":{"code":"SCOPE_VIOLATION",
              "message":"Target \"example.com\" is outside the project's authorized scope"}}
```

El scope se configura en la pestaña **Settings** del proyecto.

---

## Estructura del proyecto

```
Attack Surface Studio/
├── client/              Frontend Next.js (Hero público + motor de grafo + workspace autenticado)
├── server/              Backend NestJS (auth, orquestador, adaptadores, grafo, reportes)
├── db/init/             Scripts de arranque de PostgreSQL
├── screenshots/         Capturas de la interfaz usadas en este README
├── docker-compose.yml   PostgreSQL + Redis locales
└── .claude/             Documentación de arquitectura y planificación
```

---

## Testing

```bash
# Frontend
cd client && pnpm test
cd client && pnpm e2e

# Backend
cd server && pnpm test
cd server && pnpm test:coverage
```

Ambos proyectos exigen un piso de cobertura del 80%. Las pruebas de adaptadores se ejecutan
contra fixtures de salida real grabada, no contra escaneos en vivo.

---

## Limitaciones conocidas

Documentadas de forma explícita, con el comportamiento observado:

- **La pestaña Graph no renderiza el lienzo.** El contenedor de React Flow colapsa a altura `0`
  (`1600x0` medido), así que la vista queda vacía aunque la API devuelva correctamente los nodos y
  el cliente los lea bien. El problema es de maquetación en cliente, no de datos. Curiosamente, la
  vista **Timeline** monta el mismo motor con dimensiones correctas y sí dibuja el grafo, así que
  sirve como workaround. El commit `148c9` (`BUG #7`) ya intentó resolver exactamente esto aplicando
  `absolute inset-0` en `WorkspaceGraphView`, y el fallo persiste: parece una regresión de aquel
  arreglo o un caso que no cubría.
- **`/docs` devuelve 404.** La ruta no existe aunque el navbar incluya un enlace a ella.
- **El ensamblado de reportes está bloqueado por lo anterior.** El constructor exige seleccionar al
  menos un nodo del grafo, y la pestaña Graph no los dibuja, así que por la interfaz no se puede
  completar un reporte. El backend sí expone el recurso.
- **El asistente de IA requiere `NVIDIA_API_KEY`.** Sin la clave responde en estado degradado.
- **`pnpm seed` genera un usuario demo inutilizable.** Su hash de contraseña es un placeholder, no
  un hash Argon2id real, así que el login con `demo@attacksurfacestudio.dev` falla siempre. Los datos
  del seed sí sirven como referencia.

---

## Documentación

El repositorio incluye la documentación siguiente:

- [`.claude/New_files.md`](.claude/New_files.md) — registro de archivos previstos en la Fase 1
- [`client/e2e/README.md`](client/e2e/README.md) — requisitos y ejecución de las pruebas E2E
- [`client/AGENTS.md`](client/AGENTS.md) — bloque de reglas de Next.js, generado y versionado
- [`docker-compose.yml`](docker-compose.yml) y [`db/init/`](db/init) — infraestructura local

Los documentos de arquitectura (`ARCHITECTURE.md`, `DATA_MODEL.md`, `SECURITY_MODEL.md`,
`INTEGRATION_SYSTEM.md`) que se mencionaban en versiones anteriores de este README **no están
presentes en el repositorio**, así que se han retirado los enlaces en lugar de dejarlos rotos. El
código y los contratos de TypeScript son hoy la fuente de verdad: los tipos del modelo de grafo
viven en `server/src/modules/projects` y `client/src/modules/graph-engine/types`.

---

## Licencia

Proyecto de portafolio. Sin licencia pública declarada.

