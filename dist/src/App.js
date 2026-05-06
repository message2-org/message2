import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { copy } from "./i18n";
import { AuthPage } from "./pages/AuthPage";
import { ChatPage } from "./pages/ChatPage";
const API_BASE_URLS = ["/messaging", "http://localhost:4000/messaging", "http://localhost:4001"];
const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;
const PASSWORD_HAS_LOWER = /[a-z]/;
const PASSWORD_HAS_UPPER = /[A-Z]/;
const PASSWORD_HAS_DIGIT = /\d/;
const PASSWORD_HAS_SPECIAL = /[^A-Za-z0-9]/;
const SESSION_STORAGE_KEY = "message2.auth.session.v1";
const UNAUTHORIZED_ERROR = "UNAUTHORIZED";
function getDisplayNameFieldError(trimmed, authMode, attempted, showMinLength, t) {
    if (authMode !== "register")
        return undefined;
    if (!trimmed)
        return undefined;
    if (trimmed.length < 2)
        return showMinLength ? t.validationNameMin : undefined;
    if (trimmed.length > 40)
        return t.validationNameMax;
    return undefined;
}
function getUsernameFieldError(trimmed, attempted, showMinLength, t) {
    if (!trimmed)
        return attempted ? t.validationRequired : undefined;
    if (!USERNAME_RE.test(trimmed))
        return t.validationUsernameChars;
    if (trimmed.length < 3)
        return showMinLength ? t.validationUsernameMin : undefined;
    if (trimmed.length > 24)
        return t.validationUsernameMax;
    return undefined;
}
function getPasswordFieldError(trimmed, attempted, showMinLength, t) {
    if (!trimmed)
        return attempted ? t.validationRequired : undefined;
    if (trimmed.length < 6)
        return showMinLength ? t.validationPasswordMin : undefined;
    if (trimmed.length > 64)
        return t.validationPasswordMax;
    if (!PASSWORD_HAS_LOWER.test(trimmed))
        return t.validationPasswordNeedLower;
    if (!PASSWORD_HAS_UPPER.test(trimmed))
        return t.validationPasswordNeedUpper;
    if (!PASSWORD_HAS_DIGIT.test(trimmed))
        return t.validationPasswordNeedDigit;
    if (!PASSWORD_HAS_SPECIAL.test(trimmed))
        return t.validationPasswordNeedSpecial;
    return undefined;
}
function readStoredSession() {
    try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!parsed.user || !parsed.accessToken || !parsed.refreshToken)
            return null;
        if (!parsed.user.id || !parsed.user.displayName || !parsed.user.username)
            return null;
        return { user: parsed.user, accessToken: parsed.accessToken, refreshToken: parsed.refreshToken };
    }
    catch {
        return null;
    }
}
function saveStoredSession(session) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}
function clearStoredSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
}
async function requestAuth(mode, payload, locale) {
    const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
    let lastError = null;
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
                const translatedMessage = locale === "ru"
                    ? backendMessage
                        .replace("username and password are required", "Требуются имя пользователя и пароль")
                        .replace("username already exists", "Такое имя пользователя уже существует")
                        .replace("invalid credentials", "Неверные учетные данные")
                    : backendMessage;
                throw new Error(translatedMessage);
            }
            return data;
        }
        catch (error) {
            if (error instanceof Error && error.name !== "AbortError" && error.message !== "Failed to fetch") {
                throw error;
            }
            lastError = error instanceof Error ? error : new Error("Auth request failed");
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    throw lastError ?? new Error("Auth request failed");
}
async function requestRefresh(refreshToken) {
    for (const baseUrl of API_BASE_URLS) {
        const response = await fetch(`${baseUrl}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken })
        });
        if (!response.ok)
            continue;
        const data = (await response.json());
        if (data.accessToken && data.refreshToken)
            return data;
    }
    throw new Error("Refresh request failed");
}
async function requestMe(accessToken) {
    for (const baseUrl of API_BASE_URLS) {
        const response = await fetch(`${baseUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok)
            continue;
        const data = (await response.json());
        if (data.id && data.username && data.displayName)
            return data;
    }
    throw new Error("Failed to load profile");
}
async function requestWithAuth(path, accessToken, init) {
    for (const baseUrl of API_BASE_URLS) {
        const response = await fetch(`${baseUrl}${path}`, {
            ...init,
            headers: {
                ...(init?.headers ?? {}),
                Authorization: `Bearer ${accessToken}`
            }
        });
        if (response.status === 401)
            throw new Error(UNAUTHORIZED_ERROR);
        if (!response.ok)
            continue;
        return response;
    }
    throw new Error("Request failed");
}
async function requestChats(accessToken) {
    const response = await requestWithAuth("/chats", accessToken);
    return (await response.json());
}
async function requestMessages(accessToken, chatId) {
    const response = await requestWithAuth(`/chats/${chatId}/messages`, accessToken);
    return (await response.json());
}
async function requestSendMessage(accessToken, chatId, text) {
    const response = await requestWithAuth(`/chats/${chatId}/messages`, accessToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cipherText: text, kind: "text" })
    });
    return (await response.json());
}
function wsCandidates(accessToken) {
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
    const [locale, setLocale] = useState("ru");
    const [theme, setTheme] = useState("dark");
    const [authMode, setAuthMode] = useState("login");
    const [authUser, setAuthUser] = useState(null);
    const [displayName, setDisplayName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [fieldTyped, setFieldTyped] = useState({
        displayName: false,
        username: false,
        password: false,
        confirmPassword: false
    });
    const [fieldBlurred, setFieldBlurred] = useState({
        displayName: false,
        username: false,
        password: false,
        confirmPassword: false
    });
    const [fieldFocused, setFieldFocused] = useState({
        displayName: false,
        username: false,
        password: false,
        confirmPassword: false
    });
    const [fieldEditedInFocus, setFieldEditedInFocus] = useState({
        displayName: false,
        username: false,
        password: false,
        confirmPassword: false
    });
    const [activeChatId, setActiveChatId] = useState(null);
    const [search, setSearch] = useState("");
    const [input, setInput] = useState("");
    const [isLanguageOpen, setIsLanguageOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [userAvatar, setUserAvatar] = useState(null);
    const [registerAvatar, setRegisterAvatar] = useState(null);
    const [chats, setChats] = useState([]);
    const [messagesByChat, setMessagesByChat] = useState({});
    const [accountPassword, setAccountPassword] = useState("");
    const [session, setSession] = useState(null);
    const [isRestoringSession, setIsRestoringSession] = useState(true);
    const t = copy[locale];
    const activeChatIdRef = useRef(null);
    const localeRef = useRef(locale);
    const authUserRef = useRef(authUser);
    const toChatItem = (chat) => {
        const last = chat.lastMessage;
        const senderType = last?.senderId === authUser?.id ? "me" : "other";
        return {
            id: chat.id,
            group: "regular",
            kind: chat.kind,
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
    const toUiMessage = (message) => {
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
    const showDisplayNameMinLength = submitAttempted || (fieldTyped.displayName && fieldBlurred.displayName && !suppressDisplayNameMinWhileEditing);
    const showUsernameMinLength = submitAttempted || (fieldTyped.username && fieldBlurred.username && !suppressUsernameMinWhileEditing);
    const showPasswordMinLength = submitAttempted || (fieldTyped.password && fieldBlurred.password && !suppressPasswordMinWhileEditing);
    const showConfirmPasswordMismatch = submitAttempted || (fieldTyped.confirmPassword && fieldBlurred.confirmPassword && !suppressConfirmPasswordMinWhileEditing);
    const displayNameError = useMemo(() => getDisplayNameFieldError(trimmedDisplayName, authMode, submitAttempted, showDisplayNameMinLength, t), [trimmedDisplayName, authMode, submitAttempted, showDisplayNameMinLength, t]);
    const usernameError = useMemo(() => getUsernameFieldError(trimmedUsername, submitAttempted, showUsernameMinLength, t), [trimmedUsername, submitAttempted, showUsernameMinLength, t]);
    const passwordError = useMemo(() => getPasswordFieldError(trimmedPassword, submitAttempted, showPasswordMinLength, t), [trimmedPassword, submitAttempted, showPasswordMinLength, t]);
    const confirmPasswordError = useMemo(() => {
        if (authMode !== "register")
            return undefined;
        if (!trimmedConfirmPassword)
            return submitAttempted ? t.validationRequired : undefined;
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
                if (mounted)
                    setIsRestoringSession(false);
                return;
            }
            try {
                const user = await requestMe(storedSession.accessToken);
                if (!mounted)
                    return;
                setAuthUser(user);
                const nextSession = { ...storedSession, user };
                setSession(nextSession);
                saveStoredSession(nextSession);
            }
            catch {
                try {
                    const refreshed = await requestRefresh(storedSession.refreshToken);
                    const user = await requestMe(refreshed.accessToken);
                    if (!mounted)
                        return;
                    setAuthUser(user);
                    const nextSession = { user, accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken };
                    setSession(nextSession);
                    saveStoredSession(nextSession);
                }
                catch {
                    setSession(null);
                    clearStoredSession();
                }
            }
            finally {
                if (mounted)
                    setIsRestoringSession(false);
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
    function switchLocale(nextLocale) {
        setLocale(nextLocale);
        setIsLanguageOpen(false);
    }
    async function runAuthorized(operation) {
        if (!session)
            throw new Error("Not authenticated");
        try {
            return await operation(session.accessToken);
        }
        catch (error) {
            if (!(error instanceof Error) || error.message !== UNAUTHORIZED_ERROR)
                throw error;
            const refreshed = await requestRefresh(session.refreshToken);
            const nextSession = { ...session, accessToken: refreshed.accessToken, refreshToken: refreshed.refreshToken };
            setSession(nextSession);
            saveStoredSession(nextSession);
            return operation(nextSession.accessToken);
        }
    }
    useEffect(() => {
        if (!authUser || !session)
            return;
        let cancelled = false;
        void runAuthorized(requestChats)
            .then((chatRows) => {
            if (cancelled)
                return;
            const nextChats = chatRows.map(toChatItem);
            setChats(nextChats);
            setActiveChatId((prev) => prev ?? nextChats[0]?.id ?? null);
        })
            .catch(() => {
            if (cancelled)
                return;
            setChats([]);
        });
        return () => {
            cancelled = true;
        };
    }, [authUser, session, locale]);
    useEffect(() => {
        if (!activeChatId)
            return;
        void loadMessagesForChat(activeChatId);
    }, [activeChatId]);
    useEffect(() => {
        if (!authUser?.id || !session?.accessToken)
            return;
        const endpoints = wsCandidates(session.accessToken);
        let socket = null;
        let closed = false;
        const connect = (index) => {
            if (closed || index >= endpoints.length)
                return;
            const candidate = endpoints[index];
            const nextSocket = new WebSocket(candidate);
            socket = nextSocket;
            nextSocket.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(String(event.data));
                    if (parsed.type !== "message.created" || !parsed.payload)
                        return;
                    const payload = parsed.payload;
                    const uiMessage = toUiMessage(payload);
                    const currentLocale = localeRef.current;
                    const currentUserId = authUserRef.current?.id;
                    const currentActiveChatId = activeChatIdRef.current;
                    setMessagesByChat((prev) => {
                        const existing = prev[payload.chatId] ?? [];
                        if (existing.some((item) => item.id === uiMessage.id))
                            return prev;
                        return { ...prev, [payload.chatId]: [...existing, uiMessage] };
                    });
                    setChats((prev) => prev.map((chat) => chat.id === payload.chatId
                        ? {
                            ...chat,
                            lastMessage: payload.cipherText,
                            lastSenderType: payload.senderId === currentUserId ? "me" : "other",
                            lastSenderName: payload.senderId === currentUserId
                                ? currentLocale === "ru"
                                    ? "Вы"
                                    : "You"
                                : payload.senderDisplayName,
                            lastAt: payload.sentAt,
                            lastDelivery: payload.senderId === currentUserId ? "sent" : null,
                            unread: payload.senderId === currentUserId || chat.id === currentActiveChatId ? chat.unread : chat.unread + 1
                        }
                        : chat));
                }
                catch {
                    // Ignore malformed WS payloads.
                }
            };
            nextSocket.onerror = () => {
                nextSocket.close();
            };
            nextSocket.onclose = () => {
                if (!closed)
                    connect(index + 1);
            };
        };
        connect(0);
        return () => {
            closed = true;
            socket?.close();
        };
    }, [authUser?.id, session?.accessToken]);
    async function loadMessagesForChat(chatId) {
        if (!session)
            return;
        const cached = messagesByChat[chatId];
        if (cached)
            return;
        try {
            const rows = await runAuthorized((accessToken) => requestMessages(accessToken, chatId));
            setMessagesByChat((prev) => ({ ...prev, [chatId]: rows.map(toUiMessage) }));
        }
        catch {
            setMessagesByChat((prev) => ({ ...prev, [chatId]: prev[chatId] ?? [] }));
        }
    }
    const handleAuthSubmit = async (event) => {
        event.preventDefault();
        setSubmitAttempted(true);
        const dErr = getDisplayNameFieldError(trimmedDisplayName, authMode, true, true, t);
        const uErr = getUsernameFieldError(trimmedUsername, true, true, t);
        const pErr = getPasswordFieldError(trimmedPassword, true, true, t);
        const cpErr = authMode === "register"
            ? !trimmedConfirmPassword
                ? t.validationRequired
                : trimmedConfirmPassword !== trimmedPassword
                    ? t.validationPasswordsMismatch
                    : undefined
            : undefined;
        if (dErr || uErr || pErr || cpErr)
            return;
        setAuthError("");
        setIsSubmittingAuth(true);
        try {
            const user = await requestAuth(authMode, { displayName, username, password }, locale);
            const authUserData = { id: user.id, displayName: user.displayName, username: user.username };
            const nextSession = { user: authUserData, accessToken: user.accessToken, refreshToken: user.refreshToken };
            setAuthUser(authUserData);
            setSession(nextSession);
            saveStoredSession(nextSession);
            setAccountPassword(trimmedPassword);
            setPassword("");
            setConfirmPassword("");
            if (registerAvatar)
                setUserAvatar(registerAvatar);
            setRegisterAvatar(null);
            setActiveChatId(null);
        }
        catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                setAuthError(t.authTimeout);
            }
            else {
                setAuthError(error instanceof Error ? error.message : copy[locale].authFailed);
            }
        }
        finally {
            setIsSubmittingAuth(false);
        }
    };
    if (isRestoringSession) {
        return null;
    }
    if (!authUser) {
        return (_jsx(AuthPage, { theme: theme, locale: locale, authMode: authMode, isLanguageOpen: isLanguageOpen, isSubmittingAuth: isSubmittingAuth, displayName: displayName, username: username, password: password, confirmPassword: confirmPassword, displayNameError: displayNameError, usernameError: usernameError, passwordError: passwordError, confirmPasswordError: confirmPasswordError, authError: authError, onLocaleToggle: () => setIsLanguageOpen((prev) => !prev), onLocaleSelect: switchLocale, onThemeToggle: () => setTheme(theme === "dark" ? "light" : "dark"), onSwitchMode: (mode) => {
                setAuthMode(mode);
                setAuthError("");
                setDisplayName("");
                setUsername("");
                setPassword("");
                setConfirmPassword("");
                resetValidationState();
            }, onDisplayNameChange: (value) => {
                setDisplayName(value);
                setFieldTyped((prev) => ({ ...prev, displayName: true }));
                setFieldEditedInFocus((prev) => ({ ...prev, displayName: true }));
            }, onUsernameChange: (value) => {
                setUsername(value);
                setFieldTyped((prev) => ({ ...prev, username: true }));
                setFieldEditedInFocus((prev) => ({ ...prev, username: true }));
            }, onPasswordChange: (value) => {
                setPassword(value);
                setFieldTyped((prev) => ({ ...prev, password: true }));
                setFieldEditedInFocus((prev) => ({ ...prev, password: true }));
            }, onConfirmPasswordChange: (value) => {
                setConfirmPassword(value);
                setFieldTyped((prev) => ({ ...prev, confirmPassword: true }));
                setFieldEditedInFocus((prev) => ({ ...prev, confirmPassword: true }));
            }, onDisplayNameFocus: () => {
                setFieldFocused((prev) => ({ ...prev, displayName: true }));
                setFieldEditedInFocus((prev) => ({ ...prev, displayName: false }));
            }, onUsernameFocus: () => {
                setFieldFocused((prev) => ({ ...prev, username: true }));
                setFieldEditedInFocus((prev) => ({ ...prev, username: false }));
            }, onPasswordFocus: () => {
                setFieldFocused((prev) => ({ ...prev, password: true }));
                setFieldEditedInFocus((prev) => ({ ...prev, password: false }));
            }, onConfirmPasswordFocus: () => {
                setFieldFocused((prev) => ({ ...prev, confirmPassword: true }));
                setFieldEditedInFocus((prev) => ({ ...prev, confirmPassword: false }));
            }, onDisplayNameBlur: () => {
                setFieldFocused((prev) => ({ ...prev, displayName: false }));
                if (!fieldTyped.displayName && !displayName.trim())
                    return;
                setFieldBlurred((prev) => ({ ...prev, displayName: true }));
                setFieldEditedInFocus((prev) => ({ ...prev, displayName: false }));
            }, onUsernameBlur: () => {
                setFieldFocused((prev) => ({ ...prev, username: false }));
                if (!fieldTyped.username && !username.trim())
                    return;
                setFieldBlurred((prev) => ({ ...prev, username: true }));
                setFieldEditedInFocus((prev) => ({ ...prev, username: false }));
            }, onPasswordBlur: () => {
                setFieldFocused((prev) => ({ ...prev, password: false }));
                if (!fieldTyped.password && !password.trim())
                    return;
                setFieldBlurred((prev) => ({ ...prev, password: true }));
                setFieldEditedInFocus((prev) => ({ ...prev, password: false }));
            }, onConfirmPasswordBlur: () => {
                setFieldFocused((prev) => ({ ...prev, confirmPassword: false }));
                if (!fieldTyped.confirmPassword && !confirmPassword.trim())
                    return;
                setFieldBlurred((prev) => ({ ...prev, confirmPassword: true }));
                setFieldEditedInFocus((prev) => ({ ...prev, confirmPassword: false }));
            }, onSubmit: handleAuthSubmit, registerAvatar: registerAvatar, onRegisterAvatarUpload: (file) => {
                if (!file)
                    return;
                const reader = new FileReader();
                reader.onload = () => {
                    if (typeof reader.result === "string")
                        setRegisterAvatar(reader.result);
                };
                reader.readAsDataURL(file);
            }, onRegisterAvatarReset: () => setRegisterAvatar(null) }));
    }
    return (_jsx(ChatPage, { locale: locale, theme: theme, authUser: authUser, userAvatar: userAvatar, isMenuOpen: isMenuOpen, search: search, activeChatId: activeChatId, chats: chats, messages: activeChatId ? messagesByChat[activeChatId] ?? [] : [], input: input, onToggleMenu: () => setIsMenuOpen((prev) => !prev), onCloseMenu: () => setIsMenuOpen(false), onSelectChat: (id) => {
            setActiveChatId(id);
            loadMessagesForChat(id);
        }, onSearchChange: setSearch, onInputChange: setInput, onSendMessage: (attachment) => {
            if (!activeChatId || (!input.trim() && !attachment))
                return;
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
                setChats((prev) => prev.map((chat) => chat.id === activeChatId
                    ? {
                        ...chat,
                        lastMessage: uiMessage.text,
                        lastSenderType: "me",
                        lastSenderName: locale === "ru" ? "Вы" : "You",
                        lastAt: created.sentAt,
                        lastDelivery: "sent"
                    }
                    : chat));
            })
                .catch(() => undefined);
        }, onLogout: () => {
            setAuthUser(null);
            setSession(null);
            clearStoredSession();
            setChats([]);
            setMessagesByChat({});
            setActiveChatId(null);
            setAccountPassword("");
            setIsMenuOpen(false);
            resetValidationState();
        }, onThemeToggle: () => setTheme((prev) => (prev === "dark" ? "light" : "dark")), onLocaleSelect: switchLocale, onUpdateProfile: ({ displayName, username, oldPassword, newPassword, confirmPassword }) => {
            const changePasswordRequested = Boolean(oldPassword || newPassword || confirmPassword);
            if (changePasswordRequested) {
                if (!oldPassword)
                    return locale === "ru" ? "введите старый пароль." : "enter current password.";
                if (oldPassword !== accountPassword)
                    return locale === "ru" ? "старый пароль неверен." : "current password is incorrect.";
                if (!newPassword)
                    return locale === "ru" ? "введите новый пароль." : "enter new password.";
                const newPasswordError = getPasswordFieldError(newPassword, true, true, t);
                if (newPasswordError)
                    return `${locale === "ru" ? "Новый пароль" : "New password"} ${newPasswordError}`;
                if (newPassword === oldPassword)
                    return locale === "ru" ? "новый пароль должен отличаться." : "new password must be different.";
                if (!confirmPassword)
                    return locale === "ru" ? "повторите новый пароль." : "repeat new password.";
                if (confirmPassword !== newPassword)
                    return locale === "ru" ? "пароли не совпадают." : "passwords do not match.";
                setAccountPassword(newPassword);
            }
            setAuthUser((prev) => (prev ? { ...prev, displayName, username } : prev));
            setMessagesByChat((prev) => {
                const next = { ...prev };
                for (const key of Object.keys(next)) {
                    next[key] = next[key].map((message) => (message.sender === "me" ? { ...message, author: displayName } : message));
                }
                return next;
            });
            return undefined;
        }, onUploadAvatar: (file) => {
            if (!file)
                return;
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === "string")
                    setUserAvatar(reader.result);
            };
            reader.readAsDataURL(file);
        }, onResetAvatar: () => setUserAvatar(null), onUpdateChat: (chatId, payload) => {
            setChats((prev) => prev.map((chat) => chat.id === chatId
                ? {
                    ...chat,
                    ...(payload.name ? { name: payload.name } : {}),
                    ...(payload.group ? { group: payload.group } : {}),
                    ...(typeof payload.unread === "number" ? { unread: payload.unread } : {})
                }
                : chat));
        } }));
}
