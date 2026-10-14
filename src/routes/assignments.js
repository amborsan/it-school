import { Router } from "express";
import {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "../controllers/assignment.js";
import { validateUuidParam } from "../middleware/validate-uuid.js";

const router = Router();

// Check :id before any controller accesses the database.
router.param("id", validateUuidParam);

router.get("/", getAssignments);
router.get("/:id", getAssignmentById);
router.post("/", createAssignment);
router.put("/:id", updateAssignment);
router.patch("/:id", updateAssignment);
router.delete("/:id", deleteAssignment);

export default router;
