import type { RequestHandler } from "express";
import type { JwtPayload } from "jsonwebtoken";
import { AppError } from "../../shared/AppError.js";
import { verifyToken } from "./auth.service.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  const authorization = req.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    next(new AppError(401, "UNAUTHORIZED", "A valid bearer token is required"));
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    next(new AppError(401, "UNAUTHORIZED", "A valid bearer token is required"));
    return;
  }

  try {
    const payload = verifyToken(token) as JwtPayload;
    if (!payload.sub) throw new Error("JWT subject is missing");
    res.locals.userId = payload.sub;
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Token is invalid or expired"));
  }
};
