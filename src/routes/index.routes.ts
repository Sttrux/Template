import { Router } from "express";
import * as indexController from "../controllers/index.controller.js";

const router = Router();

router.get("/", indexController.getHomeData);
router.get("/health", indexController.getHealth);

export default router;