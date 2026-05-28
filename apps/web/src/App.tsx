import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { API_BASE_URLS, fetchRefresh, UNAUTHORIZED_ERROR } from "./auth/api";
import { getBootAuthState, restoreSession } from "./auth/restoreSession";
import type { RestoreSessionResult } from "./auth/restoreSession";
import { clearStoredSession, saveStoredSession } from "./auth/storage";
import type { StoredSession } from "./auth/types";
import { copy, Locale, preloadLocaleFlags } from "./i18n";
import { AuthPage } from "./pages/AuthPage";
import { ChatPage } from "./pages/ChatPage";
import { uploadAvatarMediaRef } from "./lib/avatar";
import { fetchMediaBlob, uploadMediaFile } from "./lib/media";
import { registerWebPush } from "./lib/push";
import { useResolvedAvatarUrl } from "./hooks/useResolvedAvatarUrl";
import { TransparencyDetailModal } from "./components/TransparencyDetailModal";
import { isE2eeDmCipherText } from "@message2/contracts";
import { readDeviceKeyMaterial, readDmSession } from "./crypto/store.js";
import {
  decodeIncomingCipherText,
  ensureLocalDeviceRegistered,
  isE2eeHandshakeCipherText,
  prepareOutgoingCipherTexts,
  shouldUseDmE2ee
} from "./e2ee/dm-wire.js";
import { decryptAttachmentBlob, encryptAttachmentFile } from "./e2ee/media-wire.js";
import {
  AuthMode,
  AuthUser,
  ChatItem,
  Message,
  PendingAttachment,
  StickerItem,
  StickerPack,
  TransparencyBanner,
  TransparencyDetailResponse
} from "./types";
import { stickerPreviewLabel } from "./lib/sticker-i18n";

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;
const PASSWORD_HAS_LOWER = /[a-z]/;
const PASSWORD_HAS_UPPER = /[A-Z]/;
const PASSWORD_HAS_DIGIT = /\d/;
const PASSWORD_HAS_SPECIAL = /[^A-Za-z0-9]/;

type Copy = (typeof copy)["ru"];
type AuthApiResponse = AuthUser & { accessToken: string; refreshToken: string };
type MessagePreviewMeta = Pick<Message, "preview" | "previewType" | "fileName">;
type ChatApiResponseItem = {
  id: string;
  title: string;
  kind: "dm" | "group";
  members: { id: string; displayName: string; username: string; lastReadAt?: string | null }[];
  peerUserId?: string;
  peerStatus?: "online" | "offline";
  lastDelivery?: "sent" | "read" | null;
  lastMessage: { id: string; senderId: string; cipherText: string; sentAt: string } | null;
};
type MessageApiResponseItem = {
  id: string;
  chatId: string;
  senderId: string;
  cipherText: string;
  sentAt: string;
  kind?: string;
  senderDisplayName?: string;
  disclosure?: Message["disclosure"];
  isTombstone?: boolean;
  tombstoneLabel?: string;
  isDeleted?: boolean;
  editedAt?: string;
  replyToMessageId?: string;
  replyTo?: {
    id: string;
    senderId: string;
    cipherText: string;
    kind: string;
    senderDisplayName?: string;
    isDeleted?: boolean;
  };
  reactions?: { emoji: string; count: number; userIds: string[]; reactedByMe?: boolean }[];
};
type AttachmentPayload = {
  kind: "attachment";
  text: string;
  mediaId?: string;
  preview?: string;
  previewType: "image" | "video" | "audio" | "file";
  fileName?: string;
  mediaE2ee?: {
    alg: "aes-256-gcm";
    keyB64: string;
    ivB64: string;
    mime: string;
    size: number;
  };
};

type StickerPayload = {
  v?: number;
  kind: "sticker";
  stickerId: string;
  packId: string;
  label: string;
  assetUrl: string;
  animated?: boolean;
};

function buildStickerCipherText(sticker: StickerItem): string {
  return JSON.stringify({
    v: 1,
    kind: "sticker",
    stickerId: sticker.id,
    packId: sticker.packId,
    label: sticker.label,
    assetUrl: sticker.assetUrl ?? "",
    animated: Boolean(sticker.animated)
  } satisfies StickerPayload);
}

function previewFromCipherText(cipherText: string, locale: Locale): string {
  const trimmed = cipherText.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as Partial<StickerPayload & AttachmentPayload>;
    if (parsed.kind === "sticker") {
      return typeof parsed.label === "string" && parsed.label.trim() ? parsed.label.trim() : stickerPreviewLabel(locale);
    }
    if (parsed.kind === "attachment") {
      if (typeof parsed.text === "string" && parsed.text.trim()) return parsed.text.trim();
      if (typeof parsed.fileName === "string" && parsed.fileName.trim()) return parsed.fileName.trim();
      return locale === "ru" ? "Вложение" : "Attachment";
    }
  } catch {
    // plain text
  }
  return trimmed;
}

function inferPreviewTypeFromDataUrl(value: string): "image" | "video" | "audio" | "file" | null {
  if (!value.startsWith("data:")) return null;
  if (value.startsWith("data:image/")) return "image";
  if (value.startsWith("data:video/")) return "video";
  if (value.startsWith("data:audio/")) return "audio";
  return "file";
}
type DiscoverApiResponse = {
  users: { id: string; username: string; displayName: string }[];
  joinedChannels: { id: string; name: string; subscribers: number }[];
  similarChannels: { id: string; name: string; subscribers: number }[];
};
type ProfileUpdatePayload = {
  displayName: string;
  username: string;
  oldPassword: string;
  newPassword: string;
  avatarUrl?: string | null;
};
function getDisplayNameFieldError(
  trimmed: string,
  authMode: AuthMode,
  attempted: boolean,
  showMinLength: boolean,
  t: Copy
): string | undefined {
  if (authMode !== "register") return undefined;
  if (!trimmed) return undefined;
  if (trimmed.length < 2) return showMinLength ? t.validationNameMin : undefined;
  if (trimmed.length > 40) return t.validationNameMax;
  return undefined;
}

function getUsernameFieldError(trimmed: string, attempted: boolean, showMinLength: boolean, t: Copy): string | undefined {
  if (!trimmed) return attempted ? t.validationRequired : undefined;
  if (!USERNAME_RE.test(trimmed)) return t.validationUsernameChars;
  if (trimmed.length < 3) return showMinLength ? t.validationUsernameMin : undefined;
  if (trimmed.length > 24) return t.validationUsernameMax;
  return undefined;
}

function getPasswordFieldError(trimmed: string, attempted: boolean, showMinLength: boolean, t: Copy): string | undefined {
  if (!trimmed) return attempted ? t.validationRequired : undefined;
  if (trimmed.length < 6) return showMinLength ? t.validationPasswordMin : undefined;
  if (trimmed.length > 64) return t.validationPasswordMax;
  if (!PASSWORD_HAS_LOWER.test(trimmed)) return t.validationPasswordNeedLower;
  if (!PASSWORD_HAS_UPPER.test(trimmed)) return t.validationPasswordNeedUpper;
  if (!PASSWORD_HAS_DIGIT.test(trimmed)) return t.validationPasswordNeedDigit;
  if (!PASSWORD_HAS_SPECIAL.test(trimmed)) return t.validationPasswordNeedSpecial;
  return undefined;
}

function translateAuthBackendMessage(message: string, locale: Locale): string {
  if (locale !== "ru") return message;
  return message
    .replace("username and password are required", "Требуются имя пользователя и пароль")
    .replace("username already exists", "Такое имя пользователя уже существует")
    .replace("invalid credentials", "Неверные учетные данные")
    .replace("failed to register user", "Не удалось зарегистрировать пользователя")
    .replace("invalid avatar", "Некорректное изображение аватара");
}

function mapAuthTransportError(message: string, locale: Locale): string {
  const isProxyFailure =
    /Error occurred while trying to proxy/i.test(message) ||
    /Unexpected token/i.test(message) ||
    /is not valid JSON/i.test(message);
  if (isProxyFailure) {
    return locale === "ru"
      ? "Сервис сообщений недоступен. Выполните pnpm infra:up и перезапустите pnpm dev."
      : "Messaging service is unavailable. Run pnpm infra:up and restart pnpm dev.";
  }
  return translateAuthBackendMessage(message, locale);
}

async function readAuthResponseBody(response: Response): Promise<Record<string, unknown>> {
  const text = (await response.text()).trim();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(text);
  }
}

async function requestAuth(
  mode: AuthMode,
  payload: { displayName?: string; username: string; password: string; avatarUrl?: string | null },
  locale: Locale
) {
  const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
  let lastError: Error | null = null;

  for (const baseUrl of API_BASE_URLS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3200);
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": locale === "ru" ? "ru-RU,ru;q=0.9" : "en-US,en;q=0.9"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const data = await readAuthResponseBody(response);
      if (!response.ok) {
        const backendMessage = String(data.error ?? "Auth request failed");
        throw new Error(mapAuthTransportError(backendMessage, locale));
      }
      return data as AuthApiResponse;
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError" && error.message !== "Failed to fetch") {
        throw new Error(mapAuthTransportError(error.message, locale));
      }
      lastError = error instanceof Error ? error : new Error("Auth request failed");
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastError ?? new Error("Auth request failed");
}

async function requestWithAuth(path: string, accessToken: string, init?: RequestInit) {
  let lastNetworkError: Error | null = null;
  for (const baseUrl of API_BASE_URLS) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (response.status === 401) throw new Error(UNAUTHORIZED_ERROR);
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        const backendError = String(payload.error ?? `HTTP ${response.status}`);
        if (response.status >= 500) continue;
        throw new Error(backendError);
      }
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === UNAUTHORIZED_ERROR) throw error;
      if (error instanceof Error && error.message !== "Failed to fetch") throw error;
      lastNetworkError = error instanceof Error ? error : new Error("Request failed");
    }
  }
  throw lastNetworkError ?? new Error("Request failed");
}

async function requestChats(accessToken: string) {
  const response = await requestWithAuth("/chats", accessToken);
  return (await response.json()) as ChatApiResponseItem[];
}

async function requestMessages(accessToken: string, chatId: string) {
  const response = await requestWithAuth(`/chats/${chatId}/messages`, accessToken);
  return (await response.json()) as MessageApiResponseItem[];
}

async function requestMarkChatRead(accessToken: string, chatId: string) {
  await requestWithAuth(`/chats/${chatId}/read`, accessToken, { method: "POST", body: "{}" });
}

async function requestChatTyping(accessToken: string, chatId: string, typing: boolean) {
  await requestWithAuth(`/chats/${chatId}/typing`, accessToken, {
    method: "POST",
    body: JSON.stringify({ typing })
  });
}

async function requestEditMessage(accessToken: string, chatId: string, messageId: string, cipherText: string) {
  const response = await requestWithAuth(`/chats/${chatId}/messages/${messageId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({ cipherText })
  });
  if (!response.ok) throw new Error("edit_failed");
  return (await response.json()) as MessageApiResponseItem;
}

async function requestDeleteMessage(accessToken: string, chatId: string, messageId: string) {
  const response = await requestWithAuth(`/chats/${chatId}/messages/${messageId}`, accessToken, {
    method: "DELETE"
  });
  if (!response.ok) throw new Error("delete_failed");
  return (await response.json()) as MessageApiResponseItem;
}

async function requestToggleReaction(accessToken: string, chatId: string, messageId: string, emoji: string) {
  const response = await requestWithAuth(`/chats/${chatId}/messages/${messageId}/reactions`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ emoji })
  });
  if (!response.ok) throw new Error("reaction_failed");
  return (await response.json()) as {
    chatId: string;
    messageId: string;
    reactions: MessageApiResponseItem["reactions"];
  };
}

async function requestSendMessage(
  accessToken: string,
  chatId: string,
  text: string,
  mediaId?: string | null,
  replyToMessageId?: string | null
) {
  let kind = "text";
  let bodyText = text;
  let resolvedMediaId = mediaId ?? null;
  try {
    const parsed = JSON.parse(text) as Partial<StickerPayload & AttachmentPayload>;
    if (parsed.kind === "sticker" && typeof parsed.stickerId === "string" && typeof parsed.assetUrl === "string") {
      kind = "sticker";
      bodyText = text;
    } else if (parsed.kind === "attachment" && typeof parsed.previewType === "string") {
      kind = parsed.previewType;
      bodyText = text;
      if (typeof parsed.mediaId === "string" && parsed.mediaId) {
        resolvedMediaId = parsed.mediaId;
      }
    }
  } catch {
    // Plain text message.
  }
  const response = await requestWithAuth(`/chats/${chatId}/messages`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cipherText: bodyText,
      kind,
      ...(resolvedMediaId ? { mediaId: resolvedMediaId } : {}),
      ...(replyToMessageId ? { replyToMessageId } : {})
    })
  });
  return (await response.json()) as MessageApiResponseItem;
}

async function requestCreateChat(accessToken: string, payload: { title: string; members: string[] }) {
  const response = await requestWithAuth("/chats", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return (await response.json()) as { id: string };
}

async function requestTransparencyDetail(accessToken: string, eventId: string) {
  const response = await requestWithAuth(`/transparency/notices/${encodeURIComponent(eventId)}`, accessToken);
  if (!response.ok) throw new Error("transparency_detail_failed");
  return (await response.json()) as TransparencyDetailResponse;
}

async function requestSubmitComplaint(accessToken: string, eventId: string, text: string) {
  const response = await requestWithAuth("/transparency/complaints", accessToken, {
    method: "POST",
    body: JSON.stringify({ eventId, text })
  });
  if (response.ok) return { ok: true as const };
  if (response.status === 409) return { ok: false as const, error: "duplicate_complaint" };
  return { ok: false as const, error: "failed" };
}

type ChatEncryptionState = {
  effectiveMode: string;
  pendingRequest: {
    id: string;
    requestedMode: string;
    isPeer: boolean;
  } | null;
};

async function requestChatEncryption(accessToken: string, chatId: string) {
  const response = await requestWithAuth(`/chats/${chatId}/encryption`, accessToken);
  if (!response.ok) throw new Error("encryption_state_failed");
  return (await response.json()) as ChatEncryptionState;
}

async function respondEncryptionDowngrade(
  accessToken: string,
  chatId: string,
  requestId: string,
  accept: boolean
) {
  const response = await requestWithAuth(
    `/chats/${chatId}/encryption/downgrade/${requestId}/respond`,
    accessToken,
    { method: "POST", body: JSON.stringify({ accept }) }
  );
  if (!response.ok) throw new Error("encryption_consent_failed");
  return (await response.json()) as { accepted: boolean; effectiveMode?: string };
}

async function requestDiscover(accessToken: string, query: string) {
  const response = await requestWithAuth(`/discover?query=${encodeURIComponent(query)}`, accessToken);
  return (await response.json()) as DiscoverApiResponse;
}

async function requestStickerPacks(accessToken: string) {
  const response = await requestWithAuth("/sticker-packs", accessToken);
  return (await response.json()) as StickerPack[];
}

async function requestCreateStickerPack(
  accessToken: string,
  payload: { title: string; slug?: string; description?: string; visibility?: "public" | "private" | "corporate" }
) {
  const response = await requestWithAuth("/sticker-packs", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return (await response.json()) as StickerPack;
}

async function requestCreateSticker(
  accessToken: string,
  packId: string,
  payload: {
    code: string;
    label: string;
    render: "large" | "inline";
    assetUrl?: string;
    animated?: boolean;
    tags?: string[];
    sortOrder?: number;
  }
) {
  const response = await requestWithAuth(`/sticker-packs/${encodeURIComponent(packId)}/stickers`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return (await response.json()) as {
    id: string;
    packId: string;
    code: string;
    label: string;
    render: "large" | "inline";
    tags: string[];
    sortOrder: number;
  };
}

async function requestUpdateStickerPack(
  accessToken: string,
  packId: string,
  payload: { title?: string; description?: string; visibility?: "public" | "private" | "corporate" }
) {
  const response = await requestWithAuth(`/sticker-packs/${encodeURIComponent(packId)}`, accessToken, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.ok;
}

async function requestDeleteStickerPack(accessToken: string, packId: string) {
  await requestWithAuth(`/sticker-packs/${encodeURIComponent(packId)}`, accessToken, {
    method: "DELETE"
  });
}

async function requestUpdateSticker(
  accessToken: string,
  stickerId: string,
  payload: {
    code?: string;
    label?: string;
    render?: "large" | "inline";
    assetUrl?: string | null;
    animated?: boolean;
    tags?: string[];
    sortOrder?: number;
  }
) {
  const response = await requestWithAuth(`/stickers/${encodeURIComponent(stickerId)}`, accessToken, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return response.ok;
}

async function requestDeleteSticker(accessToken: string, stickerId: string) {
  await requestWithAuth(`/stickers/${encodeURIComponent(stickerId)}`, accessToken, {
    method: "DELETE"
  });
}

function translateProfileUpdateError(raw: string, locale: Locale) {
  const message = String(raw ?? "failed to update profile");
  if (locale !== "ru") return message;
  return message
    .replace("display name must be 2-40 chars", "имя должно быть длиной 2–40 символов")
    .replace("username must be 3-24 chars and contain only letters, digits, _ or -", "логин должен быть длиной 3–24 символа и содержать только буквы, цифры, _ или -")
    .replace("username already exists", "такой логин уже занят")
    .replace("current password is required", "введите текущий пароль")
    .replace("current password is incorrect", "текущий пароль неверен")
    .replace("new password must be 6-64 chars", "новый пароль должен быть длиной 6–64 символов")
    .replace("new password must be different", "новый пароль должен отличаться от текущего")
    .replace("user not found", "пользователь не найден")
    .replace("failed to update profile", "не удалось обновить профиль");
}

async function requestUpdateProfile(accessToken: string, payload: ProfileUpdatePayload, locale: Locale) {
  for (const baseUrl of API_BASE_URLS) {
    const response = await fetch(`${baseUrl}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });
    if (response.status === 401) throw new Error(UNAUTHORIZED_ERROR);
    const data = await response.json().catch(() => ({ error: "failed to update profile" }));
    if (!response.ok) {
      if (response.status >= 500) continue;
      throw new Error(translateProfileUpdateError(String(data.error ?? "failed to update profile"), locale));
    }
    return data as AuthUser;
  }
  throw new Error(translateProfileUpdateError("failed to update profile", locale));
}

function wsCandidates(accessToken: string) {
  return API_BASE_URLS.map((baseUrl) => {
    if (baseUrl.startsWith("/")) {
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      return `${protocol}://${window.location.host}${baseUrl}/ws?token=${encodeURIComponent(accessToken)}`;
    }
    const wsBase = baseUrl.replace(/^http/, "ws");
    return `${wsBase}/ws?token=${encodeURIComponent(accessToken)}`;
  });
}

const bootAuth = getBootAuthState();

export default function App() {
  const [locale, setLocale] = useState<Locale>("ru");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authUser, setAuthUser] = useState<AuthUser | null>(bootAuth.authUser);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [fieldTyped, setFieldTyped] = useState<{ displayName: boolean; username: boolean; password: boolean; confirmPassword: boolean }>({
    displayName: false,
    username: false,
    password: false,
    confirmPassword: false
  });
  const [fieldBlurred, setFieldBlurred] = useState<{ displayName: boolean; username: boolean; password: boolean; confirmPassword: boolean }>({
    displayName: false,
    username: false,
    password: false,
    confirmPassword: false
  });
  const [fieldFocused, setFieldFocused] = useState<{ displayName: boolean; username: boolean; password: boolean; confirmPassword: boolean }>({
    displayName: false,
    username: false,
    password: false,
    confirmPassword: false
  });
  const [fieldEditedInFocus, setFieldEditedInFocus] = useState<{ displayName: boolean; username: boolean; password: boolean; confirmPassword: boolean }>({
    displayName: false,
    username: false,
    password: false,
    confirmPassword: false
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [registerAvatarFile, setRegisterAvatarFile] = useState<File | null>(null);
  const [registerAvatarPreview, setRegisterAvatarPreview] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [messagePreviewById, setMessagePreviewById] = useState<Record<string, MessagePreviewMeta>>({});
  const [mediaBlobById, setMediaBlobById] = useState<Record<string, string>>({});
  const [discoverUsers, setDiscoverUsers] = useState<DiscoverApiResponse["users"]>([]);
  const [discoverJoinedChannels, setDiscoverJoinedChannels] = useState<DiscoverApiResponse["joinedChannels"]>([]);
  const [discoverSimilarChannels, setDiscoverSimilarChannels] = useState<DiscoverApiResponse["similarChannels"]>([]);
  const [stickerPacks, setStickerPacks] = useState<StickerPack[]>([]);
  const [isRealtimeReconnecting, setIsRealtimeReconnecting] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [transparencyBanner, setTransparencyBanner] = useState<TransparencyBanner | null>(null);
  const [transparencyDetailEventId, setTransparencyDetailEventId] = useState<string | null>(null);
  const [userTransparencyEnabled, setUserTransparencyEnabled] = useState(true);
  const [chatEncryptionMode, setChatEncryptionMode] = useState<string | null>(null);
  const [encryptionConsent, setEncryptionConsent] = useState<{
    requestId: string;
    requestedMode: string;
  } | null>(null);
  const wsHasOpenedRef = useRef(false);
  const chatsRef = useRef(chats);
  const chatEncryptionModeRef = useRef(chatEncryptionMode);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingByChat, setTypingByChat] = useState<Record<string, { userId: string; displayName: string }[]>>({});
  const [accountPassword, setAccountPassword] = useState("");
  const [session, setSession] = useState<StoredSession | null>(bootAuth.session);
  const [isRestoringSession, setIsRestoringSession] = useState(bootAuth.shouldRestore);
  const t = copy[locale];
  const userAvatarDisplay = useResolvedAvatarUrl(userAvatar, session?.accessToken ?? null);
  const activeChatIdRef = useRef<string | null>(null);
  const localeRef = useRef(locale);
  const authUserRef = useRef(authUser);
  const userTransparencyEnabledRef = useRef(userTransparencyEnabled);

  useEffect(() => {
    userTransparencyEnabledRef.current = userTransparencyEnabled;
  }, [userTransparencyEnabled]);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    chatEncryptionModeRef.current = chatEncryptionMode;
  }, [chatEncryptionMode]);

  const toChatItem = (chat: ChatApiResponseItem): ChatItem => {
    const last = chat.lastMessage;
    const senderType = last?.senderId === authUser?.id ? "me" : "other";
    const peer =
      chat.kind === "dm" && authUser?.id ? chat.members.find((member) => member.id !== authUser.id) : undefined;
    const chatName = chat.kind === "dm" ? (peer?.displayName || peer?.username || chat.title) : chat.title;
    return {
      id: chat.id,
      group: "regular",
      kind: chat.kind,
      peerUserId: chat.peerUserId ?? peer?.id,
      peerUsername: peer?.username,
      name: chatName,
      status: chat.peerStatus === "online" ? "online" : "offline",
      lastMessage: last?.cipherText ? previewFromCipherText(last.cipherText, locale) : "",
      lastSenderType: last ? senderType : undefined,
      lastSenderName: senderType === "me" ? (locale === "ru" ? "Вы" : "You") : undefined,
      lastAt: last?.sentAt,
      lastDelivery: chat.lastDelivery ?? (senderType === "me" ? "sent" : null),
      unread: 0
    };
  };

  const toUiMessage = (message: MessageApiResponseItem): Message => {
    const createdAt = message.sentAt;
    let parsedSticker: StickerPayload | null = null;
    let parsedAttachment: AttachmentPayload | null = null;
    try {
      const parsed = JSON.parse(message.cipherText) as Partial<StickerPayload & AttachmentPayload>;
      if (parsed.kind === "sticker" && typeof parsed.stickerId === "string" && typeof parsed.assetUrl === "string") {
        parsedSticker = {
          v: parsed.v,
          kind: "sticker",
          stickerId: parsed.stickerId,
          packId: typeof parsed.packId === "string" ? parsed.packId : "",
          label: typeof parsed.label === "string" ? parsed.label : stickerPreviewLabel(locale),
          assetUrl: parsed.assetUrl,
          animated: parsed.animated
        };
      } else if (
        parsed.kind === "attachment" &&
        (parsed.previewType === "image" || parsed.previewType === "video" || parsed.previewType === "audio" || parsed.previewType === "file") &&
        (typeof parsed.mediaId === "string" || typeof parsed.preview === "string")
      ) {
        parsedAttachment = {
          kind: "attachment",
          text: typeof parsed.text === "string" ? parsed.text : "",
          mediaId: typeof parsed.mediaId === "string" ? parsed.mediaId : undefined,
          preview: typeof parsed.preview === "string" ? parsed.preview : undefined,
          previewType: parsed.previewType,
          fileName: typeof parsed.fileName === "string" ? parsed.fileName : undefined,
          mediaE2ee:
            parsed.mediaE2ee &&
            typeof parsed.mediaE2ee === "object" &&
            parsed.mediaE2ee.alg === "aes-256-gcm" &&
            typeof parsed.mediaE2ee.keyB64 === "string" &&
            typeof parsed.mediaE2ee.ivB64 === "string" &&
            typeof parsed.mediaE2ee.mime === "string" &&
            typeof parsed.mediaE2ee.size === "number"
              ? {
                  alg: "aes-256-gcm",
                  keyB64: parsed.mediaE2ee.keyB64,
                  ivB64: parsed.mediaE2ee.ivB64,
                  mime: parsed.mediaE2ee.mime,
                  size: parsed.mediaE2ee.size
                }
              : undefined
        };
      }
    } catch {
      // Plain text message.
    }
    if (!parsedAttachment && !parsedSticker) {
      const inferredType = inferPreviewTypeFromDataUrl(message.cipherText);
      if (inferredType) {
        parsedAttachment = {
          kind: "attachment",
          text: "",
          preview: message.cipherText,
          previewType: inferredType
        };
      }
    }
    if (message.isTombstone) {
      return {
        id: message.id,
        sender: "them",
        author: locale === "ru" ? "Система" : "System",
        text: message.tombstoneLabel ?? (locale === "ru" ? "Сообщение удалено." : "Message removed."),
        time: new Date(createdAt).toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", { hour: "2-digit", minute: "2-digit" }),
        createdAt,
        isTombstone: true,
        tombstoneLabel: message.tombstoneLabel,
        disclosure: message.disclosure
      };
    }

    const deletedLabel = locale === "ru" ? "Сообщение удалено" : "Message deleted";
    const timeBase = new Date(createdAt).toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
    const timeLabel = message.editedAt
      ? `${timeBase} · ${locale === "ru" ? "изм." : "edited"}`
      : timeBase;

    const replyAuthor =
      message.replyTo?.senderId === authUser?.id
        ? locale === "ru"
          ? "Вы"
          : "You"
        : (message.replyTo?.senderDisplayName ??
          message.senderDisplayName ??
          (locale === "ru" ? "Собеседник" : "Contact"));

    const stickerLabel = parsedSticker?.label ?? stickerPreviewLabel(locale);

    return {
      id: message.id,
      sender: message.senderId === authUser?.id ? "me" : "them",
      author: message.senderId === authUser?.id ? authUser?.displayName ?? (locale === "ru" ? "Вы" : "You") : message.senderDisplayName ?? (locale === "ru" ? "Собеседник" : "Contact"),
      kind: message.kind ?? (parsedSticker ? "sticker" : parsedAttachment ? parsedAttachment.previewType : "text"),
      text: message.isDeleted ? deletedLabel : (parsedSticker ? stickerLabel : (parsedAttachment?.text ?? message.cipherText)),
      time: timeLabel,
      createdAt,
      sticker:
        message.isDeleted || !parsedSticker
          ? undefined
          : {
              stickerId: parsedSticker.stickerId,
              assetUrl: parsedSticker.assetUrl,
              label: stickerLabel,
              animated: parsedSticker.animated
            },
      mediaId: message.isDeleted ? undefined : parsedAttachment?.mediaId,
      preview: message.isDeleted ? undefined : parsedAttachment?.preview,
      previewType: message.isDeleted ? undefined : parsedAttachment?.previewType,
      fileName: parsedAttachment?.fileName,
      mediaE2ee: parsedAttachment?.mediaE2ee,
      disclosure: message.disclosure,
      isDeleted: message.isDeleted,
      editedAt: message.editedAt,
      ...(message.replyTo
        ? {
            replyTo: {
              id: message.replyTo.id,
              author: replyAuthor,
              text: message.replyTo.isDeleted ? deletedLabel : message.replyTo.cipherText,
              isDeleted: message.replyTo.isDeleted
            }
          }
        : {}),
      ...(message.reactions?.length
        ? {
            reactions: message.reactions.map((r) => ({
              emoji: r.emoji,
              count: r.count,
              reactedByMe: r.reactedByMe
            }))
          }
        : {})
    };
  };

  async function mapApiMessageToUi(message: MessageApiResponseItem, chatId: string): Promise<Message | null> {
    if (isE2eeHandshakeCipherText(message.cipherText)) return null;
    const chat = chatsRef.current.find((item) => item.id === chatId);
    if (
      chat &&
      shouldUseDmE2ee(chat.kind, chatEncryptionModeRef.current) &&
      isE2eeDmCipherText(message.cipherText)
    ) {
      const material = readDeviceKeyMaterial();
      if (!material) {
        return toUiMessage({
          ...message,
          cipherText: locale === "ru" ? "[E2EE: нет ключей устройства]" : "[E2EE: device keys missing]"
        });
      }
      try {
        const plain = await decodeIncomingCipherText({
          chatId,
          cipherText: message.cipherText,
          localMaterial: material
        });
        if (plain === null) return null;
        return toUiMessage({ ...message, cipherText: plain });
      } catch {
        return toUiMessage({
          ...message,
          cipherText: locale === "ru" ? "[не удалось расшифровать]" : "[decryption failed]"
        });
      }
    }
    return toUiMessage(message);
  }

  const messagesByChatWithMedia = useMemo(() => {
    const next: Record<string, Message[]> = {};
    for (const [chatId, rows] of Object.entries(messagesByChat)) {
      next[chatId] = rows.map((message) => {
        if (message.mediaId && !message.preview && mediaBlobById[message.mediaId]) {
          return { ...message, preview: mediaBlobById[message.mediaId] };
        }
        return message;
      });
    }
    return next;
  }, [messagesByChat, mediaBlobById]);

  const trimmedDisplayName = displayName.trim();
  const trimmedUsername = username.trim();
  const trimmedPassword = password.trim();
  const trimmedConfirmPassword = confirmPassword.trim();
  const suppressDisplayNameMinWhileEditing = fieldFocused.displayName && fieldEditedInFocus.displayName;
  const suppressUsernameMinWhileEditing = fieldFocused.username && fieldEditedInFocus.username;
  const suppressPasswordMinWhileEditing = fieldFocused.password && fieldEditedInFocus.password;
  const suppressConfirmPasswordMinWhileEditing = fieldFocused.confirmPassword && fieldEditedInFocus.confirmPassword;
  const showDisplayNameMinLength =
    submitAttempted || (fieldTyped.displayName && fieldBlurred.displayName && !suppressDisplayNameMinWhileEditing);
  const showUsernameMinLength = submitAttempted || (fieldTyped.username && fieldBlurred.username && !suppressUsernameMinWhileEditing);
  const showPasswordMinLength = submitAttempted || (fieldTyped.password && fieldBlurred.password && !suppressPasswordMinWhileEditing);
  const showConfirmPasswordMismatch =
    submitAttempted || (fieldTyped.confirmPassword && fieldBlurred.confirmPassword && !suppressConfirmPasswordMinWhileEditing);

  const displayNameError = useMemo(
    () => getDisplayNameFieldError(trimmedDisplayName, authMode, submitAttempted, showDisplayNameMinLength, t),
    [trimmedDisplayName, authMode, submitAttempted, showDisplayNameMinLength, t]
  );
  const usernameError = useMemo(
    () => getUsernameFieldError(trimmedUsername, submitAttempted, showUsernameMinLength, t),
    [trimmedUsername, submitAttempted, showUsernameMinLength, t]
  );
  const passwordError = useMemo(
    () => getPasswordFieldError(trimmedPassword, submitAttempted, showPasswordMinLength, t),
    [trimmedPassword, submitAttempted, showPasswordMinLength, t]
  );
  const confirmPasswordError = useMemo(() => {
    if (authMode !== "register") return undefined;
    if (!trimmedConfirmPassword) return submitAttempted ? t.validationRequired : undefined;
    if (trimmedConfirmPassword !== trimmedPassword) {
      return showConfirmPasswordMismatch ? t.validationPasswordsMismatch : undefined;
    }
    return undefined;
  }, [authMode, trimmedConfirmPassword, trimmedPassword, submitAttempted, showConfirmPasswordMismatch, t]);

  useEffect(() => {
    preloadLocaleFlags();
  }, []);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
    setReplyTo(null);
    setTypingByChat((prev) => (activeChatId ? { ...prev, [activeChatId]: [] } : prev));
  }, [activeChatId]);

  useEffect(() => {
    if (!activeChatId || !session?.accessToken) return;
    void runAuthorized((accessToken) => requestMarkChatRead(accessToken, activeChatId)).catch(() => {});
  }, [activeChatId, session?.accessToken]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  useEffect(() => {
    let mounted = true;
    if (!bootAuth.shouldRestore) return;
    void restoreSession().then((result: RestoreSessionResult) => {
      if (!mounted) return;
      if (result.status === "restored") {
        setAuthUser(result.session.user);
        setUserAvatar(result.session.user.avatarUrl ?? null);
        setSession(result.session);
      } else if (result.status === "cleared") {
        setAuthUser(null);
        setSession(null);
        setUserAvatar(null);
      }
      setIsRestoringSession(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      for (const base of API_BASE_URLS) {
        try {
          const response = await fetch(`${base}/instance/profile`);
          if (!response.ok) continue;
          const body = (await response.json()) as { userTransparencyEnabled?: boolean };
          if (!cancelled) {
            setUserTransparencyEnabled(body.userTransparencyEnabled !== false);
          }
          return;
        } catch {
          /* try next base */
        }
      }
    };
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetValidationState() {
    setSubmitAttempted(false);
    setFieldTyped({ displayName: false, username: false, password: false, confirmPassword: false });
    setFieldBlurred({ displayName: false, username: false, password: false, confirmPassword: false });
    setFieldFocused({ displayName: false, username: false, password: false, confirmPassword: false });
    setFieldEditedInFocus({ displayName: false, username: false, password: false, confirmPassword: false });
  }

  function switchLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    setIsLanguageOpen(false);
  }

  async function runAuthorized<T>(operation: (accessToken: string) => Promise<T>) {
    if (!session) throw new Error("Not authenticated");
    try {
      return await operation(session.accessToken);
    } catch (error) {
      if (!(error instanceof Error) || error.message !== UNAUTHORIZED_ERROR) throw error;
      const refreshed = await fetchRefresh(session.refreshToken);
      const nextSession = { ...session, accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken };
      setSession(nextSession);
      saveStoredSession(nextSession);
      return operation(nextSession.accessToken);
    }
  }

  useEffect(() => {
    if (!session?.accessToken) return;
    void registerWebPush(session.accessToken).catch(() => {});
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) return;
    void runAuthorized(async (accessToken) => {
      const existing = readDeviceKeyMaterial();
      const deviceId = existing?.deviceId ?? `web-${crypto.randomUUID().slice(0, 8)}`;
      await ensureLocalDeviceRegistered(accessToken, deviceId);
    }).catch(() => {});
  }, [session?.accessToken]);

  useEffect(() => {
    if (!authUser || !session || chats.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const chatFromUrl = params.get("chat");
    if (!chatFromUrl) return;
    const exists = chats.some((chat) => chat.id === chatFromUrl);
    if (!exists) return;
    setActiveChatId(chatFromUrl);
    loadMessagesForChat(chatFromUrl);
    params.delete("chat");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
  }, [authUser?.id, session?.accessToken, chats.length]);

  useEffect(() => {
    if (!authUser || !session) return;
    let cancelled = false;
    void runAuthorized(requestChats)
      .then((chatRows) => {
        if (cancelled) return;
        const nextChats = chatRows.map(toChatItem);
        setChats(nextChats);
        setActiveChatId((prev) => prev ?? nextChats[0]?.id ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setChats([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser, session, locale]);

  useEffect(() => {
    if (!activeChatId) return;
    void loadMessagesForChat(activeChatId);
  }, [activeChatId]);

  const refreshChatEncryption = (chatId: string) => {
    if (!session) return;
    void runAuthorized((token) => requestChatEncryption(token, chatId))
      .then((state) => {
        setChatEncryptionMode(state.effectiveMode);
        if (state.pendingRequest?.isPeer) {
          setEncryptionConsent({
            requestId: state.pendingRequest.id,
            requestedMode: state.pendingRequest.requestedMode
          });
        } else {
          setEncryptionConsent(null);
        }
      })
      .catch(() => {
        setChatEncryptionMode(null);
        setEncryptionConsent(null);
      });
  };

  useEffect(() => {
    if (!activeChatId || !session) {
      setChatEncryptionMode(null);
      setEncryptionConsent(null);
      return;
    }
    refreshChatEncryption(activeChatId);
  }, [activeChatId, session]);

  useEffect(() => {
    if (!authUser || !session) return;
    let stopped = false;
    const intervalId = setInterval(() => {
      if (stopped) return;
      void runAuthorized(requestChats)
        .then((chatRows) => {
          if (stopped) return;
          const nextChats = chatRows.map(toChatItem);
          setChats(nextChats);
          setActiveChatId((prev) => prev ?? nextChats[0]?.id ?? null);
        })
        .catch(() => undefined);

      const currentChatId = activeChatIdRef.current;
      if (!currentChatId) return;
      void runAuthorized(async (accessToken) => {
        const rows = await requestMessages(accessToken, currentChatId);
        if (stopped) return;
        const merged: Message[] = [];
        for (const row of rows) {
          const ui = await mapApiMessageToUi(row, currentChatId);
          if (!ui) continue;
          const meta = messagePreviewById[ui.id];
          const blob = ui.mediaId ? mediaBlobById[ui.mediaId] : undefined;
          const withMedia = blob && !ui.preview ? { ...ui, preview: blob } : ui;
          merged.push(meta ? { ...withMedia, ...meta } : withMedia);
        }
        setMessagesByChat((prev) => ({ ...prev, [currentChatId]: merged }));
      }).catch(() => undefined);
    }, 1500);

    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  }, [authUser, session, locale, messagePreviewById, mediaBlobById]);

  useEffect(() => {
    if (!session?.accessToken) return;
    const pendingIds = new Set<string>();
    for (const rows of Object.values(messagesByChat)) {
      for (const message of rows) {
        if (message.mediaId && !message.preview && !mediaBlobById[message.mediaId]) {
          pendingIds.add(message.mediaId);
        }
      }
    }
    if (pendingIds.size === 0) return;

    const envelopeByMediaId: Record<
      string,
      { alg: "aes-256-gcm"; keyB64: string; ivB64: string; mime: string; size: number } | undefined
    > = {};
    for (const rows of Object.values(messagesByChat)) {
      for (const message of rows) {
        if (message.mediaId && message.mediaE2ee && !envelopeByMediaId[message.mediaId]) {
          envelopeByMediaId[message.mediaId] = message.mediaE2ee;
        }
      }
    }

    let cancelled = false;
    void (async () => {
      for (const mediaId of pendingIds) {
        if (cancelled) return;
        try {
          const encryptedBlob = await fetchMediaBlob(session.accessToken, mediaId);
          const decryptedBlob = envelopeByMediaId[mediaId]
            ? await decryptAttachmentBlob(encryptedBlob, envelopeByMediaId[mediaId]!)
            : encryptedBlob;
          const blobUrl = URL.createObjectURL(decryptedBlob);
          if (cancelled) {
            URL.revokeObjectURL(blobUrl);
            return;
          }
          setMediaBlobById((prev) => (prev[mediaId] ? prev : { ...prev, [mediaId]: blobUrl }));
        } catch {
          // Preview stays unavailable until the next poll cycle.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [messagesByChat, session?.accessToken, mediaBlobById]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(mediaBlobById)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  useEffect(() => {
    if (!authUser?.id || !session?.accessToken) {
      setDiscoverUsers([]);
      setDiscoverJoinedChannels([]);
      setDiscoverSimilarChannels([]);
      setStickerPacks([]);
      return;
    }
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      void runAuthorized((accessToken) => requestDiscover(accessToken, search))
        .then((data) => {
          if (cancelled) return;
          setDiscoverUsers(data.users);
          setDiscoverJoinedChannels(data.joinedChannels);
          setDiscoverSimilarChannels(data.similarChannels);
        })
        .catch(() => {
          if (cancelled) return;
          setDiscoverUsers([]);
          setDiscoverJoinedChannels([]);
          setDiscoverSimilarChannels([]);
        });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [authUser?.id, session?.accessToken, search]);

  useEffect(() => {
    if (!authUser?.id || !session?.accessToken) {
      setStickerPacks([]);
      return;
    }
    let cancelled = false;
    void runAuthorized(requestStickerPacks)
      .then((rows) => {
        if (!cancelled) setStickerPacks(rows);
      })
      .catch(() => {
        if (!cancelled) setStickerPacks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [authUser?.id, session?.accessToken]);

  useEffect(() => {
    if (!authUser?.id || !session?.accessToken) {
      wsHasOpenedRef.current = false;
      setIsRealtimeReconnecting(false);
      setIsRealtimeConnected(false);
      return;
    }
    const endpoints = wsCandidates(session.accessToken);
    let socket: WebSocket | null = null;
    let closed = false;

    const connect = (index: number) => {
      if (closed || index >= endpoints.length) return;
      const candidate = endpoints[index];
      const nextSocket = new WebSocket(candidate);
      socket = nextSocket;

      nextSocket.onopen = () => {
        wsHasOpenedRef.current = true;
        setIsRealtimeReconnecting(false);
        setIsRealtimeConnected(true);
      };

      nextSocket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as {
            type?: string;
            payload?: MessageApiResponseItem & {
              chatId?: string;
              messageId?: string;
              summary?: string;
              eventId?: string;
              action?: string;
              createdAt?: string;
              disclosureLevel?: string;
              label?: string;
              deletedAt?: string;
            };
          };
          if (!parsed.type || !parsed.payload) return;

          if (
            parsed.type === "encryption.downgrade.request" ||
            parsed.type === "encryption.mode.changed" ||
            parsed.type === "encryption.downgrade.rejected"
          ) {
            const chatId = parsed.payload.chatId;
            if (typeof chatId === "string" && chatId === activeChatIdRef.current) {
              refreshChatEncryption(chatId);
            }
            return;
          }

          if (parsed.type === "transparency.notice") {
            if (!userTransparencyEnabledRef.current) return;
            const payload = parsed.payload;
            if (!payload.eventId || !payload.summary) return;
            setTransparencyBanner({
              eventId: payload.eventId,
              summary: payload.summary,
              action: payload.action ?? "message_read",
              createdAt: payload.createdAt ?? new Date().toISOString()
            });
            return;
          }

          if (parsed.type === "message.disclosure") {
            const payload = parsed.payload;
            if (!payload.chatId || !payload.messageId) return;
            const level =
              payload.disclosureLevel === "full" || payload.disclosureLevel === "sealed"
                ? payload.disclosureLevel
                : "partial";
            setMessagesByChat((prev) => {
              const rows = prev[payload.chatId!] ?? [];
              const next = rows.map((row) =>
                row.id === payload.messageId
                  ? {
                      ...row,
                      disclosure: {
                        eventId: payload.eventId ?? "",
                        action: payload.action ?? "message_read",
                        disclosureLevel: level
                      }
                    }
                  : row
              );
              return { ...prev, [payload.chatId!]: next };
            });
            return;
          }

          if (parsed.type === "message.tombstone") {
            const payload = parsed.payload;
            if (!payload.chatId || !payload.messageId) return;
            const tombUi: Message = {
              id: payload.messageId,
              sender: "them",
              author: localeRef.current === "ru" ? "Система" : "System",
              text: payload.label ?? (localeRef.current === "ru" ? "Сообщение удалено." : "Message removed."),
              time: new Date(payload.deletedAt ?? Date.now()).toLocaleTimeString(
                localeRef.current === "ru" ? "ru-RU" : "en-US",
                { hour: "2-digit", minute: "2-digit" }
              ),
              createdAt: payload.deletedAt,
              isTombstone: true,
              tombstoneLabel: payload.label,
              disclosure: {
                eventId: payload.eventId ?? "",
                action: "message_delete",
                disclosureLevel: "partial"
              }
            };
            setMessagesByChat((prev) => {
              const rows = prev[payload.chatId!] ?? [];
              const without = rows.filter((row) => row.id !== payload.messageId);
              return { ...prev, [payload.chatId!]: [...without, tombUi] };
            });
            return;
          }

          if (parsed.type === "presence.changed") {
            const payload = parsed.payload;
            if (!payload.userId || (payload.status !== "online" && payload.status !== "offline")) return;
            setChats((prev) =>
              prev.map((chat) =>
                chat.kind === "dm" && chat.peerUserId === payload.userId
                  ? { ...chat, status: payload.status === "online" ? "online" : "offline" }
                  : chat
              )
            );
            return;
          }

          if (parsed.type === "chat.typing") {
            const payload = parsed.payload;
            if (!payload.chatId || !payload.userId) return;
            setTypingByChat((prev) => {
              const list = prev[payload.chatId!] ?? [];
              if (!payload.typing) {
                return { ...prev, [payload.chatId!]: list.filter((u) => u.userId !== payload.userId) };
              }
              if (list.some((u) => u.userId === payload.userId)) return prev;
              return {
                ...prev,
                [payload.chatId!]: [
                  ...list,
                  { userId: payload.userId!, displayName: payload.displayName ?? "" }
                ]
              };
            });
            return;
          }

          if (parsed.type === "chat.read") {
            const payload = parsed.payload;
            if (!payload.chatId || !payload.userId) return;
            const currentUserId = authUserRef.current?.id;
            if (payload.userId === currentUserId) return;
            setChats((prev) =>
              prev.map((chat) =>
                chat.id === payload.chatId && chat.lastSenderType === "me"
                  ? { ...chat, lastDelivery: "read" as const }
                  : chat
              )
            );
            return;
          }

          if (parsed.type === "message.updated" || parsed.type === "message.deleted") {
            const payload = parsed.payload as MessageApiResponseItem;
            if (!payload.chatId) return;
            void runAuthorized(async (accessToken) => {
              const uiMessage = await mapApiMessageToUi(payload, payload.chatId!);
              if (!uiMessage) return;
              setMessagesByChat((prev) => {
                const rows = prev[payload.chatId!] ?? [];
                return {
                  ...prev,
                  [payload.chatId!]: rows.map((row) => (row.id === uiMessage.id ? uiMessage : row))
                };
              });
            }).catch(() => undefined);
            return;
          }

          if (parsed.type === "message.reactions") {
            const payload = parsed.payload as {
              chatId?: string;
              messageId?: string;
              reactions?: MessageApiResponseItem["reactions"];
            };
            if (!payload.chatId || !payload.messageId) return;
            const currentUserId = authUserRef.current?.id;
            setMessagesByChat((prev) => {
              const rows = prev[payload.chatId!] ?? [];
              return {
                ...prev,
                [payload.chatId!]: rows.map((row) =>
                  row.id === payload.messageId
                    ? {
                        ...row,
                        reactions: (payload.reactions ?? []).map((r) => ({
                          emoji: r.emoji,
                          count: r.count,
                          reactedByMe: currentUserId ? r.userIds?.includes(currentUserId) : false
                        }))
                      }
                    : row
                )
              };
            });
            return;
          }

          if (parsed.type !== "message.created") return;
          const payload = parsed.payload;
          if (isE2eeHandshakeCipherText(payload.cipherText)) return;
          const currentLocale = localeRef.current;
          const currentUserId = authUserRef.current?.id;
          const currentActiveChatId = activeChatIdRef.current;
          void runAuthorized(async (accessToken) => {
            const uiMessage = await mapApiMessageToUi(payload, payload.chatId);
            if (!uiMessage) return;
            setMessagesByChat((prev) => {
              const existing = prev[payload.chatId] ?? [];
              if (existing.some((item) => item.id === uiMessage.id)) return prev;
              return { ...prev, [payload.chatId]: [...existing, uiMessage] };
            });
            setChats((prev) =>
              prev.map((chat) =>
                chat.id === payload.chatId
                  ? {
                      ...chat,
                      lastMessage: uiMessage.text,
                      lastSenderType: payload.senderId === currentUserId ? "me" : "other",
                      lastSenderName:
                        payload.senderId === currentUserId
                          ? currentLocale === "ru"
                            ? "Вы"
                            : "You"
                          : payload.senderDisplayName,
                      lastAt: payload.sentAt,
                      lastDelivery: payload.senderId === currentUserId ? "sent" : null,
                      unread:
                        payload.senderId === currentUserId || chat.id === currentActiveChatId
                          ? chat.unread
                          : chat.unread + 1
                    }
                  : chat
              )
            );
          }).catch(() => undefined);
        } catch {
          // Ignore malformed WS payloads.
        }
      };

      nextSocket.onerror = () => {
        nextSocket.close();
      };

      nextSocket.onclose = () => {
        if (!closed && wsHasOpenedRef.current) {
          setIsRealtimeReconnecting(true);
          setIsRealtimeConnected(false);
        }
        if (!closed) connect(index + 1);
      };
    };

    connect(0);
    return () => {
      closed = true;
      wsHasOpenedRef.current = false;
      setIsRealtimeReconnecting(false);
      setIsRealtimeConnected(false);
      socket?.close();
    };
  }, [authUser?.id, session?.accessToken]);

  async function loadMessagesForChat(chatId: string) {
    if (!session) return;
    const cached = messagesByChat[chatId];
    if (cached) return;
    try {
      await runAuthorized(async (accessToken) => {
        const rows = await requestMessages(accessToken, chatId);
        const merged: Message[] = [];
        for (const row of rows) {
          const ui = await mapApiMessageToUi(row, chatId);
          if (ui) merged.push(ui);
        }
        setMessagesByChat((prev) => ({ ...prev, [chatId]: merged }));
      });
    } catch {
      setMessagesByChat((prev) => ({ ...prev, [chatId]: prev[chatId] ?? [] }));
    }
  }

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    const dErr = getDisplayNameFieldError(trimmedDisplayName, authMode, true, true, t);
    const uErr = getUsernameFieldError(trimmedUsername, true, true, t);
    const pErr = getPasswordFieldError(trimmedPassword, true, true, t);
    const cpErr =
      authMode === "register"
        ? !trimmedConfirmPassword
          ? t.validationRequired
          : trimmedConfirmPassword !== trimmedPassword
            ? t.validationPasswordsMismatch
            : undefined
        : undefined;
    if (dErr || uErr || pErr || cpErr) return;
    setAuthError("");
    setIsSubmittingAuth(true);
    try {
      const authPayload: { displayName: string; username: string; password: string; avatarUrl?: string | null } = {
        displayName,
        username,
        password
      };
      const user = await requestAuth(authMode, authPayload, locale);
      let avatarUrl = user.avatarUrl ?? null;
      if (authMode === "register" && registerAvatarFile) {
        try {
          const updated = await requestUpdateProfile(
            user.accessToken,
            {
              displayName: user.displayName,
              username: user.username,
              oldPassword: "",
              newPassword: "",
              avatarUrl: await uploadAvatarMediaRef(user.accessToken, registerAvatarFile)
            },
            locale
          );
          avatarUrl = updated.avatarUrl ?? null;
        } catch {
          // Account is created; avatar can be set later in profile.
        }
      }
      const authUserData: AuthUser = { id: user.id, displayName: user.displayName, username: user.username, avatarUrl };
      const nextSession: StoredSession = { user: authUserData, accessToken: user.accessToken, refreshToken: user.refreshToken };
      setAuthUser(authUserData);
      setSession(nextSession);
      saveStoredSession(nextSession);
      setAccountPassword(trimmedPassword);
      setAuthMode("login");
      setUserAvatar(avatarUrl);
      if (registerAvatarPreview) URL.revokeObjectURL(registerAvatarPreview);
      setRegisterAvatarFile(null);
      setRegisterAvatarPreview(null);
      setActiveChatId(null);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setAuthError(t.authTimeout);
      } else {
        setAuthError(error instanceof Error ? error.message : copy[locale].authFailed);
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  if (isRestoringSession && !authUser) {
    return null;
  }

  if (!authUser) {
    return (
      <AuthPage
        theme={theme}
        locale={locale}
        authMode={authMode}
        isLanguageOpen={isLanguageOpen}
        isSubmittingAuth={isSubmittingAuth}
        displayName={displayName}
        username={username}
        password={password}
        confirmPassword={confirmPassword}
        displayNameError={displayNameError}
        usernameError={usernameError}
        passwordError={passwordError}
        confirmPasswordError={confirmPasswordError}
        authError={authError}
        onLocaleToggle={() => setIsLanguageOpen((prev) => !prev)}
        onLocaleSelect={switchLocale}
        onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
        onSwitchMode={(mode) => {
          setAuthMode(mode);
          setAuthError("");
          setDisplayName("");
          setUsername("");
          setPassword("");
          setConfirmPassword("");
          if (registerAvatarPreview) URL.revokeObjectURL(registerAvatarPreview);
          setRegisterAvatarFile(null);
          setRegisterAvatarPreview(null);
          resetValidationState();
        }}
        onDisplayNameChange={(value) => {
          setDisplayName(value);
          setFieldTyped((prev) => ({ ...prev, displayName: true }));
          setFieldEditedInFocus((prev) => ({ ...prev, displayName: true }));
        }}
        onUsernameChange={(value) => {
          setUsername(value);
          setFieldTyped((prev) => ({ ...prev, username: true }));
          setFieldEditedInFocus((prev) => ({ ...prev, username: true }));
        }}
        onPasswordChange={(value) => {
          setPassword(value);
          setFieldTyped((prev) => ({ ...prev, password: true }));
          setFieldEditedInFocus((prev) => ({ ...prev, password: true }));
        }}
        onConfirmPasswordChange={(value) => {
          setConfirmPassword(value);
          setFieldTyped((prev) => ({ ...prev, confirmPassword: true }));
          setFieldEditedInFocus((prev) => ({ ...prev, confirmPassword: true }));
        }}
        onDisplayNameFocus={() => {
          setFieldFocused((prev) => ({ ...prev, displayName: true }));
          setFieldEditedInFocus((prev) => ({ ...prev, displayName: false }));
        }}
        onUsernameFocus={() => {
          setFieldFocused((prev) => ({ ...prev, username: true }));
          setFieldEditedInFocus((prev) => ({ ...prev, username: false }));
        }}
        onPasswordFocus={() => {
          setFieldFocused((prev) => ({ ...prev, password: true }));
          setFieldEditedInFocus((prev) => ({ ...prev, password: false }));
        }}
        onConfirmPasswordFocus={() => {
          setFieldFocused((prev) => ({ ...prev, confirmPassword: true }));
          setFieldEditedInFocus((prev) => ({ ...prev, confirmPassword: false }));
        }}
        onDisplayNameBlur={() => {
          setFieldFocused((prev) => ({ ...prev, displayName: false }));
          if (!fieldTyped.displayName && !displayName.trim()) return;
          setFieldBlurred((prev) => ({ ...prev, displayName: true }));
          setFieldEditedInFocus((prev) => ({ ...prev, displayName: false }));
        }}
        onUsernameBlur={() => {
          setFieldFocused((prev) => ({ ...prev, username: false }));
          if (!fieldTyped.username && !username.trim()) return;
          setFieldBlurred((prev) => ({ ...prev, username: true }));
          setFieldEditedInFocus((prev) => ({ ...prev, username: false }));
        }}
        onPasswordBlur={() => {
          setFieldFocused((prev) => ({ ...prev, password: false }));
          if (!fieldTyped.password && !password.trim()) return;
          setFieldBlurred((prev) => ({ ...prev, password: true }));
          setFieldEditedInFocus((prev) => ({ ...prev, password: false }));
        }}
        onConfirmPasswordBlur={() => {
          setFieldFocused((prev) => ({ ...prev, confirmPassword: false }));
          if (!fieldTyped.confirmPassword && !confirmPassword.trim()) return;
          setFieldBlurred((prev) => ({ ...prev, confirmPassword: true }));
          setFieldEditedInFocus((prev) => ({ ...prev, confirmPassword: false }));
        }}
        onSubmit={handleAuthSubmit}
        registerAvatarPreview={registerAvatarPreview}
        onRegisterAvatarUpload={(file) => {
          if (!file) return;
          if (registerAvatarPreview) URL.revokeObjectURL(registerAvatarPreview);
          setRegisterAvatarFile(file);
          setRegisterAvatarPreview(URL.createObjectURL(file));
        }}
        onRegisterAvatarReset={() => {
          if (registerAvatarPreview) URL.revokeObjectURL(registerAvatarPreview);
          setRegisterAvatarFile(null);
          setRegisterAvatarPreview(null);
        }}
      />
    );
  }

  return (
    <>
    {transparencyDetailEventId ? (
      <TransparencyDetailModal
        locale={locale}
        eventId={transparencyDetailEventId}
        onClose={() => setTransparencyDetailEventId(null)}
        loadDetail={(eventId) => runAuthorized((token) => requestTransparencyDetail(token, eventId))}
        submitComplaint={(eventId, text) =>
          runAuthorized((token) => requestSubmitComplaint(token, eventId, text))
        }
      />
    ) : null}
    <ChatPage
      locale={locale}
      theme={theme}
      authUser={authUser}
      userAvatar={userAvatarDisplay}
      userAvatarRef={userAvatar}
      isMenuOpen={isMenuOpen}
      isRealtimeReconnecting={isRealtimeReconnecting}
      isRealtimeConnected={isRealtimeConnected}
      transparencyBanner={userTransparencyEnabled ? transparencyBanner : null}
      onDismissTransparency={() => setTransparencyBanner(null)}
      onOpenTransparency={(eventId) => setTransparencyDetailEventId(eventId)}
      chatEncryptionMode={chatEncryptionMode}
      encryptionConsent={encryptionConsent}
      onEncryptionConsent={(accept) => {
        if (!activeChatId || !encryptionConsent || !session) return;
        void runAuthorized((token) =>
          respondEncryptionDowngrade(token, activeChatId, encryptionConsent.requestId, accept)
        ).then(() => refreshChatEncryption(activeChatId));
      }}
      search={search}
      discoverUsers={discoverUsers}
      discoverJoinedChannels={discoverJoinedChannels}
      discoverSimilarChannels={discoverSimilarChannels}
      stickerPacks={stickerPacks}
      activeChatId={activeChatId}
      chats={chats}
      messages={activeChatId ? messagesByChatWithMedia[activeChatId] ?? [] : []}
      input={input}
      onToggleMenu={() => setIsMenuOpen((prev) => !prev)}
      onCloseMenu={() => setIsMenuOpen(false)}
      onSelectChat={(id) => {
        setActiveChatId(id);
        loadMessagesForChat(id);
      }}
      onOpenDirectChat={async (user) => {
        const existing = chats.find((chat) => chat.kind === "dm" && chat.peerUsername === user.username);
        if (existing) {
          setActiveChatId(existing.id);
          loadMessagesForChat(existing.id);
          return;
        }
        try {
          const created = await runAuthorized((accessToken) =>
            requestCreateChat(accessToken, { title: user.displayName || user.username, members: [user.id] })
          );
          setActiveChatId(created.id);
          void loadMessagesForChat(created.id);
          void runAuthorized(requestChats)
            .then((nextRows) => {
              const nextChats = nextRows.map(toChatItem);
              setChats(nextChats);
            })
            .catch(() => {
              // Keep currently opened chat usable even if chat list refresh fails.
            });
        } catch {
          throw new Error(locale === "ru" ? "не удалось создать/открыть чат" : "failed to create/open chat");
        }
      }}
      onSearchChange={setSearch}
      replyTo={replyTo}
      onCancelReply={() => setReplyTo(null)}
      onSetReplyTo={setReplyTo}
      typingPeers={activeChatId ? (typingByChat[activeChatId] ?? []) : []}
      onInputChange={(value) => {
        setInput(value);
        if (!activeChatId || !value.trim()) return;
        if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
        void runAuthorized((accessToken) => requestChatTyping(accessToken, activeChatId, true)).catch(() => {});
        typingStopTimerRef.current = setTimeout(() => {
          void runAuthorized((accessToken) => requestChatTyping(accessToken, activeChatId, false)).catch(() => {});
        }, 2500);
      }}
      onEditMessage={async (chatId, messageId, cipherText) => {
        const updated = await runAuthorized(async (accessToken) => {
          const chat = chatsRef.current.find((item) => item.id === chatId);
          const material = readDeviceKeyMaterial();
          let wireCipher = cipherText;
          if (chat?.peerUserId && material && shouldUseDmE2ee(chat.kind, chatEncryptionModeRef.current)) {
            const stored = readDmSession(chatId);
            const cipherTexts = await prepareOutgoingCipherTexts({
              token: accessToken,
              chatId,
              chatKind: chat.kind,
              encryptionMode: chatEncryptionModeRef.current,
              localDeviceId: material.deviceId,
              peerUserId: chat.peerUserId,
              peerDeviceId: stored?.peerDeviceId ?? "",
              plaintexts: [cipherText]
            });
            wireCipher = cipherTexts?.[cipherTexts.length - 1] ?? cipherText;
          }
          return requestEditMessage(accessToken, chatId, messageId, wireCipher);
        });
        const uiMessage = await mapApiMessageToUi(updated, chatId);
        if (!uiMessage) return;
        setMessagesByChat((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] ?? []).map((row) => (row.id === uiMessage.id ? uiMessage : row))
        }));
      }}
      onDeleteMessage={async (chatId, messageId) => {
        const updated = await runAuthorized((accessToken) => requestDeleteMessage(accessToken, chatId, messageId));
        const uiMessage = toUiMessage(updated);
        setMessagesByChat((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] ?? []).map((row) => (row.id === uiMessage.id ? uiMessage : row))
        }));
      }}
      onToggleReaction={async (chatId, messageId, emoji) => {
        const result = await runAuthorized((accessToken) =>
          requestToggleReaction(accessToken, chatId, messageId, emoji)
        );
        setMessagesByChat((prev) => ({
          ...prev,
          [chatId]: (prev[chatId] ?? []).map((row) =>
            row.id === messageId
              ? {
                  ...row,
                  reactions: (result.reactions ?? []).map((r) => ({
                    emoji: r.emoji,
                    count: r.count,
                    reactedByMe: r.userIds?.includes(authUser.id)
                  }))
                }
              : row
          )
        }));
      }}
      onPrepareAttachment={async (file) => {
        const type: PendingAttachment["type"] = file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : file.type.startsWith("image/")
              ? "image"
              : "file";
        const localPreview = URL.createObjectURL(file);
        const chat = activeChatId ? chatsRef.current.find((item) => item.id === activeChatId) : null;
        const useMediaE2ee = Boolean(chat && shouldUseDmE2ee(chat.kind, chatEncryptionModeRef.current));
        const uploadable = useMediaE2ee ? await encryptAttachmentFile(file) : null;
        const uploaded = await runAuthorized((accessToken) =>
          uploadMediaFile(accessToken, uploadable ? uploadable.encryptedFile : file)
        );
        return {
          mediaId: uploaded.mediaId,
          type,
          name: uploaded.name,
          localPreview,
          mime: file.type || "application/octet-stream",
          size: file.size,
          mediaE2ee: uploadable?.envelope
        };
      }}
      onSendMessage={(attachment) => {
        if (!activeChatId || (!input.trim() && !attachment)) return;
        const plainText = input.trim();
        const messageText = plainText || attachment?.name || (locale === "ru" ? "Вложение" : "Attachment");
        const wireText = attachment
          ? JSON.stringify({
              kind: "attachment",
              text: plainText,
              mediaId: attachment.mediaId,
              previewType: attachment.type,
              fileName: attachment.name,
              ...(attachment.mediaE2ee ? { mediaE2ee: attachment.mediaE2ee } : {})
            } satisfies AttachmentPayload)
          : messageText;
        const optimisticId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const replySnapshot = replyTo;
        const optimisticMessage: Message = {
          id: optimisticId,
          sender: "me",
          author: authUser.displayName,
          text: messageText,
          time: new Date().toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", { hour: "2-digit", minute: "2-digit" }),
          createdAt: new Date().toISOString(),
          mediaId: attachment?.mediaId,
          preview: attachment?.localPreview,
          previewType: attachment?.type,
          fileName: attachment?.name,
          mediaE2ee: attachment?.mediaE2ee,
          ...(replySnapshot
            ? {
                replyTo: {
                  id: replySnapshot.id,
                  author: replySnapshot.author,
                  text: replySnapshot.text,
                  isDeleted: replySnapshot.isDeleted
                }
              }
            : {})
        };
        const attachmentPreviewUrl = attachment?.localPreview;
        setInput("");
        setReplyTo(null);
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChatId]: [...(prev[activeChatId] ?? []), optimisticMessage]
        }));
        if (attachment) {
          URL.revokeObjectURL(attachment.localPreview);
        }
        void runAuthorized(async (accessToken) => {
          const chat = chatsRef.current.find((item) => item.id === activeChatId);
          const material = readDeviceKeyMaterial();
          const useE2ee =
            chat?.peerUserId &&
            material &&
            shouldUseDmE2ee(chat.kind, chatEncryptionModeRef.current);
          if (useE2ee && chat?.peerUserId && material) {
            const stored = readDmSession(activeChatId);
            const e2eePlaintext = attachment ? wireText : messageText;
            const cipherTexts = await prepareOutgoingCipherTexts({
              token: accessToken,
              chatId: activeChatId,
              chatKind: chat.kind,
              encryptionMode: chatEncryptionModeRef.current,
              localDeviceId: material.deviceId,
              peerUserId: chat.peerUserId,
              peerDeviceId: stored?.peerDeviceId ?? "",
              plaintexts: [e2eePlaintext]
            });
            if (!cipherTexts?.length) throw new Error("e2ee_encrypt_failed");
            let lastCreated: MessageApiResponseItem | null = null;
            for (const cipher of cipherTexts) {
              lastCreated = await requestSendMessage(
                accessToken,
                activeChatId,
                cipher,
                null,
                replySnapshot?.id ?? null
              );
            }
            if (!lastCreated) throw new Error("send_failed");
            return lastCreated;
          }
          return requestSendMessage(
            accessToken,
            activeChatId,
            wireText,
            attachment?.mediaId ?? null,
            replySnapshot?.id ?? null
          );
        })
          .then(async (created) => {
            const uiMessage = await mapApiMessageToUi(created, activeChatId);
            if (!uiMessage) return;
            if (attachment && attachmentPreviewUrl) {
              setMessagePreviewById((prev) => ({
                ...prev,
                [uiMessage.id]: {
                  preview: attachmentPreviewUrl,
                  previewType: attachment.type,
                  fileName: attachment.name
                }
              }));
              setMediaBlobById((prev) =>
                prev[attachment.mediaId] ? prev : { ...prev, [attachment.mediaId]: attachmentPreviewUrl }
              );
            }
            setMessagesByChat((prev) => ({
              ...prev,
              [activeChatId]: (prev[activeChatId] ?? [])
                .filter((item) => item.id !== optimisticId)
                .some((item) => item.id === uiMessage.id)
                ? (prev[activeChatId] ?? []).filter((item) => item.id !== optimisticId)
                : [
                    ...(prev[activeChatId] ?? []).filter((item) => item.id !== optimisticId),
                    attachment
                      ? {
                          ...uiMessage,
                          mediaId: attachment.mediaId,
                          preview: attachmentPreviewUrl,
                          previewType: attachment.type,
                          fileName: attachment.name,
                          mediaE2ee: attachment.mediaE2ee
                        }
                      : uiMessage
                  ]
            }));
            setChats((prev) =>
              prev.map((chat) =>
                chat.id === activeChatId
                  ? {
                      ...chat,
                      lastMessage: uiMessage.text,
                      lastSenderType: "me",
                      lastSenderName: locale === "ru" ? "Вы" : "You",
                      lastAt: created.sentAt,
                      lastDelivery: "sent"
                    }
                  : chat
              )
            );
          })
          .catch(() => {
            setMessagesByChat((prev) => ({
              ...prev,
              [activeChatId]: (prev[activeChatId] ?? []).filter((item) => item.id !== optimisticId)
            }));
          });
      }}
      onSendSticker={(sticker) => {
        if (!activeChatId || !sticker.assetUrl) return;
        const wireText = buildStickerCipherText(sticker);
        const optimisticId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const replySnapshot = replyTo;
        const optimisticMessage: Message = {
          id: optimisticId,
          sender: "me",
          author: authUser.displayName,
          kind: "sticker",
          text: sticker.label,
          time: new Date().toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", { hour: "2-digit", minute: "2-digit" }),
          createdAt: new Date().toISOString(),
          sticker: {
            stickerId: sticker.id,
            assetUrl: sticker.assetUrl,
            label: sticker.label,
            animated: sticker.animated
          },
          ...(replySnapshot
            ? {
                replyTo: {
                  id: replySnapshot.id,
                  author: replySnapshot.author,
                  text: replySnapshot.text,
                  isDeleted: replySnapshot.isDeleted
                }
              }
            : {})
        };
        setReplyTo(null);
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChatId]: [...(prev[activeChatId] ?? []), optimisticMessage]
        }));
        void runAuthorized(async (accessToken) => {
          const chat = chatsRef.current.find((item) => item.id === activeChatId);
          const material = readDeviceKeyMaterial();
          const useE2ee =
            chat?.peerUserId && material && shouldUseDmE2ee(chat.kind, chatEncryptionModeRef.current);
          if (useE2ee && chat?.peerUserId && material) {
            const stored = readDmSession(activeChatId);
            const cipherTexts = await prepareOutgoingCipherTexts({
              token: accessToken,
              chatId: activeChatId,
              chatKind: chat.kind,
              encryptionMode: chatEncryptionModeRef.current,
              localDeviceId: material.deviceId,
              peerUserId: chat.peerUserId,
              peerDeviceId: stored?.peerDeviceId ?? "",
              plaintexts: [wireText]
            });
            if (!cipherTexts?.length) throw new Error("e2ee_encrypt_failed");
            let lastCreated: MessageApiResponseItem | null = null;
            for (const cipher of cipherTexts) {
              lastCreated = await requestSendMessage(accessToken, activeChatId, cipher, null, replySnapshot?.id ?? null);
            }
            if (!lastCreated) throw new Error("send_failed");
            return lastCreated;
          }
          return requestSendMessage(accessToken, activeChatId, wireText, null, replySnapshot?.id ?? null);
        })
          .then(async (created) => {
            const uiMessage = await mapApiMessageToUi(created, activeChatId);
            if (!uiMessage) return;
            setMessagesByChat((prev) => ({
              ...prev,
              [activeChatId]: (prev[activeChatId] ?? [])
                .filter((item) => item.id !== optimisticId)
                .some((item) => item.id === uiMessage.id)
                ? (prev[activeChatId] ?? []).filter((item) => item.id !== optimisticId)
                : [...(prev[activeChatId] ?? []).filter((item) => item.id !== optimisticId), uiMessage]
            }));
            setChats((prev) =>
              prev.map((chat) =>
                chat.id === activeChatId
                  ? {
                      ...chat,
                      lastMessage: uiMessage.text,
                      lastSenderType: "me",
                      lastSenderName: locale === "ru" ? "Вы" : "You",
                      lastAt: created.sentAt,
                      lastDelivery: "sent"
                    }
                  : chat
              )
            );
          })
          .catch(() => {
            setMessagesByChat((prev) => ({
              ...prev,
              [activeChatId]: (prev[activeChatId] ?? []).filter((item) => item.id !== optimisticId)
            }));
          });
      }}
      onLogout={() => {
        setAuthUser(null);
        setSession(null);
        clearStoredSession();
        setChats([]);
        setMessagesByChat({});
        setActiveChatId(null);
        setAccountPassword("");
        setIsMenuOpen(false);
        setAuthMode("login");
        resetValidationState();
      }}
      onThemeToggle={() => setTheme((prev) => (prev === "dark" ? "light" : "dark"))}
      onLocaleSelect={switchLocale}
      onUpdateProfile={async ({ displayName, username, oldPassword, newPassword, confirmPassword }) => {
        const changePasswordRequested = Boolean(oldPassword || newPassword || confirmPassword);
        if (changePasswordRequested) {
          if (!oldPassword) return locale === "ru" ? "введите старый пароль." : "enter current password.";
          if (oldPassword !== accountPassword) return locale === "ru" ? "старый пароль неверен." : "current password is incorrect.";
          if (!newPassword) return locale === "ru" ? "введите новый пароль." : "enter new password.";
          const newPasswordError = getPasswordFieldError(newPassword, true, true, t);
          if (newPasswordError) return `${locale === "ru" ? "Новый пароль" : "New password"} ${newPasswordError}`;
          if (newPassword === oldPassword) return locale === "ru" ? "новый пароль должен отличаться." : "new password must be different.";
          if (!confirmPassword) return locale === "ru" ? "повторите новый пароль." : "repeat new password.";
          if (confirmPassword !== newPassword) return locale === "ru" ? "пароли не совпадают." : "passwords do not match.";
        }
        let updatedUser: AuthUser;
        try {
          updatedUser = await runAuthorized((accessToken) =>
            requestUpdateProfile(accessToken, {
              displayName,
              username,
              oldPassword,
              newPassword
            }, locale)
          );
        } catch (error) {
          return error instanceof Error ? error.message : locale === "ru" ? "не удалось обновить профиль." : "failed to update profile.";
        }
        if (changePasswordRequested) {
          setAccountPassword(newPassword);
        }
        setAuthUser(updatedUser);
        setSession((prev) => {
          if (!prev) return prev;
          const next = { ...prev, user: updatedUser };
          saveStoredSession(next);
          return next;
        });
        setUserAvatar(updatedUser.avatarUrl ?? null);
        setMessagesByChat((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[key] = next[key].map((message) => (message.sender === "me" ? { ...message, author: displayName } : message));
          }
          return next;
        });
        return undefined;
      }}
      onUploadAvatar={async (file) => {
        if (!file) return;
        try {
          const updated = await runAuthorized(async (accessToken) =>
            requestUpdateProfile(accessToken, {
              displayName: authUser.displayName,
              username: authUser.username,
              oldPassword: "",
              newPassword: "",
              avatarUrl: await uploadAvatarMediaRef(accessToken, file)
            }, locale)
          );
          setAuthUser(updated);
          setSession((prev) => {
            if (!prev) return prev;
            const next = { ...prev, user: updated };
            saveStoredSession(next);
            return next;
          });
          setUserAvatar(updated.avatarUrl ?? null);
        } catch {
          // Keep current avatar on upload errors.
        }
      }}
      onResetAvatar={() => {
        void runAuthorized((accessToken) =>
          requestUpdateProfile(accessToken, {
            displayName: authUser.displayName,
            username: authUser.username,
            oldPassword: "",
            newPassword: "",
            avatarUrl: null
          }, locale)
        )
          .then((updated) => {
            setAuthUser(updated);
            setSession((prev) => {
              if (!prev) return prev;
              const next = { ...prev, user: updated };
              saveStoredSession(next);
              return next;
            });
            setUserAvatar(null);
          })
          .catch(() => undefined);
      }}
      onUpdateChat={(chatId, payload) => {
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  ...(payload.name ? { name: payload.name } : {}),
                  ...(payload.group ? { group: payload.group } : {}),
                  ...(typeof payload.unread === "number" ? { unread: payload.unread } : {})
                }
              : chat
          )
        );
      }}
      onCreateStickerPack={async (payload) => {
        await runAuthorized((accessToken) => requestCreateStickerPack(accessToken, payload));
        const rows = await runAuthorized(requestStickerPacks);
        setStickerPacks(rows);
      }}
      onCreateSticker={async (packId, payload) => {
        await runAuthorized((accessToken) => requestCreateSticker(accessToken, packId, payload));
        const rows = await runAuthorized(requestStickerPacks);
        setStickerPacks(rows);
      }}
      onUpdateStickerPack={async (packId, payload) => {
        await runAuthorized((accessToken) => requestUpdateStickerPack(accessToken, packId, payload));
        const rows = await runAuthorized(requestStickerPacks);
        setStickerPacks(rows);
      }}
      onDeleteStickerPack={async (packId) => {
        await runAuthorized((accessToken) => requestDeleteStickerPack(accessToken, packId));
        const rows = await runAuthorized(requestStickerPacks);
        setStickerPacks(rows);
      }}
      onUpdateSticker={async (stickerId, payload) => {
        await runAuthorized((accessToken) => requestUpdateSticker(accessToken, stickerId, payload));
        const rows = await runAuthorized(requestStickerPacks);
        setStickerPacks(rows);
      }}
      onDeleteSticker={async (stickerId) => {
        await runAuthorized((accessToken) => requestDeleteSticker(accessToken, stickerId));
        const rows = await runAuthorized(requestStickerPacks);
        setStickerPacks(rows);
      }}
    />
    </>
  );
}
