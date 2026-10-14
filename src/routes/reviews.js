import { Router } from "express";
import {
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
} from "../controllers/review.js";
import { validateUuidParam } from "../middleware/validate-uuid.js";

const router = Router();

// Check :id before any controller accesses the database.
router.param("id", validateUuidParam);

router.get("/", getReviews);
router.get("/:id", getReviewById);
router.post("/", createReview);
router.put("/:id", updateReview);
router.patch("/:id", updateReview);
router.delete("/:id", deleteReview);

export default router;
