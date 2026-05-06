import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import { copy, localeOptions } from "../i18n";
import { ArchiveIcon, BellIcon, CalendarIcon, ChecklistIcon, CheckDoubleIcon, CheckSingleIcon, DotsVerticalIcon, FileIcon, HamburgerIcon, ImageIcon, InfoIcon, LanguageIcon, LinkIcon, LogoutIcon, MicIcon, PaletteIcon, PaperclipIcon, PencilIcon, PinIcon, PollIcon, SearchIcon, SendPlaneIcon, SettingsIcon, StarIcon, UsersIcon, UserIcon, VideoIcon, WalletIcon } from "../components/ui-icons";
const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;
const PASSWORD_HAS_LOWER = /[a-z]/;
const PASSWORD_HAS_UPPER = /[A-Z]/;
const PASSWORD_HAS_DIGIT = /\d/;
const PASSWORD_HAS_SPECIAL = /[^A-Za-z0-9]/;
export function ChatPage(props) {
    const { locale, theme, authUser, userAvatar, isMenuOpen, search, activeChatId, chats, messages, input, onToggleMenu, onCloseMenu, onSelectChat, onSearchChange, onInputChange, onSendMessage, onLogout, onThemeToggle, onLocaleSelect, onUpdateProfile, onUploadAvatar, onResetAvatar, onUpdateChat } = props;
    const t = copy[locale];
    const menuRef = useRef(null);
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [submenuTop, setSubmenuTop] = useState(8);
    const [submenuLeft, setSubmenuLeft] = useState(210);
    const [profileName, setProfileName] = useState(authUser.displayName);
    const [profileUsername, setProfileUsername] = useState(authUser.username);
    const [profileOldPassword, setProfileOldPassword] = useState("");
    const [profileNewPassword, setProfileNewPassword] = useState("");
    const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
    const [profileSubmitError, setProfileSubmitError] = useState("");
    const [activeProfileEdit, setActiveProfileEdit] = useState(null);
    const [isAvatarClearHover, setIsAvatarClearHover] = useState(false);
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
    const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
    const [topDrawer, setTopDrawer] = useState("profile");
    const [isChatInfoEditMode, setIsChatInfoEditMode] = useState(false);
    const [pinnedChats, setPinnedChats] = useState({});
    const [mutedChats, setMutedChats] = useState({});
    const [chatContextMenu, setChatContextMenu] = useState(null);
    const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [pendingAttachment, setPendingAttachment] = useState(null);
    const [chatDescriptions, setChatDescriptions] = useState({});
    const [chatDisplayAliases, setChatDisplayAliases] = useState({});
    const [chatInfoAvatars, setChatInfoAvatars] = useState({});
    const [chatInfoDraftName, setChatInfoDraftName] = useState("");
    const [chatInfoDraftDescription, setChatInfoDraftDescription] = useState("");
    const [chatInfoDraftAlias, setChatInfoDraftAlias] = useState("");
    const [chatInfoDraftAvatar, setChatInfoDraftAvatar] = useState(null);
    const [mediaPreviewUrl, setMediaPreviewUrl] = useState(null);
    const [mediaPreviewType, setMediaPreviewType] = useState(null);
    const [activeChatInfoSection, setActiveChatInfoSection] = useState("media");
    const [isArchiveViewOpen, setIsArchiveViewOpen] = useState(false);
    const [isArchiveMenuOpen, setIsArchiveMenuOpen] = useState(false);
    const [isArchiveHiddenFromMain, setIsArchiveHiddenFromMain] = useState(false);
    const [isArchiveSettingsOpen, setIsArchiveSettingsOpen] = useState(false);
    const [archiveMuteByDefault, setArchiveMuteByDefault] = useState(true);
    const [archiveKeepUnreadCounter, setArchiveKeepUnreadCounter] = useState(true);
    const [archiveAutoArchiveMuted, setArchiveAutoArchiveMuted] = useState(false);
    const [isNewChatMenuOpen, setIsNewChatMenuOpen] = useState(false);
    const chatMenuRef = useRef(null);
    const archiveMenuRef = useRef(null);
    const newChatMenuRef = useRef(null);
    const attachMenuRef = useRef(null);
    const emojiRef = useRef(null);
    const composerInputRef = useRef(null);
    const chatContextMenuRef = useRef(null);
    useEffect(() => {
        if (!isMenuOpen)
            return;
        const onDocClick = (event) => {
            if (!menuRef.current)
                return;
            if (!menuRef.current.contains(event.target))
                onCloseMenu();
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [isMenuOpen, onCloseMenu]);
    useEffect(() => {
        if (!isMenuOpen) {
            setActiveSubmenu(null);
        }
    }, [isMenuOpen]);
    useEffect(() => {
        if (!isProfilePanelOpen)
            return;
        const onEscape = (event) => {
            if (event.key === "Escape")
                setIsProfilePanelOpen(false);
        };
        document.addEventListener("keydown", onEscape);
        return () => document.removeEventListener("keydown", onEscape);
    }, [isProfilePanelOpen]);
    useEffect(() => {
        if (!isProfilePanelOpen)
            return;
        setProfileName(authUser.displayName);
        setProfileUsername(authUser.username);
        setProfileOldPassword("");
        setProfileNewPassword("");
        setProfileConfirmPassword("");
        setProfileSubmitError("");
        setActiveProfileEdit(null);
    }, [authUser.displayName, authUser.username, isProfilePanelOpen]);
    useEffect(() => {
        if (!isChatMenuOpen)
            return;
        const onDocClick = (event) => {
            if (!chatMenuRef.current)
                return;
            if (!chatMenuRef.current.contains(event.target))
                setIsChatMenuOpen(false);
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [isChatMenuOpen]);
    useEffect(() => {
        if (!isAttachMenuOpen)
            return;
        const onDocClick = (event) => {
            if (!attachMenuRef.current)
                return;
            if (!attachMenuRef.current.contains(event.target))
                setIsAttachMenuOpen(false);
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [isAttachMenuOpen]);
    useEffect(() => {
        if (!isEmojiOpen)
            return;
        const onDocClick = (event) => {
            if (!emojiRef.current)
                return;
            if (!emojiRef.current.contains(event.target))
                setIsEmojiOpen(false);
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [isEmojiOpen]);
    useEffect(() => {
        if (!chatContextMenu)
            return;
        const onDocClick = (event) => {
            if (!chatContextMenuRef.current)
                return;
            if (!chatContextMenuRef.current.contains(event.target))
                setChatContextMenu(null);
        };
        const onEscape = (event) => {
            if (event.key === "Escape")
                setChatContextMenu(null);
        };
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("keydown", onEscape);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("keydown", onEscape);
        };
    }, [chatContextMenu]);
    useEffect(() => {
        if (!isArchiveMenuOpen)
            return;
        const onDocClick = (event) => {
            if (!archiveMenuRef.current)
                return;
            if (!archiveMenuRef.current.contains(event.target))
                setIsArchiveMenuOpen(false);
        };
        const onEscape = (event) => {
            if (event.key === "Escape")
                setIsArchiveMenuOpen(false);
        };
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("keydown", onEscape);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("keydown", onEscape);
        };
    }, [isArchiveMenuOpen]);
    useEffect(() => {
        if (!isArchiveSettingsOpen)
            return;
        const onEscape = (event) => {
            if (event.key === "Escape")
                setIsArchiveSettingsOpen(false);
        };
        document.addEventListener("keydown", onEscape);
        return () => {
            document.removeEventListener("keydown", onEscape);
        };
    }, [isArchiveSettingsOpen]);
    useEffect(() => {
        if (!isNewChatMenuOpen)
            return;
        const onDocClick = (event) => {
            if (!newChatMenuRef.current)
                return;
            if (!newChatMenuRef.current.contains(event.target))
                setIsNewChatMenuOpen(false);
        };
        const onEscape = (event) => {
            if (event.key === "Escape")
                setIsNewChatMenuOpen(false);
        };
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("keydown", onEscape);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("keydown", onEscape);
        };
    }, [isNewChatMenuOpen]);
    useEffect(() => {
        const selectedChat = chats.find((chat) => chat.id === activeChatId) ?? null;
        if (!isChatInfoOpen || !selectedChat)
            return;
        setIsChatInfoEditMode(false);
        setActiveChatInfoSection("media");
        setChatInfoDraftName(selectedChat.name);
        setChatInfoDraftDescription(chatDescriptions[selectedChat.id] ?? "");
        setChatInfoDraftAlias(chatDisplayAliases[selectedChat.id] ?? "");
        setChatInfoDraftAvatar(chatInfoAvatars[selectedChat.id] ?? null);
    }, [isChatInfoOpen, chats, activeChatId, chatDescriptions, chatDisplayAliases, chatInfoAvatars]);
    const effectiveChats = useMemo(() => chats.map((chat) => ({
        ...chat,
        isPinned: Boolean(pinnedChats[chat.id]),
        isMuted: Boolean(mutedChats[chat.id])
    })), [chats, pinnedChats, mutedChats]);
    const filteredChats = effectiveChats
        .filter((chat) => chat.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
        if (a.isPinned !== b.isPinned)
            return a.isPinned ? -1 : 1;
        return (new Date(b.lastAt ?? 0).getTime() || 0) - (new Date(a.lastAt ?? 0).getTime() || 0);
    });
    const archivedChats = filteredChats.filter((chat) => chat.group === "archived");
    const mainChats = filteredChats.filter((chat) => chat.group !== "archived");
    const isArchiveAvailable = archivedChats.length > 0;
    const archiveUnreadCount = archivedChats.reduce((sum, chat) => sum + chat.unread, 0);
    const archiveLastChat = archivedChats[0] ?? null;
    const archiveLastMessage = archiveLastChat?.lastMessage ?? (locale === "ru" ? "Архив пуст" : "Archive is empty");
    const chatListItems = isArchiveViewOpen ? archivedChats : mainChats;
    const activeChat = chats.find((chat) => chat.id === activeChatId) ?? null;
    const activeChatMessages = activeChat ? messages : [];
    const chatMediaItems = activeChatMessages.filter((message) => message.preview && (message.previewType === "image" || message.previewType === "video"));
    const chatFileItems = activeChatMessages.filter((message) => message.preview && (message.previewType === "file" || message.previewType === "audio"));
    const activeChatDescription = activeChat ? chatDescriptions[activeChat.id] ?? "" : "";
    const activeChatAlias = activeChat ? chatDisplayAliases[activeChat.id] ?? "" : "";
    const activeChatInfoAvatar = activeChat ? chatInfoAvatars[activeChat.id] ?? null : null;
    const canEditChatMeta = activeChat ? activeChat.kind === "group" && activeChat.group !== "archived" : false;
    const canEditAlias = Boolean(activeChat && activeChat.kind === "dm");
    const canDeleteContact = Boolean(activeChat && activeChat.kind === "dm");
    function formatChatTime(value) {
        if (!value)
            return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
            return "";
        const now = new Date();
        const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.floor((startToday.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays === 0) {
            return date.toLocaleTimeString(locale === "ru" ? "ru-RU" : "en-US", { hour: "2-digit", minute: "2-digit" });
        }
        if (diffDays > 0 && diffDays < 7) {
            const weekdaysRu = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
            const weekdaysEn = ["su", "mo", "tu", "we", "th", "fr", "sa"];
            return locale === "ru" ? weekdaysRu[date.getDay()] : weekdaysEn[date.getDay()];
        }
        const monthsRu = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
        const monthsEn = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const monthText = locale === "ru" ? monthsRu[date.getMonth()] : monthsEn[date.getMonth()];
        const dayText = String(date.getDate()).padStart(2, "0");
        if (date.getFullYear() === now.getFullYear())
            return `${dayText} ${monthText}`;
        return `${dayText} ${monthText} ${date.getFullYear()}`;
    }
    function lastSenderTag(chat) {
        if (chat.kind !== "group")
            return "";
        if (chat.lastSenderType === "me")
            return locale === "ru" ? "Вы" : "You";
        const sender = chat.lastSenderName?.trim() || (locale === "ru" ? "Участник" : "Member");
        return sender[0].toUpperCase();
    }
    function statusIcon(chat) {
        if (chat.unread > 0)
            return null;
        if (chat.lastSenderType !== "me")
            return null;
        if (!chat.lastDelivery)
            return null;
        if (chat.lastDelivery === "read")
            return _jsx(CheckDoubleIcon, {});
        return _jsx(CheckSingleIcon, {});
    }
    function messageDateLabel(current, previous) {
        if (!current.createdAt)
            return null;
        const date = new Date(current.createdAt);
        if (Number.isNaN(date.getTime()))
            return null;
        const prevDate = previous?.createdAt ? new Date(previous.createdAt) : null;
        const currentKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const prevKey = prevDate ? `${prevDate.getFullYear()}-${prevDate.getMonth()}-${prevDate.getDate()}` : "";
        if (currentKey === prevKey)
            return null;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.floor((today.getTime() - target.getTime()) / 86400000);
        if (diffDays === 0)
            return locale === "ru" ? "Сегодня" : "Today";
        if (diffDays === 1)
            return locale === "ru" ? "Вчера" : "Yesterday";
        if (diffDays > 1 && diffDays < 7) {
            const weekdaysRu = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
            const weekdaysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            return locale === "ru" ? weekdaysRu[target.getDay()] : weekdaysEn[target.getDay()];
        }
        const monthsRu = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
        const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        if (locale === "ru")
            return `${target.getDate()} ${monthsRu[target.getMonth()]}${target.getFullYear() === now.getFullYear() ? "" : ` ${target.getFullYear()} г.`}`;
        return `${monthsEn[target.getMonth()]} ${target.getDate()}${target.getFullYear() === now.getFullYear() ? "" : `, ${target.getFullYear()}`}`;
    }
    function senderInitial(author) {
        return author.trim().slice(0, 1).toUpperCase() || "?";
    }
    function resizeComposerInput() {
        if (!composerInputRef.current)
            return;
        composerInputRef.current.style.height = "0px";
        const nextHeight = Math.min(composerInputRef.current.scrollHeight, 130);
        composerInputRef.current.style.height = `${nextHeight}px`;
    }
    function handleComposerChange(value) {
        onInputChange(value);
        requestAnimationFrame(resizeComposerInput);
    }
    function onEmojiPick(emoji) {
        onInputChange(`${input}${emoji.emoji}`);
        setIsEmojiOpen(false);
        requestAnimationFrame(resizeComposerInput);
    }
    function requestLogout() {
        setIsLogoutConfirmOpen(true);
    }
    function fieldCaptionLine(label, error) {
        return error ? `${label} ${error}` : label;
    }
    const profileNameTrim = profileName.trim();
    const profileUsernameTrim = profileUsername.trim();
    const profileOldPasswordTrim = profileOldPassword.trim();
    const profileNewPasswordTrim = profileNewPassword.trim();
    const profileConfirmPasswordTrim = profileConfirmPassword.trim();
    const isPasswordChangeRequested = Boolean(profileOldPasswordTrim || profileNewPasswordTrim || profileConfirmPasswordTrim);
    const profileNameError = !profileNameTrim ? (locale === "ru" ? "обязательное поле." : "required.") : profileNameTrim.length < 2 ? (locale === "ru" ? "меньше 2 символов." : "fewer than 2 characters.") : profileNameTrim.length > 40 ? (locale === "ru" ? "больше 40 символов." : "more than 40 characters.") : "";
    const profileUsernameError = !profileUsernameTrim
        ? locale === "ru"
            ? "обязательное поле."
            : "required."
        : !USERNAME_RE.test(profileUsernameTrim)
            ? locale === "ru"
                ? "только латиница, цифры, «_» и «-»."
                : "letters, digits, _ and - only."
            : profileUsernameTrim.length < 3
                ? locale === "ru"
                    ? "меньше 3 символов."
                    : "fewer than 3 characters."
                : profileUsernameTrim.length > 24
                    ? locale === "ru"
                        ? "больше 24 символов."
                        : "more than 24 characters."
                    : "";
    const profileOldPasswordError = isPasswordChangeRequested && !profileOldPasswordTrim ? (locale === "ru" ? "введите старый пароль." : "enter current password.") : "";
    const profileNewPasswordError = !isPasswordChangeRequested
        ? ""
        : !profileNewPasswordTrim
            ? locale === "ru"
                ? "введите новый пароль."
                : "enter new password."
            : profileNewPasswordTrim.length < 6
                ? locale === "ru"
                    ? "меньше 6 символов."
                    : "fewer than 6 characters."
                : profileNewPasswordTrim.length > 64
                    ? locale === "ru"
                        ? "больше 64 символов."
                        : "more than 64 characters."
                    : !PASSWORD_HAS_LOWER.test(profileNewPasswordTrim)
                        ? locale === "ru"
                            ? "добавьте строчную букву."
                            : "add a lowercase letter."
                        : !PASSWORD_HAS_UPPER.test(profileNewPasswordTrim)
                            ? locale === "ru"
                                ? "добавьте заглавную букву."
                                : "add an uppercase letter."
                            : !PASSWORD_HAS_DIGIT.test(profileNewPasswordTrim)
                                ? locale === "ru"
                                    ? "добавьте цифру."
                                    : "add a digit."
                                : !PASSWORD_HAS_SPECIAL.test(profileNewPasswordTrim)
                                    ? locale === "ru"
                                        ? "добавьте спецсимвол."
                                        : "add a special symbol."
                                    : profileNewPasswordTrim === profileOldPasswordTrim
                                        ? locale === "ru"
                                            ? "новый пароль должен отличаться."
                                            : "new password must be different."
                                        : "";
    const profileConfirmPasswordError = !isPasswordChangeRequested
        ? ""
        : !profileConfirmPasswordTrim
            ? locale === "ru"
                ? "повторите новый пароль."
                : "repeat new password."
            : profileConfirmPasswordTrim !== profileNewPasswordTrim
                ? locale === "ru"
                    ? "пароли не совпадают."
                    : "passwords do not match."
                : "";
    function startProfileEdit(kind) {
        if (activeProfileEdit && activeProfileEdit !== kind)
            return;
        setProfileSubmitError("");
        if (kind === "name")
            setProfileName(authUser.displayName);
        if (kind === "username")
            setProfileUsername(authUser.username);
        if (kind === "password") {
            setProfileOldPassword("");
            setProfileNewPassword("");
            setProfileConfirmPassword("");
        }
        setActiveProfileEdit(kind);
    }
    function cancelProfileEdit() {
        setProfileName(authUser.displayName);
        setProfileUsername(authUser.username);
        setProfileOldPassword("");
        setProfileNewPassword("");
        setProfileConfirmPassword("");
        setProfileSubmitError("");
        setActiveProfileEdit(null);
    }
    function saveProfileEdit() {
        const localError = activeProfileEdit === "name"
            ? profileNameError
            : activeProfileEdit === "username"
                ? profileUsernameError
                : profileOldPasswordError || profileNewPasswordError || profileConfirmPasswordError;
        if (localError) {
            setProfileSubmitError(localError);
            return;
        }
        const error = onUpdateProfile({
            displayName: (activeProfileEdit === "name" ? profileNameTrim : authUser.displayName) || authUser.displayName,
            username: (activeProfileEdit === "username" ? profileUsernameTrim : authUser.username) || authUser.username,
            oldPassword: activeProfileEdit === "password" ? profileOldPasswordTrim : "",
            newPassword: activeProfileEdit === "password" ? profileNewPasswordTrim : "",
            confirmPassword: activeProfileEdit === "password" ? profileConfirmPasswordTrim : ""
        });
        if (error) {
            setProfileSubmitError(error);
            return;
        }
        setProfileSubmitError("");
        setProfileOldPassword("");
        setProfileNewPassword("");
        setProfileConfirmPassword("");
        setActiveProfileEdit(null);
    }
    function openFlyout(kind, event) {
        const rowTop = event.currentTarget.offsetTop;
        const menuWidth = event.currentTarget.parentElement?.clientWidth ?? 224;
        setSubmenuTop(Math.max(6, rowTop));
        setSubmenuLeft(Math.max(170, menuWidth - 14));
        setActiveSubmenu(kind);
    }
    function userInitials() {
        const value = (authUser.displayName || authUser.username || "U").trim();
        const words = value.split(/\s+/).filter(Boolean);
        return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "U";
    }
    function userAvatarGradient() {
        let hash = 0;
        const id = authUser.id || authUser.username;
        for (let i = 0; i < id.length; i += 1)
            hash = (hash * 31 + id.charCodeAt(i)) | 0;
        const hue = Math.abs(hash) % 360;
        return `linear-gradient(145deg, hsl(${hue} 68% 58%), hsl(${hue} 68% 40%))`;
    }
    function deliveryText(chat) {
        if (chat.lastSenderType !== "me")
            return "";
        if (chat.lastDelivery === "read")
            return locale === "ru" ? "прочитано" : "read";
        if (chat.lastDelivery === "sent")
            return locale === "ru" ? "доставлено" : "delivered";
        return "";
    }
    function chatSubtitle(chat) {
        if (!chat)
            return "";
        if (chat.kind === "group")
            return locale === "ru" ? "7 участников" : "7 participants";
        return chat.status === "online" ? t.online : t.lastSeen;
    }
    function chatPublicHandle(chat) {
        if (!chat)
            return "";
        const normalized = chat.name
            .toLowerCase()
            .replace(/[^a-z0-9а-яё]+/gi, "")
            .slice(0, 22);
        return normalized || chat.id;
    }
    function chatInternalUrl(chat) {
        if (!chat)
            return "";
        return `message2.local/${chatPublicHandle(chat)}`;
    }
    function groupMembersCount(chat) {
        if (!chat)
            return 0;
        return chat.kind === "group" ? 7 : 1;
    }
    function groupAdminsCount(chat) {
        if (!chat || chat.kind !== "group")
            return 0;
        return 2;
    }
    function groupRemovedCount(chat) {
        if (!chat || chat.kind !== "group")
            return 0;
        return 1;
    }
    function saveChatInfoChanges() {
        if (!activeChat)
            return;
        if (canEditChatMeta) {
            const nextName = chatInfoDraftName.trim() || activeChat.name;
            onUpdateChat(activeChat.id, { name: nextName });
            setChatDescriptions((prev) => ({ ...prev, [activeChat.id]: chatInfoDraftDescription.trim() }));
        }
        if (canEditAlias) {
            setChatDisplayAliases((prev) => ({ ...prev, [activeChat.id]: chatInfoDraftAlias.trim() }));
        }
        if (chatInfoDraftAvatar) {
            setChatInfoAvatars((prev) => ({ ...prev, [activeChat.id]: chatInfoDraftAvatar }));
        }
        setIsChatInfoEditMode(false);
    }
    function openChatInfoFromHeader() {
        setTopDrawer("chat");
        setIsChatInfoOpen(true);
    }
    function openChatInNewTab(chatId) {
        const nextUrl = new URL(window.location.href);
        nextUrl.hash = `chat-${chatId}`;
        window.open(nextUrl.toString(), "_blank", "noopener,noreferrer");
        setChatContextMenu(null);
    }
    function toggleChatRead(chat) {
        onUpdateChat(chat.id, { unread: chat.unread > 0 ? 0 : 1 });
        setChatContextMenu(null);
    }
    function toggleChatPin(chatId) {
        setPinnedChats((prev) => ({ ...prev, [chatId]: !prev[chatId] }));
        setChatContextMenu(null);
    }
    function toggleChatMute(chatId) {
        setMutedChats((prev) => ({ ...prev, [chatId]: !prev[chatId] }));
        setChatContextMenu(null);
    }
    function toggleChatArchive(chat) {
        onUpdateChat(chat.id, { group: chat.group === "archived" ? "regular" : "archived" });
        setChatContextMenu(null);
    }
    function removeChatAction(chat) {
        setChatContextMenu(null);
        onUpdateChat(chat.id, { group: "archived", unread: 0 });
    }
    function markArchivedAsRead() {
        archivedChats.forEach((chat) => onUpdateChat(chat.id, { unread: 0 }));
        setIsArchiveMenuOpen(false);
    }
    useEffect(() => {
        const onMove = (event) => {
            const min = 250;
            const max = Math.min(520, Math.round(window.innerWidth * 0.52));
            setSidebarWidth(Math.max(min, Math.min(max, event.clientX)));
        };
        const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
        const onDown = () => {
            window.addEventListener("mousemove", onMove);
            window.addEventListener("mouseup", onUp);
        };
        const divider = document.getElementById("chat-pane-divider");
        divider?.addEventListener("mousedown", onDown);
        return () => {
            divider?.removeEventListener("mousedown", onDown);
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, []);
    function getChatInitials(name) {
        const words = name.trim().split(/\s+/).filter(Boolean);
        return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "C";
    }
    function chatGradient(id) {
        let hash = 0;
        for (let i = 0; i < id.length; i += 1)
            hash = (hash * 31 + id.charCodeAt(i)) | 0;
        const hue = Math.abs(hash) % 360;
        const sat = 68;
        const light = 58;
        return `linear-gradient(145deg, hsl(${hue} ${sat}% ${light}%), hsl(${hue} ${sat}% ${Math.max(30, light - 16)}%))`;
    }
    const isDrawerOpen = isProfilePanelOpen || isChatInfoOpen;
    const activeDrawer = topDrawer === "chat"
        ? isChatInfoOpen
            ? "chat"
            : isProfilePanelOpen
                ? "profile"
                : null
        : isProfilePanelOpen
            ? "profile"
            : isChatInfoOpen
                ? "chat"
                : null;
    return (_jsxs("main", { className: `layout theme-${theme} ${isDrawerOpen ? "layout--drawer-open" : ""}`, style: {
            ["--sidebar-width"]: `${sidebarWidth}px`,
            ["--drawer-width"]: "340px"
        }, children: [_jsxs("aside", { className: "sidebar", children: [isArchiveViewOpen ? (_jsxs("header", { className: "sidebar__header sidebar__header--archive", children: [_jsxs("div", { className: "sidebar__archive-title-wrap", children: [_jsx("button", { className: "icon-button icon-button--ghost", type: "button", onClick: () => {
                                            setIsArchiveViewOpen(false);
                                            setIsArchiveMenuOpen(false);
                                            setIsArchiveSettingsOpen(false);
                                        }, "aria-label": locale === "ru" ? "Назад к списку чатов" : "Back to chat list", children: _jsx("span", { className: "sidebar__archive-back-arrow", "aria-hidden": "true", children: "\u2190" }) }), _jsx("h2", { className: "sidebar__archive-title", children: locale === "ru" ? "Архивированные чаты" : "Archived chats" })] }), _jsxs("div", { className: "chat-panel__menu-wrap", ref: archiveMenuRef, children: [_jsx("button", { type: "button", className: "icon-button icon-button--ghost", onClick: () => setIsArchiveMenuOpen((prev) => !prev), "aria-label": locale === "ru" ? "Действия архива" : "Archive actions", children: _jsx(DotsVerticalIcon, {}) }), isArchiveMenuOpen ? (_jsxs("div", { className: "chat-panel__menu", children: [_jsxs("button", { type: "button", onClick: () => {
                                                    setIsArchiveHiddenFromMain((prev) => !prev);
                                                    setIsArchiveMenuOpen(false);
                                                }, children: [_jsx(ArchiveIcon, {}), _jsx("span", { children: isArchiveHiddenFromMain ? (locale === "ru" ? "Показывать архив в списке чатов" : "Show archive in chat list") : (locale === "ru" ? "Скрыть архив из списка чатов" : "Hide archive from chat list") })] }), _jsxs("button", { type: "button", onClick: markArchivedAsRead, children: [_jsx(CheckDoubleIcon, {}), _jsx("span", { children: locale === "ru" ? "Пометить все как прочитанные" : "Mark all as read" })] }), _jsxs("button", { type: "button", onClick: () => {
                                                    setIsArchiveMenuOpen(false);
                                                    setIsArchiveSettingsOpen(true);
                                                }, children: [_jsx(SettingsIcon, {}), _jsx("span", { children: locale === "ru" ? "Настройки архива" : "Archive settings" })] }), _jsxs("button", { type: "button", onClick: () => {
                                                    setIsArchiveMenuOpen(false);
                                                    window.alert(locale === "ru" ? "Архив хранит чаты и группы вне основного списка, но они остаются актуальными." : "Archive keeps chats and groups out of the main list while they stay up to date.");
                                                }, children: [_jsx(InfoIcon, {}), _jsx("span", { children: locale === "ru" ? "Как это работает?" : "How does it work?" })] })] })) : null] })] })) : (_jsxs("header", { className: "sidebar__header sidebar__header--chat", children: [_jsx("button", { className: `icon-button icon-button--ghost ${isMenuOpen ? "icon-button--active" : ""}`, onClick: onToggleMenu, "aria-label": locale === "ru" ? "Открыть меню" : "Open menu", children: _jsx(HamburgerIcon, {}) }), isMenuOpen ? (_jsxs("div", { className: "burger-popover", ref: menuRef, onMouseLeave: () => setActiveSubmenu(null), children: [_jsxs("div", { className: "burger-menu", children: [_jsxs("button", { className: "burger-menu__item", type: "button", onMouseEnter: () => setActiveSubmenu(null), onClick: () => {
                                                    setTopDrawer("profile");
                                                    setIsProfilePanelOpen(true);
                                                    onCloseMenu();
                                                }, children: [_jsx(UserIcon, {}), _jsx("span", { children: locale === "ru" ? "Мой аккаунт" : "My account" })] }), _jsxs("button", { className: "burger-menu__item", type: "button", onMouseEnter: (event) => openFlyout("theme", event), onClick: (event) => openFlyout("theme", event), children: [_jsx(PaletteIcon, {}), _jsx("span", { children: locale === "ru" ? "Тема" : "Theme" })] }), _jsxs("button", { className: "burger-menu__item", type: "button", onMouseEnter: (event) => openFlyout("locale", event), onClick: (event) => openFlyout("locale", event), children: [_jsx(LanguageIcon, {}), _jsx("span", { children: locale === "ru" ? "Язык" : "Language" })] }), _jsxs("button", { className: "burger-menu__item", type: "button", onMouseEnter: () => setActiveSubmenu(null), children: [_jsx(InfoIcon, {}), _jsx("span", { children: t.aboutUs })] }), _jsxs("button", { className: "burger-menu__item burger-menu__item--danger", type: "button", onMouseEnter: () => setActiveSubmenu(null), onClick: requestLogout, children: [_jsx(LogoutIcon, {}), _jsx("span", { children: t.logout })] })] }), activeSubmenu ? (_jsx("div", { className: "burger-submenu-flyout", style: { top: `${submenuTop}px`, left: `${submenuLeft}px` }, children: activeSubmenu === "theme" ? (_jsxs(_Fragment, { children: [_jsxs("button", { className: `burger-submenu__item ${theme === "dark" ? "burger-submenu__item--active" : ""}`, type: "button", onClick: () => {
                                                        if (theme !== "dark")
                                                            onThemeToggle();
                                                        setActiveSubmenu(null);
                                                    }, children: [_jsx("img", { src: "/icons/moon.svg", alt: "", className: "burger-submenu__icon" }), locale === "ru" ? "Темная" : "Dark"] }), _jsxs("button", { className: `burger-submenu__item ${theme === "light" ? "burger-submenu__item--active" : ""}`, type: "button", onClick: () => {
                                                        if (theme !== "light")
                                                            onThemeToggle();
                                                        setActiveSubmenu(null);
                                                    }, children: [_jsx("img", { src: "/icons/sun.svg", alt: "", className: "burger-submenu__icon" }), locale === "ru" ? "Светлая" : "Light"] })] })) : (_jsxs(_Fragment, { children: [_jsxs("button", { className: `burger-submenu__item ${locale === "ru" ? "burger-submenu__item--active" : ""}`, type: "button", onClick: () => {
                                                        onLocaleSelect("ru");
                                                        setActiveSubmenu(null);
                                                    }, children: [_jsx("img", { src: localeOptions.ru.flag, alt: "", className: "burger-submenu__flag" }), "\u0420\u0443\u0441\u0441\u043A\u0438\u0439"] }), _jsxs("button", { className: `burger-submenu__item ${locale === "en" ? "burger-submenu__item--active" : ""}`, type: "button", onClick: () => {
                                                        onLocaleSelect("en");
                                                        setActiveSubmenu(null);
                                                    }, children: [_jsx("img", { src: localeOptions.en.flag, alt: "", className: "burger-submenu__flag" }), "English"] })] })) })) : null] })) : null, _jsxs("div", { className: "search-wrap search-wrap--header", children: [_jsx(SearchIcon, {}), _jsx("input", { className: "search", value: search, onChange: (event) => onSearchChange(event.target.value), placeholder: t.searchChats })] })] })), _jsxs("div", { className: "sidebar__main", children: [_jsxs("div", { className: "chat-list", children: [!isArchiveViewOpen && !isArchiveHiddenFromMain && isArchiveAvailable ? (_jsxs("button", { className: "chat-card", type: "button", onClick: () => {
                                            setIsArchiveViewOpen(true);
                                            setIsArchiveMenuOpen(false);
                                            onCloseMenu();
                                        }, children: [_jsxs("div", { className: "chat-card__left", children: [_jsx("span", { className: "chat-avatar chat-avatar--archived", children: _jsx(ArchiveIcon, {}) }), _jsxs("div", { children: [_jsx("p", { className: "chat-card__name", children: locale === "ru" ? "Архив" : "Archive" }), _jsx("p", { className: "chat-card__message", children: archiveLastMessage })] })] }), _jsxs("div", { className: "chat-card__meta", children: [_jsx("div", { className: "chat-card__meta-top", children: _jsx("span", { className: "chat-card__time", children: formatChatTime(archiveLastChat?.lastAt) }) }), _jsx("div", { className: "chat-card__meta-bottom", children: archiveKeepUnreadCounter && archiveUnreadCount > 0 ? _jsx("span", { className: `badge ${archiveUnreadCount < 10 ? "badge--single" : ""}`, children: archiveUnreadCount }) : null })] })] })) : null, chatListItems.map((chat) => (_jsxs("button", { className: `chat-card ${chat.id === activeChatId ? "chat-card--active" : ""}`, onClick: () => onSelectChat(chat.id), onContextMenu: (event) => {
                                            event.preventDefault();
                                            setChatContextMenu({
                                                chatId: chat.id,
                                                x: Math.min(event.clientX, window.innerWidth - 252),
                                                y: Math.min(event.clientY, window.innerHeight - 302)
                                            });
                                        }, children: [_jsxs("div", { className: "chat-card__left", children: [chat.group === "favorite" ? (_jsx("span", { className: "chat-avatar chat-avatar--favorite", children: _jsx(StarIcon, {}) })) : chat.group === "archived" ? (_jsx("span", { className: "chat-avatar chat-avatar--archived", children: _jsx(ArchiveIcon, {}) })) : (_jsx("span", { className: "chat-avatar", style: { backgroundImage: chatGradient(chat.id) }, children: getChatInitials(chat.name) })), _jsxs("div", { children: [_jsx("p", { className: "chat-card__name", children: chat.name }), _jsxs("p", { className: "chat-card__message", children: [lastSenderTag(chat) ? _jsxs("span", { className: "chat-card__sender", children: [lastSenderTag(chat), ":"] }) : null, lastSenderTag(chat) ? " " : "", chat.lastMessage] })] })] }), _jsxs("div", { className: "chat-card__meta", children: [_jsxs("div", { className: "chat-card__meta-top", children: [statusIcon(chat), _jsx("span", { className: "chat-card__time", children: formatChatTime(chat.lastAt) })] }), _jsx("div", { className: "chat-card__meta-bottom", children: chat.unread > 0 ? _jsx("span", { className: `badge ${chat.unread < 10 ? "badge--single" : ""} ${chat.id === activeChatId ? "badge--inverted" : ""}`, children: chat.unread }) : null })] })] }, chat.id)))] }), !isArchiveViewOpen ? (_jsx("div", { className: "chat-list__new-chat-wrap", children: _jsxs("div", { className: "chat-panel__menu-wrap chat-list__new-chat-menu-wrap", ref: newChatMenuRef, children: [_jsx("button", { type: "button", className: "chat-list__new-chat-btn", "aria-label": locale === "ru" ? "Новый чат" : "New chat", title: locale === "ru" ? "Новый чат" : "New chat", onClick: () => setIsNewChatMenuOpen((prev) => !prev), children: _jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { d: "M20.7,5.2a1.024,1.024,0,0,1,0,1.448L18.074,9.276l-3.35-3.35L17.35,3.3a1.024,1.024,0,0,1,1.448,0Zm-4.166,5.614-3.35-3.35L4.675,15.975,3,21l5.025-1.675Z" }) }) }), isNewChatMenuOpen ? (_jsxs("div", { className: "chat-panel__menu chat-list__new-chat-menu", children: [_jsxs("button", { type: "button", onClick: () => setIsNewChatMenuOpen(false), children: [_jsx(LinkIcon, {}), _jsx("span", { children: locale === "ru" ? "Новый канал" : "New channel" })] }), _jsxs("button", { type: "button", onClick: () => setIsNewChatMenuOpen(false), children: [_jsx(UsersIcon, {}), _jsx("span", { children: locale === "ru" ? "Новая группа" : "New group" })] }), _jsxs("button", { type: "button", onClick: () => setIsNewChatMenuOpen(false), children: [_jsx(UserIcon, {}), _jsx("span", { children: locale === "ru" ? "Новый приватный чат" : "New private chat" })] })] })) : null] }) })) : null] }), chatContextMenu ? (_jsx("div", { className: "chat-panel__menu chat-list__context-menu", style: { top: chatContextMenu.y, left: chatContextMenu.x }, ref: chatContextMenuRef, children: (() => {
                            const menuChat = chats.find((chat) => chat.id === chatContextMenu.chatId) ?? null;
                            if (!menuChat)
                                return null;
                            const isMuted = Boolean(mutedChats[menuChat.id]);
                            const isPinned = Boolean(pinnedChats[menuChat.id]);
                            const isArchived = menuChat.group === "archived";
                            return (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", onClick: () => openChatInNewTab(menuChat.id), children: [_jsx(LinkIcon, {}), _jsx("span", { children: locale === "ru" ? "Открыть в новой вкладке" : "Open in new tab" })] }), _jsxs("button", { type: "button", onClick: () => toggleChatRead(menuChat), children: [menuChat.unread > 0 ? _jsx(CheckDoubleIcon, {}) : _jsx(CheckSingleIcon, {}), _jsx("span", { children: menuChat.unread > 0 ? (locale === "ru" ? "Пометить как прочитанный" : "Mark as read") : (locale === "ru" ? "Пометить как непрочитанный" : "Mark as unread") })] }), _jsxs("button", { type: "button", onClick: () => toggleChatPin(menuChat.id), children: [_jsx(PinIcon, {}), _jsx("span", { children: isPinned ? (locale === "ru" ? "Открепить чат" : "Unpin chat") : (locale === "ru" ? "Закрепить чат" : "Pin chat") })] }), _jsxs("button", { type: "button", onClick: () => toggleChatMute(menuChat.id), children: [_jsx(BellIcon, {}), _jsx("span", { children: isMuted ? (locale === "ru" ? "Включить уведомления" : "Enable notifications") : (locale === "ru" ? "Выключить уведомления" : "Disable notifications") })] }), _jsxs("button", { type: "button", onClick: () => toggleChatArchive(menuChat), children: [_jsx(ArchiveIcon, {}), _jsx("span", { children: isArchived ? (locale === "ru" ? "Разархивировать чат" : "Unarchive chat") : (locale === "ru" ? "Архивировать чат" : "Archive chat") })] }), _jsxs("button", { type: "button", className: "chat-panel__menu-danger", onClick: () => removeChatAction(menuChat), children: [menuChat.kind === "group" ? _jsx(LogoutIcon, {}) : _jsx(ArchiveIcon, {}), _jsx("span", { children: menuChat.kind === "group" ? (locale === "ru" ? "Покинуть группу" : "Leave group") : (locale === "ru" ? "Удалить чат" : "Delete chat") })] })] }));
                        })() })) : null] }), _jsx("div", { id: "chat-pane-divider", className: "pane-divider" }), _jsxs("section", { className: "chat-panel", children: [activeChat ? (_jsxs("header", { className: "chat-panel__header chat-panel__header--clickable", role: "button", tabIndex: 0, onClick: openChatInfoFromHeader, onKeyDown: (event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                openChatInfoFromHeader();
                            }
                        }, children: [_jsxs("div", { className: "chat-panel__header-left", children: [_jsx("button", { type: "button", className: "chat-panel__avatar-btn", onClick: (event) => {
                                            event.stopPropagation();
                                            setTopDrawer("chat");
                                            setIsChatInfoOpen(true);
                                        }, "aria-label": locale === "ru" ? "Информация о чате" : "Chat info", children: activeChat.group === "favorite" ? (_jsx("span", { className: "chat-avatar chat-avatar--favorite", children: _jsx(StarIcon, {}) })) : activeChat.group === "archived" ? (_jsx("span", { className: "chat-avatar chat-avatar--archived", children: _jsx(ArchiveIcon, {}) })) : (_jsx("span", { className: "chat-avatar", style: { backgroundImage: chatGradient(activeChat.id) }, children: getChatInitials(activeChat.name) })) }), _jsxs("div", { className: "chat-panel__headline", children: [_jsx("h2", { children: activeChat.name }), _jsx("p", { children: chatSubtitle(activeChat) })] })] }), _jsxs("div", { className: "chat-panel__actions", children: [_jsx("button", { type: "button", className: "icon-button chat-panel__action-plain", onClick: (event) => event.stopPropagation(), "aria-label": locale === "ru" ? "Поиск по сообщениям" : "Search messages", children: _jsx(SearchIcon, {}) }), _jsxs("div", { className: "chat-panel__menu-wrap", ref: chatMenuRef, children: [_jsx("button", { type: "button", className: "icon-button chat-panel__action-plain", onClick: (event) => {
                                                    event.stopPropagation();
                                                    setIsChatMenuOpen((prev) => !prev);
                                                }, "aria-label": locale === "ru" ? "Действия чата" : "Chat actions", children: _jsx(DotsVerticalIcon, {}) }), isChatMenuOpen ? (_jsxs("div", { className: "chat-panel__menu", children: [_jsxs("button", { type: "button", children: [_jsx(PencilIcon, {}), _jsx("span", { children: locale === "ru" ? "Переименовать" : "Rename" })] }), _jsxs("button", { type: "button", children: [_jsx(VideoIcon, {}), _jsx("span", { children: locale === "ru" ? "Видеозвонок" : "Video call" })] }), _jsxs("button", { type: "button", children: [_jsx(BellIcon, {}), _jsx("span", { children: locale === "ru" ? "Уведомления" : "Notifications" })] }), _jsxs("button", { type: "button", children: [_jsx(ChecklistIcon, {}), _jsx("span", { children: locale === "ru" ? "Выбор сообщений" : "Select messages" })] }), _jsxs("button", { type: "button", children: [_jsx(PinIcon, {}), _jsx("span", { children: locale === "ru" ? "Закрепить сообщение" : "Pin message" })] }), _jsxs("button", { type: "button", children: [_jsx(UserIcon, {}), _jsx("span", { children: locale === "ru" ? "Блокировать/разблокировать" : "Block/unblock" })] }), _jsxs("button", { type: "button", className: "chat-panel__menu-danger", children: [_jsx(ArchiveIcon, {}), _jsx("span", { children: locale === "ru" ? "Удалить чат" : "Delete chat" })] })] })) : null] })] })] })) : null, _jsx("div", { className: "messages", children: activeChat ? (_jsx(_Fragment, { children: messages.map((message, index) => {
                                const prev = messages[index - 1];
                                const next = messages[index + 1];
                                const isFirstInSeries = !prev || prev.sender !== message.sender;
                                const isLastInSeries = !next || next.sender !== message.sender;
                                const dayLabel = messageDateLabel(message, prev);
                                const mediaNode = message.preview ? (message.previewType === "video" ? (_jsx("video", { src: message.preview, className: "message__preview", controls: true })) : message.previewType === "audio" ? (_jsx("audio", { src: message.preview, className: "message__audio", controls: true })) : message.previewType === "file" ? (_jsx("a", { href: message.preview, target: "_blank", rel: "noreferrer", className: "message__file", children: message.fileName ?? (locale === "ru" ? "Файл" : "File") })) : (_jsx("img", { src: message.preview, alt: "media preview", className: "message__preview" }))) : null;
                                return (_jsxs("div", { children: [dayLabel ? _jsx("div", { className: "message-day-sep", children: dayLabel }) : null, message.sender === "me" ? (_jsxs("article", { className: "message message--me", children: [isFirstInSeries ? _jsx("p", { className: "message__author", children: message.author }) : null, _jsx("p", { children: message.text }), mediaNode, _jsx("p", { className: "message__time", children: message.time })] })) : (_jsxs("div", { className: "message-row", children: [_jsx("div", { className: "message-row__avatar-slot", children: isLastInSeries ? _jsx("span", { className: "message-row__avatar", children: senderInitial(message.author) }) : null }), _jsxs("article", { className: "message", children: [isFirstInSeries ? _jsx("p", { className: "message__author", children: message.author }) : null, _jsx("p", { children: message.text }), mediaNode, _jsx("p", { className: "message__time", children: message.time })] })] }))] }, message.id));
                            }) })) : (_jsx("div", { className: "chat-empty-state" })) }), activeChat ? (_jsxs("form", { className: "composer", onSubmit: (event) => {
                            event.preventDefault();
                            if (!input.trim() && !pendingAttachment)
                                return;
                            onSendMessage(pendingAttachment ?? undefined);
                            setPendingAttachment(null);
                            requestAnimationFrame(() => {
                                if (!composerInputRef.current)
                                    return;
                                composerInputRef.current.style.height = "0px";
                            });
                        }, children: [_jsxs("div", { className: "composer__emoji-wrap", ref: emojiRef, children: [_jsx("button", { type: "button", className: "icon-button", onClick: () => setIsEmojiOpen((prev) => !prev), "aria-label": locale === "ru" ? "Эмодзи" : "Emoji", children: "\uD83D\uDE0A" }), isEmojiOpen ? (_jsx("div", { className: "composer__emoji-pop", children: _jsx(EmojiPicker, { theme: theme === "dark" ? "dark" : "light", onEmojiClick: onEmojiPick, lazyLoadEmojis: true, autoFocusSearch: false }) })) : null] }), _jsxs("div", { className: "composer__input-wrap", ref: attachMenuRef, children: [_jsx("textarea", { ref: composerInputRef, value: input, onChange: (event) => handleComposerChange(event.target.value), placeholder: t.messagePlaceholder, rows: 1 }), _jsx("button", { type: "button", className: "icon-button composer__clip", onClick: () => setIsAttachMenuOpen((prev) => !prev), "aria-label": locale === "ru" ? "Вложения" : "Attachments", children: _jsx(PaperclipIcon, {}) }), isAttachMenuOpen ? (_jsxs("div", { className: "composer__attach-menu", children: [_jsxs("label", { children: [_jsx(ImageIcon, {}), _jsx("span", { children: locale === "ru" ? "Фото/видео" : "Photo/video" }), _jsx("input", { type: "file", className: "composer-file-input", accept: "image/*,video/*", onChange: (event) => {
                                                            const file = event.target.files?.[0];
                                                            if (!file)
                                                                return;
                                                            setPendingAttachment({ url: URL.createObjectURL(file), type: file.type.startsWith("video/") ? "video" : "image", name: file.name });
                                                            setIsAttachMenuOpen(false);
                                                        } })] }), _jsxs("label", { children: [_jsx(FileIcon, {}), _jsx("span", { children: locale === "ru" ? "Файл" : "File" }), _jsx("input", { type: "file", className: "composer-file-input", onChange: (event) => {
                                                            const file = event.target.files?.[0];
                                                            if (!file)
                                                                return;
                                                            const type = file.type.startsWith("audio/") ? "audio" : "file";
                                                            setPendingAttachment({ url: URL.createObjectURL(file), type, name: file.name });
                                                            setIsAttachMenuOpen(false);
                                                        } })] }), _jsxs("button", { type: "button", children: [_jsx(PollIcon, {}), _jsx("span", { children: locale === "ru" ? "Опрос" : "Poll" })] }), _jsxs("button", { type: "button", children: [_jsx(CalendarIcon, {}), _jsx("span", { children: locale === "ru" ? "Дата" : "Date" })] }), _jsxs("button", { type: "button", children: [_jsx(WalletIcon, {}), _jsx("span", { children: locale === "ru" ? "Кошелёк" : "Wallet" })] })] })) : null] }), _jsx("button", { type: input.trim() || pendingAttachment ? "submit" : "button", className: "icon-button composer__send-toggle", "aria-label": input.trim() || pendingAttachment ? t.sendMessage : locale === "ru" ? "Голосовое сообщение" : "Voice message", children: input.trim() || pendingAttachment ? _jsx(SendPlaneIcon, {}) : _jsx(MicIcon, {}) })] })) : null] }), activeDrawer === "profile" ? (_jsxs("aside", { className: "profile-drawer", onMouseDown: () => setTopDrawer("profile"), children: [_jsxs("header", { className: "profile-drawer__header", children: [_jsx("h3", { children: locale === "ru" ? "Мой аккаунт" : "My account" }), _jsx("button", { type: "button", className: "icon-button drawer-close-btn", onClick: () => setIsProfilePanelOpen(false), "aria-label": "Close", children: "\u00D7" })] }), _jsxs("div", { className: "avatar-block", children: [_jsxs("div", { className: "avatar-block__main", children: [_jsxs("div", { className: `auth-avatar-picker-wrap profile-avatar-wrap ${isAvatarClearHover ? "profile-avatar-wrap--clear-hover" : ""}`, children: [_jsxs("label", { className: "auth-avatar-picker auth-avatar-picker--profile", title: locale === "ru" ? "Изменить фото" : "Change photo", children: [_jsx("input", { type: "file", accept: "image/*", onChange: (event) => onUploadAvatar(event.target.files?.[0] ?? null) }), userAvatar?.startsWith("data:image/") ? (_jsx("img", { src: userAvatar, alt: "" })) : (_jsx("span", { className: "chat-avatar profile-auto-avatar", style: { backgroundImage: userAvatarGradient() }, children: userInitials() })), _jsx("span", { className: "profile-avatar-overlay", "aria-hidden": "true", children: _jsx(PencilIcon, {}) })] }), userAvatar ? (_jsx("button", { type: "button", className: "auth-avatar-clear", onMouseEnter: () => setIsAvatarClearHover(true), onMouseLeave: () => setIsAvatarClearHover(false), onClick: onResetAvatar, "aria-label": locale === "ru" ? "Удалить фото" : "Remove photo", children: "\u00D7" })) : null] }), _jsxs("span", { className: "profile-pill", children: ["@", authUser.username] })] }), _jsxs("div", { className: "profile-edit-fields auth-form", children: [_jsxs("div", { className: `profile-inline-edit ${activeProfileEdit && activeProfileEdit !== "name" ? "profile-inline-edit--locked" : ""}`, children: [_jsx("div", { className: "profile-inline-edit__toolbar", children: activeProfileEdit !== "name" ? (_jsx("button", { type: "button", className: "icon-button profile-pencil profile-pencil--hover profile-pencil--plain", onClick: () => startProfileEdit("name"), disabled: Boolean(activeProfileEdit), children: _jsx(PencilIcon, {}) })) : (_jsxs("div", { className: "profile-icon-actions", children: [_jsx("button", { type: "button", className: "profile-icon-btn profile-icon-btn--save", onClick: saveProfileEdit, "aria-label": locale === "ru" ? "Сохранить" : "Save", children: "\u2713" }), _jsx("button", { type: "button", className: "profile-icon-btn profile-icon-btn--cancel", onClick: cancelProfileEdit, "aria-label": locale === "ru" ? "Отмена" : "Cancel", children: "\u00D7" })] })) }), _jsxs("div", { className: `input-group ${profileNameTrim ? "touched" : ""} ${activeProfileEdit === "name" && profileNameError ? "input-group--invalid" : ""}`, children: [_jsx("div", { className: "input-group__head", children: _jsx("span", { className: `input-group__caption ${activeProfileEdit === "name" && profileNameError ? "input-group__caption--invalid" : ""}`, children: _jsx("label", { children: fieldCaptionLine(locale === "ru" ? "Имя" : "Name", activeProfileEdit === "name" ? profileNameError : "") }) }) }), _jsx("input", { className: "form-control", value: activeProfileEdit === "name" ? profileName : authUser.displayName, onChange: (event) => setProfileName(event.target.value), placeholder: " ", readOnly: activeProfileEdit !== "name" })] })] }), _jsxs("div", { className: `profile-inline-edit ${activeProfileEdit && activeProfileEdit !== "username" ? "profile-inline-edit--locked" : ""}`, children: [_jsx("div", { className: "profile-inline-edit__toolbar", children: activeProfileEdit !== "username" ? (_jsx("button", { type: "button", className: "icon-button profile-pencil profile-pencil--hover profile-pencil--plain", onClick: () => startProfileEdit("username"), disabled: Boolean(activeProfileEdit), children: _jsx(PencilIcon, {}) })) : (_jsxs("div", { className: "profile-icon-actions", children: [_jsx("button", { type: "button", className: "profile-icon-btn profile-icon-btn--save", onClick: saveProfileEdit, "aria-label": locale === "ru" ? "Сохранить" : "Save", children: "\u2713" }), _jsx("button", { type: "button", className: "profile-icon-btn profile-icon-btn--cancel", onClick: cancelProfileEdit, "aria-label": locale === "ru" ? "Отмена" : "Cancel", children: "\u00D7" })] })) }), _jsxs("div", { className: `input-group ${profileUsernameTrim ? "touched" : ""} ${activeProfileEdit === "username" && profileUsernameError ? "input-group--invalid" : ""}`, children: [_jsx("div", { className: "input-group__head", children: _jsx("span", { className: `input-group__caption ${activeProfileEdit === "username" && profileUsernameError ? "input-group__caption--invalid" : ""}`, children: _jsx("label", { children: fieldCaptionLine(locale === "ru" ? "Логин" : "Username", activeProfileEdit === "username" ? profileUsernameError : "") }) }) }), _jsx("input", { className: "form-control", value: activeProfileEdit === "username" ? profileUsername : authUser.username, onChange: (event) => setProfileUsername(event.target.value), placeholder: " ", readOnly: activeProfileEdit !== "username" })] })] }), _jsxs("div", { className: `profile-inline-edit ${activeProfileEdit && activeProfileEdit !== "password" ? "profile-inline-edit--locked" : ""}`, children: [_jsxs("div", { className: "profile-inline-edit__toolbar profile-inline-edit__toolbar--password", children: [activeProfileEdit === "password" ? _jsx("span", { className: "profile-password-title", children: locale === "ru" ? "Смена пароля" : "Password change" }) : null, activeProfileEdit !== "password" ? (_jsx("button", { type: "button", className: "ghost-button profile-change-password", onClick: () => startProfileEdit("password"), disabled: Boolean(activeProfileEdit && activeProfileEdit !== "password"), children: locale === "ru" ? "Сменить пароль" : "Change password" })) : null] }), activeProfileEdit === "password" ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "profile-password-stack", children: [_jsxs("div", { className: `input-group ${profileOldPasswordTrim ? "touched" : ""} ${profileOldPasswordError ? "input-group--invalid" : ""}`, children: [_jsx("div", { className: "input-group__head", children: _jsx("span", { className: `input-group__caption ${profileOldPasswordError ? "input-group__caption--invalid" : ""}`, children: _jsx("label", { children: fieldCaptionLine(locale === "ru" ? "Старый пароль" : "Current password", profileOldPasswordError) }) }) }), _jsx("input", { className: "form-control", type: "password", value: profileOldPassword, onChange: (event) => setProfileOldPassword(event.target.value), placeholder: " " })] }), _jsxs("div", { className: `input-group ${profileNewPasswordTrim ? "touched" : ""} ${profileNewPasswordError ? "input-group--invalid" : ""}`, children: [_jsx("div", { className: "input-group__head", children: _jsx("span", { className: `input-group__caption ${profileNewPasswordError ? "input-group__caption--invalid" : ""}`, children: _jsx("label", { children: fieldCaptionLine(locale === "ru" ? "Новый пароль" : "New password", profileNewPasswordError) }) }) }), _jsx("input", { className: "form-control", type: "password", value: profileNewPassword, onChange: (event) => setProfileNewPassword(event.target.value), placeholder: " " })] }), _jsxs("div", { className: `input-group ${profileConfirmPasswordTrim ? "touched" : ""} ${profileConfirmPasswordError ? "input-group--invalid" : ""}`, children: [_jsx("div", { className: "input-group__head", children: _jsx("span", { className: `input-group__caption ${profileConfirmPasswordError ? "input-group__caption--invalid" : ""}`, children: _jsx("label", { children: fieldCaptionLine(locale === "ru" ? "Повтор пароля" : "Repeat password", profileConfirmPasswordError) }) }) }), _jsx("input", { className: "form-control", type: "password", value: profileConfirmPassword, onChange: (event) => setProfileConfirmPassword(event.target.value), placeholder: " " })] })] }), _jsxs("div", { className: "profile-password-actions", children: [_jsx("button", { type: "button", className: "profile-icon-btn profile-icon-btn--save", onClick: saveProfileEdit, "aria-label": locale === "ru" ? "Сохранить" : "Save", children: "\u2713" }), _jsx("button", { type: "button", className: "profile-icon-btn profile-icon-btn--cancel", onClick: cancelProfileEdit, "aria-label": locale === "ru" ? "Отмена" : "Cancel", children: "\u00D7" })] })] })) : null] }), profileSubmitError ? _jsx("p", { className: "auth-error profile-password-error", children: profileSubmitError }) : null] })] })] })) : null, activeDrawer === "chat" ? (_jsxs("aside", { className: "profile-drawer chat-info-drawer", onMouseDown: () => setTopDrawer("chat"), children: [_jsxs("header", { className: "chat-info-drawer__header", children: [_jsx("button", { type: "button", className: "icon-button drawer-close-btn", onClick: () => setIsChatInfoOpen(false), "aria-label": "Close", children: "\u00D7" }), _jsx("h3", { children: locale === "ru" ? "Данные чата" : "Chat details" }), _jsx("button", { type: "button", className: "icon-button chat-info-drawer__edit-btn", onClick: () => {
                                    setIsChatInfoEditMode(true);
                                }, "aria-label": locale === "ru" ? "Редактировать" : "Edit", children: _jsx(PencilIcon, {}) })] }), _jsxs("div", { className: "chat-info-main", children: [_jsxs("div", { className: "chat-info-main__hero", children: [activeChatInfoAvatar || chatInfoDraftAvatar ? (_jsx("img", { src: chatInfoDraftAvatar ?? activeChatInfoAvatar ?? "", alt: "", className: "chat-info-main__avatar" })) : (_jsx("span", { className: "chat-avatar chat-info-main__avatar", style: { backgroundImage: activeChat ? chatGradient(activeChat.id) : undefined }, children: activeChat ? getChatInitials(activeChat.name) : "C" })), isChatInfoEditMode ? (_jsxs("label", { className: "avatar-upload chat-info-main__upload", children: [locale === "ru" ? "Обновить фото" : "Update photo", _jsx("input", { type: "file", accept: "image/*", onChange: (event) => {
                                                    const file = event.target.files?.[0];
                                                    if (!file)
                                                        return;
                                                    const reader = new FileReader();
                                                    reader.onload = () => {
                                                        if (typeof reader.result === "string")
                                                            setChatInfoDraftAvatar(reader.result);
                                                    };
                                                    reader.readAsDataURL(file);
                                                } })] })) : null, isChatInfoEditMode ? (_jsx("input", { className: "chat-info-main__title-input", value: canEditChatMeta ? chatInfoDraftName : activeChat?.name ?? "", onChange: (event) => setChatInfoDraftName(event.target.value), placeholder: locale === "ru" ? "Название" : "Title", disabled: !canEditChatMeta })) : (_jsx("h4", { children: activeChatAlias || activeChat?.name })), _jsx("p", { children: activeChat?.kind === "group" ? `${groupMembersCount(activeChat)} ${locale === "ru" ? "участников" : "members"}` : (locale === "ru" ? "Личный чат" : "Direct chat") })] }), _jsxs("section", { className: "chat-info-main__card", children: [_jsxs("h5", { children: [_jsx(BellIcon, {}), locale === "ru" ? "Уведомления" : "Notifications"] }), _jsx("p", { children: locale === "ru" ? "Включены для этого чата." : "Enabled for this chat." })] }), _jsxs("section", { className: "chat-info-main__card", children: [_jsxs("h5", { children: [_jsx(LinkIcon, {}), locale === "ru" ? "Внутренняя ссылка" : "Internal link"] }), _jsxs("p", { children: [_jsx("strong", { children: "@" }), chatPublicHandle(activeChat)] }), _jsx("small", { children: chatInternalUrl(activeChat) })] }), activeChat?.kind === "group" ? (_jsxs("section", { className: "chat-info-main__card", children: [_jsxs("h5", { children: [_jsx(UsersIcon, {}), locale === "ru" ? "Участники" : "Members"] }), _jsx("p", { children: locale === "ru" ? `Админов: ${groupAdminsCount(activeChat)} · Пользователей: ${groupMembersCount(activeChat)} · Удалено: ${groupRemovedCount(activeChat)}` : `Admins: ${groupAdminsCount(activeChat)} · Users: ${groupMembersCount(activeChat)} · Removed: ${groupRemovedCount(activeChat)}` })] })) : null, isChatInfoEditMode && canEditChatMeta ? (_jsxs("section", { className: "chat-info-main__card", children: [_jsxs("h5", { children: [_jsx(InfoIcon, {}), locale === "ru" ? "Описание группы" : "Group description"] }), _jsx("textarea", { className: "chat-info-main__textarea", value: chatInfoDraftDescription, onChange: (event) => setChatInfoDraftDescription(event.target.value) })] })) : activeChatDescription ? (_jsxs("section", { className: "chat-info-main__card", children: [_jsxs("h5", { children: [_jsx(InfoIcon, {}), locale === "ru" ? "Описание группы" : "Group description"] }), _jsx("p", { children: activeChatDescription })] })) : null, isChatInfoEditMode && canEditAlias ? (_jsxs("section", { className: "chat-info-main__card", children: [_jsxs("h5", { children: [_jsx(PencilIcon, {}), locale === "ru" ? "Отображаемое имя" : "Display name"] }), _jsx("input", { className: "chat-info-main__title-input", value: chatInfoDraftAlias, onChange: (event) => setChatInfoDraftAlias(event.target.value), placeholder: locale === "ru" ? "Имя и фамилия" : "Name and surname" })] })) : null, canDeleteContact ? (_jsx("button", { type: "button", className: "ghost-button chat-info-main__danger", children: locale === "ru" ? "Удалить контакт" : "Delete contact" })) : null] }), _jsxs("div", { className: "chat-info-sections", children: [_jsxs("div", { className: "chat-info-sections__tabs", role: "tablist", "aria-label": locale === "ru" ? "Разделы чата" : "Chat sections", children: [_jsxs("button", { type: "button", role: "tab", "aria-selected": activeChatInfoSection === "media", className: `chat-info-sections__tab ${activeChatInfoSection === "media" ? "chat-info-sections__tab--active" : ""}`, onClick: () => setActiveChatInfoSection("media"), children: [_jsx(ImageIcon, {}), locale === "ru" ? "Медиа" : "Media"] }), _jsxs("button", { type: "button", role: "tab", "aria-selected": activeChatInfoSection === "files", className: `chat-info-sections__tab ${activeChatInfoSection === "files" ? "chat-info-sections__tab--active" : ""}`, onClick: () => setActiveChatInfoSection("files"), children: [_jsx(FileIcon, {}), locale === "ru" ? "Файлы" : "Files"] }), _jsxs("button", { type: "button", role: "tab", "aria-selected": activeChatInfoSection === "groups", className: `chat-info-sections__tab ${activeChatInfoSection === "groups" ? "chat-info-sections__tab--active" : ""}`, onClick: () => setActiveChatInfoSection("groups"), children: [_jsx(UsersIcon, {}), locale === "ru" ? "Группы" : "Groups"] })] }), _jsxs("section", { className: "chat-info-sections__panel", role: "tabpanel", children: [activeChatInfoSection === "media" ? (_jsxs(_Fragment, { children: [_jsxs("h4", { children: [_jsx(ImageIcon, {}), locale === "ru" ? "Медиа" : "Media"] }), _jsx("div", { className: "chat-info-media-grid", children: chatMediaItems.length ? chatMediaItems.map((item) => (_jsx("button", { type: "button", className: "chat-info-media-grid__item", onClick: () => {
                                                        setMediaPreviewUrl(item.preview ?? null);
                                                        setMediaPreviewType(item.previewType === "video" ? "video" : "image");
                                                    }, children: item.previewType === "video" ? _jsx("video", { src: item.preview, muted: true }) : _jsx("img", { src: item.preview, alt: "" }) }, item.id))) : _jsx("p", { children: locale === "ru" ? "Пока нет медиа." : "No media yet." }) })] })) : null, activeChatInfoSection === "files" ? (_jsxs(_Fragment, { children: [_jsxs("h4", { children: [_jsx(FileIcon, {}), locale === "ru" ? "Файлы" : "Files"] }), _jsx("p", { children: chatFileItems.length ? `${chatFileItems.length} ${locale === "ru" ? "файлов/аудио" : "files/audio"}` : (locale === "ru" ? "Пока нет файлов." : "No files yet.") })] })) : null, activeChatInfoSection === "groups" ? (_jsxs(_Fragment, { children: [_jsxs("h4", { children: [_jsx(UsersIcon, {}), locale === "ru" ? "Группы" : "Groups"] }), _jsx("p", { children: locale === "ru" ? "Связанные общие группы будут отображены здесь." : "Related shared groups will appear here." })] })) : null] })] }), isChatInfoEditMode ? (_jsx("div", { className: "chat-info-save-wrap", children: _jsx("button", { type: "button", className: "chat-list__new-chat-btn chat-info-save-btn", onClick: saveChatInfoChanges, "aria-label": locale === "ru" ? "Сохранить" : "Save", title: locale === "ru" ? "Сохранить" : "Save", children: _jsx("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsx("path", { d: "M9.55 17.2 4.8 12.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4z" }) }) }) })) : null] })) : null, mediaPreviewUrl ? (_jsx("div", { className: "confirm-overlay", role: "dialog", "aria-modal": "true", "aria-label": locale === "ru" ? "Просмотр медиа" : "Media preview", onClick: () => {
                    setMediaPreviewUrl(null);
                    setMediaPreviewType(null);
                }, children: _jsxs("div", { className: "chat-media-lightbox", onClick: (event) => event.stopPropagation(), children: [_jsx("button", { type: "button", className: "icon-button chat-media-lightbox__close", onClick: () => {
                                setMediaPreviewUrl(null);
                                setMediaPreviewType(null);
                            }, "aria-label": "Close", children: "\u00D7" }), mediaPreviewType === "video" ? _jsx("video", { src: mediaPreviewUrl, controls: true, autoPlay: true }) : _jsx("img", { src: mediaPreviewUrl, alt: "" })] }) })) : null, isArchiveSettingsOpen ? (_jsxs("aside", { className: `profile-drawer chat-info-drawer ${topDrawer === "chat" ? "profile-drawer--top" : ""}`, onMouseDown: () => setTopDrawer("chat"), children: [_jsxs("header", { className: "chat-info-drawer__header", children: [_jsx("button", { type: "button", className: "icon-button drawer-close-btn", onClick: () => setIsArchiveSettingsOpen(false), "aria-label": "Close", children: "\u00D7" }), _jsx("h3", { children: locale === "ru" ? "Настройки архива" : "Archive settings" }), _jsx("span", {})] }), _jsxs("div", { className: "chat-info-main", children: [_jsxs("section", { className: "chat-info-main__card", children: [_jsxs("h5", { children: [_jsx(ArchiveIcon, {}), locale === "ru" ? "Показывать архив в списке чатов" : "Show archive in chat list"] }), _jsx("p", { children: locale === "ru" ? "Карточка «Архив» отображается в основном списке чатов." : "Archive entry is shown in the main chat list." }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setIsArchiveHiddenFromMain((prev) => !prev), children: isArchiveHiddenFromMain ? (locale === "ru" ? "Показывать архив" : "Show archive") : (locale === "ru" ? "Скрыть архив" : "Hide archive") })] }), _jsxs("section", { className: "chat-info-main__card", children: [_jsxs("h5", { children: [_jsx(BellIcon, {}), locale === "ru" ? "Отключать уведомления по умолчанию" : "Mute by default"] }), _jsx("p", { children: locale === "ru" ? "Для новых архивных чатов уведомления сразу выключены." : "New archived chats start with notifications muted." }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setArchiveMuteByDefault((prev) => !prev), children: archiveMuteByDefault ? (locale === "ru" ? "Включено" : "Enabled") : (locale === "ru" ? "Выключено" : "Disabled") })] }), _jsxs("section", { className: "chat-info-main__card", children: [_jsxs("h5", { children: [_jsx(CheckDoubleIcon, {}), locale === "ru" ? "Счётчик непрочитанных в архиве" : "Keep unread counter"] }), _jsx("p", { children: locale === "ru" ? "Показывать общее число непрочитанных рядом с архивом." : "Show total unread count near archive entry." }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setArchiveKeepUnreadCounter((prev) => !prev), children: archiveKeepUnreadCounter ? (locale === "ru" ? "Показывать" : "Show") : (locale === "ru" ? "Скрывать" : "Hide") })] }), _jsxs("section", { className: "chat-info-main__card", children: [_jsxs("h5", { children: [_jsx(SettingsIcon, {}), locale === "ru" ? "Автоархив muted-чатов" : "Auto-archive muted chats"] }), _jsx("p", { children: locale === "ru" ? "Автоматически переносить приглушённые чаты в архив." : "Automatically move muted chats to archive." }), _jsx("button", { type: "button", className: "ghost-button", onClick: () => setArchiveAutoArchiveMuted((prev) => !prev), children: archiveAutoArchiveMuted ? (locale === "ru" ? "Включено" : "Enabled") : (locale === "ru" ? "Выключено" : "Disabled") })] })] })] })) : null, isLogoutConfirmOpen ? (_jsx("div", { className: "confirm-overlay", role: "dialog", "aria-modal": "true", "aria-label": locale === "ru" ? "Подтверждение выхода" : "Logout confirmation", children: _jsxs("div", { className: "confirm-popup", children: [_jsx("h4", { children: locale === "ru" ? "Выйти из аккаунта?" : "Log out from account?" }), _jsx("p", { children: locale === "ru" ? "Вы уверены, что хотите завершить текущий сеанс?" : "Are you sure you want to end the current session?" }), _jsxs("div", { className: "confirm-popup__actions", children: [_jsx("button", { type: "button", className: "ghost-button", onClick: () => setIsLogoutConfirmOpen(false), children: locale === "ru" ? "Отмена" : "Cancel" }), _jsx("button", { type: "button", className: "primary-button confirm-danger", onClick: () => {
                                        setIsLogoutConfirmOpen(false);
                                        onLogout();
                                    }, children: locale === "ru" ? "Выйти" : "Log out" })] })] }) })) : null] }));
}
