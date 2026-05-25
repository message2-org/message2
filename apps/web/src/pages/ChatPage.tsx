import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { buildAvatarGradient, buildUserInitials } from "../lib/avatar";
import { copy, localeOptions, Locale } from "../i18n";
import { chatMatchesSearch } from "../search-utils";
import { AuthUser, ChatItem, Message, PendingAttachment, TransparencyBanner } from "../types";
import { SidebarDiscovery, type DiscoveryTabId } from "../components/SidebarDiscovery";
import {
  ArchiveIcon,
  BellIcon,
  CalendarIcon,
  ChecklistIcon,
  CheckDoubleIcon,
  CheckSingleIcon,
  DotsVerticalIcon,
  FileIcon,
  HamburgerIcon,
  ImageIcon,
  InfoIcon,
  LanguageIcon,
  LinkIcon,
  LogoutIcon,
  MicIcon,
  PaletteIcon,
  PaperclipIcon,
  PencilIcon,
  PinIcon,
  PollIcon,
  SearchIcon,
  SendPlaneIcon,
  SettingsIcon,
  StarIcon,
  UsersIcon,
  UserIcon,
  VideoIcon,
  WalletIcon
} from "../components/ui-icons";

const USERNAME_RE = /^[a-zA-Z0-9_-]+$/;
const PASSWORD_HAS_LOWER = /[a-z]/;
const PASSWORD_HAS_UPPER = /[A-Z]/;
const PASSWORD_HAS_DIGIT = /\d/;
const PASSWORD_HAS_SPECIAL = /[^A-Za-z0-9]/;

type ChatPageProps = {
  locale: Locale;
  theme: "light" | "dark";
  authUser: AuthUser;
  /** Resolved URL for `<img>` (blob, data, or https). */
  userAvatar: string | null;
  /** Stored profile value (`media:<id>`, legacy data URL, or null). */
  userAvatarRef: string | null;
  isMenuOpen: boolean;
  /** True only after the realtime channel was open and then dropped (not during initial connect). */
  isRealtimeReconnecting: boolean;
  isRealtimeConnected: boolean;
  transparencyBanner: TransparencyBanner | null;
  onDismissTransparency: () => void;
  onOpenTransparency: (eventId: string) => void;
  chatEncryptionMode: string | null;
  encryptionConsent: { requestId: string; requestedMode: string } | null;
  onEncryptionConsent: (accept: boolean) => void;
  search: string;
  discoverUsers: { id: string; username: string; displayName: string }[];
  discoverJoinedChannels: { id: string; name: string; subscribers: number }[];
  discoverSimilarChannels: { id: string; name: string; subscribers: number }[];
  activeChatId: string | null;
  chats: ChatItem[];
  messages: Message[];
  input: string;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onSelectChat: (id: string) => void;
  onOpenDirectChat: (user: { id: string; username: string; displayName: string }) => void | Promise<void>;
  onSearchChange: (value: string) => void;
  replyTo: Message | null;
  onCancelReply: () => void;
  onSetReplyTo: (message: Message | null) => void;
  typingPeers: { userId: string; displayName: string }[];
  onInputChange: (value: string) => void;
  onPrepareAttachment: (file: File) => Promise<PendingAttachment>;
  onSendMessage: (attachment?: PendingAttachment) => void;
  onEditMessage: (chatId: string, messageId: string, cipherText: string) => void | Promise<void>;
  onDeleteMessage: (chatId: string, messageId: string) => void | Promise<void>;
  onToggleReaction: (chatId: string, messageId: string, emoji: string) => void | Promise<void>;
  onLogout: () => void;
  onThemeToggle: () => void;
  onLocaleSelect: (next: Locale) => void;
  onUpdateProfile: (payload: {
    displayName: string;
    username: string;
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => string | undefined | Promise<string | undefined>;
  onUploadAvatar: (file: File | null) => void | Promise<void>;
  onResetAvatar: () => void | Promise<void>;
  onUpdateChat: (chatId: string, payload: { name?: string; group?: "favorite" | "regular" | "archived"; unread?: number }) => void;
};

export function ChatPage(props: ChatPageProps) {
  const {
    locale,
    theme,
    authUser,
    userAvatar,
    userAvatarRef,
    isMenuOpen,
    isRealtimeReconnecting,
    isRealtimeConnected,
    transparencyBanner,
    onDismissTransparency,
    onOpenTransparency,
    chatEncryptionMode,
    encryptionConsent,
    onEncryptionConsent,
    search,
    discoverUsers,
    discoverJoinedChannels,
    discoverSimilarChannels,
    activeChatId,
    chats,
    messages,
    input,
    onToggleMenu,
    onCloseMenu,
    onSelectChat,
    onOpenDirectChat,
    onSearchChange,
    replyTo,
    onCancelReply,
    onSetReplyTo,
    typingPeers,
    onInputChange,
    onPrepareAttachment,
    onSendMessage,
    onEditMessage,
    onDeleteMessage,
    onToggleReaction,
    onLogout,
    onThemeToggle,
    onLocaleSelect,
    onUpdateProfile,
    onUploadAvatar,
    onResetAvatar,
    onUpdateChat
  } = props;
  const t = copy[locale];
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isProfilePanelOpen, setIsProfilePanelOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<null | "theme" | "locale">(null);
  const [submenuTop, setSubmenuTop] = useState(8);
  const [submenuLeft, setSubmenuLeft] = useState(210);
  const [profileName, setProfileName] = useState(authUser.displayName);
  const [profileUsername, setProfileUsername] = useState(authUser.username);
  const [profileOldPassword, setProfileOldPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState("");
  const [profileSubmitError, setProfileSubmitError] = useState("");
  const [activeProfileEdit, setActiveProfileEdit] = useState<null | "name" | "username" | "password">(null);
  const [isAvatarClearHover, setIsAvatarClearHover] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [isChatInfoOpen, setIsChatInfoOpen] = useState(false);
  const [topDrawer, setTopDrawer] = useState<"profile" | "chat">("profile");
  const [isChatInfoEditMode, setIsChatInfoEditMode] = useState(false);
  const [pinnedChats, setPinnedChats] = useState<Record<string, boolean>>({});
  const [mutedChats, setMutedChats] = useState<Record<string, boolean>>({});
  const [chatContextMenu, setChatContextMenu] = useState<{ chatId: string; x: number; y: number } | null>(null);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<PendingAttachment | null>(null);
  const [isAttachmentUploading, setIsAttachmentUploading] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState("");
  const [chatDescriptions, setChatDescriptions] = useState<Record<string, string>>({});
  const [chatDisplayAliases, setChatDisplayAliases] = useState<Record<string, string>>({});
  const [chatInfoAvatars, setChatInfoAvatars] = useState<Record<string, string>>({});
  const [chatInfoDraftName, setChatInfoDraftName] = useState("");
  const [chatInfoDraftDescription, setChatInfoDraftDescription] = useState("");
  const [chatInfoDraftAlias, setChatInfoDraftAlias] = useState("");
  const [chatInfoDraftAvatar, setChatInfoDraftAvatar] = useState<string | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaPreviewType, setMediaPreviewType] = useState<"image" | "video" | null>(null);
  const [activeChatInfoSection, setActiveChatInfoSection] = useState<"media" | "files" | "groups">("media");
  const [isArchiveViewOpen, setIsArchiveViewOpen] = useState(false);
  const [isArchiveMenuOpen, setIsArchiveMenuOpen] = useState(false);
  const [isArchiveHiddenFromMain, setIsArchiveHiddenFromMain] = useState(false);
  const [isArchiveSettingsOpen, setIsArchiveSettingsOpen] = useState(false);
  const [archiveMuteByDefault, setArchiveMuteByDefault] = useState(true);
  const [archiveKeepUnreadCounter, setArchiveKeepUnreadCounter] = useState(true);
  const [archiveAutoArchiveMuted, setArchiveAutoArchiveMuted] = useState(false);
  const [isNewChatMenuOpen, setIsNewChatMenuOpen] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [discoveryTab, setDiscoveryTab] = useState<DiscoveryTabId>("chats");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const chatMenuRef = useRef<HTMLDivElement | null>(null);
  const archiveMenuRef = useRef<HTMLDivElement | null>(null);
  const newChatMenuRef = useRef<HTMLDivElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement | null>(null);
  const emojiRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContextMenuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!isMenuOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) onCloseMenu();
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
    if (!isProfilePanelOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsProfilePanelOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [isProfilePanelOpen]);
  useEffect(() => {
    if (!isProfilePanelOpen) return;
    setProfileName(authUser.displayName);
    setProfileUsername(authUser.username);
    setProfileOldPassword("");
    setProfileNewPassword("");
    setProfileConfirmPassword("");
    setProfileSubmitError("");
    setActiveProfileEdit(null);
  }, [authUser.displayName, authUser.username, isProfilePanelOpen]);
  useEffect(() => {
    if (!isChatMenuOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!chatMenuRef.current) return;
      if (!chatMenuRef.current.contains(event.target as Node)) setIsChatMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isChatMenuOpen]);
  useEffect(() => {
    if (!isAttachMenuOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!attachMenuRef.current) return;
      if (!attachMenuRef.current.contains(event.target as Node)) setIsAttachMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isAttachMenuOpen]);
  useEffect(() => {
    if (!isEmojiOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!emojiRef.current) return;
      if (!emojiRef.current.contains(event.target as Node)) setIsEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isEmojiOpen]);
  useEffect(() => {
    if (!chatContextMenu) return;
    const onDocClick = (event: MouseEvent) => {
      if (!chatContextMenuRef.current) return;
      if (!chatContextMenuRef.current.contains(event.target as Node)) setChatContextMenu(null);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChatContextMenu(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [chatContextMenu]);
  useEffect(() => {
    if (!isArchiveMenuOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!archiveMenuRef.current) return;
      if (!archiveMenuRef.current.contains(event.target as Node)) setIsArchiveMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsArchiveMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isArchiveMenuOpen]);
  useEffect(() => {
    if (!isArchiveSettingsOpen) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsArchiveSettingsOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
    };
  }, [isArchiveSettingsOpen]);
  useEffect(() => {
    if (!isNewChatMenuOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (!newChatMenuRef.current) return;
      if (!newChatMenuRef.current.contains(event.target as Node)) setIsNewChatMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsNewChatMenuOpen(false);
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
    if (!isChatInfoOpen || !selectedChat) return;
    setIsChatInfoEditMode(false);
    setActiveChatInfoSection("media");
    setChatInfoDraftName(selectedChat.name);
    setChatInfoDraftDescription(chatDescriptions[selectedChat.id] ?? "");
    setChatInfoDraftAlias(chatDisplayAliases[selectedChat.id] ?? "");
    setChatInfoDraftAvatar(chatInfoAvatars[selectedChat.id] ?? null);
  }, [isChatInfoOpen, chats, activeChatId, chatDescriptions, chatDisplayAliases, chatInfoAvatars]);
  const effectiveChats = useMemo(
    () =>
      chats.map((chat) => ({
        ...chat,
        isPinned: Boolean(pinnedChats[chat.id]),
        isMuted: Boolean(mutedChats[chat.id])
      })),
    [chats, pinnedChats, mutedChats]
  );
  const filteredChats = effectiveChats
    .filter((chat) => chatMatchesSearch(chat, search))
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
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

  function formatChatTime(value: string | undefined) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
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
    if (date.getFullYear() === now.getFullYear()) return `${dayText} ${monthText}`;
    return `${dayText} ${monthText} ${date.getFullYear()}`;
  }

  function lastSenderTag(chat: ChatItem) {
    if (chat.kind !== "group") return "";
    if (chat.lastSenderType === "me") return locale === "ru" ? "Вы" : "You";
    const sender = chat.lastSenderName?.trim() || (locale === "ru" ? "Участник" : "Member");
    return sender[0].toUpperCase();
  }

  function statusIcon(chat: ChatItem) {
    if (chat.unread > 0) return null;
    if (chat.lastSenderType !== "me") return null;
    if (!chat.lastDelivery) return null;
    if (chat.lastDelivery === "read") return <CheckDoubleIcon />;
    return <CheckSingleIcon />;
  }
  function messageDateLabel(current: Message, previous: Message | undefined) {
    if (!current.createdAt) return null;
    const date = new Date(current.createdAt);
    if (Number.isNaN(date.getTime())) return null;
    const prevDate = previous?.createdAt ? new Date(previous.createdAt) : null;
    const currentKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const prevKey = prevDate ? `${prevDate.getFullYear()}-${prevDate.getMonth()}-${prevDate.getDate()}` : "";
    if (currentKey === prevKey) return null;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((today.getTime() - target.getTime()) / 86400000);
    if (diffDays === 0) return locale === "ru" ? "Сегодня" : "Today";
    if (diffDays === 1) return locale === "ru" ? "Вчера" : "Yesterday";
    if (diffDays > 1 && diffDays < 7) {
      const weekdaysRu = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
      const weekdaysEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return locale === "ru" ? weekdaysRu[target.getDay()] : weekdaysEn[target.getDay()];
    }
    const monthsRu = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
    const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (locale === "ru") return `${target.getDate()} ${monthsRu[target.getMonth()]}${target.getFullYear() === now.getFullYear() ? "" : ` ${target.getFullYear()} г.`}`;
    return `${monthsEn[target.getMonth()]} ${target.getDate()}${target.getFullYear() === now.getFullYear() ? "" : `, ${target.getFullYear()}`}`;
  }
  function senderInitial(author: string) {
    return author.trim().slice(0, 1).toUpperCase() || "?";
  }
  function isEmojiOnlyText(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return false;
    const withoutEmojiTokens = trimmed.replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u{1F3FB}-\u{1F3FF}\s]/gu, "");
    return withoutEmojiTokens.length === 0;
  }
  function resizeComposerInput() {
    if (!composerInputRef.current) return;
    composerInputRef.current.style.height = "0px";
    const nextHeight = Math.min(composerInputRef.current.scrollHeight, 130);
    composerInputRef.current.style.height = `${nextHeight}px`;
  }
  function handleComposerChange(value: string) {
    onInputChange(value);
    requestAnimationFrame(resizeComposerInput);
  }
  function submitComposerMessage() {
    if (!input.trim() && !pendingAttachment) return;
    if (editingMessageId && activeChatId) {
      void onEditMessage(activeChatId, editingMessageId, input.trim());
      setEditingMessageId(null);
      onInputChange("");
      clearPendingAttachment();
      requestAnimationFrame(() => {
        if (!composerInputRef.current) return;
        composerInputRef.current.style.height = "0px";
      });
      return;
    }
    onSendMessage(pendingAttachment ?? undefined);
    clearPendingAttachment();
    requestAnimationFrame(() => {
      if (!composerInputRef.current) return;
      composerInputRef.current.style.height = "0px";
    });
  }
  function handleComposerKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    submitComposerMessage();
  }
  function onEmojiPick(emoji: EmojiClickData) {
    onInputChange(`${input}${emoji.emoji}`);
    setIsEmojiOpen(false);
    requestAnimationFrame(resizeComposerInput);
  }
  function clearPendingAttachment() {
    if (pendingAttachment) {
      URL.revokeObjectURL(pendingAttachment.localPreview);
    }
    setPendingAttachment(null);
    setAttachmentUploadError("");
  }

  async function attachFile(file: File) {
    setIsAttachmentUploading(true);
    setAttachmentUploadError("");
    try {
      const prepared = await onPrepareAttachment(file);
      setPendingAttachment((prev) => {
        if (prev) URL.revokeObjectURL(prev.localPreview);
        return prepared;
      });
      setIsAttachMenuOpen(false);
    } catch {
      setAttachmentUploadError(locale === "ru" ? "Не удалось загрузить файл" : "Failed to upload file");
    } finally {
      setIsAttachmentUploading(false);
    }
  }
  function pendingAttachmentLabel(type: "image" | "video" | "audio" | "file") {
    if (locale === "ru") {
      if (type === "image") return "Изображение";
      if (type === "video") return "Видео";
      if (type === "audio") return "Аудио";
      return "Файл";
    }
    if (type === "image") return "Image";
    if (type === "video") return "Video";
    if (type === "audio") return "Audio";
    return "File";
  }
  function requestLogout() {
    setIsLogoutConfirmOpen(true);
  }
  function fieldCaptionLine(label: string, error?: string): string {
    return error ? `${label} ${error}` : label;
  }
  const profileNameTrim = profileName.trim();
  const profileUsernameTrim = profileUsername.trim();
  const profileOldPasswordTrim = profileOldPassword.trim();
  const profileNewPasswordTrim = profileNewPassword.trim();
  const profileConfirmPasswordTrim = profileConfirmPassword.trim();
  const isPasswordChangeRequested = Boolean(profileOldPasswordTrim || profileNewPasswordTrim || profileConfirmPasswordTrim);
  const profileNameError =
    !profileNameTrim ? (locale === "ru" ? "обязательное поле." : "required.") : profileNameTrim.length < 2 ? (locale === "ru" ? "меньше 2 символов." : "fewer than 2 characters.") : profileNameTrim.length > 40 ? (locale === "ru" ? "больше 40 символов." : "more than 40 characters.") : "";
  const profileUsernameError =
    !profileUsernameTrim
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
  const profileConfirmPasswordError =
    !isPasswordChangeRequested
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
  function startProfileEdit(kind: "name" | "username" | "password") {
    if (activeProfileEdit && activeProfileEdit !== kind) return;
    setProfileSubmitError("");
    if (kind === "name") setProfileName(authUser.displayName);
    if (kind === "username") setProfileUsername(authUser.username);
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
  async function saveProfileEdit() {
    const localError =
      activeProfileEdit === "name"
        ? profileNameError
        : activeProfileEdit === "username"
          ? profileUsernameError
          : profileOldPasswordError || profileNewPasswordError || profileConfirmPasswordError;
    if (localError) {
      setProfileSubmitError(localError);
      return;
    }
    const error = await onUpdateProfile({
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
  function openFlyout(kind: "theme" | "locale", event: ReactMouseEvent<HTMLButtonElement>) {
    const rowTop = event.currentTarget.offsetTop;
    const menuWidth = event.currentTarget.parentElement?.clientWidth ?? 224;
    setSubmenuTop(Math.max(6, rowTop));
    setSubmenuLeft(Math.max(170, menuWidth - 14));
    setActiveSubmenu(kind);
  }
  function userInitials() {
    return buildUserInitials(authUser.displayName, authUser.username);
  }
  function userAvatarGradient() {
    return buildAvatarGradient(authUser.id || authUser.username);
  }
  function deliveryText(chat: ChatItem) {
    if (chat.lastSenderType !== "me") return "";
    if (chat.lastDelivery === "read") return locale === "ru" ? "прочитано" : "read";
    if (chat.lastDelivery === "sent") return locale === "ru" ? "доставлено" : "delivered";
    return "";
  }
  function chatSubtitle(chat: ChatItem | null) {
    if (typingPeers.length > 0) {
      const name = typingPeers[0]?.displayName || (locale === "ru" ? "Собеседник" : "Contact");
      return locale === "ru" ? `${name} печатает…` : `${name} is typing…`;
    }
    if (!chat) return "";
    if (chat.kind === "group") return locale === "ru" ? "7 участников" : "7 participants";
    return chat.status === "online" ? t.online : t.lastSeen;
  }
  function chatPublicHandle(chat: ChatItem | null) {
    if (!chat) return "";
    const normalized = chat.name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]+/gi, "")
      .slice(0, 22);
    return normalized || chat.id;
  }
  function chatInternalUrl(chat: ChatItem | null) {
    if (!chat) return "";
    return `message2.local/${chatPublicHandle(chat)}`;
  }
  function groupMembersCount(chat: ChatItem | null) {
    if (!chat) return 0;
    return chat.kind === "group" ? 7 : 1;
  }
  function groupAdminsCount(chat: ChatItem | null) {
    if (!chat || chat.kind !== "group") return 0;
    return 2;
  }
  function groupRemovedCount(chat: ChatItem | null) {
    if (!chat || chat.kind !== "group") return 0;
    return 1;
  }
  function saveChatInfoChanges() {
    if (!activeChat) return;
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
  function openChatInNewTab(chatId: string) {
    const nextUrl = new URL(window.location.href);
    nextUrl.hash = `chat-${chatId}`;
    window.open(nextUrl.toString(), "_blank", "noopener,noreferrer");
    setChatContextMenu(null);
  }
  function toggleChatRead(chat: ChatItem) {
    onUpdateChat(chat.id, { unread: chat.unread > 0 ? 0 : 1 });
    setChatContextMenu(null);
  }
  function toggleChatPin(chatId: string) {
    setPinnedChats((prev) => ({ ...prev, [chatId]: !prev[chatId] }));
    setChatContextMenu(null);
  }
  function toggleChatMute(chatId: string) {
    setMutedChats((prev) => ({ ...prev, [chatId]: !prev[chatId] }));
    setChatContextMenu(null);
  }
  function toggleChatArchive(chat: ChatItem) {
    onUpdateChat(chat.id, { group: chat.group === "archived" ? "regular" : "archived" });
    setChatContextMenu(null);
  }
  function removeChatAction(chat: ChatItem) {
    setChatContextMenu(null);
    onUpdateChat(chat.id, { group: "archived", unread: 0 });
  }
  function markArchivedAsRead() {
    archivedChats.forEach((chat) => onUpdateChat(chat.id, { unread: 0 }));
    setIsArchiveMenuOpen(false);
  }

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
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

  function getChatInitials(name: string) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "C";
  }
  function chatGradient(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    const sat = 68;
    const light = 58;
    return `linear-gradient(145deg, hsl(${hue} ${sat}% ${light}%), hsl(${hue} ${sat}% ${Math.max(30, light - 16)}%))`;
  }
  const isDrawerOpen = isProfilePanelOpen || isChatInfoOpen;
  const showDiscoveryHeader = isDiscoveryOpen && !isArchiveViewOpen;
  const activeDrawer =
    topDrawer === "chat"
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

  return (
    <main
      className={`layout theme-${theme} ${isDrawerOpen ? "layout--drawer-open" : ""}`}
      style={{
        ["--sidebar-width" as string]: `${sidebarWidth}px`,
        ["--drawer-width" as string]: "340px"
      }}
    >
      <aside className="sidebar">
        {isArchiveViewOpen ? (
          <header className="sidebar__header sidebar__header--archive">
            <div className="sidebar__archive-title-wrap">
              <button
                className="icon-button icon-button--ghost"
                type="button"
                onClick={() => {
                  setIsArchiveViewOpen(false);
                  setIsArchiveMenuOpen(false);
                  setIsArchiveSettingsOpen(false);
                }}
                aria-label={locale === "ru" ? "Назад к списку чатов" : "Back to chat list"}
              >
                <span className="sidebar__archive-back-arrow" aria-hidden="true">←</span>
              </button>
              <h2 className="sidebar__archive-title">{locale === "ru" ? "Архивированные чаты" : "Archived chats"}</h2>
            </div>
            <div className="chat-panel__menu-wrap" ref={archiveMenuRef}>
              <button
                type="button"
                className="icon-button icon-button--ghost"
                onClick={() => setIsArchiveMenuOpen((prev) => !prev)}
                aria-label={locale === "ru" ? "Действия архива" : "Archive actions"}
              >
                <DotsVerticalIcon />
              </button>
              {isArchiveMenuOpen ? (
                <div className="chat-panel__menu">
                  <button
                    type="button"
                    onClick={() => {
                      setIsArchiveHiddenFromMain((prev) => !prev);
                      setIsArchiveMenuOpen(false);
                    }}
                  >
                    <ArchiveIcon />
                    <span>{isArchiveHiddenFromMain ? (locale === "ru" ? "Показывать архив в списке чатов" : "Show archive in chat list") : (locale === "ru" ? "Скрыть архив из списка чатов" : "Hide archive from chat list")}</span>
                  </button>
                  <button type="button" onClick={markArchivedAsRead}>
                    <CheckDoubleIcon />
                    <span>{locale === "ru" ? "Пометить все как прочитанные" : "Mark all as read"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsArchiveMenuOpen(false);
                      setIsArchiveSettingsOpen(true);
                    }}
                  >
                    <SettingsIcon />
                    <span>{locale === "ru" ? "Настройки архива" : "Archive settings"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsArchiveMenuOpen(false);
                      window.alert(locale === "ru" ? "Архив хранит чаты и группы вне основного списка, но они остаются актуальными." : "Archive keeps chats and groups out of the main list while they stay up to date.");
                    }}
                  >
                    <InfoIcon />
                    <span>{locale === "ru" ? "Как это работает?" : "How does it work?"}</span>
                  </button>
                </div>
              ) : null}
            </div>
          </header>
        ) : (
          <header className="sidebar__header sidebar__header--chat">
            {showDiscoveryHeader ? (
              <button
                className="icon-button icon-button--ghost"
                type="button"
                onClick={() => {
                  setIsDiscoveryOpen(false);
                  onCloseMenu();
                }}
                aria-label={locale === "ru" ? "Назад к списку чатов" : "Back to chat list"}
              >
                <span className="sidebar__archive-back-arrow" aria-hidden="true">←</span>
              </button>
            ) : (
              <>
                <button className={`icon-button icon-button--ghost ${isMenuOpen ? "icon-button--active" : ""}`} onClick={onToggleMenu} aria-label={locale === "ru" ? "Открыть меню" : "Open menu"}>
                  <HamburgerIcon />
                </button>
                {isMenuOpen ? (
                  <div className="burger-popover" ref={menuRef} onMouseLeave={() => setActiveSubmenu(null)}>
                    <div className="burger-menu">
                      <button
                        className="burger-menu__item"
                        type="button"
                        onMouseEnter={() => setActiveSubmenu(null)}
                        onClick={() => {
                          setTopDrawer("profile");
                          setIsProfilePanelOpen(true);
                          onCloseMenu();
                        }}
                      >
                        <UserIcon />
                        <span>{locale === "ru" ? "Мой аккаунт" : "My account"}</span>
                      </button>
                      <button className="burger-menu__item" type="button" onMouseEnter={(event) => openFlyout("theme", event)} onClick={(event) => openFlyout("theme", event)}>
                        <PaletteIcon />
                        <span>{locale === "ru" ? "Тема" : "Theme"}</span>
                      </button>
                      <button className="burger-menu__item" type="button" onMouseEnter={(event) => openFlyout("locale", event)} onClick={(event) => openFlyout("locale", event)}>
                        <LanguageIcon />
                        <span>{locale === "ru" ? "Язык" : "Language"}</span>
                      </button>
                      <button className="burger-menu__item" type="button" onMouseEnter={() => setActiveSubmenu(null)}>
                        <InfoIcon />
                        <span>{t.aboutUs}</span>
                      </button>
                      <button className="burger-menu__item burger-menu__item--danger" type="button" onMouseEnter={() => setActiveSubmenu(null)} onClick={requestLogout}>
                        <LogoutIcon />
                        <span>{t.logout}</span>
                      </button>
                    </div>
                    {activeSubmenu ? (
                      <div className="burger-submenu-flyout" style={{ top: `${submenuTop}px`, left: `${submenuLeft}px` }}>
                        {activeSubmenu === "theme" ? (
                          <>
                            <button
                              className={`burger-submenu__item ${theme === "dark" ? "burger-submenu__item--active" : ""}`}
                              type="button"
                              onClick={() => {
                                if (theme !== "dark") onThemeToggle();
                                setActiveSubmenu(null);
                              }}
                            >
                              <img src="/icons/moon.svg" alt="" className="burger-submenu__icon" />
                              {locale === "ru" ? "Темная" : "Dark"}
                            </button>
                            <button
                              className={`burger-submenu__item ${theme === "light" ? "burger-submenu__item--active" : ""}`}
                              type="button"
                              onClick={() => {
                                if (theme !== "light") onThemeToggle();
                                setActiveSubmenu(null);
                              }}
                            >
                              <img src="/icons/sun.svg" alt="" className="burger-submenu__icon" />
                              {locale === "ru" ? "Светлая" : "Light"}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={`burger-submenu__item ${locale === "ru" ? "burger-submenu__item--active" : ""}`}
                              type="button"
                              onClick={() => {
                                onLocaleSelect("ru");
                                setActiveSubmenu(null);
                              }}
                            >
                              <img src={localeOptions.ru.flag} alt="" className="burger-submenu__flag" />
                              Русский
                            </button>
                            <button
                              className={`burger-submenu__item ${locale === "en" ? "burger-submenu__item--active" : ""}`}
                              type="button"
                              onClick={() => {
                                onLocaleSelect("en");
                                setActiveSubmenu(null);
                              }}
                            >
                              <img src={localeOptions.en.flag} alt="" className="burger-submenu__flag" />
                              English
                            </button>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
            <div
              className={`search-wrap search-wrap--header ${!isRealtimeReconnecting ? "search-wrap--header--pressable" : ""}`}
              onClick={
                isRealtimeReconnecting
                  ? undefined
                  : () => {
                      setIsDiscoveryOpen(true);
                      setIsArchiveViewOpen(false);
                      onCloseMenu();
                    }
              }
            >
              {!isRealtimeReconnecting ? (
                <>
                  <SearchIcon />
                  <input className="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder={t.searchChats} />
                </>
              ) : (
                <>
                  <svg className="search-wrap__spinner" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="31.4 31.4" />
                  </svg>
                  <div className="search search--reconnecting" role="status" aria-live="polite">
                    {t.reconnecting}
                  </div>
                </>
              )}
            </div>
            <div className={`realtime-badge ${isRealtimeConnected ? "realtime-badge--ok" : "realtime-badge--polling"}`} title={isRealtimeConnected ? "Realtime: WebSocket connected" : "Realtime: fallback polling"}>
              <span className="realtime-badge__dot" aria-hidden />
              <span>{isRealtimeConnected ? (locale === "ru" ? "Онлайн" : "Live") : (locale === "ru" ? "Опрос" : "Polling")}</span>
            </div>
          </header>
        )}

        <div className="sidebar__main">
          {showDiscoveryHeader ? (
            <SidebarDiscovery
              locale={locale}
              tab={discoveryTab}
              onTabChange={setDiscoveryTab}
              t={t}
              search={search}
              chats={mainChats}
              users={discoverUsers}
              joinedChannels={discoverJoinedChannels}
              similarChannels={discoverSimilarChannels}
              onOpenDirectChat={onOpenDirectChat}
              onSelectChat={(id) => {
                onSelectChat(id);
                setIsDiscoveryOpen(false);
              }}
              chatGradient={chatGradient}
              getChatInitials={getChatInitials}
              onCloseDiscovery={() => setIsDiscoveryOpen(false)}
            />
          ) : (
            <>
          <div className="chat-list">
          {!isArchiveViewOpen && !isArchiveHiddenFromMain && isArchiveAvailable ? (
            <button
              className="chat-card"
              type="button"
              onClick={() => {
                setIsArchiveViewOpen(true);
                setIsArchiveMenuOpen(false);
                setIsDiscoveryOpen(false);
                onCloseMenu();
              }}
            >
              <div className="chat-card__left">
                <span className="chat-avatar chat-avatar--archived">
                  <ArchiveIcon />
                </span>
                <div>
                  <p className="chat-card__name">{locale === "ru" ? "Архив" : "Archive"}</p>
                  <p className="chat-card__message">{archiveLastMessage}</p>
                </div>
              </div>
              <div className="chat-card__meta">
                <div className="chat-card__meta-top">
                  <span className="chat-card__time">{formatChatTime(archiveLastChat?.lastAt)}</span>
                </div>
                <div className="chat-card__meta-bottom">
                  {archiveKeepUnreadCounter && archiveUnreadCount > 0 ? <span className={`badge ${archiveUnreadCount < 10 ? "badge--single" : ""}`}>{archiveUnreadCount}</span> : null}
                </div>
              </div>
            </button>
          ) : null}
          {chatListItems.map((chat) => (
            <button
              key={chat.id}
              className={`chat-card ${chat.id === activeChatId ? "chat-card--active" : ""}`}
              onClick={() => onSelectChat(chat.id)}
              onContextMenu={(event) => {
                event.preventDefault();
                setChatContextMenu({
                  chatId: chat.id,
                  x: Math.min(event.clientX, window.innerWidth - 252),
                  y: Math.min(event.clientY, window.innerHeight - 302)
                });
              }}
            >
              <div className="chat-card__left">
                {chat.group === "favorite" ? (
                  <span className="chat-avatar chat-avatar--favorite">
                    <StarIcon />
                  </span>
                ) : chat.group === "archived" ? (
                  <span className="chat-avatar chat-avatar--archived">
                    <ArchiveIcon />
                  </span>
                ) : (
                  <span className="chat-avatar" style={{ backgroundImage: chatGradient(chat.id) }}>
                    {getChatInitials(chat.name)}
                  </span>
                )}
                <div>
                  <p className="chat-card__name">{chat.name}</p>
                  <p className="chat-card__message">
                    {lastSenderTag(chat) ? <span className="chat-card__sender">{lastSenderTag(chat)}:</span> : null}
                    {lastSenderTag(chat) ? " " : ""}
                    {chat.lastMessage}
                  </p>
                </div>
              </div>
              <div className="chat-card__meta">
                <div className="chat-card__meta-top">
                  {statusIcon(chat)}
                  <span className="chat-card__time">{formatChatTime(chat.lastAt)}</span>
                </div>
                <div className="chat-card__meta-bottom">
                  {chat.unread > 0 ? <span className={`badge ${chat.unread < 10 ? "badge--single" : ""} ${chat.id === activeChatId ? "badge--inverted" : ""}`}>{chat.unread}</span> : null}
                </div>
              </div>
            </button>
          ))}
          </div>
          {!isArchiveViewOpen ? (
            <div className="chat-list__new-chat-wrap">
              <div className="chat-panel__menu-wrap chat-list__new-chat-menu-wrap" ref={newChatMenuRef}>
                <button
                  type="button"
                  className="chat-list__new-chat-btn"
                  aria-label={locale === "ru" ? "Новый чат" : "New chat"}
                  title={locale === "ru" ? "Новый чат" : "New chat"}
                  onClick={() => setIsNewChatMenuOpen((prev) => !prev)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.7,5.2a1.024,1.024,0,0,1,0,1.448L18.074,9.276l-3.35-3.35L17.35,3.3a1.024,1.024,0,0,1,1.448,0Zm-4.166,5.614-3.35-3.35L4.675,15.975,3,21l5.025-1.675Z" />
                  </svg>
                </button>
                {isNewChatMenuOpen ? (
                  <div className="chat-panel__menu chat-list__new-chat-menu">
                    <button type="button" onClick={() => setIsNewChatMenuOpen(false)}>
                      <LinkIcon />
                      <span>{locale === "ru" ? "Новый канал" : "New channel"}</span>
                    </button>
                    <button type="button" onClick={() => setIsNewChatMenuOpen(false)}>
                      <UsersIcon />
                      <span>{locale === "ru" ? "Новая группа" : "New group"}</span>
                    </button>
                    <button type="button" onClick={() => setIsNewChatMenuOpen(false)}>
                      <UserIcon />
                      <span>{locale === "ru" ? "Новый приватный чат" : "New private chat"}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
            </>
          )}
        </div>
        {chatContextMenu ? (
          <div className="chat-panel__menu chat-list__context-menu" style={{ top: chatContextMenu.y, left: chatContextMenu.x }} ref={chatContextMenuRef}>
            {(() => {
              const menuChat = chats.find((chat) => chat.id === chatContextMenu.chatId) ?? null;
              if (!menuChat) return null;
              const isMuted = Boolean(mutedChats[menuChat.id]);
              const isPinned = Boolean(pinnedChats[menuChat.id]);
              const isArchived = menuChat.group === "archived";
              return (
                <>
                  <button type="button" onClick={() => openChatInNewTab(menuChat.id)}>
                    <LinkIcon />
                    <span>{locale === "ru" ? "Открыть в новой вкладке" : "Open in new tab"}</span>
                  </button>
                  <button type="button" onClick={() => toggleChatRead(menuChat)}>
                    {menuChat.unread > 0 ? <CheckDoubleIcon /> : <CheckSingleIcon />}
                    <span>{menuChat.unread > 0 ? (locale === "ru" ? "Пометить как прочитанный" : "Mark as read") : (locale === "ru" ? "Пометить как непрочитанный" : "Mark as unread")}</span>
                  </button>
                  <button type="button" onClick={() => toggleChatPin(menuChat.id)}>
                    <PinIcon />
                    <span>{isPinned ? (locale === "ru" ? "Открепить чат" : "Unpin chat") : (locale === "ru" ? "Закрепить чат" : "Pin chat")}</span>
                  </button>
                  <button type="button" onClick={() => toggleChatMute(menuChat.id)}>
                    <BellIcon />
                    <span>{isMuted ? (locale === "ru" ? "Включить уведомления" : "Enable notifications") : (locale === "ru" ? "Выключить уведомления" : "Disable notifications")}</span>
                  </button>
                  <button type="button" onClick={() => toggleChatArchive(menuChat)}>
                    <ArchiveIcon />
                    <span>{isArchived ? (locale === "ru" ? "Разархивировать чат" : "Unarchive chat") : (locale === "ru" ? "Архивировать чат" : "Archive chat")}</span>
                  </button>
                  <button type="button" className="chat-panel__menu-danger" onClick={() => removeChatAction(menuChat)}>
                    {menuChat.kind === "group" ? <LogoutIcon /> : <ArchiveIcon />}
                    <span>{menuChat.kind === "group" ? (locale === "ru" ? "Покинуть группу" : "Leave group") : (locale === "ru" ? "Удалить чат" : "Delete chat")}</span>
                  </button>
                </>
              );
            })()}
          </div>
        ) : null}
      </aside>
      <div id="chat-pane-divider" className="pane-divider" />

      <section className="chat-panel">
        {activeChat ? (
          <header
            className="chat-panel__header chat-panel__header--clickable"
            role="button"
            tabIndex={0}
            onClick={openChatInfoFromHeader}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openChatInfoFromHeader();
              }
            }}
          >
            <div className="chat-panel__header-left">
              <button
                type="button"
                className="chat-panel__avatar-btn"
                onClick={(event) => {
                  event.stopPropagation();
                    setTopDrawer("chat");
                  setIsChatInfoOpen(true);
                }}
                aria-label={locale === "ru" ? "Информация о чате" : "Chat info"}
              >
                {activeChat.group === "favorite" ? (
                  <span className="chat-avatar chat-avatar--favorite">
                    <StarIcon />
                  </span>
                ) : activeChat.group === "archived" ? (
                  <span className="chat-avatar chat-avatar--archived">
                    <ArchiveIcon />
                  </span>
                ) : (
                  <span className="chat-avatar" style={{ backgroundImage: chatGradient(activeChat.id) }}>
                    {getChatInitials(activeChat.name)}
                  </span>
                )}
              </button>
              <div className="chat-panel__headline">
                <h2>{activeChat.name}</h2>
                <p>{chatSubtitle(activeChat)}</p>
                {chatEncryptionMode ? (
                  <p className="chat-panel__encryption-mode">
                    {locale === "ru" ? "Шифрование:" : "Encryption:"} {chatEncryptionMode}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="chat-panel__actions">
              <button type="button" className="icon-button chat-panel__action-plain" onClick={(event) => event.stopPropagation()} aria-label={locale === "ru" ? "Поиск по сообщениям" : "Search messages"}>
                <SearchIcon />
              </button>
              <div className="chat-panel__menu-wrap" ref={chatMenuRef}>
                <button
                  type="button"
                  className="icon-button chat-panel__action-plain"
                  onClick={(event) => {
                    event.stopPropagation();
                    setIsChatMenuOpen((prev) => !prev);
                  }}
                  aria-label={locale === "ru" ? "Действия чата" : "Chat actions"}
                >
                  <DotsVerticalIcon />
                </button>
                {isChatMenuOpen ? (
                  <div className="chat-panel__menu">
                    <button type="button"><PencilIcon /><span>{locale === "ru" ? "Переименовать" : "Rename"}</span></button>
                    <button type="button"><VideoIcon /><span>{locale === "ru" ? "Видеозвонок" : "Video call"}</span></button>
                    <button type="button"><BellIcon /><span>{locale === "ru" ? "Уведомления" : "Notifications"}</span></button>
                    <button type="button"><ChecklistIcon /><span>{locale === "ru" ? "Выбор сообщений" : "Select messages"}</span></button>
                    <button type="button"><PinIcon /><span>{locale === "ru" ? "Закрепить сообщение" : "Pin message"}</span></button>
                    <button type="button"><UserIcon /><span>{locale === "ru" ? "Блокировать/разблокировать" : "Block/unblock"}</span></button>
                    <button type="button" className="chat-panel__menu-danger"><ArchiveIcon /><span>{locale === "ru" ? "Удалить чат" : "Delete chat"}</span></button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>
        ) : null}

        {encryptionConsent ? (
          <div className="encryption-consent-banner" role="status">
            <p>
              {locale === "ru"
                ? `Запрос на ослабление шифрования до «${encryptionConsent.requestedMode}». Подтвердите, если согласны.`
                : `Peer requests weaker encryption (${encryptionConsent.requestedMode}). Accept?`}
            </p>
            <div className="encryption-consent-banner__actions">
              <button type="button" onClick={() => onEncryptionConsent(true)}>
                {locale === "ru" ? "Принять" : "Accept"}
              </button>
              <button type="button" onClick={() => onEncryptionConsent(false)}>
                {locale === "ru" ? "Отклонить" : "Reject"}
              </button>
            </div>
          </div>
        ) : null}

        {transparencyBanner ? (
          <div className="transparency-banner" role="status">
            <span className="transparency-banner__icon" title={locale === "ru" ? "Служебный доступ" : "Privileged access"} aria-hidden="true">
              🕶️
            </span>
            <p className="transparency-banner__text">{transparencyBanner.summary}</p>
            <button
              type="button"
              className="transparency-banner__open"
              onClick={() => onOpenTransparency(transparencyBanner.eventId)}
            >
              {locale === "ru" ? "Подробнее" : "Details"}
            </button>
            <button type="button" className="transparency-banner__close" onClick={onDismissTransparency} aria-label={locale === "ru" ? "Закрыть" : "Dismiss"}>
              ×
            </button>
          </div>
        ) : null}

        <div className="messages">
          {activeChat ? (
            <>
              {messages.map((message, index) => {
                const prev = messages[index - 1];
                const next = messages[index + 1];
                const isFirstInSeries = !prev || prev.sender !== message.sender;
                const isLastInSeries = !next || next.sender !== message.sender;
                const dayLabel = messageDateLabel(message, prev);
                const isEmojiOnly = isEmojiOnlyText(message.text) && !message.preview;
                const disclosureBadge = message.disclosure ? (
                  <span
                    className="message__disclosure-badge"
                    title={
                      locale === "ru"
                        ? `Служебный доступ (${message.disclosure.action})`
                        : `Privileged access (${message.disclosure.action})`
                    }
                    aria-label={locale === "ru" ? "Проверено третьей стороной" : "Reviewed by third party"}
                  >
                    🕶️
                  </span>
                ) : null;
                const mediaNode = message.preview ? (
                  message.previewType === "video" ? (
                    <video src={message.preview} className="message__preview" controls />
                  ) : message.previewType === "audio" ? (
                    <audio src={message.preview} className="message__audio" controls />
                  ) : message.previewType === "file" ? (
                    <a href={message.preview} target="_blank" rel="noreferrer" className="message__file">
                      {message.fileName ?? (locale === "ru" ? "Файл" : "File")}
                    </a>
                  ) : (
                    <img src={message.preview} alt="media preview" className="message__preview" />
                  )
                ) : null;
                const canInteract = !message.isTombstone && !message.isDeleted && activeChatId;
                const reactionRow = message.reactions?.length ? (
                  <div className="message__reactions">
                    {message.reactions.map((reaction) => (
                      <button
                        key={reaction.emoji}
                        type="button"
                        className={`message__reaction ${reaction.reactedByMe ? "message__reaction--mine" : ""}`}
                        onClick={() => canInteract && void onToggleReaction(activeChatId!, message.id, reaction.emoji)}
                      >
                        {reaction.emoji} {reaction.count}
                      </button>
                    ))}
                  </div>
                ) : null;
                const replyPreview = message.replyTo ? (
                  <div className="message__reply">
                    <span className="message__reply-author">{message.replyTo.author}</span>
                    <span className="message__reply-text">{message.replyTo.text}</span>
                  </div>
                ) : null;
                const actionBar = canInteract ? (
                  <div className="message__actions" role="toolbar" aria-label={locale === "ru" ? "Действия" : "Actions"}>
                    <button type="button" className="message__action-btn" onClick={() => onSetReplyTo(message)}>
                      {locale === "ru" ? "Ответ" : "Reply"}
                    </button>
                    <button type="button" className="message__action-btn" onClick={() => void onToggleReaction(activeChatId!, message.id, "👍")}>
                      👍
                    </button>
                    {message.sender === "me" ? (
                      <>
                        <button
                          type="button"
                          className="message__action-btn"
                          onClick={() => {
                            setEditingMessageId(message.id);
                            onInputChange(message.text);
                            requestAnimationFrame(resizeComposerInput);
                          }}
                        >
                          {locale === "ru" ? "Изм." : "Edit"}
                        </button>
                        <button
                          type="button"
                          className="message__action-btn message__action-btn--danger"
                          onClick={() => void onDeleteMessage(activeChatId!, message.id)}
                        >
                          {locale === "ru" ? "Удалить" : "Delete"}
                        </button>
                      </>
                    ) : null}
                  </div>
                ) : null;
                return (
                  <div key={message.id} className="message-wrap">
                    {dayLabel ? <div className="message-day-sep">{dayLabel}</div> : null}
                    {message.sender === "me" ? (
                      <article className={`message message--me ${message.isTombstone ? "message--tombstone" : ""} ${message.isDeleted ? "message--deleted" : ""}`}>
                        {isFirstInSeries ? <p className="message__author">{message.author}</p> : null}
                        {replyPreview}
                        <div className="message__body-row">
                          <p className={isEmojiOnly ? "message__emoji-only" : undefined}>{message.text}</p>
                          {disclosureBadge}
                        </div>
                        {mediaNode}
                        {actionBar}
                        {reactionRow}
                        <p className="message__time">{message.time}</p>
                      </article>
                    ) : (
                      <div className="message-row">
                        <div className="message-row__avatar-slot">
                          {isLastInSeries ? <span className="message-row__avatar">{senderInitial(message.author)}</span> : null}
                        </div>
                        <article className={`message ${message.isTombstone ? "message--tombstone" : ""} ${message.isDeleted ? "message--deleted" : ""}`}>
                          {isFirstInSeries ? <p className="message__author">{message.author}</p> : null}
                          {replyPreview}
                          <div className="message__body-row">
                            <p className={isEmojiOnly ? "message__emoji-only" : undefined}>{message.text}</p>
                            {disclosureBadge}
                          </div>
                          {mediaNode}
                          {actionBar}
                          {reactionRow}
                          <p className="message__time">{message.time}</p>
                        </article>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="chat-empty-state" />
          )}
        </div>

        {activeChat ? (
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              submitComposerMessage();
            }}
          >
            {replyTo ? (
              <div className="composer__reply">
                <div className="composer__reply-main">
                  <span className="composer__reply-author">{replyTo.author}</span>
                  <span className="composer__reply-text">{replyTo.text}</span>
                </div>
                <button type="button" className="icon-button" onClick={onCancelReply} aria-label={locale === "ru" ? "Отменить ответ" : "Cancel reply"}>
                  ×
                </button>
              </div>
            ) : null}
            {editingMessageId ? (
              <p className="composer__edit-hint" role="status">
                {locale === "ru" ? "Редактирование сообщения" : "Editing message"}
                <button
                  type="button"
                  className="composer__edit-cancel"
                  onClick={() => {
                    setEditingMessageId(null);
                    onInputChange("");
                  }}
                >
                  {locale === "ru" ? "Отмена" : "Cancel"}
                </button>
              </p>
            ) : null}
            <div className="composer__emoji-wrap" ref={emojiRef}>
              <button type="button" className="icon-button" onClick={() => setIsEmojiOpen((prev) => !prev)} aria-label={locale === "ru" ? "Эмодзи" : "Emoji"}>
                😊
              </button>
              {isEmojiOpen ? (
                <div className="composer__emoji-pop">
                  <EmojiPicker
                    theme={theme === "dark" ? "dark" : "light"}
                    onEmojiClick={onEmojiPick}
                    lazyLoadEmojis
                    autoFocusSearch={false}
                  />
                </div>
              ) : null}
            </div>
            {pendingAttachment ? (
              <div className="composer__pending-attachment">
                <div className="composer__pending-preview">
                  {pendingAttachment.type === "image" ? (
                    <img src={pendingAttachment.localPreview} alt={pendingAttachment.name} className="composer__pending-preview-media" />
                  ) : pendingAttachment.type === "video" ? (
                    <video src={pendingAttachment.localPreview} className="composer__pending-preview-media" muted />
                  ) : pendingAttachment.type === "audio" ? (
                    <span className="composer__pending-icon-wrap">
                      <MicIcon />
                    </span>
                  ) : (
                    <span className="composer__pending-icon-wrap">
                      <FileIcon />
                    </span>
                  )}
                </div>
                <div className="composer__pending-meta">
                  <p className="composer__pending-name">{pendingAttachment.name}</p>
                  <p className="composer__pending-type">{pendingAttachmentLabel(pendingAttachment.type)}</p>
                </div>
                <button
                  type="button"
                  className="icon-button composer__pending-remove"
                  onClick={clearPendingAttachment}
                  aria-label={locale === "ru" ? "Удалить вложение" : "Remove attachment"}
                >
                  ×
                </button>
              </div>
            ) : null}
            {isAttachmentUploading ? (
              <p className="composer__upload-status" role="status">
                {locale === "ru" ? "Загрузка файла…" : "Uploading file…"}
              </p>
            ) : null}
            {attachmentUploadError ? <p className="composer__upload-error">{attachmentUploadError}</p> : null}
            <div className="composer__input-wrap" ref={attachMenuRef}>
              <textarea
                ref={composerInputRef}
                value={input}
                onChange={(event) => handleComposerChange(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={t.messagePlaceholder}
                rows={1}
              />
              <button type="button" className="icon-button composer__clip" onClick={() => setIsAttachMenuOpen((prev) => !prev)} aria-label={locale === "ru" ? "Вложения" : "Attachments"}>
                <PaperclipIcon />
              </button>
              {isAttachMenuOpen ? (
                <div className="composer__attach-menu">
                  <label>
                    <ImageIcon />
                    <span>{locale === "ru" ? "Фото/видео" : "Photo/video"}</span>
                    <input
                      type="file"
                      className="composer-file-input"
                      accept="image/*,video/*"
                      disabled={isAttachmentUploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        void attachFile(file);
                      }}
                    />
                  </label>
                  <label>
                    <FileIcon />
                    <span>{locale === "ru" ? "Файл" : "File"}</span>
                    <input
                      type="file"
                      className="composer-file-input"
                      disabled={isAttachmentUploading}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        void attachFile(file);
                      }}
                    />
                  </label>
                  <button type="button"><PollIcon /><span>{locale === "ru" ? "Опрос" : "Poll"}</span></button>
                  <button type="button"><CalendarIcon /><span>{locale === "ru" ? "Дата" : "Date"}</span></button>
                  <button type="button"><WalletIcon /><span>{locale === "ru" ? "Кошелёк" : "Wallet"}</span></button>
                </div>
              ) : null}
            </div>
            <button type={input.trim() || pendingAttachment ? "submit" : "button"} className="icon-button composer__send-toggle" aria-label={input.trim() || pendingAttachment ? t.sendMessage : locale === "ru" ? "Голосовое сообщение" : "Voice message"}>
              {input.trim() || pendingAttachment ? <SendPlaneIcon /> : <MicIcon />}
            </button>
          </form>
        ) : null}

      </section>
      {activeDrawer === "profile" ? (
        <aside className="profile-drawer" onMouseDown={() => setTopDrawer("profile")}>
          <header className="profile-drawer__header">
            <h3>{locale === "ru" ? "Мой аккаунт" : "My account"}</h3>
            <button type="button" className="icon-button drawer-close-btn" onClick={() => setIsProfilePanelOpen(false)} aria-label="Close">
              ×
            </button>
          </header>
          <div className="avatar-block">
            <div className="avatar-block__main">
              <div className={`auth-avatar-picker-wrap profile-avatar-wrap ${isAvatarClearHover ? "profile-avatar-wrap--clear-hover" : ""}`}>
                <label className="auth-avatar-picker auth-avatar-picker--profile" title={locale === "ru" ? "Изменить фото" : "Change photo"}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => onUploadAvatar(event.target.files?.[0] ?? null)}
                  />
                  {userAvatar ? (
                    <img src={userAvatar} alt="" />
                  ) : (
                    <span className="chat-avatar profile-auto-avatar" style={{ backgroundImage: userAvatarGradient() }}>
                      {userInitials()}
                    </span>
                  )}
                  <span className="profile-avatar-overlay" aria-hidden="true">
                    <PencilIcon />
                  </span>
                </label>
                {userAvatarRef ? (
                  <button
                    type="button"
                    className="auth-avatar-clear"
                    onMouseEnter={() => setIsAvatarClearHover(true)}
                    onMouseLeave={() => setIsAvatarClearHover(false)}
                    onClick={onResetAvatar}
                    aria-label={locale === "ru" ? "Удалить фото" : "Remove photo"}
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <span className="profile-pill">@{authUser.username}</span>
            </div>
            <div className="profile-edit-fields auth-form">
              <div className={`profile-inline-edit ${activeProfileEdit && activeProfileEdit !== "name" ? "profile-inline-edit--locked" : ""}`}>
                <div className="profile-inline-edit__toolbar">
                  {activeProfileEdit !== "name" ? (
                    <button type="button" className="icon-button profile-pencil profile-pencil--hover profile-pencil--plain" onClick={() => startProfileEdit("name")} disabled={Boolean(activeProfileEdit)}>
                      <PencilIcon />
                    </button>
                  ) : (
                    <div className="profile-icon-actions">
                      <button type="button" className="profile-icon-btn profile-icon-btn--save" onClick={() => void saveProfileEdit()} aria-label={locale === "ru" ? "Сохранить" : "Save"}>
                        ✓
                      </button>
                      <button type="button" className="profile-icon-btn profile-icon-btn--cancel" onClick={cancelProfileEdit} aria-label={locale === "ru" ? "Отмена" : "Cancel"}>
                        ×
                      </button>
                    </div>
                  )}
                </div>
                <div className={`input-group ${profileNameTrim ? "touched" : ""} ${activeProfileEdit === "name" && profileNameError ? "input-group--invalid" : ""}`}>
                  <div className="input-group__head">
                    <span className={`input-group__caption ${activeProfileEdit === "name" && profileNameError ? "input-group__caption--invalid" : ""}`}>
                      <label>{fieldCaptionLine(locale === "ru" ? "Имя" : "Name", activeProfileEdit === "name" ? profileNameError : "")}</label>
                    </span>
                  </div>
                  <input
                    className="form-control"
                    value={activeProfileEdit === "name" ? profileName : authUser.displayName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder=" "
                    readOnly={activeProfileEdit !== "name"}
                  />
                </div>
              </div>

              <div className={`profile-inline-edit ${activeProfileEdit && activeProfileEdit !== "username" ? "profile-inline-edit--locked" : ""}`}>
                <div className="profile-inline-edit__toolbar">
                  {activeProfileEdit !== "username" ? (
                    <button type="button" className="icon-button profile-pencil profile-pencil--hover profile-pencil--plain" onClick={() => startProfileEdit("username")} disabled={Boolean(activeProfileEdit)}>
                      <PencilIcon />
                    </button>
                  ) : (
                    <div className="profile-icon-actions">
                      <button type="button" className="profile-icon-btn profile-icon-btn--save" onClick={() => void saveProfileEdit()} aria-label={locale === "ru" ? "Сохранить" : "Save"}>
                        ✓
                      </button>
                      <button type="button" className="profile-icon-btn profile-icon-btn--cancel" onClick={cancelProfileEdit} aria-label={locale === "ru" ? "Отмена" : "Cancel"}>
                        ×
                      </button>
                    </div>
                  )}
                </div>
                <div className={`input-group ${profileUsernameTrim ? "touched" : ""} ${activeProfileEdit === "username" && profileUsernameError ? "input-group--invalid" : ""}`}>
                  <div className="input-group__head">
                    <span className={`input-group__caption ${activeProfileEdit === "username" && profileUsernameError ? "input-group__caption--invalid" : ""}`}>
                      <label>{fieldCaptionLine(locale === "ru" ? "Логин" : "Username", activeProfileEdit === "username" ? profileUsernameError : "")}</label>
                    </span>
                  </div>
                  <input
                    className="form-control"
                    value={activeProfileEdit === "username" ? profileUsername : authUser.username}
                    onChange={(event) => setProfileUsername(event.target.value)}
                    placeholder=" "
                    readOnly={activeProfileEdit !== "username"}
                  />
                </div>
              </div>

              <div className={`profile-inline-edit ${activeProfileEdit && activeProfileEdit !== "password" ? "profile-inline-edit--locked" : ""}`}>
                <div className="profile-inline-edit__toolbar profile-inline-edit__toolbar--password">
                  {activeProfileEdit === "password" ? <span className="profile-password-title">{locale === "ru" ? "Смена пароля" : "Password change"}</span> : null}
                  {activeProfileEdit !== "password" ? (
                    <button type="button" className="ghost-button profile-change-password" onClick={() => startProfileEdit("password")} disabled={Boolean(activeProfileEdit && activeProfileEdit !== "password")}>
                      {locale === "ru" ? "Сменить пароль" : "Change password"}
                    </button>
                  ) : null}
                </div>
                {activeProfileEdit === "password" ? (
                  <>
                    <div className="profile-password-stack">
                      <div className={`input-group ${profileOldPasswordTrim ? "touched" : ""} ${profileOldPasswordError ? "input-group--invalid" : ""}`}>
                        <div className="input-group__head">
                          <span className={`input-group__caption ${profileOldPasswordError ? "input-group__caption--invalid" : ""}`}>
                            <label>{fieldCaptionLine(locale === "ru" ? "Старый пароль" : "Current password", profileOldPasswordError)}</label>
                          </span>
                        </div>
                        <input className="form-control" type="password" value={profileOldPassword} onChange={(event) => setProfileOldPassword(event.target.value)} placeholder=" " />
                      </div>
                      <div className={`input-group ${profileNewPasswordTrim ? "touched" : ""} ${profileNewPasswordError ? "input-group--invalid" : ""}`}>
                        <div className="input-group__head">
                          <span className={`input-group__caption ${profileNewPasswordError ? "input-group__caption--invalid" : ""}`}>
                            <label>{fieldCaptionLine(locale === "ru" ? "Новый пароль" : "New password", profileNewPasswordError)}</label>
                          </span>
                        </div>
                        <input className="form-control" type="password" value={profileNewPassword} onChange={(event) => setProfileNewPassword(event.target.value)} placeholder=" " />
                      </div>
                      <div className={`input-group ${profileConfirmPasswordTrim ? "touched" : ""} ${profileConfirmPasswordError ? "input-group--invalid" : ""}`}>
                        <div className="input-group__head">
                          <span className={`input-group__caption ${profileConfirmPasswordError ? "input-group__caption--invalid" : ""}`}>
                            <label>{fieldCaptionLine(locale === "ru" ? "Повтор пароля" : "Repeat password", profileConfirmPasswordError)}</label>
                          </span>
                        </div>
                        <input className="form-control" type="password" value={profileConfirmPassword} onChange={(event) => setProfileConfirmPassword(event.target.value)} placeholder=" " />
                      </div>
                    </div>
                    <div className="profile-password-actions">
                      <button type="button" className="profile-icon-btn profile-icon-btn--save" onClick={() => void saveProfileEdit()} aria-label={locale === "ru" ? "Сохранить" : "Save"}>
                        ✓
                      </button>
                      <button type="button" className="profile-icon-btn profile-icon-btn--cancel" onClick={cancelProfileEdit} aria-label={locale === "ru" ? "Отмена" : "Cancel"}>
                        ×
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
              {profileSubmitError ? <p className="auth-error profile-password-error">{profileSubmitError}</p> : null}
            </div>
          </div>
        </aside>
      ) : null}
      {activeDrawer === "chat" ? (
        <aside className="profile-drawer chat-info-drawer" onMouseDown={() => setTopDrawer("chat")}>
          <header className="chat-info-drawer__header">
            <button type="button" className="icon-button drawer-close-btn" onClick={() => setIsChatInfoOpen(false)} aria-label="Close">
              ×
            </button>
            <h3>{locale === "ru" ? "Данные чата" : "Chat details"}</h3>
            <button
              type="button"
              className="icon-button chat-info-drawer__edit-btn"
              onClick={() => {
                setIsChatInfoEditMode(true);
              }}
              aria-label={locale === "ru" ? "Редактировать" : "Edit"}
            >
              <PencilIcon />
            </button>
          </header>
          <div className="chat-info-main">
            <div className="chat-info-main__hero">
              {activeChatInfoAvatar || chatInfoDraftAvatar ? (
                <img src={chatInfoDraftAvatar ?? activeChatInfoAvatar ?? ""} alt="" className="chat-info-main__avatar" />
              ) : (
                <span className="chat-avatar chat-info-main__avatar" style={{ backgroundImage: activeChat ? chatGradient(activeChat.id) : undefined }}>
                  {activeChat ? getChatInitials(activeChat.name) : "C"}
                </span>
              )}
              {isChatInfoEditMode ? (
                <label className="avatar-upload chat-info-main__upload">
                  {locale === "ru" ? "Обновить фото" : "Update photo"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") setChatInfoDraftAvatar(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              ) : null}
              {isChatInfoEditMode ? (
                <input
                  className="chat-info-main__title-input"
                  value={canEditChatMeta ? chatInfoDraftName : activeChat?.name ?? ""}
                  onChange={(event) => setChatInfoDraftName(event.target.value)}
                  placeholder={locale === "ru" ? "Название" : "Title"}
                  disabled={!canEditChatMeta}
                />
              ) : (
                <h4>{activeChatAlias || activeChat?.name}</h4>
              )}
              <p>{activeChat?.kind === "group" ? `${groupMembersCount(activeChat)} ${locale === "ru" ? "участников" : "members"}` : (locale === "ru" ? "Личный чат" : "Direct chat")}</p>
            </div>
            <section className="chat-info-main__card">
              <h5><BellIcon />{locale === "ru" ? "Уведомления" : "Notifications"}</h5>
              <p>{locale === "ru" ? "Включены для этого чата." : "Enabled for this chat."}</p>
            </section>
            <section className="chat-info-main__card">
              <h5><LinkIcon />{locale === "ru" ? "Внутренняя ссылка" : "Internal link"}</h5>
              <p><strong>@</strong>{chatPublicHandle(activeChat)}</p>
              <small>{chatInternalUrl(activeChat)}</small>
            </section>
            {activeChat?.kind === "group" ? (
              <section className="chat-info-main__card">
                <h5><UsersIcon />{locale === "ru" ? "Участники" : "Members"}</h5>
                <p>{locale === "ru" ? `Админов: ${groupAdminsCount(activeChat)} · Пользователей: ${groupMembersCount(activeChat)} · Удалено: ${groupRemovedCount(activeChat)}` : `Admins: ${groupAdminsCount(activeChat)} · Users: ${groupMembersCount(activeChat)} · Removed: ${groupRemovedCount(activeChat)}`}</p>
              </section>
            ) : null}
            {isChatInfoEditMode && canEditChatMeta ? (
              <section className="chat-info-main__card">
                <h5><InfoIcon />{locale === "ru" ? "Описание группы" : "Group description"}</h5>
                <textarea className="chat-info-main__textarea" value={chatInfoDraftDescription} onChange={(event) => setChatInfoDraftDescription(event.target.value)} />
              </section>
            ) : activeChatDescription ? (
              <section className="chat-info-main__card">
                <h5><InfoIcon />{locale === "ru" ? "Описание группы" : "Group description"}</h5>
                <p>{activeChatDescription}</p>
              </section>
            ) : null}
            {isChatInfoEditMode && canEditAlias ? (
              <section className="chat-info-main__card">
                <h5><PencilIcon />{locale === "ru" ? "Отображаемое имя" : "Display name"}</h5>
                <input className="chat-info-main__title-input" value={chatInfoDraftAlias} onChange={(event) => setChatInfoDraftAlias(event.target.value)} placeholder={locale === "ru" ? "Имя и фамилия" : "Name and surname"} />
              </section>
            ) : null}
            {canDeleteContact ? (
              <button type="button" className="ghost-button chat-info-main__danger">
                {locale === "ru" ? "Удалить контакт" : "Delete contact"}
              </button>
            ) : null}
          </div>
          <div className="chat-info-sections">
            <div className="chat-info-sections__tabs" role="tablist" aria-label={locale === "ru" ? "Разделы чата" : "Chat sections"}>
              <button
                type="button"
                role="tab"
                aria-selected={activeChatInfoSection === "media"}
                className={`chat-info-sections__tab ${activeChatInfoSection === "media" ? "chat-info-sections__tab--active" : ""}`}
                onClick={() => setActiveChatInfoSection("media")}
              >
                <ImageIcon />
                {locale === "ru" ? "Медиа" : "Media"}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeChatInfoSection === "files"}
                className={`chat-info-sections__tab ${activeChatInfoSection === "files" ? "chat-info-sections__tab--active" : ""}`}
                onClick={() => setActiveChatInfoSection("files")}
              >
                <FileIcon />
                {locale === "ru" ? "Файлы" : "Files"}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeChatInfoSection === "groups"}
                className={`chat-info-sections__tab ${activeChatInfoSection === "groups" ? "chat-info-sections__tab--active" : ""}`}
                onClick={() => setActiveChatInfoSection("groups")}
              >
                <UsersIcon />
                {locale === "ru" ? "Группы" : "Groups"}
              </button>
            </div>
            <section className="chat-info-sections__panel" role="tabpanel">
              {activeChatInfoSection === "media" ? (
                <>
                  <h4><ImageIcon />{locale === "ru" ? "Медиа" : "Media"}</h4>
                  <div className="chat-info-media-grid">
                    {chatMediaItems.length ? chatMediaItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="chat-info-media-grid__item"
                        onClick={() => {
                          setMediaPreviewUrl(item.preview ?? null);
                          setMediaPreviewType(item.previewType === "video" ? "video" : "image");
                        }}
                      >
                        {item.previewType === "video" ? <video src={item.preview} muted /> : <img src={item.preview} alt="" />}
                      </button>
                    )) : <p>{locale === "ru" ? "Пока нет медиа." : "No media yet."}</p>}
                  </div>
                </>
              ) : null}
              {activeChatInfoSection === "files" ? (
                <>
                  <h4><FileIcon />{locale === "ru" ? "Файлы" : "Files"}</h4>
                  <p>{chatFileItems.length ? `${chatFileItems.length} ${locale === "ru" ? "файлов/аудио" : "files/audio"}` : (locale === "ru" ? "Пока нет файлов." : "No files yet.")}</p>
                </>
              ) : null}
              {activeChatInfoSection === "groups" ? (
                <>
                  <h4><UsersIcon />{locale === "ru" ? "Группы" : "Groups"}</h4>
                  <p>{locale === "ru" ? "Связанные общие группы будут отображены здесь." : "Related shared groups will appear here."}</p>
                </>
              ) : null}
            </section>
          </div>
          {isChatInfoEditMode ? (
            <div className="chat-info-save-wrap">
              <button type="button" className="chat-list__new-chat-btn chat-info-save-btn" onClick={saveChatInfoChanges} aria-label={locale === "ru" ? "Сохранить" : "Save"} title={locale === "ru" ? "Сохранить" : "Save"}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9.55 17.2 4.8 12.45l1.4-1.4 3.35 3.35 8.25-8.25 1.4 1.4z" />
                </svg>
              </button>
            </div>
          ) : null}
        </aside>
      ) : null}
      {mediaPreviewUrl ? (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={locale === "ru" ? "Просмотр медиа" : "Media preview"}
          onClick={() => {
            setMediaPreviewUrl(null);
            setMediaPreviewType(null);
          }}
        >
          <div className="chat-media-lightbox" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="icon-button chat-media-lightbox__close"
              onClick={() => {
                setMediaPreviewUrl(null);
                setMediaPreviewType(null);
              }}
              aria-label="Close"
            >
              ×
            </button>
            {mediaPreviewType === "video" ? <video src={mediaPreviewUrl} controls autoPlay /> : <img src={mediaPreviewUrl} alt="" />}
          </div>
        </div>
      ) : null}
      {isArchiveSettingsOpen ? (
        <aside className={`profile-drawer chat-info-drawer ${topDrawer === "chat" ? "profile-drawer--top" : ""}`} onMouseDown={() => setTopDrawer("chat")}>
          <header className="chat-info-drawer__header">
            <button type="button" className="icon-button drawer-close-btn" onClick={() => setIsArchiveSettingsOpen(false)} aria-label="Close">
              ×
            </button>
            <h3>{locale === "ru" ? "Настройки архива" : "Archive settings"}</h3>
            <span />
          </header>
          <div className="chat-info-main">
            <section className="chat-info-main__card">
              <h5><ArchiveIcon />{locale === "ru" ? "Показывать архив в списке чатов" : "Show archive in chat list"}</h5>
              <p>{locale === "ru" ? "Карточка «Архив» отображается в основном списке чатов." : "Archive entry is shown in the main chat list."}</p>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setIsArchiveHiddenFromMain((prev) => !prev)}
              >
                {isArchiveHiddenFromMain ? (locale === "ru" ? "Показывать архив" : "Show archive") : (locale === "ru" ? "Скрыть архив" : "Hide archive")}
              </button>
            </section>
            <section className="chat-info-main__card">
              <h5><BellIcon />{locale === "ru" ? "Отключать уведомления по умолчанию" : "Mute by default"}</h5>
              <p>{locale === "ru" ? "Для новых архивных чатов уведомления сразу выключены." : "New archived chats start with notifications muted."}</p>
              <button type="button" className="ghost-button" onClick={() => setArchiveMuteByDefault((prev) => !prev)}>
                {archiveMuteByDefault ? (locale === "ru" ? "Включено" : "Enabled") : (locale === "ru" ? "Выключено" : "Disabled")}
              </button>
            </section>
            <section className="chat-info-main__card">
              <h5><CheckDoubleIcon />{locale === "ru" ? "Счётчик непрочитанных в архиве" : "Keep unread counter"}</h5>
              <p>{locale === "ru" ? "Показывать общее число непрочитанных рядом с архивом." : "Show total unread count near archive entry."}</p>
              <button type="button" className="ghost-button" onClick={() => setArchiveKeepUnreadCounter((prev) => !prev)}>
                {archiveKeepUnreadCounter ? (locale === "ru" ? "Показывать" : "Show") : (locale === "ru" ? "Скрывать" : "Hide")}
              </button>
            </section>
            <section className="chat-info-main__card">
              <h5><SettingsIcon />{locale === "ru" ? "Автоархив muted-чатов" : "Auto-archive muted chats"}</h5>
              <p>{locale === "ru" ? "Автоматически переносить приглушённые чаты в архив." : "Automatically move muted chats to archive."}</p>
              <button type="button" className="ghost-button" onClick={() => setArchiveAutoArchiveMuted((prev) => !prev)}>
                {archiveAutoArchiveMuted ? (locale === "ru" ? "Включено" : "Enabled") : (locale === "ru" ? "Выключено" : "Disabled")}
              </button>
            </section>
          </div>
        </aside>
      ) : null}
      {isLogoutConfirmOpen ? (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label={locale === "ru" ? "Подтверждение выхода" : "Logout confirmation"}>
          <div className="confirm-popup">
            <h4>{locale === "ru" ? "Выйти из аккаунта?" : "Log out from account?"}</h4>
            <p>{locale === "ru" ? "Вы уверены, что хотите завершить текущий сеанс?" : "Are you sure you want to end the current session?"}</p>
            <div className="confirm-popup__actions">
              <button type="button" className="ghost-button" onClick={() => setIsLogoutConfirmOpen(false)}>
                {locale === "ru" ? "Отмена" : "Cancel"}
              </button>
              <button
                type="button"
                className="primary-button confirm-danger"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  onLogout();
                }}
              >
                {locale === "ru" ? "Выйти" : "Log out"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
