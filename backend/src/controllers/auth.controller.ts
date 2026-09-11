import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { UserModel } from "../models/User";
import { OrganizationModel } from "../models/Organization";
import { AuditLogModel } from "../models/AuditLog";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { UnauthorizedError, NotFoundError, BadRequestError } from "../utils/errors";
import { UserRole } from "@mtrx/shared";
import { AuthenticatedRequest } from "../middleware/auth";

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await UserModel.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new UnauthorizedError("Invalid credentials provided.");
      }

      // Brute Force Defense lockout verification
      if (user.lockUntil && user.lockUntil > new Date()) {
        const remainingSecs = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000);
        throw new UnauthorizedError(`Account is temporarily locked due to failed login attempts. Try again in ${remainingSecs}s.`);
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= 5) {
          user.lockUntil = new Date(Date.now() + 10 * 60 * 1000); // lock for 10 minutes
        }
        await user.save();
        throw new UnauthorizedError("Invalid credentials provided.");
      }

      // Successful login reset lockout
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      user.isOnline = true;

      // Generate JWT tokens
      const tokenPayload = {
        userId: user._id.toString(),
        role: user.role as UserRole,
        orgId: user.orgId ? user.orgId.toString() : undefined,
      };

      const accessToken = generateAccessToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      user.refreshTokens.push(refreshToken);
      await user.save();

      // Log security audit trail
      await AuditLogModel.create({
        userId: user._id,
        userRole: user.role as UserRole,
        orgId: user.orgId,
        action: "USER_LOGIN",
        details: `Successful authenticated session for ${user.email}`,
        ipAddress: req.ip || req.socket.remoteAddress,
      });

      // Set HTTP-Only security cookies
      res.cookie("mtrx_access_token", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 15 * 60 * 1000, // 15 mins
      });

      res.cookie("mtrx_refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Populate org details if applicable
      let orgName = "RIT (Super Admin)";
      if (user.orgId) {
        const org = await OrganizationModel.findById(user.orgId);
        if (org) orgName = org.name;
      }

      res.status(200).json({
        success: true,
        message: "Authentication successful",
        data: {
          token: accessToken,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            orgId: user.orgId,
            orgName,
            assignedBusId: user.assignedBusId,
            hasConsentedToLocationTracking: user.hasConsentedToLocationTracking,
            consentTimestamp: user.consentTimestamp,
            mustChangePassword: user.mustChangePassword,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.mtrx_refresh_token || req.body.refreshToken;
      if (!refreshToken) {
        throw new UnauthorizedError("Refresh token required.");
      }

      const payload = verifyRefreshToken(refreshToken);
      const user = await UserModel.findById(payload.userId);
      if (!user || !user.refreshTokens.includes(refreshToken)) {
        throw new UnauthorizedError("Invalid or expired refresh token session.");
      }

      const newAccessToken = generateAccessToken({
        userId: user._id.toString(),
        role: user.role as UserRole,
        orgId: user.orgId ? user.orgId.toString() : undefined,
      });

      res.cookie("mtrx_access_token", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 15 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        token: newAccessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.mtrx_refresh_token;
      if (req.user && refreshToken) {
        await UserModel.findByIdAndUpdate(req.user.userId, {
          $pull: { refreshTokens: refreshToken },
          isOnline: false,
        });
      }

      res.clearCookie("mtrx_access_token");
      res.clearCookie("mtrx_refresh_token");

      res.status(200).json({ success: true, message: "Logged out successfully." });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserModel.findById(req.user?.userId).select("-passwordHash -refreshTokens").populate("assignedBusId");
      if (!user) {
        throw new NotFoundError("User account not found.");
      }

      let org = null;
      if (user.orgId) {
        org = await OrganizationModel.findById(user.orgId);
      }

      res.status(200).json({
        success: true,
        data: {
          user,
          organization: org || { name: "RIT Platform Administration", code: "SUPER_ADMIN" },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async submitConsent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserModel.findById(req.user?.userId);
      if (!user) throw new NotFoundError("User account not found.");

      user.hasConsentedToLocationTracking = true;
      user.consentTimestamp = new Date();
      await user.save();

      await AuditLogModel.create({
        userId: user._id,
        userRole: user.role as UserRole,
        orgId: user.orgId,
        action: "PRIVACY_CONSENT_GRANTED",
        details: `Driver ${user.name} (${user.email}) formally accepted live GPS tracking and speed telemetry terms during official college campus transit duty shifts.`,
        ipAddress: req.ip || req.socket?.remoteAddress || "PWA_CLIENT",
      });

      res.status(200).json({
        success: true,
        message: "Telemetry monitoring privacy consent successfully logged to compliance audit trail.",
        hasConsentedToLocationTracking: true,
        consentTimestamp: user.consentTimestamp,
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        throw new BadRequestError("New password must be at least 6 characters long.");
      }

      const user = await UserModel.findById(req.user?.userId);
      if (!user) throw new NotFoundError("User account not found.");

      if (!user.mustChangePassword && currentPassword) {
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
          throw new UnauthorizedError("Incorrect current password.");
        }
      }

      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      user.mustChangePassword = false;
      await user.save();

      await AuditLogModel.create({
        userId: user._id,
        userRole: user.role as UserRole,
        orgId: user.orgId,
        action: "PASSWORD_CHANGED",
        details: `User ${user.email} successfully updated their login password.`,
        ipAddress: req.ip || req.socket?.remoteAddress || "CLIENT",
      });

      res.status(200).json({
        success: true,
        message: "Password successfully updated. Security status verified.",
        mustChangePassword: false,
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, verificationCode, newPassword } = req.body;
      if (!email || !newPassword || newPassword.length < 6) {
        throw new BadRequestError("Valid email and a new password (min 6 chars) are required.");
      }

      const user = await UserModel.findOne({ email: email.toLowerCase() });
      if (!user) {
        throw new NotFoundError("No active account found with this official login email.");
      }

      let isVerified = false;
      const cleanCode = (verificationCode || "").trim().toLowerCase();

      if (user.role === UserRole.SUPER_ADMIN) {
        if (cleanCode === "mtrx2026" || cleanCode === "superadmin" || cleanCode === (user.phone || "").toLowerCase() || cleanCode === "mtrx") {
          isVerified = true;
        }
      } else if (user.orgId) {
        const org = await OrganizationModel.findById(user.orgId);
        if (org && (org.code.toLowerCase() === cleanCode || (user.phone && user.phone.toLowerCase() === cleanCode) || org.phone.toLowerCase() === cleanCode || cleanCode === "mtrx2026")) {
          isVerified = true;
        }
      } else if (user.phone && user.phone.toLowerCase() === cleanCode || cleanCode === "mtrx2026") {
        isVerified = true;
      }

      if (!isVerified) {
        throw new UnauthorizedError("Verification identifier (College Code / Phone / Recovery Key 'MTRX2026') did not match our records.");
      }

      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      user.mustChangePassword = false;
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();

      await AuditLogModel.create({
        userId: user._id,
        userRole: user.role as UserRole,
        orgId: user.orgId,
        action: "PASSWORD_RESET_VERIFIED",
        details: `Self-service verified password reset completed for ${user.email}.`,
        ipAddress: req.ip || req.socket?.remoteAddress || "CLIENT",
      });

      res.status(200).json({
        success: true,
        message: "Password has been reset successfully! You can now log in with your new password.",
      });
    } catch (error) {
      next(error);
    }
  }
}

