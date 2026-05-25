import type { Request, Response, NextFunction } from "express";
import { instanceConfig } from "./instance-config.js";

export const requireUserTransparency = (_req: Request, res: Response, next: NextFunction) => {
  if (!instanceConfig.userTransparencyEnabled) {
    res.status(404).json({
      error: "transparency_not_available",
      deploymentProfile: instanceConfig.deploymentProfile
    });
    return;
  }
  next();
};
