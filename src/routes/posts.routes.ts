import { Router } from "express";
import * as postsController from "../controllers/posts.controller.js";
import {
  authenticateEither,
  requireAnyPermission,
  requirePermission,
} from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import {
  createPostValidators,
  postIdValidator,
  postInputValidators,
} from "../validators/auth.validators.js";

const router = Router();

router.get("/", postsController.listPublished);
router.get("/mine", authenticateEither, postsController.listMine);
router.post(
  "/",
  authenticateEither,
  requirePermission("posts:create"),
  createPostValidators,
  validateRequest,
  postsController.create,
);
router.patch(
  "/:postId",
  authenticateEither,
  requireAnyPermission("posts:update:any", "posts:update:own"),
  postIdValidator,
  postInputValidators,
  validateRequest,
  postsController.update,
);
router.delete(
  "/:postId",
  authenticateEither,
  requireAnyPermission("posts:delete:any", "posts:delete:own"),
  postIdValidator,
  validateRequest,
  postsController.remove,
);

export default router;
