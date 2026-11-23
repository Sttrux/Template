import type { RequestHandler } from "express";
import { listRoles, listUsers } from "../repository/user.repository.js";
import { changeUserRole } from "../services/role.service.js";
import { AppError } from "../utils/app-error.js";

export const getUsers: RequestHandler = async (_req, res) => {
  res.json({ users: await listUsers() });
};

export const getRoles: RequestHandler = async (_req, res) => {
  const roles = await listRoles();
  res.json({
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.rolePermissions.map(({ permission }) => permission.name),
    })),
  });
};

export const assignRole: RequestHandler = async (req, res) => {
  if (!req.user) throw new AppError(401, "Login required");
  const userId = Number(req.params.userId);
  const roleName = req.params.roleName;
  if (typeof roleName !== "string") throw new AppError(400, "Invalid role name");
  await changeUserRole(req.user, userId, roleName, true);
  res.status(204).end();
};

export const revokeRole: RequestHandler = async (req, res) => {
  if (!req.user) throw new AppError(401, "Login required");
  const userId = Number(req.params.userId);
  const roleName = req.params.roleName;
  if (typeof roleName !== "string") throw new AppError(400, "Invalid role name");
  await changeUserRole(req.user, userId, roleName, false);
  res.status(204).end();
};
