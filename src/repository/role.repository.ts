import { pool } from "../config/pool.js";
import { AppError } from "../utils/app-error.js";

export async function setUserRole(
  actorUserId: number,
  targetUserId: number,
  roleName: string,
  assigned: boolean,
) {
  try {
    await pool.query("CALL set_user_role($1, $2, $3, $4)", [
      actorUserId,
      targetUserId,
      roleName,
      assigned,
    ]);
  } catch (error) {
    const code = getDatabaseErrorCode(error);
    if (code === "42501") throw new AppError(403, "Only an admin can change role assignments");
    if (code === "22023") throw new AppError(400, "Unknown role");
    if (code === "P0002") throw new AppError(404, "User not found");
    if (code === "23514") throw new AppError(409, "Cannot revoke the last admin role");
    throw error;
  }
}

function getDatabaseErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}
