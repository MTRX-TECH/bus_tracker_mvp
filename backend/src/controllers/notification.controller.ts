import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { NotificationModel } from "../models/Notification";
import { UserRole } from "@mtrx/shared";

export class NotificationController {
  static async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: any = {};
      if (req.user?.role !== UserRole.SUPER_ADMIN) {
        query.$or = [
          { orgId: req.user?.orgId, recipientId: { $exists: false } },
          { orgId: req.user?.orgId, recipientId: null },
          { recipientId: req.user?.userId },
          { recipientRole: req.user?.role },
        ];
      }

      const notifications = await NotificationModel.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("meta.busId", "busNumber registrationPlate")
        .populate("meta.driverId", "name phone");

      const unreadCount = await NotificationModel.countDocuments({ ...query, read: false, isRead: false });

      res.status(200).json({ success: true, count: notifications.length, unreadCount, data: notifications });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await NotificationModel.findByIdAndUpdate(id, { read: true, isRead: true });
      res.status(200).json({ success: true, message: "Notification acknowledged." });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: any = {};
      if (req.user?.role !== UserRole.SUPER_ADMIN) {
        query.orgId = req.user?.orgId;
      }
      await NotificationModel.updateMany(query, { read: true, isRead: true });
      res.status(200).json({ success: true, message: "All notifications acknowledged." });
    } catch (error) {
      next(error);
    }
  }
}
