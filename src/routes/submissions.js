import { Router } from "express";
import {
  getSubmissions,
  getSubmissionById,
  createSubmission,
  updateSubmission,
  deleteSubmission,
} from "../controllers/submission.js";
import { validateUuidParam } from "../middleware/validate-uuid.js";

const router = Router();

// Check :id before any controller accesses the database.
router.param("id", validateUuidParam);

router.get("/", getSubmissions);
router.get("/:id", getSubmissionById);
router.post("/", createSubmission);
router.put("/:id", updateSubmission);
router.patch("/:id", updateSubmission);
router.delete("/:id", deleteSubmission);

export default router;
