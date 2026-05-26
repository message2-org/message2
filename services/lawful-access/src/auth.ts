import type { Request, Response, NextFunction } from "express";
import { config } from "./config.js";

const ipv4ToInt = (ip: string): number | null => {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return null;
  }
  return parts.reduce((acc, part) => (acc << 8) + part, 0);
};

const matchCidr = (ip: string, cidr: string): boolean => {
  const [network, prefixRaw] = cidr.split("/");
  const prefix = prefixRaw ? Number(prefixRaw) : 32;
  const ipInt = ipv4ToInt(ip);
  const networkInt = ipv4ToInt(network);
  if (ipInt === null || networkInt === null || Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    return false;
  }
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
};

export const isIpAllowed = (ip: string, allowlist: string[]): boolean => {
  if (!allowlist.length) return true;
  const normalized = ip.replace(/^::ffff:/, "");
  return allowlist.some((entry) => {
    if (entry.includes("/")) {
      return matchCidr(normalized, entry);
    }
    return entry === normalized;
  });
};

export const getClientIp = (req: Request): string => {
  const forwarded = req.header("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  }
  return req.ip ?? "unknown";
};

export const isMtlsVerified = (req: Request): boolean => {
  const verifyHeader = (req.header("x-ssl-client-verify") ?? req.header("x-tls-client-cert-verified") ?? "")
    .trim()
    .toUpperCase();
  if (verifyHeader === "SUCCESS" || verifyHeader === "YES" || verifyHeader === "TRUE") {
    return true;
  }
  const forwardedCert = req.header("x-forwarded-client-cert");
  if (forwardedCert && forwardedCert.length > 0) {
    return true;
  }
  const socket = req.socket as { getPeerCertificate?: () => { subject?: unknown } };
  if (typeof socket.getPeerCertificate === "function") {
    const cert = socket.getPeerCertificate();
    return Boolean(cert?.subject);
  }
  return false;
};

export const requireLawfulApiEnabled = (_req: Request, res: Response, next: NextFunction) => {
  if (config.deploymentProfile === "corporate" || !config.lawfulAccessEnabled) {
    res.status(403).json({ error: "lawful_access_disabled" });
    return;
  }
  next();
};

export const requireLawfulPrincipal = (req: Request, res: Response, next: NextFunction) => {
  if (!isIpAllowed(getClientIp(req), config.ipAllowlist)) {
    res.status(403).json({ error: "ip_not_allowed" });
    return;
  }

  if (config.mtlsRequired) {
    if (!isMtlsVerified(req)) {
      res.status(403).json({ error: "mtls_required" });
      return;
    }
    next();
    return;
  }

  const secret = req.header("x-lawful-api-secret") ?? "";
  if (!config.apiSharedSecret || secret !== config.apiSharedSecret) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
};
