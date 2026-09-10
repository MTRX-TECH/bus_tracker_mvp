import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { UserRole } from "@mtrx/shared";

export interface ITokenPayload {
  userId: string;
  role: UserRole;
  orgId?: string;
}

export const generateAccessToken = (payload: ITokenPayload): string => {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRE as any,
  });
};

export const generateRefreshToken = (payload: ITokenPayload): string => {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRE as any,
  });
};

export const verifyAccessToken = (token: string): ITokenPayload => {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as ITokenPayload;
};

export const verifyRefreshToken = (token: string): ITokenPayload => {
  return jwt.verify(token, config.JWT_REFRESH_SECRET) as ITokenPayload;
};
