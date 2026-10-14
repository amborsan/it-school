import { Router } from "express";
import {
  getCourseMaterials,
  getCourseMaterialById,
  createCourseMaterial,
  updateCourseMaterial,
  deleteCourseMaterial,
} from "../controllers/courseMaterial.js";
import { validateUuidParam } from "../middleware/validate-uuid.js";

const router = Router();

// Check :id before any controller accesses the database.
router.param("id", validateUuidParam);

router.get("/", getCourseMaterials);
router.get("/:id", getCourseMaterialById);
router.post("/", createCourseMaterial);
router.put("/:id", updateCourseMaterial);
router.patch("/:id", updateCourseMaterial);
router.delete("/:id", deleteCourseMaterial);

export default router;
