import { Router } from "express";
import { BusController } from "../controllers/bus.controller";
import { authenticate, requireSuperAdminOrOrgAdmin } from "../middleware/auth";
import { enforceBusLimit } from "../middleware/planEnforcer";

const router = Router();

// Public bus inventory access for unauthenticated student live tracking portal
router.get("/", BusController.getBuses);

router.use(authenticate);

router.post("/", requireSuperAdminOrOrgAdmin, enforceBusLimit, BusController.createBus);
router.get("/:busId/qrcode", requireSuperAdminOrOrgAdmin, BusController.getBusQRCode);
router.delete("/:busId", requireSuperAdminOrOrgAdmin, BusController.deleteBus);

export default router;
