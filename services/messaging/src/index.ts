import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { WebSocket, WebSocketServer } from "ws";
import bcrypt from "bcryptjs";
import argon2 from "argon2";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt, { type SignOptions } from "jsonwebtoken";
import { PrismaClient, type User } from "@prisma/client";
import { loadMasterKeys } from "./key-provider.js";
import {
  broadcastToUsers,
  getUserIdForSocket,
  isUserConnected,
  registerSocket,
  unregisterSocket
} from "./realtime.js";
import { notifyPresenceForUser } from "./realtime-presence.js";
import { registerMessageRoutes } from "./message-routes.js";
import { applyTransparencyEvent, type TransparencyIngressPayload } from "./transparency.js";
import { instanceConfig } from "./instance-config.js";
import { requireUserTransparency } from "./profile-guards.js";
import { registerEncryptionRoutes } from "./encryption-routes.js";
import { registerE2eeRoutes } from "./e2ee-routes.js";
import { ensureInstanceEncryptionPolicy } from "./encryption-policy.js";

process.loadEnvFile?.();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, limit: 200, standardHeaders: true, legacyHeaders: false }));

const jwtSecret = process.env.JWT_SECRET ?? "change-me-in-production";
const internalServiceSecret = process.env.INTERNAL_SERVICE_SECRET ?? "change-me-internal";
const accessAuditUrl = process.env.ACCESS_AUDIT_URL ?? "http://localhost:4004";

const auditInternalFetch = (path: string, init?: RequestInit) =>
  fetch(`${accessAuditUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-internal-secret": internalServiceSecret,
      ...(init?.headers ?? {})
    }
  });
const accessTokenTtl = process.env.ACCESS_TOKEN_TTL ?? "15m";
const refreshTokenTtl = process.env.REFRESH_TOKEN_TTL ?? "30d";
const argonMemoryCost = Number(process.env.ARGON2_MEMORY_KB ?? "65536");
const argonTimeCost = Number(process.env.ARGON2_TIME_COST ?? "3");
const argonParallelism = Number(process.env.ARGON2_PARALLELISM ?? "1");
const encryptionKeyVersion = Number(process.env.ENCRYPTION_KEY_VERSION ?? "1");
const keyRotationBatchSize = Number(process.env.KEY_ROTATION_BATCH_SIZE ?? "100");
const keyRotationAutoEnabled = (process.env.KEY_ROTATION_AUTO_ENABLED ?? "false").toLowerCase() === "true";
const keyRotationIntervalMs = Number(process.env.KEY_ROTATION_INTERVAL_MS ?? "60000");
const keyProviderRetryIntervalMs = Number(process.env.KEY_PROVIDER_RETRY_INTERVAL_MS ?? "15000");
const prisma = new PrismaClient();
let lastRotationAt: Date | null = null;
let lastRotationProcessed = 0;
let lastRotationRotated = 0;
let lastRotationRemaining = 0;
let totalRotationProcessed = 0;
let totalRotationRotated = 0;
let keyProvider: "env" | "vault" = "env";
let encryptionKeys: Buffer[] = [];
let keysReady = false;
let keyInitLastError: string | null = null;

type AuthPayload = { sub: string; role: "user" | "admin" };
type RefreshPayload = { sub: string; role: "user" | "admin"; typ: "refresh" };
type AuthRequest = express.Request & { auth?: AuthPayload };
const auth = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "missing bearer token" });
    return;
  }
  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthPayload;
    if (!decoded.sub || !decoded.role || (decoded as Partial<RefreshPayload>).typ === "refresh") {
      res.status(401).json({ error: "invalid token" });
      return;
    }
    req.auth = decoded;
    next();
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
};

function routeParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

const toAuthRole = (role: User["role"]): "user" | "admin" => (role === "admin" ? "admin" : "user");
const accessSignOptions: SignOptions = { expiresIn: accessTokenTtl as SignOptions["expiresIn"] };
const refreshSignOptions: SignOptions = { expiresIn: refreshTokenTtl as SignOptions["expiresIn"] };
const issueAccessToken = (user: User) =>
  jwt.sign({ sub: user.id, role: toAuthRole(user.role) }, jwtSecret, accessSignOptions);
const issueRefreshToken = (user: User) =>
  jwt.sign({ sub: user.id, role: toAuthRole(user.role), typ: "refresh" }, jwtSecret, refreshSignOptions);
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

type WrappedEncryptedValue = {
  ciphertext: string;
  iv: string;
  tag: string;
};

const wrapDek = (dek: Buffer) => {
  if (encryptionKeys.length === 0) {
    throw new Error("encryption keys are not initialized");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKeys[0], iv);
  const encrypted = Buffer.concat([cipher.update(dek), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.from(
    JSON.stringify({
      ciphertext: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64")
    } satisfies WrappedEncryptedValue),
    "utf8"
  );
};

const unwrapDek = (wrappedDek: Uint8Array) => {
  const payload = JSON.parse(Buffer.from(wrappedDek).toString("utf8")) as WrappedEncryptedValue;
  for (const key of encryptionKeys) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
      decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
      return Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64")), decipher.final()]);
    } catch {
      // Try next configured key for key-rotation compatibility.
    }
  }
  throw new Error("unable to unwrap DEK with configured keys");
};

const encryptPrivateValue = (plainText: string, dek: Buffer) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(plainText, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.from(
    JSON.stringify({
      ciphertext: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64")
    } satisfies WrappedEncryptedValue),
    "utf8"
  );
};

const decryptPrivateValue = (encryptedValue: Uint8Array, dek: Buffer) => {
  const payload = JSON.parse(Buffer.from(encryptedValue).toString("utf8")) as WrappedEncryptedValue;
  const decipher = createDecipheriv("aes-256-gcm", dek, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64")), decipher.final()]);
  return decrypted.toString("utf8");
};

const normalizeOptionalField = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const AVATAR_MEDIA_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeAvatarUrl = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("media:")) {
    const mediaId = trimmed.slice("media:".length);
    return AVATAR_MEDIA_ID_RE.test(mediaId) ? trimmed : null;
  }
  if (trimmed.length > 1_000_000) return null;
  if (trimmed.startsWith("data:image/")) return trimmed;
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  return null;
};

const requireAdmin = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.auth || req.auth.role !== "admin") {
    res.status(403).json({ error: "admin role required" });
    return;
  }
  next();
};

const requireCryptoReady = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!keysReady || encryptionKeys.length === 0) {
    res.status(503).json({ error: "encryption key provider unavailable, retry later" });
    return;
  }
  next();
};

const rotatePrivateProfilesBatch = async () => {
  const profiles = await prisma.userPrivateProfile.findMany({
    where: { keyVersion: { lt: encryptionKeyVersion } },
    take: keyRotationBatchSize,
    orderBy: { updatedAt: "asc" }
  });

  let rotated = 0;
  for (const profile of profiles) {
    try {
      const dek = unwrapDek(profile.dekWrapped);
      const email = profile.emailEnc ? decryptPrivateValue(profile.emailEnc, dek) : null;
      const phone = profile.phoneEnc ? decryptPrivateValue(profile.phoneEnc, dek) : null;
      await upsertUserPrivateProfile(profile.userId, email, phone);
      rotated += 1;
    } catch {
      // Keep going if one row is corrupted or uses unknown key material.
    }
  }

  const remaining = await prisma.userPrivateProfile.count({
    where: { keyVersion: { lt: encryptionKeyVersion } }
  });

  lastRotationAt = new Date();
  lastRotationProcessed = profiles.length;
  lastRotationRotated = rotated;
  lastRotationRemaining = remaining;
  totalRotationProcessed += profiles.length;
  totalRotationRotated += rotated;

  return {
    rotated,
    processed: profiles.length,
    remaining,
    targetKeyVersion: encryptionKeyVersion
  };
};

const upsertUserPrivateProfile = async (userId: string, email: string | null, phone: string | null) => {
  if (!email && !phone) {
    return;
  }

  const dek = randomBytes(32);
  await prisma.userPrivateProfile.upsert({
    where: { userId },
    create: {
      userId,
      emailEnc: email ? encryptPrivateValue(email, dek) : null,
      phoneEnc: phone ? encryptPrivateValue(phone, dek) : null,
      dekWrapped: wrapDek(dek),
      keyVersion: encryptionKeyVersion
    },
    update: {
      emailEnc: email ? encryptPrivateValue(email, dek) : null,
      phoneEnc: phone ? encryptPrivateValue(phone, dek) : null,
      dekWrapped: wrapDek(dek),
      keyVersion: encryptionKeyVersion
    }
  });
};

const getRequestIp = (req: express.Request) => {
  const forwarded = req.header("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return req.ip ?? null;
};

const hashPassword = async (password: string) =>
  argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: argonMemoryCost,
    timeCost: argonTimeCost,
    parallelism: argonParallelism
  });

const verifyAndUpgradePassword = async (user: User, password: string) => {
  if (user.passwordHash.startsWith("$argon2id$")) {
    return argon2.verify(user.passwordHash, password);
  }

  const legacyMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!legacyMatch) {
    return false;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password) }
  });
  return true;
};

const createRefreshSession = async (userId: string, refreshToken: string, req: express.Request) => {
  const decoded = jwt.decode(refreshToken) as { exp?: number } | null;
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.refreshSession.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt,
      userAgent: req.header("user-agent") ?? null,
      ipAddress: getRequestIp(req)
    }
  });
};

const SYSTEM_BOT_USERNAME = process.env.ONBOARDING_BOT_USERNAME ?? "message2_bot";
const SYSTEM_BOT_DISPLAY_NAME = process.env.ONBOARDING_BOT_DISPLAY_NAME ?? "Послание 2";
const WELCOME_CHAT_TITLE_RU = process.env.ONBOARDING_WELCOME_CHAT_TITLE_RU ?? process.env.ONBOARDING_WELCOME_CHAT_TITLE ?? "Послание2";
const WELCOME_CHAT_TITLE_EN = process.env.ONBOARDING_WELCOME_CHAT_TITLE_EN ?? process.env.ONBOARDING_WELCOME_CHAT_TITLE ?? "Message2";
const SAVED_CHAT_TITLE_RU = process.env.ONBOARDING_SAVED_CHAT_TITLE_RU ?? process.env.ONBOARDING_SAVED_CHAT_TITLE ?? "Сохранённое";
const SAVED_CHAT_TITLE_EN = process.env.ONBOARDING_SAVED_CHAT_TITLE_EN ?? process.env.ONBOARDING_SAVED_CHAT_TITLE ?? "Saved";
const DEFAULT_WELCOME_TEXT_RU =
  process.env.ONBOARDING_WELCOME_TEXT_RU ??
  process.env.ONBOARDING_WELCOME_TEXT ??
  "Добро пожаловать в Послание2! Здесь можно быстро начать общение и проверить, что всё работает.";
const DEFAULT_WELCOME_TEXT_EN =
  process.env.ONBOARDING_WELCOME_TEXT_EN ??
  process.env.ONBOARDING_WELCOME_TEXT ??
  "Welcome to Message 2! This chat helps you get started and verify everything works.";

const resolvePreferredLocale = (req: express.Request): "ru" | "en" => {
  const header = (req.header("accept-language") ?? "").toLowerCase();
  if (!header) return "ru";
  if (header.includes("ru")) return "ru";
  if (header.includes("en")) return "en";
  return "ru";
};

const ensureSystemBotUser = async () => {
  const existing = await prisma.user.findUnique({ where: { username: SYSTEM_BOT_USERNAME } });
  if (existing) {
    return existing;
  }
  return prisma.user.create({
    data: {
      displayName: SYSTEM_BOT_DISPLAY_NAME,
      username: SYSTEM_BOT_USERNAME,
      passwordHash: await hashPassword(randomBytes(24).toString("hex")),
      role: "user"
    }
  });
};

const createOnboardingChats = async (userId: string, locale: "ru" | "en", welcomeText: string) => {
  const systemBot = await ensureSystemBotUser();
  const welcomeTitle = locale === "en" ? WELCOME_CHAT_TITLE_EN : WELCOME_CHAT_TITLE_RU;
  const savedTitle = locale === "en" ? SAVED_CHAT_TITLE_EN : SAVED_CHAT_TITLE_RU;
  const welcomeChat = await prisma.chat.create({
    data: {
      title: welcomeTitle,
      members: {
        create: [{ userId }, { userId: systemBot.id }]
      }
    }
  });

  await prisma.message.create({
    data: {
      chatId: welcomeChat.id,
      senderId: systemBot.id,
      cipherText: welcomeText,
      kind: "text"
    }
  });

  await prisma.chat.create({
    data: {
      title: savedTitle,
      members: {
        create: [{ userId }]
      }
    }
  });
};

app.post("/auth/register", async (req, res) => {
  const username = String(req.body.username ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "").trim();
  const displayName = String(req.body.displayName ?? "").trim() || "User";
  const email = normalizeOptionalField(req.body.email)?.toLowerCase() ?? null;
  const phone = normalizeOptionalField(req.body.phone);

  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  const hasAvatarField = Object.prototype.hasOwnProperty.call(req.body, "avatarUrl");
  const avatarUrl = hasAvatarField ? normalizeAvatarUrl(req.body.avatarUrl) : null;
  if (hasAvatarField && req.body.avatarUrl != null && String(req.body.avatarUrl).trim() !== "" && !avatarUrl) {
    res.status(400).json({ error: "invalid avatar" });
    return;
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      res.status(409).json({ error: "username already exists" });
      return;
    }

    const bootstrapAdminRequested = req.body.bootstrapAdmin === true;
    const adminCount = bootstrapAdminRequested
      ? await prisma.user.count({ where: { role: "admin" } })
      : 0;
    if (bootstrapAdminRequested && adminCount > 0) {
      res.status(409).json({ error: "admin already exists" });
      return;
    }
    const user = await prisma.user.create({
      data: {
        displayName,
        username,
        passwordHash: await hashPassword(password),
        role: bootstrapAdminRequested ? "admin" : "user",
        ...(hasAvatarField ? { avatarUrl } : {})
      }
    });

    const accessToken = issueAccessToken(user);
    const refreshToken = issueRefreshToken(user);
    await createRefreshSession(user.id, refreshToken, req);
    await upsertUserPrivateProfile(user.id, email, phone);
    const preferredLocale = resolvePreferredLocale(req);
    const welcomeText = preferredLocale === "en" ? DEFAULT_WELCOME_TEXT_EN : DEFAULT_WELCOME_TEXT_RU;
    await createOnboardingChats(user.id, preferredLocale, welcomeText);

    res.status(201).json({
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: toAuthRole(user.role),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error("[auth/register]", error);
    res.status(500).json({ error: "failed to register user" });
  }
});

app.get("/auth/admin-bootstrap-status", async (_req, res) => {
  try {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    res.json({ canBootstrap: adminCount === 0 });
  } catch (error) {
    console.error("[auth/admin-bootstrap-status]", error);
    res.status(500).json({ error: "failed to resolve bootstrap status" });
  }
});

app.post("/auth/login", async (req, res) => {
  const username = String(req.body.username ?? "").trim().toLowerCase();
  const password = String(req.body.password ?? "").trim();

  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await verifyAndUpgradePassword(user, password))) {
      res.status(401).json({ error: "invalid credentials" });
      return;
    }

    const accessToken = issueAccessToken(user);
    const refreshToken = issueRefreshToken(user);
    await createRefreshSession(user.id, refreshToken, req);

    res.json({
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: toAuthRole(user.role),
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error("[auth/login]", error);
    res.status(500).json({ error: "failed to login" });
  }
});

app.post("/auth/refresh", async (req, res) => {
  const refreshToken = String(req.body.refreshToken ?? "").trim();
  if (!refreshToken) {
    res.status(400).json({ error: "refresh token is required" });
    return;
  }

  try {
    const decoded = jwt.verify(refreshToken, jwtSecret) as RefreshPayload;
    if (!decoded.sub || !decoded.role || decoded.typ !== "refresh") {
      res.status(401).json({ error: "invalid refresh token" });
      return;
    }

    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash: hashToken(refreshToken) }
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      res.status(401).json({ error: "invalid refresh token" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      res.status(401).json({ error: "user not found" });
      return;
    }

    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date(), revokedReason: "rotated" }
    });

    const newRefreshToken = issueRefreshToken(user);
    await createRefreshSession(user.id, newRefreshToken, req);

    res.json({
      accessToken: issueAccessToken(user),
      refreshToken: newRefreshToken
    });
  } catch {
    res.status(401).json({ error: "invalid refresh token" });
  }
});

app.post("/auth/logout", auth, async (req: AuthRequest, res) => {
  const refreshToken = String(req.body.refreshToken ?? "").trim();
  if (!refreshToken) {
    res.status(400).json({ error: "refresh token is required" });
    return;
  }

  await prisma.refreshSession.updateMany({
    where: {
      userId: req.auth!.sub,
      tokenHash: hashToken(refreshToken),
      revokedAt: null
    },
    data: {
      revokedAt: new Date(),
      revokedReason: "user_logout"
    }
  });

  res.status(204).end();
});

app.post("/auth/logout-all", auth, async (req: AuthRequest, res) => {
  await prisma.refreshSession.updateMany({
    where: {
      userId: req.auth!.sub,
      revokedAt: null
    },
    data: {
      revokedAt: new Date(),
      revokedReason: "user_logout_all"
    }
  });

  res.status(204).end();
});

app.get("/auth/me", auth, async (req: AuthRequest, res) => {
  try {
    const user = req.auth
      ? await prisma.user.findUnique({
        where: { id: req.auth.sub },
        include: { privateProfile: true }
      })
      : undefined;
    if (!user) {
      res.status(401).json({ error: "user not found" });
      return;
    }
    res.json({
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: toAuthRole(user.role),
      hasEmail: Boolean(user.privateProfile?.emailEnc),
      hasPhone: Boolean(user.privateProfile?.phoneEnc),
      encryptionKeyVersion: user.privateProfile?.keyVersion ?? null
    });
  } catch {
    res.status(500).json({ error: "failed to fetch profile" });
  }
});

app.put("/auth/profile", auth, async (req: AuthRequest, res) => {
  const displayName = String(req.body.displayName ?? "").trim();
  const username = String(req.body.username ?? "").trim().toLowerCase();
  const oldPassword = String(req.body.oldPassword ?? "").trim();
  const newPassword = String(req.body.newPassword ?? "").trim();
  const hasAvatarField = Object.prototype.hasOwnProperty.call(req.body, "avatarUrl");
  const avatarUrl = hasAvatarField ? normalizeAvatarUrl(req.body.avatarUrl) : undefined;

  if (!displayName || displayName.length < 2 || displayName.length > 40) {
    res.status(400).json({ error: "display name must be 2-40 chars" });
    return;
  }
  if (!username || username.length < 3 || username.length > 24 || !/^[a-z0-9_-]+$/i.test(username)) {
    res.status(400).json({ error: "username must be 3-24 chars and contain only letters, digits, _ or -" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth!.sub } });
    if (!user) {
      res.status(401).json({ error: "user not found" });
      return;
    }

    const usernameTakenByOther = await prisma.user.findFirst({
      where: { username, id: { not: user.id } },
      select: { id: true }
    });
    if (usernameTakenByOther) {
      res.status(409).json({ error: "username already exists" });
      return;
    }

    if (newPassword) {
      if (!oldPassword) {
        res.status(400).json({ error: "current password is required" });
        return;
      }
      if (!(await verifyAndUpgradePassword(user, oldPassword))) {
        res.status(401).json({ error: "current password is incorrect" });
        return;
      }
      if (newPassword.length < 6 || newPassword.length > 64) {
        res.status(400).json({ error: "new password must be 6-64 chars" });
        return;
      }
      if (newPassword === oldPassword) {
        res.status(400).json({ error: "new password must be different" });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName,
        username,
        ...(hasAvatarField ? { avatarUrl } : {}),
        ...(newPassword ? { passwordHash: await hashPassword(newPassword) } : {})
      }
    });

    res.json({
      id: updated.id,
      displayName: updated.displayName,
      username: updated.username,
      avatarUrl: updated.avatarUrl,
      role: toAuthRole(updated.role)
    });
  } catch {
    res.status(500).json({ error: "failed to update profile" });
  }
});

app.get("/auth/private-profile", auth, requireCryptoReady, async (req: AuthRequest, res) => {
  const profile = await prisma.userPrivateProfile.findUnique({
    where: { userId: req.auth!.sub }
  });
  if (!profile) {
    res.json({ email: null, phone: null, keyVersion: null });
    return;
  }

  try {
    const dek = unwrapDek(profile.dekWrapped);
    res.json({
      email: profile.emailEnc ? decryptPrivateValue(profile.emailEnc, dek) : null,
      phone: profile.phoneEnc ? decryptPrivateValue(profile.phoneEnc, dek) : null,
      keyVersion: profile.keyVersion
    });
  } catch {
    res.status(500).json({ error: "failed to decrypt private profile" });
  }
});

app.put("/auth/private-profile", auth, requireCryptoReady, async (req: AuthRequest, res) => {
  const email = normalizeOptionalField(req.body.email)?.toLowerCase() ?? null;
  const phone = normalizeOptionalField(req.body.phone);
  await upsertUserPrivateProfile(req.auth!.sub, email, phone);
  res.status(204).end();
});

app.post("/admin/crypto/rekey-private-profiles", auth, requireAdmin, requireCryptoReady, async (_req: AuthRequest, res) => {
  const result = await rotatePrivateProfilesBatch();
  res.json(result);
});

app.get("/admin/crypto/rekey-status", auth, requireAdmin, async (_req: AuthRequest, res) => {
  const remaining = await prisma.userPrivateProfile.count({
    where: { keyVersion: { lt: encryptionKeyVersion } }
  });

  res.json({
    keyProvider,
    keysReady,
    keyInitLastError,
    autoEnabled: keyRotationAutoEnabled,
    intervalMs: keyRotationIntervalMs,
    batchSize: keyRotationBatchSize,
    targetKeyVersion: encryptionKeyVersion,
    remaining,
    lastRun: {
      at: lastRotationAt?.toISOString() ?? null,
      processed: lastRotationProcessed,
      rotated: lastRotationRotated,
      remaining: lastRotationRemaining
    },
    totals: {
      processed: totalRotationProcessed,
      rotated: totalRotationRotated
    }
  });
});

app.get("/metrics", async (_req, res) => {
  const remaining = await prisma.userPrivateProfile.count({
    where: { keyVersion: { lt: encryptionKeyVersion } }
  });
  const lines = [
    "# HELP message2_key_rotation_remaining_profiles Number of private profiles pending re-encryption.",
    "# TYPE message2_key_rotation_remaining_profiles gauge",
    `message2_key_rotation_remaining_profiles ${remaining}`,
    "# HELP message2_key_rotation_last_processed Last key-rotation batch processed count.",
    "# TYPE message2_key_rotation_last_processed gauge",
    `message2_key_rotation_last_processed ${lastRotationProcessed}`,
    "# HELP message2_key_rotation_last_rotated Last key-rotation batch successfully rotated count.",
    "# TYPE message2_key_rotation_last_rotated gauge",
    `message2_key_rotation_last_rotated ${lastRotationRotated}`,
    "# HELP message2_key_rotation_total_processed Total processed profiles across all batches.",
    "# TYPE message2_key_rotation_total_processed counter",
    `message2_key_rotation_total_processed ${totalRotationProcessed}`,
    "# HELP message2_key_rotation_total_rotated Total successfully rotated profiles across all batches.",
    "# TYPE message2_key_rotation_total_rotated counter",
    `message2_key_rotation_total_rotated ${totalRotationRotated}`,
    "# HELP message2_key_rotation_target_key_version Current target key version for private profile encryption.",
    "# TYPE message2_key_rotation_target_key_version gauge",
    `message2_key_rotation_target_key_version ${encryptionKeyVersion}`,
    "# HELP message2_key_provider_ready Whether encryption keys are loaded and usable.",
    "# TYPE message2_key_provider_ready gauge",
    `message2_key_provider_ready ${keysReady ? 1 : 0}`
  ];

  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.send(`${lines.join("\n")}\n`);
});

app.get("/health/crypto", (_req, res) => {
  if (!keysReady || encryptionKeys.length === 0) {
    res.status(503).json({
      ok: false,
      service: "messaging",
      component: "crypto",
      keyProvider,
      keysReady,
      error: keyInitLastError
    });
    return;
  }

  res.json({
    ok: true,
    service: "messaging",
    component: "crypto",
    keyProvider,
    keysReady
  });
});

app.get("/health/ready", (_req, res) => {
  if (!keysReady || encryptionKeys.length === 0) {
    res.status(503).json({
      ok: false,
      service: "messaging",
      ready: false,
      reason: "crypto_not_ready",
      keyProvider,
      error: keyInitLastError
    });
    return;
  }

  res.json({
    ok: true,
    service: "messaging",
    ready: true,
    keyProvider,
    deploymentProfile: instanceConfig.deploymentProfile,
    lawfulAccessEnabled: instanceConfig.lawfulAccessEnabled,
    userTransparencyEnabled: instanceConfig.userTransparencyEnabled,
    corporateConnectivity: instanceConfig.corporateConnectivity
  });
});

app.get("/instance/profile", async (_req, res) => {
  const encryptionPolicy = await ensureInstanceEncryptionPolicy(prisma);
  res.json({
    deploymentProfile: instanceConfig.deploymentProfile,
    lawfulAccessEnabled: instanceConfig.lawfulAccessEnabled,
    userTransparencyEnabled: instanceConfig.userTransparencyEnabled,
    corporateConnectivity: instanceConfig.corporateConnectivity,
    encryptionPolicy
  });
});

registerEncryptionRoutes({ app, prisma, auth, requireAdmin });
registerE2eeRoutes({ app, prisma, auth });

app.post("/chats", auth, async (req: AuthRequest, res) => {
  try {
    const authorId = req.auth!.sub;
    const requestedMembers = Array.isArray(req.body.members)
      ? req.body.members.filter((member: unknown): member is string => typeof member === "string")
      : [];
    const members = Array.from(new Set([authorId, ...requestedMembers]));
    const isDirectChatRequest = requestedMembers.length === 1 && members.length === 2;

    if (isDirectChatRequest) {
      const peerId = requestedMembers[0];
      const existing = await prisma.chat.findMany({
        where: {
          members: {
            some: { userId: authorId }
          }
        },
        include: {
          members: true
        },
        orderBy: { createdAt: "desc" },
        take: 50
      });
      const existingDirectChat = existing.find((chat) => {
        if (chat.members.length !== 2) return false;
        const ids = chat.members.map((member) => member.userId);
        return ids.includes(authorId) && ids.includes(peerId);
      });
      if (existingDirectChat) {
        res.status(200).json({
          id: existingDirectChat.id,
          title: existingDirectChat.title,
          members: existingDirectChat.members.map((member) => member.userId)
        });
        return;
      }
    }

    const chat = await prisma.chat.create({
      data: {
        title: String(req.body.title ?? "New chat"),
        members: {
          create: members.map((userId) => ({ userId }))
        }
      },
      include: { members: true }
    });

    res.status(201).json({
      id: chat.id,
      title: chat.title,
      members: chat.members.map((member) => member.userId)
    });
  } catch (error) {
    console.error("[chats/create]", error);
    res.status(500).json({ error: "failed to create chat" });
  }
});

app.get("/chats", auth, async (req: AuthRequest, res) => {
  try {
    const me = req.auth!.sub;
    const rows = await prisma.chat.findMany({
      where: { members: { some: { userId: me } } },
      include: {
        members: {
          include: {
            user: { select: { id: true, displayName: true, username: true, avatarUrl: true } }
          }
        },
        messages: { orderBy: { sentAt: "desc" }, take: 1, where: { deletedAt: null } }
      },
      orderBy: { createdAt: "desc" }
    });

    const chats = rows.map((chat) => {
      const lastMessage = chat.messages[0] ?? null;
      const kind = chat.members.length <= 2 ? "dm" : "group";
      const peerMember =
        kind === "dm" ? chat.members.find((member) => member.userId !== me) : undefined;
      const myMember = chat.members.find((member) => member.userId === me);
      const peerLastReadAt = peerMember?.lastReadAt?.toISOString() ?? null;
      const lastDelivery =
        lastMessage &&
        lastMessage.senderId === me &&
        peerLastReadAt &&
        new Date(peerLastReadAt).getTime() >= lastMessage.sentAt.getTime()
          ? ("read" as const)
          : lastMessage && lastMessage.senderId === me
            ? ("sent" as const)
            : null;
      return {
        id: chat.id,
        title: chat.title,
        kind,
        members: chat.members.map((member) => ({
          id: member.user.id,
          displayName: member.user.displayName,
          username: member.user.username,
          avatarUrl: member.user.avatarUrl,
          lastReadAt: member.lastReadAt?.toISOString() ?? null
        })),
        peerUserId: peerMember?.userId,
        peerStatus: peerMember ? (isUserConnected(peerMember.userId) ? "online" : "offline") : undefined,
        myLastReadAt: myMember?.lastReadAt?.toISOString() ?? null,
        lastDelivery,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              senderId: lastMessage.senderId,
              cipherText: lastMessage.cipherText,
              sentAt: lastMessage.sentAt.toISOString()
            }
          : null
      };
    });

    res.json(chats);
  } catch {
    res.status(500).json({ error: "failed to fetch chats" });
  }
});

app.get("/discover", auth, async (req: AuthRequest, res) => {
  try {
    const me = req.auth!.sub;
    const rawQuery = String(req.query.query ?? "");
    const query = rawQuery.trim().replace(/^@+/, "");

    const userWhere = query
      ? {
          OR: [
            { username: { contains: query, mode: "insensitive" as const } },
            { displayName: { contains: query, mode: "insensitive" as const } }
          ]
        }
      : {};

    const users = await prisma.user.findMany({
      where: {
        id: { not: me },
        ...userWhere
      },
      select: { id: true, username: true, displayName: true },
      orderBy: { username: "asc" },
      take: 20
    });

    const joinedRows = await prisma.chat.findMany({
      where: {
        members: { some: { userId: me } },
        ...(query
          ? {
              title: { contains: query, mode: "insensitive" as const }
            }
          : {})
      },
      include: {
        members: { select: { userId: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 24
    });

    const joinedChannels = joinedRows
      .filter((chat) => chat.members.length > 2)
      .map((chat) => ({
        id: chat.id,
        name: chat.title,
        subscribers: chat.members.length
      }));

    const similarRows = await prisma.chat.findMany({
      where: {
        members: { none: { userId: me } },
        ...(query
          ? {
              title: { contains: query, mode: "insensitive" as const }
            }
          : {})
      },
      include: {
        members: { select: { userId: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 24
    });

    const similarChannels = similarRows
      .filter((chat) => chat.members.length > 2)
      .map((chat) => ({
        id: chat.id,
        name: chat.title,
        subscribers: chat.members.length
      }));

    res.json({
      users,
      joinedChannels,
      similarChannels
    });
  } catch {
    res.status(500).json({ error: "failed to discover" });
  }
});

const isChatMember = async (chatId: string, userId: string) => {
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } }
  });
  return Boolean(membership);
};

registerMessageRoutes(app, { prisma, auth, isChatMember, internalServiceSecret });

app.get("/transparency/notices", auth, requireUserTransparency, async (req: AuthRequest, res) => {
  const notices = await prisma.transparencyUserNotice.findMany({
    where: { userId: req.auth!.sub },
    orderBy: { createdAt: "desc" },
    take: 50
  });
  res.json(
    notices.map((notice) => ({
      id: notice.id,
      eventId: notice.eventId,
      action: notice.action,
      scope: JSON.parse(notice.scopeJson),
      disclosureLevel: notice.disclosureLevel,
      summary: notice.summary,
      createdAt: notice.createdAt.toISOString(),
      readAt: notice.readAt?.toISOString() ?? null
    }))
  );
});

app.get("/transparency/notices/:eventId", auth, requireUserTransparency, async (req: AuthRequest, res) => {
  const eventId = routeParam(req.params.eventId);
  if (!eventId) {
    res.status(400).json({ error: "invalid_event_id" });
    return;
  }
  const notice = await prisma.transparencyUserNotice.findFirst({
    where: { userId: req.auth!.sub, eventId }
  });
  if (!notice) {
    res.status(404).json({ error: "notice_not_found" });
    return;
  }

  let event: Record<string, unknown> | null = null;
  let complaint: unknown = null;
  try {
    const [eventRes, complaintRes] = await Promise.all([
      auditInternalFetch(`/internal/transparency/${encodeURIComponent(eventId)}`),
      auditInternalFetch(
        `/internal/complaints/lookup?eventId=${encodeURIComponent(eventId)}&userId=${encodeURIComponent(req.auth!.sub)}`
      )
    ]);
    if (eventRes.ok) {
      event = (await eventRes.json()) as Record<string, unknown>;
    }
    if (complaintRes.ok) {
      const body = (await complaintRes.json()) as { complaint: unknown };
      complaint = body.complaint;
    }
  } catch (error) {
    console.warn("[transparency/notices/:eventId] audit lookup failed", error);
  }

  res.json({
    notice: {
      id: notice.id,
      eventId: notice.eventId,
      action: notice.action,
      scope: JSON.parse(notice.scopeJson),
      disclosureLevel: notice.disclosureLevel,
      summary: notice.summary,
      createdAt: notice.createdAt.toISOString(),
      readAt: notice.readAt?.toISOString() ?? null
    },
    event:
      event ??
      ({
        eventId: notice.eventId,
        action: notice.action,
        scope: JSON.parse(notice.scopeJson),
        disclosureLevel: notice.disclosureLevel,
        summary: notice.summary ?? "",
        createdAt: notice.createdAt.toISOString()
      } as Record<string, unknown>),
    complaint
  });
});

app.post("/transparency/complaints", auth, requireUserTransparency, async (req: AuthRequest, res) => {
  const body = req.body as { eventId?: string; text?: string };
  const eventId = typeof body.eventId === "string" ? body.eventId.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!eventId || !text) {
    res.status(400).json({ error: "eventId_and_text_required" });
    return;
  }

  const notice = await prisma.transparencyUserNotice.findFirst({
    where: { userId: req.auth!.sub, eventId }
  });
  if (!notice) {
    res.status(403).json({ error: "not_affected_user" });
    return;
  }

  try {
    const auditRes = await auditInternalFetch("/internal/complaints", {
      method: "POST",
      body: JSON.stringify({ eventId, userId: req.auth!.sub, body: text })
    });
    const payload = await auditRes.json().catch(() => ({}));
    if (auditRes.status === 409) {
      res.status(409).json({ error: "duplicate_complaint" });
      return;
    }
    if (!auditRes.ok) {
      res.status(auditRes.status).json(payload);
      return;
    }
    res.status(201).json(payload);
  } catch (error) {
    console.error("[transparency/complaints]", error);
    res.status(502).json({ error: "audit_service_unavailable" });
  }
});

const requireInternalService = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const secret = req.header("x-internal-secret") ?? "";
  if (!secret || secret !== internalServiceSecret) {
    res.status(401).json({ error: "invalid internal service credentials" });
    return;
  }
  next();
};

app.post("/internal/transparency", requireInternalService, async (req, res) => {
  try {
    const payload = req.body as TransparencyIngressPayload;
    if (!payload?.id || !payload?.action || !payload?.scope) {
      res.status(400).json({ error: "invalid transparency payload" });
      return;
    }
    const result = await applyTransparencyEvent(prisma, payload);
    res.status(202).json({ ok: true, ...result });
  } catch (error) {
    console.error("[internal/transparency]", error);
    res.status(500).json({ error: "failed to apply transparency event" });
  }
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket, req) => {
  const requestUrl = new URL(req.url ?? "/ws", "http://localhost");
  const token = requestUrl.searchParams.get("token") ?? "";
  if (!token) {
    socket.close();
    return;
  }
  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthPayload;
    if (!decoded.sub || !decoded.role) {
      socket.close();
      return;
    }
    const userId = decoded.sub;
    const wasOnline = isUserConnected(userId);
    registerSocket(socket, userId);
    if (!wasOnline) {
      void notifyPresenceForUser(prisma, userId, "online");
    }
  } catch {
    socket.close();
    return;
  }
  socket.on("close", () => {
    const userId = getUserIdForSocket(socket);
    unregisterSocket(socket);
    if (userId && !isUserConnected(userId)) {
      void notifyPresenceForUser(prisma, userId, "offline");
    }
  });
});

app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const maybeErr = err as { type?: string; status?: number; message?: string } | undefined;
  const isClientAbort = req.aborted || maybeErr?.type === "request.aborted";
  if (isClientAbort) {
    // Browser/HMR can drop in-flight requests; treat as a benign client disconnect.
    if (!res.headersSent) {
      res.status(499).end();
    }
    return;
  }
  if (!res.headersSent) {
    res.status(maybeErr?.status ?? 500).json({ error: maybeErr?.message ?? "internal server error" });
    return;
  }
  next(err);
});

const port = Number(process.env.PORT ?? 4001);
const initEncryptionKeys = async () => {
  try {
    const loadedKeys = await loadMasterKeys(jwtSecret);
    if (loadedKeys.keys.length === 0) {
      throw new Error("no encryption keys loaded");
    }
    keyProvider = loadedKeys.provider;
    encryptionKeys = loadedKeys.keys;
    keysReady = true;
    keyInitLastError = null;
    return true;
  } catch (error) {
    keysReady = false;
    keyInitLastError = error instanceof Error ? error.message : "unknown key provider error";
    return false;
  }
};

const bootstrap = async () => {
  await prisma.$connect();
  const initialized = await initEncryptionKeys();
  server.listen(port, () => {
    console.log(
      `messaging listening on :${port} (keyProvider=${keyProvider}, profile=${instanceConfig.deploymentProfile}, transparency=${instanceConfig.userTransparencyEnabled})`
    );
  });

  if (!initialized) {
    setInterval(() => {
      if (keysReady) {
        return;
      }
      void initEncryptionKeys();
    }, keyProviderRetryIntervalMs);
  }

  if (keyRotationAutoEnabled) {
    setInterval(() => {
      if (!keysReady) {
        return;
      }
      void rotatePrivateProfilesBatch()
        .then((result) => {
          if (result.processed > 0) {
            console.log(
              `key-rotation: processed=${result.processed} rotated=${result.rotated} remaining=${result.remaining}`
            );
          }
        })
        .catch(() => {
          // Keep service healthy even if background rotation batch fails.
        });
    }, keyRotationIntervalMs);
  }
};

void bootstrap();
