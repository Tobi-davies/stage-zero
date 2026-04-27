import { Router } from "express";
import {
  CreateProfile,
  deleteProfile,
  getAllProfiles,
  getSingleProfile,
  // exportProfiles
} from "../controllers/profile.controller.js";
import { requireRole } from "../middleware/auth.js";

const router = Router();

// Admin only — create and delete
router.post("/profiles", requireRole("admin"), CreateProfile);
router.delete("/profiles/:id", requireRole("admin"), deleteProfile);

// Both roles — read and search
router.get("/profiles", getAllProfiles);
// router.get("/profiles/search", searchProfiles);
// router.get("/profiles/export", exportProfiles);
router.get("/profiles/:id", getSingleProfile);

export default router;
