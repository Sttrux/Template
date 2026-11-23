# Plantilla de API con Express, TypeScript y PostgreSQL

Base reutilizable con autenticación Passport Local/sesiones y JWT, permisos RBAC y un módulo de ejemplo para publicaciones. La base de datos se crea explícitamente; la aplicación no ejecuta el esquema automáticamente.

## Estructura

```text
src/
├── app.ts                 # Configura Express y middleware
├── server.ts              # Arranque y apagado ordenado
├── config/                # Entorno, pool PostgreSQL y sesiones
├── controllers/           # Adaptadores HTTP
├── db/schema.sql          # Esquema inicial, triggers, seeds y procedimientos
├── interfaces/            # Tipos de autenticación
├── middlewares/           # Autenticación, permisos, validación, errores y logs
├── prisma/                # Contrato y runtime de Prisma 8
├── repository/            # Acceso a datos
├── routes/                # Rutas Express
├── services/              # Reglas de negocio y transacciones
├── utils/                 # Errores y logging
└── validators/            # Validación de entrada
```

## Instalación y configuración

Requiere Node.js 22 o posterior y PostgreSQL.

```bash
npm ci
cp .env.example .env
```

Genera dos secretos distintos y reemplaza los valores de ejemplo `JWT_SECRET` y `SESSION_SECRET` en `.env`:

```bash
openssl rand -base64 48
```

Completa `DATABASE_URL` con la conexión a una base PostgreSQL vacía. Después, crea la base y aplica el esquema:

```bash
createdb blog_api
psql -d blog_api -v ON_ERROR_STOP=1 -f src/db/schema.sql
npm run contract:emit
```

`src/db/schema.sql` es una base inicial para una base nueva, no una migración de una base existente. Revísalo y prepara una migración explícita antes de usarlo con datos existentes.

Arranca en desarrollo o compila y ejecuta la versión de producción:

```bash
npm run dev
npm run build
npm start
```

## Autenticación

Los dos mecanismos están separados para que cada cliente elija el flujo adecuado:

### Passport Local con sesión

`POST /api/auth/session/login` recibe `login` (nombre de usuario o correo) y `password`; el servidor persiste la sesión en PostgreSQL y responde con cookie `httpOnly`.

```http
POST /api/auth/session/login
Content-Type: application/json

{"login":"usuario","password":"una-contraseña-larga"}
```

- `POST /api/auth/register`: crea una cuenta con rol `user` por defecto.
- `GET /api/auth/session/me`: devuelve la identidad autenticada por sesión.
- `POST /api/auth/session/logout`: cierra la sesión.

En un frontend de otro origen, configura `CORS_ORIGINS` y envía la cookie con credenciales. En producción, sirve la API sobre HTTPS.

### JWT Bearer

`POST /api/auth/token` recibe las mismas credenciales y devuelve un access token de duración configurable (`JWT_EXPIRES_IN_SECONDS`). El token no incluye permisos: estos se consultan desde la base para que un cambio de rol tenga efecto inmediato.

```http
GET /api/auth/token/me
Authorization: Bearer <accessToken>
```

Los tokens son stateless y expiran; no hay refresh tokens ni revocación individual implementados.

## Roles, permisos y rutas de ejemplo

El esquema asigna permisos explícitos a roles; el código no decide acceso comparando nombres de roles:

| Rol | Permisos de ejemplo |
|---|---|
| `admin` | Todos los permisos semilla, incluidos lectura de usuarios y asignación de roles |
| `moderator` | Crear, publicar, editar y borrar cualquier publicación; no administra usuarios ni roles |
| `user` | Leer publicaciones públicas, crear publicaciones y editar/borrar solo las propias |

Rutas de publicaciones:

- `GET /api/posts`: publicaciones públicas.
- `GET /api/posts/mine`: publicaciones del usuario autenticado.
- `POST /api/posts`: crea una publicación; publicar requiere permiso adicional.
- `PATCH /api/posts/:postId` y `DELETE /api/posts/:postId`: aplican permiso y propiedad del recurso.

Administración (requiere `roles:manage` o `users:read`):

- `GET /api/admin/users`
- `GET /api/admin/roles`
- `POST /api/admin/users/:userId/roles/:roleName`
- `DELETE /api/admin/users/:userId/roles/:roleName`

Las rutas protegidas de publicaciones y administración aceptan una sesión Passport o `Authorization: Bearer ...`. Las rutas `/session/*` y `/token/*` son específicas de cada mecanismo.

Para conceder el primer rol `admin`, registra primero una cuenta y ejecuta una asignación de bootstrap desde una conexión administrativa a PostgreSQL. Hazlo solo una vez y limita el acceso a la consola de base de datos:

```sql
INSERT INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users CROSS JOIN roles
WHERE users.username = lower('mi-admin') AND roles.name = 'admin'
ON CONFLICT DO NOTHING;
```

## Esquema PostgreSQL: transacciones, triggers y procedimientos

El esquema incluye:

- `users`, `roles`, `permissions`, `user_roles` y `role_permissions`, con permisos semilla para `admin`, `moderator` y `user`.
- `sessions`, compatible con el almacén PostgreSQL de Express Session.
- `role_audit_logs` y triggers que registran asignaciones/revocaciones de roles.
- Triggers `BEFORE UPDATE` que mantienen `updated_at` en usuarios y publicaciones.
- `create_user_with_default_role(...)` y `set_user_role(...)` como ejemplos de procedimientos almacenados. El segundo exige el permiso `roles:manage` y evita revocar el último rol `admin`.

El registro desde la API usa una transacción Prisma (`db.transaction`) para crear el usuario y asignarle el rol inicial como una operación atómica. Los procedimientos SQL son ejemplos para operaciones desde PostgreSQL; no se ejecutan automáticamente al iniciar la app. Las contraseñas deben llegar a PostgreSQL ya hasheadas con bcrypt.

## Configuración

`.env.example` enumera las variables:

- `PORT`, `DATABASE_URL`, `CORS_ORIGINS`
- `JWT_SECRET`, `JWT_EXPIRES_IN_SECONDS`
- `SESSION_SECRET`, `SESSION_MAX_AGE_MS`, `SESSION_COOKIE_SAME_SITE`, `SESSION_COOKIE_SECURE`
- `TRUST_PROXY_HOPS` para despliegues detrás de un proxy confiable
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_MAX`
- `BCRYPT_SALT_ROUNDS` (mínimo 10; predeterminado 12)

El servidor falla al arrancar si faltan secretos o siguen usando los valores de ejemplo. No guardes `.env` ni secretos en el repositorio. Usa un secreto distinto para sesiones y JWT.
En producción, configura `SESSION_COOKIE_SECURE=true`; para cookies cross-site usa `SESSION_COOKIE_SAME_SITE=none` junto con HTTPS y CORS de orígenes explícitos.
