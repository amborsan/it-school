import { Router } from "express";
import {
  getGrades,
  getGradeById,
  createGrade,
  updateGrade,
  deleteGrade,
} from "../controllers/grade.js";
import { validateUuidParam } from "../middleware/validate-uuid.js";

const router = Router();

// Check :id before any controller accesses the database.
router.param("id", validateUuidParam);

router.get("/", getGrades);
router.get("/:id", getGradeById);
router.post("/", createGrade);
router.put("/:id", updateGrade);
router.patch("/:id", updateGrade);
router.delete("/:id", deleteGrade);

export default router;
