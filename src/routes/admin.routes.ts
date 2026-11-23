import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import {
  authenticateEither,
  requirePermission,
} from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { roleAssignmentValidators } from "../validators/auth.validators.js";

const router = Router();

router.use(authenticateEither);
router.get("/users", requirePermission("users:read"), adminController.getUsers);
router.get("/roles", requirePermission("roles:manage"), adminController.getRoles);
router.post(
  "/users/:userId/roles/:roleName",
  requirePermission("roles:manage"),
  roleAssignmentValidators,
  validateRequest,
  adminController.assignRole,
);
router.delete(
  "/users/:userId/roles/:roleName",
  requirePermission("roles:manage"),
  roleAssignmentValidators,
  validateRequest,
  adminController.revokeRole,
);

export default router;
