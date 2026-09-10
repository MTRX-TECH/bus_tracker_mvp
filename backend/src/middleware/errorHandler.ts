import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { Logger } from "../utils/logger";
import { ZodError } from "zod";

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Validation Failed",
      details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
    return;
  }

  const statusCode = (err as AppError).statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (statusCode === 500) {
    Logger.error(`Unhandled API Exception [${req.method} ${req.originalUrl}]:`, err.stack || err);
  } else {
    Logger.warn(`Operational Error [${req.method} ${req.originalUrl}]: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
