import { Router } from "express";
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/course.js";
import { validateUuidParam } from "../middleware/validate-uuid.js";

const router = Router();

// Check :id before any controller accesses the database.
router.param("id", validateUuidParam);

router.get("/", getCourses);
router.get("/:id", getCourseById);
router.post("/", createCourse);
router.put("/:id", updateCourse);
router.patch("/:id", updateCourse);
router.delete("/:id", deleteCourse);

export default router;
