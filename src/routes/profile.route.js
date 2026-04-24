import { Router } from "express";
import {
  CreateProfile,
  deleteProfile,
  getAllProfiles,
  getSingleProfile,
  SearchProfiles,
} from "../controllers/profile.controller.js";

const router = Router();

router.post("/profiles", CreateProfile);
router.get("/profiles/search", SearchProfiles);
router.get("/profiles/:id", getSingleProfile);
router.delete("/profiles/:id", deleteProfile);
router.get("/profiles", getAllProfiles);

export default router;
