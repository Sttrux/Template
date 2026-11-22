# Prisma ORM 8 — Guía completa de consultas

Referencia de consultas para **Prisma ORM 8 + TypeScript + PostgreSQL**.

Esta guía se concentra exclusivamente en operaciones de base de datos: lectura, escritura, filtros, relaciones, agregaciones, consultas SQL y transacciones.

> Los ejemplos utilizan la nueva API de Prisma 8 (`db.orm` y `db.sql`). No utilizan la sintaxis tradicional de Prisma Client 6/7.

---

# 1. Modelos utilizados en los ejemplos

Para que los ejemplos sean coherentes, utilizaremos estos modelos en `contract.prisma`:

```prisma
// use prisma-8

model User {
  id        String   @id @onCreate(cuid(2))
  name      String
  email     String   @unique
  password  String
  role      String   @default("user")
  createdAt DateTime @default(now())

  posts     Post[]
}

model Post {
  id        String   @id @onCreate(cuid(2))
  title     String
  content   String?
  published Boolean  @default(false)
  views     Int      @default(0)
  createdAt DateTime @default(now())

  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
}

model Product {
  id        String   @id @onCreate(cuid(2))
  name      String
  price     Int
  stock     Int      @default(0)
  createdAt DateTime @default(now())
}
```

En los ejemplos se supone que ya ejecutaste `contract emit` y que las tablas existen.

## Importar el cliente

```ts
import { db } from "../prisma/db";
```

En PostgreSQL se accede a los modelos mediante:

```ts
db.orm.public.User
db.orm.public.Post
db.orm.public.Product
```

`public` es el esquema de PostgreSQL. Si utilizas otro namespace, debes cambiarlo.

---

# 2. Consultas de lectura (READ)

## 2.1. Obtener todos los registros

`.all()` devuelve todos los registros que coinciden con la consulta.

```ts
const users = await db.orm.public.User.all();
```

Con filtro:

```ts
const users = await db.orm.public.User
  .where({ role: "admin" })
  .all();
```

## 2.2. Obtener un solo registro

`.first()` devuelve el primer registro encontrado o `null`.

```ts
const user = await db.orm.public.User
  .where({ email: "user@gmail.com" })
  .first();
```

También puedes pasar el filtro directamente:

```ts
const user = await db.orm.public.User
  .first({ email: "user@gmail.com" });
```

## 2.3. Buscar por clave única

`.whereUnique()` permite filtrar mediante una clave primaria o un campo único.

```ts
const user = await db.orm.public.User
  .whereUnique({ email: "user@gmail.com" })
  .first();
```

Por ID:

```ts
const user = await db.orm.public.User
  .whereUnique({ id: "USER_ID" })
  .first();
```

## 2.4. Obtener un registro o lanzar un error

`.firstOrThrow()` devuelve un registro o lanza un error si no encuentra coincidencias.

```ts
const user = await db.orm.public.User
  .where({ email: "user@gmail.com" })
  .firstOrThrow();
```

También admite un filtro directo:

```ts
const user = await db.orm.public.User
  .firstOrThrow({ id: "USER_ID" });
```

## 2.5. Seleccionar campos específicos

`.select()` permite elegir qué campos devolver.

```ts
const users = await db.orm.public.User
  .select("id", "name", "email")
  .all();
```

En lugar de devolver todos los campos, devuelve solamente los seleccionados.

Ejemplo con un solo usuario:

```ts
const user = await db.orm.public.User
  .where({ id: "USER_ID" })
  .select("id", "name", "email")
  .first();
```

## 2.6. Consultar registros distintos

`.distinct()` elimina duplicados según los campos indicados.

```ts
const users = await db.orm.public.User
  .distinct("role")
  .all();
```

Devuelve una fila completa por cada valor diferente de `role`.

## 2.7. Obtener el primer registro de cada grupo

`.distinctOn()` permite conservar el primer registro de cada grupo según el orden establecido.

```ts
const latestPosts = await db.orm.public.Post
  .orderBy([
    (p) => p.authorId.asc(),
    (p) => p.createdAt.desc()
  ])
  .distinctOn("authorId")
  .all();
```

Obtiene la publicación más reciente de cada autor.

**Nota:** `distinct()` y `distinctOn()` están disponibles para PostgreSQL.

---

# 3. Filtros WHERE

`.where()` permite establecer condiciones para seleccionar registros.

## 3.1. Igualdad

```ts
const users = await db.orm.public.User
  .where({ name: "Strux" })
  .all();
```

También puedes usar el operador explícito:

```ts
const users = await db.orm.public.User
  .where((u) => u.name.eq("Strux"))
  .all();
```

## 3.2. Desigualdad

```ts
const users = await db.orm.public.User
  .where((u) => u.role.neq("admin"))
  .all();
```

## 3.3. Mayor que

```ts
const products = await db.orm.public.Product
  .where((p) => p.price.gt(100))
  .all();
```

## 3.4. Mayor o igual que

```ts
const products = await db.orm.public.Product
  .where((p) => p.price.gte(100))
  .all();
```

## 3.5. Menor que

```ts
const products = await db.orm.public.Product
  .where((p) => p.price.lt(100))
  .all();
```

## 3.6. Menor o igual que

```ts
const products = await db.orm.public.Product
  .where((p) => p.price.lte(100))
  .all();
```

## 3.7. Buscar dentro de una lista

`.in()` busca valores que estén dentro de un arreglo.

```ts
const users = await db.orm.public.User
  .where((u) => u.role.in(["admin", "moderator"]))
  .all();
```

## 3.8. Excluir valores de una lista

`.notIn()` excluye los valores indicados.

```ts
const users = await db.orm.public.User
  .where((u) => u.role.notIn(["admin", "moderator"]))
  .all();
```

## 3.9. Buscar texto con LIKE

`.like()` realiza búsquedas que distinguen mayúsculas y minúsculas.

```ts
const users = await db.orm.public.User
  .where((u) => u.email.like("%@gmail.com"))
  .all();
```

## 3.10. Buscar texto con ILIKE

`.ilike()` realiza búsquedas sin distinguir mayúsculas y minúsculas.

```ts
const users = await db.orm.public.User
  .where((u) => u.name.ilike("%strux%"))
  .all();
```

## 3.11. Comprobar valores NULL

`.isNull()` busca valores nulos.

```ts
const posts = await db.orm.public.Post
  .where((p) => p.content.isNull())
  .all();
```

`.isNotNull()` busca valores que no sean nulos.

```ts
const posts = await db.orm.public.Post
  .where((p) => p.content.isNotNull())
  .all();
```

## 3.12. Resumen de operadores

| Operador | Función |
|---|---|
| `eq()` | Igual |
| `neq()` | Diferente |
| `gt()` | Mayor que |
| `gte()` | Mayor o igual |
| `lt()` | Menor que |
| `lte()` | Menor o igual |
| `in()` | Está dentro de una lista |
| `notIn()` | No está dentro de una lista |
| `like()` | Coincidencia de texto sensible a mayúsculas |
| `ilike()` | Coincidencia de texto sin distinguir mayúsculas |
| `isNull()` | Es NULL |
| `isNotNull()` | No es NULL |

Los operadores disponibles dependen del tipo de campo. Por ejemplo, `like()` e `ilike()` son para campos de texto.

---

# 4. Operadores lógicos

Prisma 8 permite combinar condiciones mediante `and()`, `or()` y `not()`.

Importación:

```ts
import {
  and,
  or,
  not,
  all
} from "@prisma/orm-postgres/orm-client";
```

## 4.1. AND

Todas las condiciones deben cumplirse.

```ts
const users = await db.orm.public.User
  .where((u) =>
    and(
      u.role.eq("admin"),
      u.name.ilike("%strux%")
    )
  )
  .all();
```

También puedes encadenar varios `where()`:

```ts
const users = await db.orm.public.User
  .where({ role: "admin" })
  .where((u) => u.name.ilike("%strux%"))
  .all();
```

Los filtros encadenados se combinan mediante AND.

## 4.2. OR

Al menos una condición debe cumplirse.

```ts
const users = await db.orm.public.User
  .where((u) =>
    or(
      u.role.eq("admin"),
      u.role.eq("moderator")
    )
  )
  .all();
```

## 4.3. NOT

Niega una condición.

```ts
const users = await db.orm.public.User
  .where((u) =>
    not(u.role.eq("admin"))
  )
  .all();
```

## 4.4. Condición universal

`all()` también existe como operador lógico que representa una condición que coincide con todas las filas.

```ts
const users = await db.orm.public.User
  .where(() => all())
  .all();
```

No confundas este `all()` con el método terminal `.all()` que ejecuta una consulta.

## 4.5. Combinar AND y OR

```ts
const users = await db.orm.public.User
  .where((u) =>
    and(
      u.name.ilike("%strux%"),
      or(
        u.role.eq("admin"),
        u.role.eq("moderator")
      )
    )
  )
  .all();
```

---

# 5. Filtros de relaciones

Permiten filtrar un modelo dependiendo de los registros relacionados.

Supongamos que `User` tiene muchas publicaciones mediante `posts`.

## 5.1. SOME

Busca usuarios que tengan al menos una publicación que cumpla la condición.

```ts
const users = await db.orm.public.User
  .where((u) =>
    u.posts.some((p) => p.published.eq(true))
  )
  .all();
```

También puedes comprobar si existe alguna publicación:

```ts
const users = await db.orm.public.User
  .where((u) => u.posts.some())
  .all();
```

## 5.2. EVERY

Busca usuarios cuyas publicaciones cumplan todas la condición.

```ts
const users = await db.orm.public.User
  .where((u) =>
    u.posts.every((p) => p.published.eq(true))
  )
  .all();
```

Un usuario sin publicaciones también cumple `every()`.

## 5.3. NONE

Busca usuarios que no tengan ninguna publicación que cumpla la condición.

```ts
const users = await db.orm.public.User
  .where((u) =>
    u.posts.none((p) => p.published.eq(false))
  )
  .all();
```

## 5.4. Filtrar mediante una relación de un solo registro

```ts
const posts = await db.orm.public.Post
  .where((p) =>
    p.author.some({ role: "admin" })
  )
  .all();
```

---

# 6. Relaciones e INCLUDE

`.include()` permite recuperar registros relacionados.

## 6.1. Incluir el autor de una publicación

```ts
const posts = await db.orm.public.Post
  .include("author")
  .all();
```

## 6.2. Incluir las publicaciones de un usuario

```ts
const users = await db.orm.public.User
  .include("posts")
  .all();
```

## 6.3. Incluir varias relaciones

```ts
const posts = await db.orm.public.Post
  .include("author")
  .all();
```

Para cargar varias relaciones, puedes encadenar inclusiones cuando el modelo tenga más de una relación:

```ts
const posts = await db.orm.public.Post
  .include("author")
  .include("tags")
  .all();
```

Este segundo ejemplo supone que `Post` tiene una relación `tags`.

## 6.4. Filtrar registros relacionados

```ts
const users = await db.orm.public.User
  .include("posts", (posts) =>
    posts.where({ published: true })
  )
  .all();
```

## 6.5. Ordenar relaciones

```ts
const users = await db.orm.public.User
  .include("posts", (posts) =>
    posts.orderBy((p) => p.createdAt.desc())
  )
  .all();
```

## 6.6. Limitar relaciones

```ts
const users = await db.orm.public.User
  .include("posts", (posts) =>
    posts
      .orderBy((p) => p.createdAt.desc())
      .limit(5)
  )
  .all();
```

Obtiene como máximo cinco publicaciones por usuario.

## 6.7. Contar registros relacionados

```ts
const users = await db.orm.public.User
  .include("posts", (posts) => posts.count())
  .all();
```

En este caso, `posts` contiene el número de publicaciones en lugar de un arreglo.

## 6.8. Sumar valores relacionados

Suponiendo que tienes `Customer` y `Order`, con `Order.amount`:

```ts
const customers = await db.orm.public.Customer
  .include("orders", (orders) => orders.sum("amount"))
  .all();
```

## 6.9. Promedio de valores relacionados

```ts
const customers = await db.orm.public.Customer
  .include("orders", (orders) => orders.avg("amount"))
  .all();
```

## 6.10. Combinar varias consultas de una relación

```ts
const users = await db.orm.public.User
  .include("posts", (posts) =>
    posts.combine({
      recent: posts
        .orderBy((p) => p.createdAt.desc())
        .limit(5),

      total: posts.count()
    })
  )
  .all();
```

Devuelve las cinco publicaciones más recientes y el total de publicaciones de cada usuario.

---

# 7. Ordenamiento (ORDER BY)

## 7.1. Ascendente

```ts
const users = await db.orm.public.User
  .orderBy((u) => u.name.asc())
  .all();
```

## 7.2. Descendente

```ts
const users = await db.orm.public.User
  .orderBy((u) => u.createdAt.desc())
  .all();
```

## 7.3. Ordenar por varios campos

```ts
const posts = await db.orm.public.Post
  .orderBy([
    (p) => p.published.asc(),
    (p) => p.createdAt.desc()
  ])
  .all();
```

## 7.4. Controlar la posición de valores NULL

```ts
const posts = await db.orm.public.Post
  .orderBy((p) =>
    p.content.asc({ nulls: "last" })
  )
  .all();
```

También puedes utilizar:

```ts
nulls: "first"
```

## 7.5. Ordenar por una relación

```ts
const posts = await db.orm.public.Post
  .orderBy((p) => p.author.name.asc())
  .all();
```

## 7.6. Ordenar por cantidad de relaciones

```ts
const users = await db.orm.public.User
  .orderBy((u) => u.posts.count().desc())
  .all();
```

---

# 8. Paginación

## 8.1. LIMIT

Limita la cantidad de resultados.

```ts
const posts = await db.orm.public.Post
  .limit(10)
  .all();
```

## 8.2. OFFSET

Omite una cantidad de registros.

```ts
const posts = await db.orm.public.Post
  .offset(10)
  .all();
```

## 8.3. Paginación tradicional

```ts
const page = 2;
const limit = 10;

const posts = await db.orm.public.Post
  .orderBy((p) => p.createdAt.desc())
  .limit(limit)
  .offset((page - 1) * limit)
  .all();
```

## 8.4. Paginación mediante cursor

Permite continuar desde el último registro de la página anterior.

```ts
const page1 = await db.orm.public.Post
  .orderBy((p) => p.createdAt.asc())
  .limit(10)
  .all();

const last = page1[page1.length - 1];

const page2 = last
  ? await db.orm.public.Post
      .orderBy((p) => p.createdAt.asc())
      .cursor({ createdAt: last.createdAt })
      .limit(10)
      .all()
  : [];
```

Cuando utilizas varios campos en `orderBy()`, debes incluir todos ellos en el cursor. Es recomendable incluir un campo único como segundo criterio.

---

# 9. Consultas de creación (CREATE)

## 9.1. Crear un registro

```ts
const user = await db.orm.public.User.create({
  name: "Strux",
  email: "strux@gmail.com",
  password: "hashed_password"
});
```

No se utiliza `data: {}`.

## 9.2. Crear devolviendo campos específicos

```ts
const user = await db.orm.public.User
  .select("id", "name", "email")
  .create({
    name: "Strux",
    email: "strux@gmail.com",
    password: "hashed_password"
  });
```

## 9.3. Crear varios registros

```ts
const users = await db.orm.public.User.createAll([
  {
    name: "User 1",
    email: "user1@gmail.com",
    password: "hash1"
  },
  {
    name: "User 2",
    email: "user2@gmail.com",
    password: "hash2"
  }
]);
```

## 9.4. Crear y obtener solamente la cantidad

```ts
const count = await db.orm.public.User.createAndCount([
  {
    name: "User 3",
    email: "user3@gmail.com",
    password: "hash3"
  },
  {
    name: "User 4",
    email: "user4@gmail.com",
    password: "hash4"
  }
]);
```

## 9.5. Crear un registro con relaciones

```ts
const user = await db.orm.public.User.create({
  name: "Strux",
  email: "strux@gmail.com",
  password: "hashed_password",

  posts: (posts) => posts.create([
    {
      title: "Primera publicación",
      content: "Contenido de ejemplo",
      published: true,
      views: 0
    },
    {
      title: "Segunda publicación",
      content: "Otro contenido",
      published: false,
      views: 0
    }
  ])
});
```

---

# 10. Consultas de actualización (UPDATE)

## 10.1. Actualizar un registro

```ts
const user = await db.orm.public.User
  .where({ id: "USER_ID" })
  .update({
    name: "Nuevo nombre"
  });
```

Actualiza un solo registro y devuelve el registro actualizado o `null`.

## 10.2. Actualizar varios registros

```ts
const users = await db.orm.public.User
  .where({ role: "user" })
  .updateAll({
    role: "member"
  });
```

## 10.3. Actualizar y obtener la cantidad

```ts
const count = await db.orm.public.User
  .where({ role: "user" })
  .updateAndCount({
    role: "member"
  });
```

Devuelve un número con la cantidad de registros afectados.

## 10.4. Actualizar campos seleccionados

```ts
const user = await db.orm.public.User
  .where({ id: "USER_ID" })
  .select("id", "name", "email")
  .update({
    name: "Nuevo nombre"
  });
```

## 10.5. Actualizar una relación

```ts
const post = await db.orm.public.Post
  .where({ id: "POST_ID" })
  .update({
    author: (author) => author.connect({
      id: "NEW_AUTHOR_ID"
    })
  });
```

`connect()` permite vincular el registro con otro registro existente.

---

# 11. Consultas de eliminación (DELETE)

## 11.1. Eliminar un registro

```ts
const user = await db.orm.public.User
  .where({ id: "USER_ID" })
  .delete();
```

Devuelve el registro eliminado o `null`.

## 11.2. Eliminar varios registros

```ts
const users = await db.orm.public.User
  .where({ role: "member" })
  .deleteAll();
```

## 11.3. Eliminar y obtener la cantidad

```ts
const count = await db.orm.public.User
  .where({ role: "member" })
  .deleteAndCount();
```

Devuelve el número de registros eliminados.

## 11.4. Eliminar devolviendo campos específicos

```ts
const user = await db.orm.public.User
  .where({ id: "USER_ID" })
  .select("id", "email")
  .delete();
```

**Importante:** `delete()` y `update()` afectan un solo registro. `deleteAll()`, `deleteAndCount()`, `updateAll()` y `updateAndCount()` son las variantes masivas.

---

# 12. UPSERT

`upsert()` permite insertar un registro o actualizarlo cuando existe un conflicto con una clave única.

En PostgreSQL se utiliza `conflictOn` para indicar el campo único que determina el conflicto.

```ts
const user = await db.orm.public.User.upsert({
  create: {
    name: "Strux",
    email: "strux@gmail.com",
    password: "hashed_password"
  },

  update: {
    name: "Nuevo nombre"
  },

  conflictOn: {
    email: "strux@gmail.com"
  }
});
```

Si el correo no existe, crea el usuario. Si ya existe, actualiza el nombre.

También puedes utilizar la clave primaria como criterio predeterminado de conflicto, omitiendo `conflictOn`.

---

# 13. Agregaciones

Las agregaciones permiten realizar cálculos sobre los registros.

En Prisma 8 para PostgreSQL se utiliza `.aggregate()`.

## 13.1. COUNT

Contar todos los registros:

```ts
const result = await db.orm.public.User
  .aggregate((a) => ({
    total: a.count()
  }));
```

Contar registros donde un campo no sea NULL:

```ts
const result = await db.orm.public.User
  .aggregate((a) => ({
    total: a.count("name")
  }));
```

## 13.2. SUM

Sumar los valores de un campo numérico:

```ts
const result = await db.orm.public.Product
  .aggregate((a) => ({
    total: a.sum("price")
  }));
```

## 13.3. AVG

Calcular el promedio:

```ts
const result = await db.orm.public.Product
  .aggregate((a) => ({
    average: a.avg("price")
  }));
```

## 13.4. MIN

Obtener el valor mínimo:

```ts
const result = await db.orm.public.Product
  .aggregate((a) => ({
    minimum: a.min("price")
  }));
```

## 13.5. MAX

Obtener el valor máximo:

```ts
const result = await db.orm.public.Product
  .aggregate((a) => ({
    maximum: a.max("price")
  }));
```

## 13.6. Varias agregaciones simultáneas

```ts
const stats = await db.orm.public.Product
  .aggregate((a) => ({
    total: a.count(),
    sum: a.sum("price"),
    average: a.avg("price"),
    minimum: a.min("price"),
    maximum: a.max("price")
  }));
```

## 13.7. Agregaciones con filtros

```ts
const stats = await db.orm.public.Product
  .where((p) => p.price.gt(100))
  .aggregate((a) => ({
    total: a.count(),
    average: a.avg("price")
  }));
```

## 13.8. Agregaciones con números grandes

Para evitar problemas de precisión con enteros muy grandes:

```ts
const stats = await db.orm.public.Product
  .aggregate((a) => ({
    total: a.countBigInt(),
    sum: a.sumBigInt("price"),
    average: a.avgDecimal("price")
  }));
```

`sum()`, `avg()`, `min()` y `max()` pueden devolver `null` si no hay registros. `count()` devuelve cero.

---

# 14. GROUP BY y HAVING

Estas operaciones permiten agrupar registros y filtrar los grupos.

## 14.1. Agrupar por un campo

```ts
const result = await db.orm.public.Post
  .groupBy("published")
  .aggregate((a) => ({
    total: a.count()
  }));
```

Agrupa las publicaciones por su estado.

## 14.2. Agrupar por varios campos

```ts
const result = await db.orm.public.Post
  .groupBy("authorId", "published")
  .aggregate((a) => ({
    total: a.count()
  }));
```

## 14.3. Filtrar los registros antes de agrupar

```ts
const result = await db.orm.public.Post
  .where({ published: true })
  .groupBy("authorId")
  .aggregate((a) => ({
    total: a.count()
  }));
```

## 14.4. HAVING

Filtra grupos según una agregación.

Ejemplo: autores con más de cinco publicaciones:

```ts
const result = await db.orm.public.Post
  .groupBy("authorId")
  .having((h) => h.count().gt(5))
  .aggregate((a) => ({
    total: a.count()
  }));
```

## 14.5. Varias condiciones HAVING

```ts
const result = await db.orm.public.Post
  .groupBy("authorId")
  .having((h) => h.count().gt(5))
  .having((h) => h.count().lt(20))
  .aggregate((a) => ({
    total: a.count()
  }));
```

Las condiciones `having()` encadenadas se combinan mediante AND.

---

# 15. Consultas sobre texto y búsqueda completa

## 15.1. Búsqueda parcial

```ts
const users = await db.orm.public.User
  .where((u) => u.name.ilike("%strux%"))
  .all();
```

## 15.2. Búsqueda por prefijo

```ts
const users = await db.orm.public.User
  .where((u) => u.email.ilike("strux%"))
  .all();
```

## 15.3. Búsqueda por sufijo

```ts
const users = await db.orm.public.User
  .where((u) => u.email.ilike("%@gmail.com"))
  .all();
```

## 15.4. Full-text search

PostgreSQL dispone de búsqueda de texto completo.

```ts
import {
  websearchToTsquery
} from "@prisma/orm-postgres/target/full-text";

const query = websearchToTsquery("Prisma ORM");

const posts = await db.orm.public.Post
  .where((p) => p.title.fullTextMatches(query))
  .all();
```

## 15.5. Ordenar por relevancia

```ts
import {
  websearchToTsquery
} from "@prisma/orm-postgres/target/full-text";

const query = websearchToTsquery("Prisma ORM");

const posts = await db.orm.public.Post
  .where((p) => p.title.fullTextMatches(query))
  .orderBy((p) => p.title.fullTextRank(query).desc())
  .limit(10)
  .all();
```

Para búsquedas en varios campos puedes definir `@@fullTextIndex` en el contrato y consultarlo mediante `indexes` en el callback.

---

# 16. Consultas SQL Builder

Además de `db.orm`, Prisma 8 incluye `db.sql`, un constructor de consultas SQL tipadas.

Se utiliza cuando necesitas mayor control sobre SQL, joins, expresiones, agrupaciones o consultas que no se expresan fácilmente con el ORM.

En PostgreSQL se accede a las tablas mediante el nombre de tabla, no necesariamente el nombre del modelo.

Por ejemplo:

```ts
db.sql.public.User
```

Si el modelo tiene `@@map("user")`:

```ts
db.sql.public.user
```

## 16.1. SELECT

```ts
const plan = db.sql.public.user
  .select("id", "email")
  .build();

const users = await db.query(plan);
```

## 16.2. SELECT con WHERE

```ts
const plan = db.sql.public.user
  .select("id", "email")
  .where((f, fns) =>
    fns.eq(f.email, "strux@gmail.com")
  )
  .build();

const users = await db.query(plan);
```

## 16.3. SELECT con varias condiciones

```ts
const plan = db.sql.public.post
  .select("id", "title")
  .where((f, fns) =>
    fns.and(
      fns.eq(f.published, true),
      fns.eq(f.userId, userId)
    )
  )
  .build();

const posts = await db.query(plan);
```

## 16.4. SELECT con expresiones calculadas

```ts
const plan = db.sql.public.user
  .select("id", "email")
  .select(
    "emailLength",
    (f, fns) =>
      fns.raw`LENGTH(${f.email})`.returns("pg/int4@1")
  )
  .build();

const users = await db.query(plan);
```

## 16.5. ORDER BY

```ts
const plan = db.sql.public.user
  .select("id", "email")
  .orderBy("email", { direction: "asc" })
  .build();

const users = await db.query(plan);
```

## 16.6. LIMIT y OFFSET

```ts
const plan = db.sql.public.user
  .select("id", "email")
  .orderBy("email", { direction: "asc" })
  .limit(10)
  .offset(20)
  .build();

const users = await db.query(plan);
```

## 16.7. INNER JOIN

```ts
const plan = db.sql.public.post
  .innerJoin(
    db.sql.public.user,
    (f, fns) =>
      fns.eq(f.post.userId, f.user.id)
  )
  .select((f) => ({
    postId: f.post.id,
    title: f.post.title,
    authorEmail: f.user.email
  }))
  .build();

const posts = await db.query(plan);
```

## 16.8. LEFT JOIN

```ts
const plan = db.sql.public.post
  .outerLeftJoin(
    db.sql.public.user,
    (f, fns) =>
      fns.eq(f.post.userId, f.user.id)
  )
  .select((f) => ({
    postId: f.post.id,
    authorEmail: f.user.email
  }))
  .build();

const posts = await db.query(plan);
```

## 16.9. RIGHT JOIN

```ts
const plan = db.sql.public.post
  .outerRightJoin(
    db.sql.public.user,
    (f, fns) =>
      fns.eq(f.post.userId, f.user.id)
  )
  .select((f) => ({
    postId: f.post.id,
    authorEmail: f.user.email
  }))
  .build();

const posts = await db.query(plan);
```

## 16.10. FULL OUTER JOIN

```ts
const plan = db.sql.public.post
  .outerFullJoin(
    db.sql.public.user,
    (f, fns) =>
      fns.eq(f.post.userId, f.user.id)
  )
  .select((f) => ({
    postId: f.post.id,
    authorEmail: f.user.email
  }))
  .build();

const result = await db.query(plan);
```

## 16.11. LATERAL JOIN

Permite ejecutar una subconsulta relacionada con cada fila de la consulta principal.

```ts
const plan = db.sql.public.user
  .lateralJoin("latestPost", (lateral) =>
    lateral
      .from(db.sql.public.post)
      .select("id", "title", "userId")
      .where((f, fns) =>
        fns.eq(f.post.userId, f.user.id)
      )
      .orderBy("createdAt", { direction: "desc" })
      .limit(1)
  )
  .select((f) => ({
    userId: f.user.id,
    email: f.user.email,
    postTitle: f.latestPost.title
  }))
  .build();

const result = await db.query(plan);
```

`lateralJoin()` y `outerLateralJoin()` están disponibles en PostgreSQL.

## 16.12. Subconsultas con AS

```ts
const highPriorityPosts = db.sql.public.post
  .select("id", "userId")
  .where((f, fns) =>
    fns.eq(f.priority, "high")
  )
  .as("hp");

const plan = db.sql.public.user
  .innerJoin(
    highPriorityPosts,
    (f, fns) =>
      fns.eq(f.user.id, f.hp.userId)
  )
  .select((f) => ({
    userId: f.user.id,
    postId: f.hp.id
  }))
  .build();

const result = await db.query(plan);
```

## 16.13. DISTINCT

```ts
const plan = db.sql.public.post
  .select("userId", "priority")
  .distinct()
  .build();

const result = await db.query(plan);
```

## 16.14. DISTINCT ON

```ts
const plan = db.sql.public.post
  .select("id", "userId", "createdAt")
  .orderBy("userId", { direction: "asc" })
  .orderBy("createdAt", { direction: "desc" })
  .distinctOn("userId")
  .build();

const result = await db.query(plan);
```

Las columnas de `distinctOn()` deben aparecer primero en `orderBy()`.

## 16.15. GROUP BY en SQL Builder

```ts
const plan = db.sql.public.post
  .select((f, fns) => ({
    userId: f.userId,
    total: fns.count()
  }))
  .groupBy("userId")
  .build();

const result = await db.query(plan);
```

## 16.16. HAVING en SQL Builder

```ts
const plan = db.sql.public.post
  .select((f, fns) => ({
    userId: f.userId,
    total: fns.count()
  }))
  .groupBy("userId")
  .having((f, fns) =>
    fns.gt(fns.count(), 5)
  )
  .build();

const result = await db.query(plan);
```

## 16.17. INSERT en SQL Builder

`insert()` siempre recibe un arreglo, incluso para un solo registro.

```ts
const plan = db.sql.public.user
  .insert([
    {
      id: crypto.randomUUID(),
      name: "Strux",
      email: "strux@gmail.com",
      password: "hashed_password",
      role: "user"
    }
  ])
  .build();

await db.execute(plan);
```

## 16.18. INSERT con RETURNING

```ts
const plan = db.sql.public.user
  .insert([
    {
      id: crypto.randomUUID(),
      name: "Strux",
      email: "strux@gmail.com",
      password: "hashed_password",
      role: "user"
    }
  ])
  .returning("id", "email")
  .build();

const result = await db.query(plan);
```

## 16.19. UPDATE en SQL Builder

```ts
const plan = db.sql.public.user
  .update({
    name: "Nuevo nombre"
  })
  .where((f, fns) =>
    fns.eq(f.email, "strux@gmail.com")
  )
  .build();

const result = await db.execute(plan);
```

## 16.20. UPDATE con RETURNING

```ts
const plan = db.sql.public.user
  .update({
    name: "Nuevo nombre"
  })
  .where((f, fns) =>
    fns.eq(f.id, userId)
  )
  .returning("id", "name")
  .build();

const result = await db.query(plan);
```

## 16.21. DELETE en SQL Builder

```ts
const plan = db.sql.public.user
  .delete()
  .where((f, fns) =>
    fns.eq(f.id, userId)
  )
  .build();

const result = await db.execute(plan);
```

## 16.22. DELETE con RETURNING

```ts
const plan = db.sql.public.user
  .delete()
  .where((f, fns) =>
    fns.eq(f.id, userId)
  )
  .returning("id", "email")
  .build();

const result = await db.query(plan);
```

**Advertencia:** en SQL Builder, un `update()` o `delete()` sin `where()` afecta todos los registros de la tabla.

## 16.23. Ejecutar una consulta SQL Builder

El proceso normal es:

```ts
const plan = db.sql.public.user
  .select("id", "email")
  .build();

const result = await db.query(plan);
```

Para consultas de escritura sin `returning()`:

```ts
const plan = db.sql.public.user
  .delete()
  .where((f, fns) => fns.eq(f.id, userId))
  .build();

const result = await db.execute(plan);
```

- `db.query(plan)` devuelve las filas.
- `db.execute(plan)` devuelve `{ affectedRows }` para escrituras sin filas de retorno.

---

# 17. SQL RAW

Cuando necesitas escribir SQL directamente, Prisma 8 dispone de `db.raw.sql`.

## 17.1. SELECT RAW

```ts
const plan = db.raw.sql`
  SELECT id, email
  FROM "User"
`.build();

const users = await db.query(plan);
```

## 17.2. SELECT con parámetros

```ts
const email = "strux@gmail.com";

const plan = db.raw.sql`
  SELECT id, email
  FROM "User"
  WHERE email = ${email}
`.build();

const users = await db.query(plan);
```

## 17.3. UPDATE RAW

```ts
const plan = db.raw.sql`
  UPDATE "User"
  SET name = ${"Nuevo nombre"}
  WHERE id = ${userId}
`.build();

const result = await db.execute(plan);
```

## 17.4. DELETE RAW

```ts
const plan = db.raw.sql`
  DELETE FROM "User"
  WHERE id = ${userId}
`.build();

const result = await db.execute(plan);
```

Utiliza parámetros para los valores dinámicos. Nunca concatenes directamente datos del usuario dentro de una consulta SQL.

---

# 18. Transacciones

Las transacciones permiten ejecutar varias consultas como una sola operación.

## 18.1. Transacción básica

```ts
const result = await db.transaction(async (tx) => {

  const user = await tx.orm.public.User.create({
    name: "Strux",
    email: "strux@gmail.com",
    password: "hashed_password"
  });

  const post = await tx.orm.public.Post.create({
    title: "Primera publicación",
    content: "Contenido",
    published: true,
    authorId: user.id
  });

  return {
    user,
    post
  };

});
```

## 18.2. Transacción con actualización y eliminación

```ts
await db.transaction(async (tx) => {

  await tx.orm.public.Product
    .where({ id: productId })
    .update({ stock: 10 });

  await tx.orm.public.Post
    .where({ id: postId })
    .delete();

});
```

## 18.3. Rollback automático

```ts
try {

  await db.transaction(async (tx) => {

    await tx.orm.public.User.create({
      name: "Strux",
      email: "strux@gmail.com",
      password: "hashed_password"
    });

    throw new Error("Error de prueba");

  });

} catch (error) {

  console.error("La transacción fue revertida");

}
```

Si el callback falla, se revierten los cambios de la transacción.

## 18.4. Bloqueo de filas

PostgreSQL permite bloquear filas dentro de una transacción.

```ts
await db.transaction(async (tx) => {

  const user = await tx.orm.public.User
    .where({ id: userId })
    .forUpdate()
    .first();

  if (!user) return;

  await tx.orm.public.User
    .where({ id: userId })
    .update({
      role: "admin"
    });

});
```

También existen:

- `forUpdate()`
- `forNoKeyUpdate()`
- `forShare()`
- `forKeyShare()`

Opciones para `forUpdate()`:

```ts
.forUpdate({ nowait: true })
```

```ts
.forUpdate({ skipLocked: true })
```

Estos bloqueos son específicos de PostgreSQL y requieren soporte registrado en el contrato.

---

# 19. Consultas de ejemplo para Express

## Obtener usuarios

```ts
export const getUsers = async () => {

  return await db.orm.public.User
    .select("id", "name", "email")
    .orderBy((u) => u.createdAt.desc())
    .all();

};
```

## Buscar un usuario

```ts
export const getUserById = async (id: string) => {

  return await db.orm.public.User
    .where({ id })
    .select("id", "name", "email")
    .first();

};
```

## Buscar por correo

```ts
export const getUserByEmail = async (email: string) => {

  return await db.orm.public.User
    .whereUnique({ email })
    .first();

};
```

## Crear usuario

```ts
export const createUser = async (
  name: string,
  email: string,
  password: string
) => {

  return await db.orm.public.User.create({
    name,
    email,
    password
  });

};
```

## Actualizar usuario

```ts
export const updateUser = async (
  id: string,
  name: string
) => {

  return await db.orm.public.User
    .where({ id })
    .update({ name });

};
```

## Eliminar usuario

```ts
export const deleteUser = async (id: string) => {

  return await db.orm.public.User
    .where({ id })
    .delete();

};
```

---

# 20. Resumen de métodos

## ORM Client

| Categoría | Métodos |
|---|---|
| Lectura | `all()`, `first()`, `firstOrThrow()` |
| Búsqueda | `where()`, `whereUnique()` |
| Selección | `select()`, `include()` |
| Ordenamiento | `orderBy()` |
| Paginación | `limit()`, `offset()`, `cursor()` |
| Distintos | `distinct()`, `distinctOn()` |
| Variantes | `variant()` |
| Bloqueos | `forUpdate()`, `forNoKeyUpdate()`, `forShare()`, `forKeyShare()` |
| Creación | `create()`, `createAll()`, `createAndCount()` |
| Actualización | `update()`, `updateAll()`, `updateAndCount()` |
| Eliminación | `delete()`, `deleteAll()`, `deleteAndCount()` |
| Inserción/actualización | `upsert()` |
| Agregaciones | `aggregate()`, `groupBy()`, `having()` |
| Relaciones | `some()`, `every()`, `none()`, `connect()`, `disconnect()` |
| Transacciones | `db.transaction()` |

## Operadores de filtros

```ts
.eq()
.neq()
.gt()
.gte()
.lt()
.lte()
.in()
.notIn()
.like()
.ilike()
.isNull()
.isNotNull()
```

## Operadores lógicos

```ts
and()
or()
not()
all()
```

## Agregaciones

```ts
count()
countBigInt()
sum()
sumBigInt()
avg()
avgDecimal()
min()
max()
```

## SQL Builder

| Categoría | Métodos |
|---|---|
| Inicio | `select()`, `insert()`, `update()`, `delete()` |
| Filtros | `where()`, `having()` |
| Selección | `select()`, `returning()` |
| Ordenamiento | `orderBy()` |
| Paginación | `limit()`, `offset()` |
| Agrupación | `groupBy()` |
| Distintos | `distinct()`, `distinctOn()` |
| Joins | `innerJoin()`, `outerLeftJoin()`, `outerRightJoin()`, `outerFullJoin()` |
| Joins laterales | `lateralJoin()`, `outerLateralJoin()` |
| Subconsultas | `as()` |
| Ejecución | `build()`, `db.query()`, `db.execute()` |

---

# 21. Documentación oficial

- [Reading data](https://www.prisma.io/docs/orm/fundamentals/reading-data)
- [Writing data](https://www.prisma.io/docs/orm/fundamentals/writing-data)
- [Relations and joins](https://www.prisma.io/docs/orm/fundamentals/relations-and-joins)
- [Transactions](https://www.prisma.io/docs/orm/fundamentals/transactions)
- [ORM Client Reference](https://www.prisma.io/docs/orm/reference/orm-client)
- [SQL Query Builder Reference](https://www.prisma.io/docs/orm/reference/sql-query-builder)
- [Advanced queries](https://www.prisma.io/docs/orm/fundamentals/advanced-queries)
- [Raw queries](https://www.prisma.io/docs/orm/reference/raw-queries)

**Nota:** esta referencia está enfocada en PostgreSQL. Algunas operaciones, como `aggregate()`, `groupBy()`, `having()`, `distinctOn()` y determinados joins, tienen disponibilidad específica del conector. Comprueba el autocompletado de TypeScript y la documentación de tu versión exacta de Prisma 8.