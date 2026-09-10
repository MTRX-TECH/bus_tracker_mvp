import { Router } from "express";
import { ReportController } from "../controllers/report.controller";
import { authenticate, requireSuperAdminOrOrgAdmin } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireSuperAdminOrOrgAdmin);
router.get("/analytics", ReportController.getFilteredAnalytics);
router.get("/export", ReportController.exportTripReport);

export default router;
