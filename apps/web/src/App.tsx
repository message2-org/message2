import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { copy, Locale } from "./i18n";
import { AuthPage } from "./pages/AuthPage";
import { ChatPage } from "./pages/ChatPage";
import { AuthMode, AuthUser, ChatItem, Message } from "./types";

const API_BASE_URLS = ["/messaging", "http://localhost:4000/messaging", "http://localhost:4001"] as const;
const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;
const PASSWORD_HAS_LOWER = /[a-z]/;
const PASSWORD_HAS_UPPER = /[A-Z]/;
const PASSWORD_HAS_DIGIT = /\d/;
const PASSWORD_HAS_SPECIAL = /[^A-Za-z0-9]/;

type Copy = (typeof copy)["ru"];
type AuthApiResponse = AuthUser & { accessToken: string; refreshToken: string };
type StoredSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};
type ChatApiResponseItem = {
  id: string;
  title: string;
  kind: "dm" | "group";
  members: { id: string; displayName: string; username: string }[];
  lastMessage: { id: string; senderId: string; cipherText: string; sentAt: string } | null;
};
type MessageApiResponseItem = {
  id: string;
  chatId: string;
  senderId: string;
  cipherText: string;
  sentAt: string;
  senderDisplayName?: string;
};
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
const SESSION_STORAGE_KEY = "message2.auth.session.v1";
const UNAUTHORIZED_ERROR = "UNAUTHORIZED";

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

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed.user || !parsed.accessToken || !parsed.refreshToken) return null;
    if (!parsed.user.id || !parsed.user.displayName || !parsed.user.username) return null;
    return { user: parsed.user, accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
  } catch {
    return null;
  }
}

function saveStoredSession(session: StoredSession) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

async function requestAuth(mode: AuthMode, payload: { displayName?: string; username: string; password: string }, locale: Locale) {
  const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
  let lastError: Error | null = null;

  for (const baseUrl of API_BASE_URLS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3200);
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) {
        const backendMessage = String(data.error ?? "Auth request failed");
        const translatedMessage =
          locale === "ru"
            ? backendMessage
                .replace("username and password are required", "Требуются имя пользователя и пароль")
                .replace("username already exists", "Такое имя пользователя уже существует")
                .replace("invalid credentials", "Неверные учетные данные")
            : backendMessage;
        throw new Error(translatedMessage);
      }
      return data as AuthApiResponse;
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError" && error.message !== "Failed to fetch") {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error("Auth request failed");
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastError ?? new Error("Auth request failed");
}

async function requestRefresh(refreshToken: string) {
  for (const baseUrl of API_BASE_URLS) {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) continue;
    const data = (await response.json()) as { accessToken: string; refreshToken: string };
    if (data.accessToken && data.refreshToken) return data;
  }
  throw new Error("Refresh request failed");
}

async function requestMe(accessToken: string) {
  for (const baseUrl of API_BASE_URLS) {
    const response = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) continue;
    const data = (await response.json()) as AuthUser;
    if (data.id && data.username && data.displayName) return data;
  }
  throw new Error("Failed to load profile");
}

async function requestWithAuth(path: string, accessToken: string, init?: RequestInit) {
  for (const baseUrl of API_BASE_URLS) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${accessToken}`
      }
    });
    if (response.status === 401) throw new Error(UNAUTHORIZED_ERROR);
    if (!response.ok) continue;
    return response;
  }
  throw new Error("Request failed");
}

async function requestChats(accessToken: string) {
  const response = await requestWithAuth("/chats", accessToken);
  return (await response.json()) as ChatApiResponseItem[];
}

async function requestMessages(accessToken: string, chatId: string) {
  const response = await requestWithAuth(`/chats/${chatId}/messages`, accessToken);
  return (await response.json()) as MessageApiResponseItem[];
}

async function requestSendMessage(accessToken: string, chatId: string, text: string) {
  const response = await requestWithAuth(`/chats/${chatId}/messages`, accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cipherText: text, kind: "text" })
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

async function requestDiscover(accessToken: string, query: string) {
  const response = await requestWithAuth(`/discover?query=${encodeURIComponent(query)}`, accessToken);
  return (await response.json()) as DiscoverApiResponse;
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

export default function App() {
  const [locale, setLocale] = useState<Locale>("ru");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
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
  const [registerAvatar, setRegisterAvatar] = useState<string | null>(null);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, Message[]>>({});
  const [discoverUsers, setDiscoverUsers] = useState<DiscoverApiResponse["users"]>([]);
  const [discoverJoinedChannels, setDiscoverJoinedChannels] = useState<DiscoverApiResponse["joinedChannels"]>([]);
  const [discoverSimilarChannels, setDiscoverSimilarChannels] = useState<DiscoverApiResponse["similarChannels"]>([]);
  const [isRealtimeReconnecting, setIsRealtimeReconnecting] = useState(false);
  const wsHasOpenedRef = useRef(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [session, setSession] = useState<StoredSession | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const t = copy[locale];
  const activeChatIdRef = useRef<string | null>(null);
  const localeRef = useRef(locale);
  const authUserRef = useRef(authUser);

  const toChatItem = (chat: ChatApiResponseItem): ChatItem => {
    const last = chat.lastMessage;
    const senderType = last?.senderId === authUser?.id ? "me" : "other";
    const peer =
      chat.kind === "dm" && authUser?.id ? chat.members.find((member) => member.id !== authUser.id) : undefined;
    return {
      id: chat.id,
      group: "regular",
      kind: chat.kind,
      peerUsername: peer?.username,
      name: chat.title,
      status: "offline",
      lastMessage: last?.cipherText ?? "",
      lastSenderType: last ? senderType : undefined,
      lastSenderName: senderType === "me" ? (locale === "ru" ? "Вы" : "You") : undefined,
      lastAt: last?.sentAt,
      lastDelivery: senderType === "me" ? "sent" : null,
      unread: 0
    };
  };

  const toUiMessage = (message: MessageApiResponseItem): Message => {
    const createdAt = message.sentAt;
    return {
      id: message.id,
      sender: message.senderId === authUser?.id ? "me" : "them",
      author: message.senderId === authUser?.id ? authUser?.displayName ?? (locale === "ru" ? "Вы" : "You") : message.senderDisplayName ?? (locale === "ru" ? "Собеседник" : "Contact"),
      text: message.cipherText,
      time: new Date(createdAt).toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", { hour: "2-digit", minute: "2-digit" }),
      createdAt
    };
  };

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
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const storedSession = readStoredSession();
      if (!storedSession) {
        if (mounted) setIsRestoringSession(false);
        return;
      }

      try {
        const user = await requestMe(storedSession.accessToken);
        if (!mounted) return;
        setAuthUser(user);
        setUserAvatar(user.avatarUrl ?? null);
        const nextSession = { ...storedSession, user };
        setSession(nextSession);
        saveStoredSession(nextSession);
      } catch {
        try {
          const refreshed = await requestRefresh(storedSession.refreshToken);
          const user = await requestMe(refreshed.accessToken);
          if (!mounted) return;
          setAuthUser(user);
          setUserAvatar(user.avatarUrl ?? null);
          const nextSession = { user, accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken };
          setSession(nextSession);
          saveStoredSession(nextSession);
        } catch {
          setSession(null);
          clearStoredSession();
        }
      } finally {
        if (mounted) setIsRestoringSession(false);
      }
    })();
    return () => {
      mounted = false;
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
      const refreshed = await requestRefresh(session.refreshToken);
      const nextSession = { ...session, accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken };
      setSession(nextSession);
      saveStoredSession(nextSession);
      return operation(nextSession.accessToken);
    }
  }

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

  useEffect(() => {
    if (!authUser?.id || !session?.accessToken) {
      setDiscoverUsers([]);
      setDiscoverJoinedChannels([]);
      setDiscoverSimilarChannels([]);
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
      wsHasOpenedRef.current = false;
      setIsRealtimeReconnecting(false);
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
      };

      nextSocket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as { type?: string; payload?: MessageApiResponseItem };
          if (parsed.type !== "message.created" || !parsed.payload) return;
          const payload = parsed.payload;
          const uiMessage = toUiMessage(payload);
          const currentLocale = localeRef.current;
          const currentUserId = authUserRef.current?.id;
          const currentActiveChatId = activeChatIdRef.current;
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
                    lastMessage: payload.cipherText,
                    lastSenderType: payload.senderId === currentUserId ? "me" : "other",
                    lastSenderName:
                      payload.senderId === currentUserId
                        ? currentLocale === "ru"
                          ? "Вы"
                          : "You"
                        : payload.senderDisplayName,
                    lastAt: payload.sentAt,
                    lastDelivery: payload.senderId === currentUserId ? "sent" : null,
                    unread: payload.senderId === currentUserId || chat.id === currentActiveChatId ? chat.unread : chat.unread + 1
                  }
                : chat
            )
          );
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
        }
        if (!closed) connect(index + 1);
      };
    };

    connect(0);
    return () => {
      closed = true;
      wsHasOpenedRef.current = false;
      setIsRealtimeReconnecting(false);
      socket?.close();
    };
  }, [authUser?.id, session?.accessToken]);

  async function loadMessagesForChat(chatId: string) {
    if (!session) return;
    const cached = messagesByChat[chatId];
    if (cached) return;
    try {
      const rows = await runAuthorized((accessToken) => requestMessages(accessToken, chatId));
      setMessagesByChat((prev) => ({ ...prev, [chatId]: rows.map(toUiMessage) }));
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
      const user = await requestAuth(authMode, { displayName, username, password }, locale);
      const authUserData: AuthUser = { id: user.id, displayName: user.displayName, username: user.username, avatarUrl: user.avatarUrl ?? null };
      const nextSession: StoredSession = { user: authUserData, accessToken: user.accessToken, refreshToken: user.refreshToken };
      setAuthUser(authUserData);
      setSession(nextSession);
      saveStoredSession(nextSession);
      setAccountPassword(trimmedPassword);
      setAuthMode("login");
      setUserAvatar(user.avatarUrl ?? registerAvatar ?? null);
      setRegisterAvatar(null);
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

  if (isRestoringSession) {
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
        registerAvatar={registerAvatar}
        onRegisterAvatarUpload={(file) => {
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") setRegisterAvatar(reader.result);
          };
          reader.readAsDataURL(file);
        }}
        onRegisterAvatarReset={() => setRegisterAvatar(null)}
      />
    );
  }

  return (
    <ChatPage
      locale={locale}
      theme={theme}
      authUser={authUser}
      userAvatar={userAvatar}
      isMenuOpen={isMenuOpen}
      isRealtimeReconnecting={isRealtimeReconnecting}
      search={search}
      discoverUsers={discoverUsers}
      discoverJoinedChannels={discoverJoinedChannels}
      discoverSimilarChannels={discoverSimilarChannels}
      activeChatId={activeChatId}
      chats={chats}
      messages={activeChatId ? messagesByChat[activeChatId] ?? [] : []}
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
          const nextRows = await runAuthorized(requestChats);
          const nextChats = nextRows.map(toChatItem);
          setChats(nextChats);
          setActiveChatId(created.id);
          loadMessagesForChat(created.id);
        } catch {
          // Keep UI stable if DM creation fails.
        }
      }}
      onSearchChange={setSearch}
      onInputChange={setInput}
      onSendMessage={(attachment) => {
        if (!activeChatId || (!input.trim() && !attachment)) return;
        const messageText = input.trim() || attachment?.name || (locale === "ru" ? "Вложение" : "Attachment");
        setInput("");
        void runAuthorized((accessToken) => requestSendMessage(accessToken, activeChatId, messageText))
          .then((created) => {
            const uiMessage = toUiMessage(created);
            setMessagesByChat((prev) => ({
              ...prev,
              [activeChatId]: (prev[activeChatId] ?? []).some((item) => item.id === uiMessage.id)
                ? prev[activeChatId] ?? []
                : [...(prev[activeChatId] ?? []), uiMessage]
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
          .catch(() => undefined);
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
        const reader = new FileReader();
        reader.onload = async () => {
          if (typeof reader.result !== "string") return;
          try {
            const updated = await runAuthorized((accessToken) =>
              requestUpdateProfile(accessToken, {
                displayName: authUser.displayName,
                username: authUser.username,
                oldPassword: "",
                newPassword: "",
                avatarUrl: reader.result
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
        };
        reader.readAsDataURL(file);
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
    />
  );
}
