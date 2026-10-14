import { Router } from "express";
import {
  getAuditLogs,
  getAuditLogById,
  createAuditLog,
  updateAuditLog,
  deleteAuditLog,
} from "../controllers/auditLog.js";
import { validateUuidParam } from "../middleware/validate-uuid.js";

const router = Router();

// Check :id before any controller accesses the database.
router.param("id", validateUuidParam);

router.get("/", getAuditLogs);
router.get("/:id", getAuditLogById);
router.post("/", createAuditLog);
router.put("/:id", updateAuditLog);
router.patch("/:id", updateAuditLog);
router.delete("/:id", deleteAuditLog);

export default router;
