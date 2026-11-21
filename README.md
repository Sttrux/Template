# Template
# Prisma 8 + TypeScript + Express + PostgreSQL

Guía de configuración de un proyecto backend utilizando **Node.js, TypeScript, Express, PostgreSQL y Prisma ORM 8**.

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

---

## Tecnologías utilizadas

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
