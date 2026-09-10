import { Router } from "express";
import { OrgController } from "../controllers/org.controller";
import { authenticate, requireRole, requireSuperAdminOrOrgAdmin } from "../middleware/auth";
import { enforceAdminLimit } from "../middleware/planEnforcer";
import { UserRole } from "@mtrx/shared";

const router = Router();

router.use(authenticate);

// Super Admin exclusive endpoints
router.get("/", requireRole(UserRole.SUPER_ADMIN), OrgController.getAllOrganizations);
router.post("/", requireRole(UserRole.SUPER_ADMIN), OrgController.createOrganization);
router.delete("/:orgId", requireRole(UserRole.SUPER_ADMIN), OrgController.deleteOrganization);

// Shared Admin endpoints
router.put("/:orgId", requireSuperAdminOrOrgAdmin, OrgController.updateOrganization);
router.post("/:orgId/users", requireSuperAdminOrOrgAdmin, enforceAdminLimit, OrgController.createOrgUser);
router.get("/:orgId/users", requireSuperAdminOrOrgAdmin, OrgController.getOrgUsers);

// Task 5: Admin Operational Gaps (Driver Shift Assignment, Audit Trail Logs, Bulk CSV Import)
router.put("/:orgId/drivers/:driverId/shift", requireSuperAdminOrOrgAdmin, OrgController.assignDriverShift);
router.get("/:orgId/audit-logs", requireSuperAdminOrOrgAdmin, OrgController.getAuditLogs);
router.post("/:orgId/import-drivers", requireSuperAdminOrOrgAdmin, enforceAdminLimit, OrgController.bulkImportDrivers);
router.post("/:orgId/import-buses", requireSuperAdminOrOrgAdmin, enforceAdminLimit, OrgController.bulkImportBuses);
router.put("/:orgId/governance", requireSuperAdminOrOrgAdmin, OrgController.updateGovernancePolicy);
router.post("/:orgId/retention-purge", requireSuperAdminOrOrgAdmin, OrgController.runDataRetentionPurge);

export default router;
