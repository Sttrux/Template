import type { AuthenticatedUser } from "../interfaces/auth.interface.js";
import { setUserRole } from "../repository/role.repository.js";
import { AppError } from "../utils/app-error.js";

export async function changeUserRole(
  actor: AuthenticatedUser,
  targetUserId: number,
  roleName: string,
  assigned: boolean,
) {
  if (!actor.permissions.includes("roles:manage")) {
    throw new AppError(403, "Insufficient permission");
  }

  await setUserRole(actor.id, targetUserId, roleName, assigned);
}
