import { body, param } from "express-validator";

export const registerValidators = [
  body("username")
    .isString()
    .trim()
    .isLength({ min: 3, max: 32 })
    .matches(/^[a-zA-Z0-9._-]+$/),
  body("email").isEmail().isLength({ max: 254 }).normalizeEmail(),
  body("password").isString().isLength({ min: 12, max: 128 }),
];

export const loginValidators = [
  body("login").isString().trim().isLength({ min: 3, max: 254 }),
  body("password").isString().isLength({ min: 1, max: 128 }),
];

export const postIdValidator = [
  param("postId").isInt({ min: 1 }).toInt(),
];

export const roleAssignmentValidators = [
  param("userId").isInt({ min: 1 }).toInt(),
  param("roleName").isIn(["admin", "moderator", "user"]),
];

export const postInputValidators = [
  body("title").optional().isString().trim().isLength({ min: 1, max: 255 }),
  body("content").optional().isString().trim().isLength({ min: 1, max: 50000 }),
  body("published").optional().isBoolean().toBoolean(),
];

export const createPostValidators = [
  body("title").isString().trim().isLength({ min: 1, max: 255 }),
  body("content").isString().trim().isLength({ min: 1, max: 50000 }),
  body("published").optional().isBoolean().toBoolean(),
];
