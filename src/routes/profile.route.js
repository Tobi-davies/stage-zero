import { Router } from "express";
import {
  CreateProfile,
  deleteProfile,
  getAllProfiles,
  getSingleProfile,
  SearchProfiles,
  exportProfiles,
  importProfiles,
} from "../controllers/profile.controller.js";
import { requireRole } from "../middleware/auth.js";
import { cacheMiddleware } from "../middleware/cache.js";
import { upload } from "../config/multer.js";

const router = Router();

// Admin only — create and delete
router.post("/profiles", requireRole("admin"), CreateProfile);
router.delete("/profiles/:id", requireRole("admin"), deleteProfile);
// router.post('/profiles/import', requireRole('admin'), importProfiles)

// Both roles — read and search
router.get("/profiles", cacheMiddleware, getAllProfiles);
router.get("/profiles/search", cacheMiddleware, SearchProfiles);
router.get("/profiles/export", exportProfiles);

router.post(
  "/profiles/import",
  requireRole("admin"),
  upload.single("file"),
  importProfiles,
);

router.get("/profiles/:id", cacheMiddleware, getSingleProfile);

export default router;
