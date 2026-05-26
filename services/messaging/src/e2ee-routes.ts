import type { Express } from "express";
import type express from "express";
import type { PrismaClient } from "@prisma/client";
import { validateDeviceId, validatePublishDevicePrekeyBundleInput } from "@message2/contracts";
import {
  fetchUserPrekeyBundle,
  listMyDeviceBundles,
  publishDevicePrekeyBundle
} from "./e2ee-prekeys.js";

type AuthPayload = { sub: string; role: "user" | "admin" };
type AuthRequest = express.Request & { auth?: AuthPayload };

function routeParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

type RouteDeps = {
  app: Express;
  prisma: PrismaClient;
  auth: (req: AuthRequest, res: express.Response, next: express.NextFunction) => void;
};

export const registerE2eeRoutes = ({ app, prisma, auth }: RouteDeps) => {
  app.put("/e2ee/devices/:deviceId/bundle", auth, async (req: AuthRequest, res) => {
    const deviceId = routeParam(req.params.deviceId);
    if (!deviceId) {
      res.status(400).json({ error: "deviceId", message: "deviceId is required" });
      return;
    }
    const deviceErr = validateDeviceId(deviceId);
    if (deviceErr) {
      res.status(400).json({ error: deviceErr.field, message: deviceErr.message });
      return;
    }
    const validated = validatePublishDevicePrekeyBundleInput(req.body);
    if (!validated.ok) {
      res.status(400).json({ error: "validation_failed", details: validated.errors });
      return;
    }
    const summary = await publishDevicePrekeyBundle(
      prisma,
      req.auth!.sub,
      deviceId,
      validated.value
    );
    res.json(summary);
  });

  app.get("/e2ee/me/devices", auth, async (req: AuthRequest, res) => {
    const devices = await listMyDeviceBundles(prisma, req.auth!.sub);
    res.json({ devices });
  });

  app.get("/e2ee/users/:userId/bundle", auth, async (req: AuthRequest, res) => {
    const deviceIdRaw = typeof req.query.deviceId === "string" ? req.query.deviceId : undefined;
    if (deviceIdRaw) {
      const deviceErr = validateDeviceId(deviceIdRaw);
      if (deviceErr) {
        res.status(400).json({ error: deviceErr.field, message: deviceErr.message });
        return;
      }
    }
    const requireDmPeer = req.query.dm_peer_required === "true" || req.query.dm_peer_required === "1";
    const targetUserId = routeParam(req.params.userId);
    if (!targetUserId) {
      res.status(400).json({ error: "userId", message: "userId is required" });
      return;
    }
    const result = await fetchUserPrekeyBundle(prisma, req.auth!.sub, targetUserId, deviceIdRaw, {
      requireDmPeer
    });
    if (!result.ok) {
      const status = result.error === "dm_peer_required" ? 403 : 404;
      res.status(status).json({ error: result.error });
      return;
    }
    res.json(result.bundle);
  });
};
