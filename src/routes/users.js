import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/user.js";
import { validateUuidParam } from "../middleware/validate-uuid.js";

const router = Router();

// Check :id before any controller accesses the database.
router.param("id", validateUuidParam);

router.get("/", getUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;
