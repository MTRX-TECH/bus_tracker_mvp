import { Router } from "express";
import { RouteController } from "../controllers/route.controller";
import { authenticate, requireSuperAdminOrOrgAdmin } from "../middleware/auth";

const router = Router();

// Public routes listing for unauthenticated student and passenger access
router.get("/", RouteController.getRoutes);

router.use(authenticate);

router.post("/", requireSuperAdminOrOrgAdmin, RouteController.createRoute);
router.put("/:routeId", requireSuperAdminOrOrgAdmin, RouteController.updateRoute);
router.delete("/:routeId", requireSuperAdminOrOrgAdmin, RouteController.deleteRoute);
router.post("/:routeId/assign", requireSuperAdminOrOrgAdmin, RouteController.assignRouteToBus);

export default router;
