import { Router } from "express";
import {
  getTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
} from "../controllers/teacher.js";
import { validateUuidParam } from "../middleware/validate-uuid.js";

const router = Router();

// Check :id before any controller accesses the database.
router.param("id", validateUuidParam);

router.get("/", getTeachers);
router.get("/:id", getTeacherById);
router.post("/", createTeacher);
router.put("/:id", updateTeacher);
router.patch("/:id", updateTeacher);
router.delete("/:id", deleteTeacher);

export default router;
