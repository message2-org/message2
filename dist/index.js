import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
const ensureEnvFile = () => {
    const cwd = process.cwd();
    const envPath = resolve(cwd, ".env");
    const envExamplePath = resolve(cwd, ".env.example");
    if (existsSync(envPath) || !existsSync(envExamplePath)) {
        return;
    }
    const jwtSecret = randomBytes(48).toString("base64url");
    const dataKey = randomBytes(48).toString("base64url");
    const template = readFileSync(envExamplePath, "utf8")
        .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${jwtSecret}`)
        .replace(/^DATA_ENCRYPTION_KEY=.*$/m, `DATA_ENCRYPTION_KEY=${dataKey}`);
    writeFileSync(envPath, template, { encoding: "utf8", flag: "wx" });
    console.log("messaging: generated .env from .env.example with random secrets");
};
ensureEnvFile();
process.loadEnvFile?.();
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(helmet());
app.use(rateLimit({ windowMs: 60_000, limit: 200, standardHeaders: true, legacyHeaders: false }));
const users = new Map();
const usersByUsername = new Map();
const chats = new Map();
const messages = new Map();
const jwtSecret = process.env.JWT_SECRET ?? "change-me-in-production";
const __dirname = dirname(fileURLToPath(import.meta.url));
const dataFilePath = resolve(__dirname, "../data/secure-store.enc");
const dataEncryptionSecret = process.env.DATA_ENCRYPTION_KEY ?? jwtSecret;
const deriveEncryptionKey = (secret) => createHash("sha256").update(secret).digest();
const encryptState = (state) => {
    const iv = randomBytes(12);
    const key = deriveEncryptionKey(dataEncryptionSecret);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const plaintext = Buffer.from(JSON.stringify(state), "utf8");
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.from(JSON.stringify({
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
        cipherText: encrypted.toString("base64")
    }), "utf8");
};
const decryptState = (payload) => {
    const decoded = JSON.parse(payload.toString("utf8"));
    const key = deriveEncryptionKey(dataEncryptionSecret);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(decoded.iv, "base64"));
    decipher.setAuthTag(Buffer.from(decoded.tag, "base64"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(decoded.cipherText, "base64")), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
};
const saveState = () => {
    const state = {
        users: Array.from(users.values()),
        chats: Array.from(chats.values()),
        messages: Object.fromEntries(Array.from(messages.entries()))
    };
    mkdirSync(dirname(dataFilePath), { recursive: true });
    writeFileSync(dataFilePath, encryptState(state));
};
const loadState = () => {
    try {
        const raw = readFileSync(dataFilePath);
        const state = decryptState(raw);
        for (const user of state.users) {
            users.set(user.id, user);
            usersByUsername.set(user.username, user);
        }
        for (const chat of state.chats) {
            chats.set(chat.id, chat);
        }
        for (const [chatId, chatMessages] of Object.entries(state.messages)) {
            messages.set(chatId, chatMessages);
        }
    }
    catch {
        // First run or corrupted storage: start with empty in-memory state.
    }
};
loadState();
const auth = (req, res, next) => {
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
        res.status(401).json({ error: "missing bearer token" });
        return;
    }
    try {
        const decoded = jwt.verify(token, jwtSecret);
        if (!decoded.sub || !decoded.role || decoded.typ === "refresh") {
            res.status(401).json({ error: "invalid token" });
            return;
        }
        req.auth = decoded;
        next();
    }
    catch {
        res.status(401).json({ error: "invalid token" });
    }
};
const issueAccessToken = (user) => jwt.sign({ sub: user.id, role: user.role }, jwtSecret, { expiresIn: "15m" });
const issueRefreshToken = (user) => jwt.sign({ sub: user.id, role: user.role, typ: "refresh" }, jwtSecret, { expiresIn: "30d" });
app.post("/auth/register", (req, res) => {
    const username = String(req.body.username ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "").trim();
    const displayName = String(req.body.displayName ?? "").trim() || "User";
    if (!username || !password) {
        res.status(400).json({ error: "username and password are required" });
        return;
    }
    if (usersByUsername.has(username)) {
        res.status(409).json({ error: "username already exists" });
        return;
    }
    const id = randomUUID();
    const isBootstrapAdmin = users.size === 0 && req.body.bootstrapAdmin === true;
    const user = {
        id,
        displayName,
        username,
        passwordHash: bcrypt.hashSync(password, 10),
        role: isBootstrapAdmin ? "admin" : "user"
    };
    users.set(id, user);
    usersByUsername.set(username, user);
    saveState();
    res.status(201).json({
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        role: user.role,
        accessToken: issueAccessToken(user),
        refreshToken: issueRefreshToken(user)
    });
});
app.post("/auth/login", (req, res) => {
    const username = String(req.body.username ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "").trim();
    if (!username || !password) {
        res.status(400).json({ error: "username and password are required" });
        return;
    }
    const user = usersByUsername.get(username);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        res.status(401).json({ error: "invalid credentials" });
        return;
    }
    res.json({
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        role: user.role,
        accessToken: issueAccessToken(user),
        refreshToken: issueRefreshToken(user)
    });
});
app.post("/auth/refresh", (req, res) => {
    const refreshToken = String(req.body.refreshToken ?? "").trim();
    if (!refreshToken) {
        res.status(400).json({ error: "refresh token is required" });
        return;
    }
    try {
        const decoded = jwt.verify(refreshToken, jwtSecret);
        if (!decoded.sub || !decoded.role || decoded.typ !== "refresh") {
            res.status(401).json({ error: "invalid refresh token" });
            return;
        }
        const user = users.get(decoded.sub);
        if (!user) {
            res.status(401).json({ error: "user not found" });
            return;
        }
        res.json({
            accessToken: issueAccessToken(user),
            refreshToken: issueRefreshToken(user)
        });
    }
    catch {
        res.status(401).json({ error: "invalid refresh token" });
    }
});
app.get("/auth/me", auth, (req, res) => {
    const user = req.auth ? users.get(req.auth.sub) : undefined;
    if (!user) {
        res.status(401).json({ error: "user not found" });
        return;
    }
    res.json({ id: user.id, displayName: user.displayName, username: user.username, role: user.role });
});
app.post("/chats", auth, (req, res) => {
    const id = randomUUID();
    const authorId = req.auth.sub;
    const members = Array.from(new Set([authorId, ...(Array.isArray(req.body.members) ? req.body.members : [])]));
    chats.set(id, { id, title: req.body.title ?? "New chat", members });
    messages.set(id, []);
    saveState();
    res.status(201).json(chats.get(id));
});
app.get("/chats/:chatId/messages", auth, (req, res) => {
    const chat = chats.get(req.params.chatId);
    if (!chat || !chat.members.includes(req.auth.sub)) {
        res.status(403).json({ error: "chat access denied" });
        return;
    }
    res.json(messages.get(req.params.chatId) ?? []);
});
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
const sockets = new Set();
wss.on("connection", (socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
});
app.post("/chats/:chatId/messages", auth, (req, res) => {
    const chat = chats.get(req.params.chatId);
    if (!chat || !chat.members.includes(req.auth.sub)) {
        res.status(403).json({ error: "chat access denied" });
        return;
    }
    const envelope = {
        id: randomUUID(),
        chatId: req.params.chatId,
        senderId: req.auth.sub,
        cipherText: req.body.cipherText,
        sentAt: new Date().toISOString(),
        kind: req.body.kind ?? "text",
        mediaId: req.body.mediaId
    };
    const chatMessages = messages.get(req.params.chatId) ?? [];
    chatMessages.push(envelope);
    messages.set(req.params.chatId, chatMessages);
    saveState();
    for (const socket of sockets) {
        socket.send(JSON.stringify({ type: "message.created", payload: envelope }));
    }
    res.status(201).json(envelope);
});
const port = Number(process.env.PORT ?? 4001);
server.listen(port, () => {
    console.log(`messaging listening on :${port}`);
});
