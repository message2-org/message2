import type express from "express";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

export type AuthPayload = { sub: string; role: "user" | "admin" };

export type AuthRequest = express.Request & { auth?: AuthPayload };

export const auth = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthPayload & { typ?: string };
    if (!decoded.sub || !decoded.role || decoded.typ === "refresh") {
      res.status(401).json({ error: "invalid token" });
      return;
    }
    req.auth = { sub: decoded.sub, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
};

export const requireInternalService = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const secret = req.header("x-internal-secret") ?? "";
  if (!secret || secret !== config.internalServiceSecret) {
    res.status(401).json({ error: "invalid internal service credentials" });
    return;
  }
  next();
};
