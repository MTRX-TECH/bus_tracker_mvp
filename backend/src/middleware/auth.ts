import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, ITokenPayload } from "../utils/jwt";
import { UnauthorizedError, ForbiddenError } from "../utils/errors";
import { UserRole } from "@mtrx/shared";
import { UserModel } from "../models/User";

export interface AuthenticatedRequest extends Request {
  user?: ITokenPayload;
  userDetails?: any;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.mtrx_access_token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      throw new UnauthorizedError("Authentication required. No token found.");
    }

    const payload = verifyAccessToken(token);
    req.user = payload;

    const dbUser = await UserModel.findById(payload.userId).select("-passwordHash");
    if (!dbUser) {
      throw new UnauthorizedError("User session no longer valid in DB.");
    }

    req.userDetails = dbUser;
    next();
  } catch (error: any) {
    next(new UnauthorizedError(`Invalid or expired session: ${error.message}`));
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError("User not authenticated."));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(`Role '${req.user.role}' lacks authorization for this endpoint. Allowed: ${allowedRoles.join(", ")}`)
      );
    }
    next();
  };
};

export const requireSuperAdminOrOrgAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(new UnauthorizedError());
  }
  if (req.user.role === UserRole.SUPER_ADMIN) {
    return next();
  }
  if (req.user.role === UserRole.ORG_ADMIN) {
    // Org Admin can only access resources tied to their organization
    const targetOrgId = req.params.orgId || req.body.orgId || req.query.orgId;
    if (targetOrgId && targetOrgId.toString() !== req.user.orgId?.toString()) {
      return next(new ForbiddenError("Access restricted to your assigned organization only."));
    }
    return next();
  }
  return next(new ForbiddenError("Administrator permissions required."));
};
