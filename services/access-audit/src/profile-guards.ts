import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";

export const requireUserTransparencyFeature = (_req: Request, res: Response, next: NextFunction) => {
  if (!config.userTransparencyEnabled) {
    res.status(404).json({
      error: "transparency_not_available",
      deploymentProfile: config.deploymentProfile
    });
    return;
  }
  next();
};
