import { Router } from "express";
import { classifyName } from "../controllers/classify.controller.js";

const router = Router();

router.get("/classify", classifyName);

export default router;
