import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthenticatedUser } from "../interfaces/auth.interface.js";
import {
  createUserWithDefaultRole,
  findCredentialsByLogin,
  userExistsByEmail,
} from "../repository/user.repository.js";
import { AppError } from "../utils/app-error.js";

export async function verifyCredentials(
  login: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const user = await findCredentialsByLogin(login);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;

  const { passwordHash: _passwordHash, ...authenticatedUser } = user;
  return authenticatedUser;
}

export async function registerUser(input: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthenticatedUser> {
  const normalizedUsername = input.username.trim().toLowerCase();
  const normalizedEmail = input.email.trim().toLowerCase();

  if (await findCredentialsByLogin(normalizedUsername)) {
    throw new AppError(409, "Username or email is already in use");
  }
  if (await userExistsByEmail(normalizedEmail)) {
    throw new AppError(409, "Username or email is already in use");
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  try {
    return await createUserWithDefaultRole({
      username: normalizedUsername,
      email: normalizedEmail,
      passwordHash,
    });
  } catch (error) {
    if (getDatabaseErrorCode(error) === "23505") {
      throw new AppError(409, "Username or email is already in use");
    }
    throw error;
  }
}

export async function createAccessToken(user: AuthenticatedUser): Promise<string> {
  return jwt.sign({ sub: String(user.id) }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
    issuer: "template-api",
    audience: "template-api",
  });
}

function getDatabaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}
