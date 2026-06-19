import cors, { type CorsOptions } from "cors";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { randomUUID } from "node:crypto";
import { readInstanceProfileFromEnv } from "@message2/contracts";
import { loadOpenApiSpec } from "./openapi.js";

export const createGatewayApp = () => {
  const app = express();
  const instanceProfile = readInstanceProfileFromEnv();
  const { deploymentProfile, lawfulAccessEnabled, userTransparencyEnabled, corporateConnectivity } =
    instanceProfile;

  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("CORS policy denied this origin"));
    }
  };
  app.use(cors(corsOptions));
  app.set("trust proxy", 1);

  app.use((req, res, next) => {
    const requestId = req.header("x-request-id") ?? randomUUID();
    req.headers["x-request-id"] = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  const openApiSpec = loadOpenApiSpec();
  app.get("/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: "Message2 API",
      swaggerOptions: { persistAuthorization: true }
    })
  );

  app.use(helmet());
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

  app.get("/health", (_req, res) =>
    res.json({
      ok: true,
      service: "api-gateway",
      deploymentProfile,
      lawfulAccessEnabled,
      userTransparencyEnabled,
      corporateConnectivity,
      lawfulRouteExposed: lawfulAccessEnabled
    })
  );

  const withRequestHeaders = createProxyMiddleware({
    target: process.env.MESSAGING_URL ?? "http://localhost:4001",
    changeOrigin: true,
    ws: true,
    pathRewrite: { "^/messaging": "" },
    on: {
      proxyReq: (proxyReq, req) => {
        const raw = req.headers["x-request-id"];
        const requestId = Array.isArray(raw) ? raw[0] : raw;
        if (requestId) {
          proxyReq.setHeader("x-request-id", requestId);
        }
      }
    }
  });
  app.use("/messaging", withRequestHeaders);
  app.use(
    "/media",
    createProxyMiddleware({
      target: process.env.MEDIA_URL ?? "http://localhost:4002",
      changeOrigin: true,
      pathRewrite: { "^/media": "" }
    })
  );
  app.use(
    "/notifications",
    createProxyMiddleware({
      target: process.env.NOTIFICATIONS_URL ?? "http://localhost:4003",
      changeOrigin: true,
      pathRewrite: { "^/notifications": "" }
    })
  );
  app.use(
    "/access-audit",
    createProxyMiddleware({
      target: process.env.AUDIT_URL ?? "http://localhost:4004",
      changeOrigin: true,
      pathRewrite: { "^/access-audit": "" }
    })
  );

  if (lawfulAccessEnabled) {
    app.use(
      "/lawful",
      createProxyMiddleware({
        target: process.env.LAWFUL_URL ?? "http://localhost:4005",
        changeOrigin: true
      })
    );
  } else {
    app.use("/lawful", (_req, res) => {
      res.status(404).json({ error: "lawful_access_not_exposed" });
    });
  }

  return app;
};
