# Template
# Prisma 8 + TypeScript + Express + PostgreSQL

Guía de configuración de un proyecto backend utilizando **Node.js, TypeScript, Express, PostgreSQL y Prisma ORM 8**.

## Estructura y ejecución

```text
src/
├── app.ts
├── config/
├── controllers/
├── db/
├── interfaces/
├── middlewares/
├── prisma/
├── repository/
└── routes/
```

Configurar las variables de entorno y arrancar la API:

```bash
cp .env.example .env
npm run dev
```

La API ofrece `GET /` como ruta de bienvenida y `GET /health` para comprobar que está activa. Las rutas inexistentes responden con HTTP 404. Para compilar y ejecutar la versión de producción:

```bash
npm run build
npm start
```

## 1. Inicializar el proyecto

Crear el proyecto e inicializar `package.json`:

```bash
npm init -y
npm pkg set type=module
```

Se utiliza **ES Modules** para trabajar con `import` y `export`.

## 2. Instalar dependencias

### Dependencias de producción

```bash
npm install express dotenv passport passport-local express-session bcryptjs jsonwebtoken multer express-validator @quixo3/prisma-session-store
```

### Dependencias de desarrollo
 
```bash
npm install -D typescript tsx @types/node @types/express @types/passport @types/passport-local @types/express-session @types/bcryptjs @types/jsonwebtoken @types/multer
```

## 3. Instalar Prisma 8

Instalar el adaptador de PostgreSQL y las herramientas de Prisma:

```bash
npm install @prisma/orm-postgres@8.0.0-rc.12

npm install -D prisma@8.0.0-rc.17 @prisma/cli-engine@0.6.1
```

> **Importante:** Se están utilizando versiones Release Candidate (RC) de Prisma 8. Mantener las versiones indicadas evita cambios inesperados entre versiones.

## 4. Inicializar Prisma

Ejecutar:

```bash
npx prisma orm init --skip-install
```

Este comando inicializa la estructura de Prisma sin volver a instalar las dependencias.

### Archivo contract.prisma

**Atención:** Prisma 8 utiliza `contract.prisma` para definir el contrato del modelo de datos.

Revisar y configurar este archivo antes de ejecutar los comandos relacionados con el esquema y la base de datos.

## 5. Equivalencias de comandos: Prisma clásico vs Prisma 8

Prisma 8 introduce cambios en algunos comandos del flujo de trabajo.

| Operación | Prisma clásico | Prisma 8 |
|---|---|---|
| Inferir estructura de BD | `npx prisma db pull` | `npx prisma contract infer` |
| Generar cliente | `npx prisma generate` | `npx prisma contract emit` |
| Formatear esquema | `npx prisma format` | `npx prisma contract format` |
| Actualizar estructura de BD | `npx prisma db push` | `npx prisma db update` |
| Aplicar migraciones | `npx prisma migrate deploy` | `npx prisma db migrate` |

**Nota:** Estos comandos no son necesariamente equivalentes en todos sus efectos. Revisar la documentación de Prisma 8 antes de utilizarlos en producción.

## 6. Comandos útiles de PostgreSQL

### Vaciar una tabla y reiniciar su identificador

```sql
TRUNCATE TABLE "users" RESTART IDENTITY CASCADE;
```

Este comando:

- `TRUNCATE TABLE`: elimina todos los registros de la tabla.
- `RESTART IDENTITY`: reinicia las secuencias de autoincremento.
- `CASCADE`: también vacía las tablas que tengan dependencias mediante claves foráneas.

> **Advertencia:** Es una operación destructiva. Puede eliminar registros de otras tablas relacionadas. Utilizar con precaución.
## 7. Conectar PostgreSQL con Prisma 8

Una vez creada la base de datos, configurar la variable de entorno en el archivo `.env`:

```env
DATABASE_URL="postgresql://strux:TU_PASSWORD@localhost:5432/blog_api"
```

### 7.1. Inferir el contrato de la base de datos

Si la base de datos ya contiene tablas y registros, ejecutar:

```bash
npx prisma contract infer --db "$DATABASE_URL"
```

Este comando analiza la estructura existente de PostgreSQL y genera un contrato inicial en `contract.prisma`.

Permite obtener los modelos, campos, relaciones, índices y restricciones existentes.

> **Importante:** Revisar el contrato generado antes de continuar. Si ya existe un `contract.prisma`, el comando puede sobrescribirlo. Para conservarlo, utilizar `--output ./inferred.prisma`.

### 7.2. Generar los artefactos del contrato

Después de revisar el contrato, ejecutar:

```bash
npx prisma contract emit
```

Genera dos archivos:

- `contract.json`: contiene la definición del contrato que utiliza el runtime.
- `contract.d.ts`: contiene las declaraciones de tipos para TypeScript.

Estos archivos son generados automáticamente. No deben modificarse manualmente.

### 7.3. Sincronizar el contrato con PostgreSQL

Si estás incorporando Prisma 8 a una base de datos existente que ya coincide con el contrato, ejecutar:

```bash
npx prisma db sign --db "$DATABASE_URL"
```

Este comando verifica que la estructura de PostgreSQL coincida con el contrato y registra su firma sin modificar las tablas existentes.

Si se trata de una base de datos nueva, utilizar:

```bash
npx prisma db init --db "$DATABASE_URL"
```

Este comando crea los elementos que faltan según el contrato y registra su firma.

### 7.4. Consultas CRUD en Prisma 8

Prisma 8 utiliza una API de consultas basada en `db.orm`, que permite consultar y modificar registros mediante métodos encadenados.

Para utilizarla, importar la instancia `db`:

```ts
import { db } from "./prisma/db";
```

En PostgreSQL, los modelos se consultan mediante `db.orm.public.NombreModelo`.

#### Obtener registros (READ)

```ts
// Obtener todos los usuarios
const users = await db.orm.public.User.all();

// Obtener un usuario por ID
const user = await db.orm.public.User
  .whereUnique({ id: 1 })
  .first();

// Obtener el primer usuario que coincida
const user = await db.orm.public.User
  .where({ email: "strux@example.com" })
  .first();
```

#### Crear registros (CREATE)

```ts
const user = await db.orm.public.User.create({
  email: "strux@example.com",
  name: "Strux"
});
```

Los campos se pasan directamente, sin utilizar el objeto `data` de Prisma clásico.

#### Actualizar registros (UPDATE)

```ts
const user = await db.orm.public.User
  .where({ id: 1 })
  .update({
    name: "New Username"
  });
```

#### Eliminar registros (DELETE)

```ts
const user = await db.orm.public.User
  .where({ id: 1 })
  .delete();
```

#### Filtrar resultados (WHERE)

```ts
// Buscar por correo
const users = await db.orm.public.User
  .where({ email: "strux@example.com" })
  .all();

// Buscar por coincidencia parcial
const users = await db.orm.public.User
  .where((u) => u.name.ilike("%strux%"))
  .all();

// Combinar condiciones
const users = await db.orm.public.User
  .where((u) => u.id.gte(1))
  .where((u) => u.id.lte(10))
  .all();
```

#### Seleccionar campos (SELECT)

```ts
const users = await db.orm.public.User
  .select("id", "email")
  .all();
```

#### Ordenar y paginar resultados

```ts
const users = await db.orm.public.User
  .orderBy((u) => u.id.desc())
  .limit(10)
  .offset(0)
  .all();
```

#### Consultar relaciones (INCLUDE)

```ts
const users = await db.orm.public.User
  .include("posts")
  .all();
```

Permite recuperar registros relacionados, siempre que las relaciones estén definidas en `contract.prisma`.

#### Cerrar la conexión

```ts
await db.close();
```

> **Nota:** Los ejemplos utilizan los modelos `User` y `Post` como referencia. Los nombres de modelos, campos y relaciones deben coincidir con los definidos en `contract.prisma`. Los métodos de actualización y eliminación requieren un filtro previo mediante `where()`.

## 8. Tecnologías utilizadas

- **Node.js:** Entorno de ejecución.
- **TypeScript:** Tipado estático.
- **Express:** Framework backend.
- **PostgreSQL:** Sistema de gestión de bases de datos.
- **Prisma ORM 8:** Gestión y acceso a datos.
- **Passport:** Autenticación.
- **JWT:** Autenticación mediante tokens.
- **Bcryptjs:** Hash de contraseñas.
- **Multer:** Gestión de archivos.
- **Express Validator:** Validación de datos.
- **Express Session:** Gestión de sesiones.