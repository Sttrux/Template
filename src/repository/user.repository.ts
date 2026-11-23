import type { AuthenticatedUser, UserCredentials } from "../interfaces/auth.interface.js";
import { db } from "../prisma/db.js";

async function findLoadedUserById(id: number) {
  return db.orm.public.Users.where({ id })
    .include("userRoles", (userRole) =>
      userRole.include("role", (role) =>
        role.include("rolePermissions", (rolePermission) =>
          rolePermission.include("permission"),
        ),
      ),
    )
    .first();
}

type LoadedUser = NonNullable<Awaited<ReturnType<typeof findLoadedUserById>>>;

function mapUser(user: LoadedUser): AuthenticatedUser {
  const roles = user.userRoles.flatMap(({ role }) => role ? [role.name] : []);
  const permissions = new Set(
    user.userRoles.flatMap(({ role }) =>
      role?.rolePermissions.map(({ permission }) => permission.name) ?? [],
    ),
  );

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roles,
    permissions: [...permissions],
  };
}

function mapCredentials(user: LoadedUser): UserCredentials {
  return {
    ...mapUser(user),
    passwordHash: user.passwordHash,
  };
}

export async function findCredentialsByLogin(
  login: string,
): Promise<UserCredentials | null> {
  const normalizedLogin = login.trim().toLowerCase();
  const user = await db.orm.public.Users.where({ username: normalizedLogin })
    .include("userRoles", (userRole) =>
      userRole.include("role", (role) =>
        role.include("rolePermissions", (rolePermission) =>
          rolePermission.include("permission"),
        ),
      ),
    )
    .first();

  if (user) return mapCredentials(user);

  const userByEmail = await db.orm.public.Users.where({ email: normalizedLogin })
    .include("userRoles", (userRole) =>
      userRole.include("role", (role) =>
        role.include("rolePermissions", (rolePermission) =>
          rolePermission.include("permission"),
        ),
      ),
    )
    .first();

  return userByEmail ? mapCredentials(userByEmail) : null;
}

export async function findAuthUserById(id: number): Promise<AuthenticatedUser | null> {
  const user = await findLoadedUserById(id);
  return user ? mapUser(user) : null;
}

export async function userExistsByEmail(email: string): Promise<boolean> {
  const user = await db.orm.public.Users.where({ email: email.toLowerCase() }).first();
  return user !== null;
}

export async function createUserWithDefaultRole(input: {
  username: string;
  email: string;
  passwordHash: string;
}): Promise<AuthenticatedUser> {
  const userId = await db.transaction(async (tx) => {
    const defaultRole = await tx.orm.public.Roles.where({ name: "user" }).first();
    if (!defaultRole) throw new Error("The default user role is missing from the database");

    const user = await tx.orm.public.Users.create({
      username: input.username.toLowerCase(),
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
    });

    await tx.orm.public.UserRoles.create({
      userId: user.id,
      roleId: defaultRole.id,
    });

    return user.id;
  });

  const createdUser = await findAuthUserById(userId);
  if (!createdUser) throw new Error("Created user could not be loaded");
  return createdUser;
}

export async function listUsers() {
  return db.orm.public.Users
    .select("id", "username", "email", "createdAt", "updatedAt")
    .orderBy((user) => user.id.asc())
    .all();
}

export async function listRoles() {
  return db.orm.public.Roles
    .include("rolePermissions", (rolePermission) =>
      rolePermission.include("permission"),
    )
    .orderBy((role) => role.id.asc())
    .all();
}
