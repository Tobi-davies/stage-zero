import { Router } from "express";
import {
  logout,
  handleGithubCallback,
  handleCliCallback,
  refreshTokens,
  redirectToGithub,
  getMe,
} from "../controllers/auth.controller.js";

const router = Router();

router.get("/github", redirectToGithub);
router.get("/github/callback", handleGithubCallback);
router.post("/github/callback", handleCliCallback);
router.post("/refresh", refreshTokens);
router.post("/logout", logout);
router.get("/me", getMe);

export default router;
