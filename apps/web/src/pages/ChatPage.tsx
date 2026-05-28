import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type RefObject
} from "react";
import EmojiPicker, { type EmojiClickData } from "emoji-picker-react";
import { buildAvatarGradient, buildUserInitials } from "../lib/avatar";
import { copy, localeOptions, Locale } from "../i18n";
import { chatMatchesSearch } from "../search-utils";
import { SidebarDiscovery } from "../components/SidebarDiscovery";
import { AuthUser, ChatItem, Message, PendingAttachment, StickerItem, StickerPack, TransparencyBanner } from "../types";
import { localizeStickerPacks } from "../lib/sticker-i18n";
import { emojiPickerCategories, emojiPickerData, emojiPickerLabels } from "../lib/emoji-picker-locale";
import { EMOTION_GIF_PRESETS, EMOTION_VIDEO_PRESETS } from "../lib/emotion-media";
import {
  AppChatIcon,
  ArchiveIcon,
  BellIcon,
  CalendarIcon,
  ChecklistIcon,
  CheckDoubleIcon,
  CheckSingleIcon,
  DotsVerticalIcon,
  EmojiSmileIcon,
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
  SavedMessagesIcon,
  SettingsIcon,
  StickerIcon,
  StarIcon,
  TrashIcon,
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
const GIF_PRESETS = EMOTION_GIF_PRESETS;
const VIDEO_PRESETS = EMOTION_VIDEO_PRESETS;
const FALLBACK_STICKER_ITEMS: StickerItem[] = [
  { id: "fallback-happy", packId: "fallback-pack", code: "happy", label: "Happy", render: "large", assetUrl: "/stickers/happy.svg", animated: false, tags: ["happy"], sortOrder: 10 },
  { id: "fallback-love", packId: "fallback-pack", code: "love", label: "Love", render: "large", assetUrl: "/stickers/love.svg", animated: false, tags: ["love"], sortOrder: 20 },
  { id: "fallback-wow", packId: "fallback-pack", code: "wow", label: "Wow", render: "large", assetUrl: "/stickers/wow.svg", animated: false, tags: ["wow"], sortOrder: 30 },
  { id: "fallback-party", packId: "fallback-pack", code: "party", label: "Party", render: "large", assetUrl: "/stickers/party.svg", animated: false, tags: ["party"], sortOrder: 40 },
  { id: "fallback-sleepy", packId: "fallback-pack", code: "sleepy", label: "Sleepy", render: "large", assetUrl: "/stickers/sleepy.svg", animated: false, tags: ["sleep"], sortOrder: 50 },
  { id: "fallback-angry", packId: "fallback-pack", code: "angry", label: "Angry", render: "large", assetUrl: "/stickers/angry.svg", animated: false, tags: ["angry"], sortOrder: 60 }
];
const FALLBACK_STICKER_PACK: StickerPack = {
  id: "fallback-pack",
  slug: "fallback-pack",
  title: "Mood",
  description: "Local fallback pack",
  visibility: "public",
  isSystem: true,
  createdById: null,
  stickers: FALLBACK_STICKER_ITEMS
};

function normalizeLocalMediaUrl(url: string): string {
  if (url.startsWith("/media/emotions/")) {
    return url.replace("/media/emotions/", "/emotion-assets/");
  }
  if (url.startsWith("/media/import/")) {
    return url.replace("/media/import/", "/emotion-import/");
  }
  return url;
}

function isVideoAssetUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

type StickerManagerRowActionsProps = {
  menuId: string;
  locale: Locale;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  menuRef: RefObject<HTMLDivElement | null>;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
};

function StickerManagerRowActions({
  menuId,
  locale,
  openMenuId,
  setOpenMenuId,
  menuRef,
  deleteLabel,
  onEdit,
  onDelete
}: StickerManagerRowActionsProps) {
  const isOpen = openMenuId === menuId;
  const editLabel = locale === "ru" ? "Изменить" : "Edit";
  const actionsLabel = locale === "ru" ? "Действия" : "Actions";

  return (
    <div className="sticker-manager__actions" ref={isOpen ? menuRef : undefined}>
      <div className="sticker-manager__actions-desktop">
        <button type="button" className="icon-button icon-button--ghost" onClick={onEdit} aria-label={editLabel} title={editLabel}>
          <PencilIcon />
        </button>
        <button
          type="button"
          className="icon-button icon-button--ghost sticker-manager__action-danger"
          onClick={onDelete}
          aria-label={deleteLabel}
          title={deleteLabel}
        >
          <TrashIcon />
        </button>
      </div>
      <div className="sticker-manager__actions-mobile chat-panel__menu-wrap">
        <button
          type="button"
          className={`icon-button icon-button--ghost ${isOpen ? "icon-button--active" : ""}`}
          onClick={() => setOpenMenuId(isOpen ? null : menuId)}
          aria-label={actionsLabel}
          aria-expanded={isOpen}
          title={actionsLabel}
        >
          <DotsVerticalIcon />
        </button>
        {isOpen ? (
          <div className="chat-panel__menu sticker-manager__row-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpenMenuId(null);
                onEdit();
              }}
            >
              <PencilIcon />
              <span>{editLabel}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="chat-panel__menu-danger"
              onClick={() => {
                setOpenMenuId(null);
                onDelete();
              }}
            >
              <TrashIcon />
              <span>{deleteLabel}</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

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
  stickerPacks: StickerPack[];
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
  onSendSticker: (sticker: StickerItem) => void;
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
  onCreateStickerPack: (payload: { title: string; slug?: string; description?: string; visibility?: "public" | "private" | "corporate" }) => void | Promise<void>;
  onCreateSticker: (
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
  ) => void | Promise<void>;
  onUpdateStickerPack: (
    packId: string,
    payload: { title?: string; description?: string; visibility?: "public" | "private" | "corporate" }
  ) => void | Promise<void>;
  onDeleteStickerPack: (packId: string) => void | Promise<void>;
  onUpdateSticker: (
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
  ) => void | Promise<void>;
  onDeleteSticker: (stickerId: string) => void | Promise<void>;
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
    stickerPacks,
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
    onSendSticker,
    onEditMessage,
    onDeleteMessage,
    onToggleReaction,
    onLogout,
    onThemeToggle,
    onLocaleSelect,
    onUpdateProfile,
    onUploadAvatar,
    onResetAvatar,
    onUpdateChat,
    onCreateStickerPack,
    onCreateSticker,
    onUpdateStickerPack,
    onDeleteStickerPack,
    onUpdateSticker,
    onDeleteSticker
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
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [isMessageSelectMode, setIsMessageSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [pickerTab, setPickerTab] = useState<"emoji" | "stickers" | "gifs" | "videos">("emoji");
  const [pickerSearch, setPickerSearch] = useState("");
  const [newPackTitle, setNewPackTitle] = useState("");
  const [newPackSlug, setNewPackSlug] = useState("");
  const [newStickerPackId, setNewStickerPackId] = useState("");
  const [newStickerCode, setNewStickerCode] = useState("");
  const [newStickerLabel, setNewStickerLabel] = useState("");
  const [newStickerRender, setNewStickerRender] = useState<"large" | "inline">("large");
  const [newStickerAssetUrl, setNewStickerAssetUrl] = useState("");
  const [newStickerAnimated, setNewStickerAnimated] = useState(false);
  const [emojiPickerStickerPackId, setEmojiPickerStickerPackId] = useState("");
  const [newStickerTags, setNewStickerTags] = useState("");
  const [stickerToast, setStickerToast] = useState("");
  const [isStickerManagerOpen, setIsStickerManagerOpen] = useState(false);
  const [stickerManagerTab, setStickerManagerTab] = useState<"packs" | "stickers">("packs");
  const [stickerOnlyMine, setStickerOnlyMine] = useState(true);
  const [editingPackId, setEditingPackId] = useState("");
  const [editingPackTitle, setEditingPackTitle] = useState("");
  const [editingStickerId, setEditingStickerId] = useState("");
  const [editingStickerLabel, setEditingStickerLabel] = useState("");
  const [stickerManagerRowMenuId, setStickerManagerRowMenuId] = useState<string | null>(null);
  const stickerManagerMenuRef = useRef<HTMLDivElement | null>(null);
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
    if (!isStickerManagerOpen) setStickerManagerRowMenuId(null);
  }, [isStickerManagerOpen]);
  useEffect(() => {
    if (!stickerManagerRowMenuId) return;
    const onDocClick = (event: MouseEvent) => {
      if (!stickerManagerMenuRef.current) return;
      if (!stickerManagerMenuRef.current.contains(event.target as Node)) setStickerManagerRowMenuId(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [stickerManagerRowMenuId]);
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
  const localizedChats = useMemo(
    () =>
      chats.map((chat) => {
        const localizedName = localizedSystemChatName(chat);
        if (localizedName === chat.name) return chat;
        return { ...chat, name: localizedName };
      }),
    [chats, locale]
  );
  useEffect(() => {
    const selectedChat = localizedChats.find((chat) => chat.id === activeChatId) ?? null;
    if (!isChatInfoOpen || !selectedChat) return;
    setIsChatInfoEditMode(false);
    setActiveChatInfoSection("media");
    setChatInfoDraftName(selectedChat.name);
    setChatInfoDraftDescription(chatDescriptions[selectedChat.id] ?? "");
    setChatInfoDraftAlias(chatDisplayAliases[selectedChat.id] ?? "");
    setChatInfoDraftAvatar(chatInfoAvatars[selectedChat.id] ?? null);
  }, [isChatInfoOpen, localizedChats, activeChatId, chatDescriptions, chatDisplayAliases, chatInfoAvatars]);
  const effectiveChats = useMemo(
    () =>
      localizedChats.map((chat) => ({
        ...chat,
        isPinned: Boolean(pinnedChats[chat.id]),
        isMuted: Boolean(mutedChats[chat.id])
      })),
    [localizedChats, pinnedChats, mutedChats]
  );
  const localizedStickerPacks = useMemo(() => localizeStickerPacks(stickerPacks, locale), [stickerPacks, locale]);
  const stickerMessagePacks = useMemo(
    () =>
      localizedStickerPacks
        .map((pack) => ({
          ...pack,
          stickers: pack.stickers
            .filter((item) => item.render === "large" && item.assetUrl)
            .map((item) => ({
              ...item,
              assetUrl: item.assetUrl ? normalizeLocalMediaUrl(item.assetUrl) : item.assetUrl
            }))
        }))
        .filter((pack) => pack.stickers.length > 0),
    [localizedStickerPacks]
  );
  const stickerMessagePacksWithFallback = useMemo(
    () => (stickerMessagePacks.length > 0 ? stickerMessagePacks : [FALLBACK_STICKER_PACK]),
    [stickerMessagePacks]
  );
  const activeStickerPickerPack = useMemo(() => {
    if (!stickerMessagePacksWithFallback.length) return null;
    return (
      stickerMessagePacksWithFallback.find((pack) => pack.id === emojiPickerStickerPackId) ?? stickerMessagePacksWithFallback[0]
    );
  }, [emojiPickerStickerPackId, stickerMessagePacksWithFallback]);
  const visiblePickerStickers = useMemo(() => {
    const source = activeStickerPickerPack?.stickers ?? [];
    const query = pickerSearch.trim().toLowerCase();
    if (!query) return source;
    return source.filter((item) => item.label.toLowerCase().includes(query) || item.code.toLowerCase().includes(query));
  }, [activeStickerPickerPack, pickerSearch]);
  const visibleGifs = useMemo(() => {
    const query = pickerSearch.trim().toLowerCase();
    if (!query) return GIF_PRESETS;
    return GIF_PRESETS.filter((item) => item.labelEn.toLowerCase().includes(query) || item.labelRu.toLowerCase().includes(query));
  }, [pickerSearch]);
  const visibleVideos = useMemo(() => {
    const query = pickerSearch.trim().toLowerCase();
    if (!query) return VIDEO_PRESETS;
    return VIDEO_PRESETS.filter((item) => item.labelEn.toLowerCase().includes(query) || item.labelRu.toLowerCase().includes(query));
  }, [pickerSearch]);
  const managedStickerPacks = useMemo(
    () => (stickerOnlyMine ? localizedStickerPacks.filter((pack) => !pack.isSystem) : localizedStickerPacks),
    [stickerOnlyMine, localizedStickerPacks]
  );
  const emojiPickerConfig = useMemo(() => emojiPickerLabels(locale), [locale]);
  const emojiPickerCategoryConfig = useMemo(() => emojiPickerCategories(locale), [locale]);
  const emojiPickerLocaleData = useMemo(() => emojiPickerData(locale), [locale]);
  useEffect(() => {
    if (!activeStickerPickerPack) return;
    setEmojiPickerStickerPackId((prev) => prev || activeStickerPickerPack.id);
  }, [activeStickerPickerPack]);
  useEffect(() => {
    if (!isEmojiOpen) {
      setPickerTab("emoji");
      setPickerSearch("");
    }
  }, [isEmojiOpen]);
  useEffect(() => {
    if (!isEmojiOpen || pickerTab !== "emoji") return;
    const root = emojiRef.current;
    if (!root) return;
    const input = root.querySelector('input[aria-controls="epr-search-id"]') as HTMLInputElement | null;
    if (!input) return;
    if (input.value === pickerSearch) return;
    input.value = pickerSearch;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, [isEmojiOpen, pickerTab, pickerSearch]);
  useEffect(() => {
    if (!stickerToast) return;
    const timer = window.setTimeout(() => setStickerToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [stickerToast]);
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
  const activeChat = localizedChats.find((chat) => chat.id === activeChatId) ?? null;
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
  function sendStickerMessage(sticker: StickerItem) {
    if (!sticker.assetUrl) return;
    setIsEmojiOpen(false);
    onSendSticker(sticker);
  }
  function sendGifPreset(url: string, label: string) {
    sendStickerMessage({
      id: `gif-${label.toLowerCase().replace(/\s+/g, "-")}`,
      packId: "emotion-gifs",
      code: label.toLowerCase().replace(/\s+/g, "-"),
      label,
      render: "large",
      assetUrl: normalizeLocalMediaUrl(url),
      animated: true,
      tags: ["gif", "emotion"],
      sortOrder: 0
    });
  }
  function sendVideoPreset(url: string, label: string) {
    sendStickerMessage({
      id: `video-${label.toLowerCase().replace(/\s+/g, "-")}`,
      packId: "emotion-videos",
      code: label.toLowerCase().replace(/\s+/g, "-"),
      label,
      render: "large",
      assetUrl: normalizeLocalMediaUrl(url),
      animated: true,
      tags: ["video", "emotion"],
      sortOrder: 0
    });
  }
  function switchPickerTabByWheel(deltaY: number) {
    const order: Array<"emoji" | "stickers" | "gifs" | "videos"> = ["emoji", "stickers", "gifs", "videos"];
    const current = order.indexOf(pickerTab);
    if (current < 0) return;
    const next =
      deltaY > 0
        ? order[(current + 1) % order.length]
        : order[(current - 1 + order.length) % order.length];
    setPickerTab(next);
  }
  function pickPackPreviewSticker(pack: StickerPack) {
    if (!pack.stickers.length) return null;
    let hash = 0;
    for (let i = 0; i < pack.id.length; i += 1) hash = (hash * 31 + pack.id.charCodeAt(i)) >>> 0;
    return pack.stickers[hash % pack.stickers.length] ?? pack.stickers[0];
  }
  function toggleMessageSelection(messageId: string) {
    setSelectedMessageIds((prev) => (prev.includes(messageId) ? prev.filter((id) => id !== messageId) : [...prev, messageId]));
  }
  function clearMessageSelectionMode() {
    setIsMessageSelectMode(false);
    setSelectedMessageIds([]);
  }
  async function submitNewStickerPack() {
    const title = newPackTitle.trim();
    if (!title) return;
    try {
      await onCreateStickerPack({
        title,
        slug: newPackSlug.trim() || undefined
      });
      setStickerToast(locale === "ru" ? "Пак создан" : "Pack created");
      setNewPackTitle("");
      setNewPackSlug("");
    } catch {
      setStickerToast(locale === "ru" ? "Не удалось создать пак" : "Failed to create pack");
    }
  }
  async function submitNewSticker() {
    if (!newStickerPackId.trim() || !newStickerCode.trim() || !newStickerLabel.trim()) return;
    if (newStickerRender === "large" && !newStickerAssetUrl.trim()) {
      setStickerToast(locale === "ru" ? "Укажите URL изображения стикера" : "Sticker image URL is required");
      return;
    }
    try {
      await onCreateSticker(newStickerPackId.trim(), {
        code: newStickerCode.trim(),
        label: newStickerLabel.trim(),
        render: newStickerRender,
        assetUrl: newStickerRender === "large" ? newStickerAssetUrl.trim() : undefined,
        animated: newStickerAnimated,
        tags: newStickerTags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      });
      setStickerToast(locale === "ru" ? "Стикер добавлен" : "Sticker added");
      setNewStickerCode("");
      setNewStickerLabel("");
      setNewStickerAssetUrl("");
      setNewStickerAnimated(false);
      setNewStickerTags("");
    } catch {
      setStickerToast(locale === "ru" ? "Не удалось добавить стикер" : "Failed to add sticker");
    }
  }
  async function submitPackRename() {
    if (!editingPackId || !editingPackTitle.trim()) return;
    try {
      await onUpdateStickerPack(editingPackId, { title: editingPackTitle.trim() });
      setStickerToast(locale === "ru" ? "Пак обновлён" : "Pack updated");
      setEditingPackId("");
      setEditingPackTitle("");
    } catch {
      setStickerToast(locale === "ru" ? "Не удалось обновить пак" : "Failed to update pack");
    }
  }
  async function removePack(packId: string) {
    const confirmed = window.confirm(locale === "ru" ? "Удалить этот пак?" : "Delete this pack?");
    if (!confirmed) return;
    try {
      await onDeleteStickerPack(packId);
      setStickerToast(locale === "ru" ? "Пак удалён" : "Pack removed");
      if (newStickerPackId === packId) setNewStickerPackId("");
    } catch {
      setStickerToast(locale === "ru" ? "Не удалось удалить пак" : "Failed to remove pack");
    }
  }
  async function submitStickerRename() {
    if (!editingStickerId || !editingStickerLabel.trim()) return;
    try {
      await onUpdateSticker(editingStickerId, { label: editingStickerLabel.trim() });
      setStickerToast(locale === "ru" ? "Стикер обновлён" : "Sticker updated");
      setEditingStickerId("");
      setEditingStickerLabel("");
    } catch {
      setStickerToast(locale === "ru" ? "Не удалось обновить стикер" : "Failed to update sticker");
    }
  }
  async function removeSticker(stickerId: string) {
    const confirmed = window.confirm(locale === "ru" ? "Удалить этот стикер?" : "Delete this sticker?");
    if (!confirmed) return;
    try {
      await onDeleteSticker(stickerId);
      setStickerToast(locale === "ru" ? "Стикер удалён" : "Sticker removed");
    } catch {
      setStickerToast(locale === "ru" ? "Не удалось удалить стикер" : "Failed to remove sticker");
    }
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
  function chatNameToken(name: string) {
    return name.trim().toLowerCase().replace(/\s+/g, "");
  }
  function isAppSystemChat(chat: ChatItem) {
    const token = chatNameToken(chat.name);
    return chat.peerUsername === "message2_bot" || token === "послание2" || token === "message2" || token === "message2bot";
  }
  function isSavedSystemChat(chat: ChatItem) {
    const token = chatNameToken(chat.name);
    return token.startsWith("сохран") || token.startsWith("saved");
  }
  function localizedSystemChatName(chat: ChatItem) {
    if (isAppSystemChat(chat)) return locale === "ru" ? "Послание2" : "Message2";
    if (isSavedSystemChat(chat)) return locale === "ru" ? "Сохранённое" : "Saved";
    return chat.name;
  }
  function renderChatAvatar(chat: ChatItem, className = "") {
    const avatarClass = `chat-avatar${className ? ` ${className}` : ""}`;
    if (chat.group === "favorite") {
      return (
        <span className={`${avatarClass} chat-avatar--favorite`}>
          <StarIcon />
        </span>
      );
    }
    if (chat.group === "archived") {
      return (
        <span className={`${avatarClass} chat-avatar--archived`}>
          <ArchiveIcon />
        </span>
      );
    }
    if (isAppSystemChat(chat)) {
      return (
        <span className={`${avatarClass} chat-avatar--app`}>
          <AppChatIcon />
        </span>
      );
    }
    if (isSavedSystemChat(chat)) {
      return (
        <span className={`${avatarClass} chat-avatar--saved`}>
          <SavedMessagesIcon />
        </span>
      );
    }
    return (
      <span className={avatarClass} style={{ backgroundImage: chatGradient(chat.id) }}>
        {getChatInitials(chat.name)}
      </span>
    );
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
                {renderChatAvatar(chat)}
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
              const menuChat = localizedChats.find((chat) => chat.id === chatContextMenu.chatId) ?? null;
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
                {renderChatAvatar(activeChat)}
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
                    <button
                      type="button"
                      onClick={() => {
                        setIsChatMenuOpen(false);
                        setIsMessageSelectMode(true);
                      }}
                    >
                      <ChecklistIcon />
                      <span>{locale === "ru" ? "Выбор сообщений" : "Select messages"}</span>
                    </button>
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
        {isMessageSelectMode ? (
          <div className="message-select-toolbar" role="status">
            <span>
              {locale === "ru"
                ? `Выбрано: ${selectedMessageIds.length}`
                : `Selected: ${selectedMessageIds.length}`}
            </span>
            <button type="button" onClick={clearMessageSelectionMode}>
              {locale === "ru" ? "Отмена" : "Cancel"}
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
                const isEmojiOnly = isEmojiOnlyText(message.text) && !message.preview && !message.sticker;
                const stickerNode =
                  message.sticker && !message.isDeleted ? (
                    isVideoAssetUrl(message.sticker.assetUrl) ? (
                      <video
                        src={normalizeLocalMediaUrl(message.sticker.assetUrl)}
                        className={`message__sticker${message.sticker.animated ? " message__sticker--animated" : ""}`}
                        muted
                        autoPlay
                        loop
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={normalizeLocalMediaUrl(message.sticker.assetUrl)}
                        alt={message.sticker.label}
                        className={`message__sticker${message.sticker.animated ? " message__sticker--animated" : ""}`}
                        loading="lazy"
                      />
                    )
                  ) : null;
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
                const isMessageActive = hoveredMessageId === message.id || selectedMessageIds.includes(message.id);
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
                    <button type="button" className="message__action-btn" onClick={() => void onToggleReaction(activeChatId!, message.id, "❤️")}>
                      ❤️
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
                const quickReactionSlot = canInteract ? (
                  <div className="message__quick-reaction-slot">
                    <button
                      type="button"
                      className="message__quick-heart"
                      onClick={() => void onToggleReaction(activeChatId!, message.id, "❤️")}
                      aria-label={locale === "ru" ? "Поставить сердце" : "React with heart"}
                    >
                      ❤️
                    </button>
                    <div className="message__quick-reactions" role="toolbar" aria-label={locale === "ru" ? "Быстрые реакции" : "Quick reactions"}>
                      {["❤️", "👍", "😂", "😮", "😢", "😡"].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="message__quick-reaction-btn"
                          onClick={() => void onToggleReaction(activeChatId!, message.id, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null;
                return (
                  <div
                    key={message.id}
                    className={`message-wrap ${isMessageActive ? "message-wrap--active" : ""}`}
                    onMouseEnter={() => setHoveredMessageId(message.id)}
                    onMouseLeave={() => setHoveredMessageId((prev) => (prev === message.id ? null : prev))}
                  >
                    {dayLabel ? <div className="message-day-sep">{dayLabel}</div> : null}
                    {message.sender === "me" ? (
                      <article
                        className={`message message--me ${message.isTombstone ? "message--tombstone" : ""} ${message.isDeleted ? "message--deleted" : ""} ${message.sticker ? "message--sticker-only" : ""} ${isMessageActive ? "message--active" : ""}`}
                        onClick={() => {
                          if (isMessageSelectMode) toggleMessageSelection(message.id);
                        }}
                      >
                        {isMessageSelectMode ? (
                          <button
                            type="button"
                            className={`message__selector message__selector--me ${selectedMessageIds.includes(message.id) ? "message__selector--checked" : ""}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleMessageSelection(message.id);
                            }}
                            aria-label={locale === "ru" ? "Выбрать сообщение" : "Select message"}
                          />
                        ) : null}
                        {isFirstInSeries ? <p className="message__author">{message.author}</p> : null}
                        {replyPreview}
                        <div className="message__body-row">
                          {stickerNode ?? <p className={isEmojiOnly ? "message__emoji-only" : undefined}>{message.text}</p>}
                          {disclosureBadge}
                        </div>
                        {quickReactionSlot}
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
                        <article
                          className={`message ${message.isTombstone ? "message--tombstone" : ""} ${message.isDeleted ? "message--deleted" : ""} ${message.sticker ? "message--sticker-only" : ""} ${isMessageActive ? "message--active" : ""}`}
                          onClick={() => {
                            if (isMessageSelectMode) toggleMessageSelection(message.id);
                          }}
                        >
                          {isMessageSelectMode ? (
                            <button
                              type="button"
                              className={`message__selector ${selectedMessageIds.includes(message.id) ? "message__selector--checked" : ""}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleMessageSelection(message.id);
                              }}
                              aria-label={locale === "ru" ? "Выбрать сообщение" : "Select message"}
                            />
                          ) : null}
                          {isFirstInSeries ? <p className="message__author">{message.author}</p> : null}
                          {replyPreview}
                          <div className="message__body-row">
                            {stickerNode ?? <p className={isEmojiOnly ? "message__emoji-only" : undefined}>{message.text}</p>}
                            {disclosureBadge}
                          </div>
                          {quickReactionSlot}
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
              <button
                type="button"
                className="icon-button composer__emoji-toggle"
                onClick={() => setIsEmojiOpen((prev) => !prev)}
                aria-label={locale === "ru" ? "Эмодзи" : "Emoji"}
              >
                <EmojiSmileIcon />
              </button>
              {isEmojiOpen ? (
                <div className="composer__emoji-pop">
                  <div
                    className="composer__picker-tabs composer__picker-tabs--embedded"
                    onWheel={(event) => {
                      event.preventDefault();
                      switchPickerTabByWheel(event.deltaY);
                    }}
                  >
                    <button
                      type="button"
                      className={`composer__picker-tab ${pickerTab === "emoji" ? "composer__picker-tab--active" : ""}`}
                      onClick={() => setPickerTab("emoji")}
                      title={locale === "ru" ? "Смайлы" : "Emoji"}
                      aria-label={locale === "ru" ? "Смайлы" : "Emoji"}
                    >
                      <EmojiSmileIcon />
                    </button>
                    <button
                      type="button"
                      className={`composer__picker-tab ${pickerTab === "stickers" ? "composer__picker-tab--active" : ""}`}
                      onClick={() => setPickerTab("stickers")}
                      title={locale === "ru" ? "Стикеры" : "Stickers"}
                      aria-label={locale === "ru" ? "Стикеры" : "Stickers"}
                    >
                      <StickerIcon />
                    </button>
                    <button
                      type="button"
                      className={`composer__picker-tab ${pickerTab === "gifs" ? "composer__picker-tab--active" : ""}`}
                      onClick={() => setPickerTab("gifs")}
                      title="GIF"
                      aria-label="GIF"
                    >
                      <span className="composer__picker-gif-glyph">GIF</span>
                    </button>
                    <button
                      type="button"
                      className={`composer__picker-tab ${pickerTab === "videos" ? "composer__picker-tab--active" : ""}`}
                      onClick={() => setPickerTab("videos")}
                      title={locale === "ru" ? "Видео" : "Video"}
                      aria-label={locale === "ru" ? "Видео" : "Video"}
                    >
                      <VideoIcon />
                    </button>
                    <button
                      type="button"
                      className="composer__open-sticker-manager composer__open-sticker-manager--icon"
                      onClick={() => {
                        setIsEmojiOpen(false);
                        setIsStickerManagerOpen(true);
                      }}
                      title={locale === "ru" ? "Мои паки" : "My packs"}
                      aria-label={locale === "ru" ? "Мои паки" : "My packs"}
                    >
                      <SettingsIcon />
                    </button>
                  </div>
                  <div className="composer__picker-shared-header composer__picker-shared-header--floating">
                    <div className="composer__picker-search">
                      <SearchIcon />
                      <input
                        type="text"
                        className="composer__sticker-search"
                        value={pickerSearch}
                        onChange={(event) => setPickerSearch(event.target.value)}
                        placeholder={locale === "ru" ? "Поиск" : "Search"}
                      />
                    </div>
                  </div>
                  {pickerTab === "emoji" ? (
                    <>
                      <EmojiPicker
                        theme={theme === "dark" ? "dark" : "light"}
                        width="100%"
                        height="100%"
                        emojiData={emojiPickerLocaleData}
                        categories={emojiPickerCategoryConfig}
                        skinTonesDisabled
                        previewConfig={{ showPreview: false, defaultCaption: emojiPickerConfig.previewTitle }}
                        suggestedEmojisMode={emojiPickerConfig.suggestedEmojisMode}
                        onEmojiClick={onEmojiPick}
                        lazyLoadEmojis
                        autoFocusSearch={false}
                      />
                    </>
                  ) : pickerTab === "stickers" ? (
                    <div className="composer__sticker-panel">
                      <div className="composer__sticker-pack-tabs">
                        {stickerMessagePacksWithFallback.map((pack) => (
                          (() => {
                            const previewSticker = pickPackPreviewSticker(pack);
                            return (
                          <button
                            key={pack.id}
                            type="button"
                            className={
                              activeStickerPickerPack?.id === pack.id
                                ? "composer__sticker-pack-tab composer__sticker-pack-tab--active"
                                : "composer__sticker-pack-tab"
                            }
                            onClick={() => setEmojiPickerStickerPackId(pack.id)}
                            title={pack.title}
                          >
                            {previewSticker?.assetUrl ? (
                              <img
                                src={previewSticker.assetUrl}
                                alt={pack.title}
                                className="composer__sticker-pack-preview"
                                loading="lazy"
                              />
                            ) : (
                              pack.title
                            )}
                          </button>
                            );
                          })()
                        ))}
                      </div>
                      <div className="composer__sticker-panel-body">
                        <div className="composer__sticker-grid">
                        {visiblePickerStickers.map((sticker) => (
                          <button
                            key={sticker.id}
                            type="button"
                            className="composer__sticker-btn"
                            title={sticker.label}
                            aria-label={sticker.label}
                            onClick={() => sendStickerMessage(sticker)}
                          >
                            <img src={sticker.assetUrl} alt={sticker.label} loading="lazy" />
                          </button>
                        ))}
                        </div>
                      </div>
                    </div>
                  ) : pickerTab === "gifs" ? (
                    <div className="composer__sticker-panel">
                      <div className="composer__sticker-panel-body">
                      <div className="composer__media-grid">
                        {visibleGifs.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="composer__media-btn"
                            title={locale === "ru" ? item.labelRu : item.labelEn}
                            onClick={() => sendGifPreset(item.url, locale === "ru" ? item.labelRu : item.labelEn)}
                          >
                            <img src={item.url} alt={locale === "ru" ? item.labelRu : item.labelEn} loading="lazy" />
                            <span>{locale === "ru" ? item.labelRu : item.labelEn}</span>
                          </button>
                        ))}
                      </div>
                      </div>
                    </div>
                  ) : (
                    <div className="composer__sticker-panel">
                      <div className="composer__sticker-panel-body">
                      <div className="composer__video-list">
                        {visibleVideos.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="composer__video-btn"
                            onClick={() => sendVideoPreset(item.url, locale === "ru" ? item.labelRu : item.labelEn)}
                          >
                            <video src={item.url} className="composer__video-preview" muted autoPlay loop playsInline preload="metadata" />
                            <strong>{locale === "ru" ? item.labelRu : item.labelEn}</strong>
                          </button>
                        ))}
                      </div>
                      </div>
                    </div>
                  )}
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
                activeChat ? renderChatAvatar(activeChat, "chat-info-main__avatar") : null
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
      {isStickerManagerOpen ? (
        <div
          className="confirm-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={locale === "ru" ? "Менеджер стикерпаков" : "Sticker packs manager"}
          onClick={() => setIsStickerManagerOpen(false)}
        >
          <div className="sticker-manager" onClick={(event) => event.stopPropagation()}>
            <header className="sticker-manager__header">
              <h4>{locale === "ru" ? "Менеджер стикерпаков" : "Sticker packs manager"}</h4>
              <button type="button" className="icon-button" onClick={() => setIsStickerManagerOpen(false)}>
                ×
              </button>
            </header>
            <div className="sticker-manager__toolbar">
              <label>
                <input
                  type="checkbox"
                  checked={stickerOnlyMine}
                  onChange={(event) => setStickerOnlyMine(event.target.checked)}
                />
                {locale === "ru" ? "Только мои (без system)" : "Only mine (exclude system)"}
              </label>
              <div className="sticker-manager__tabs" role="tablist" aria-label={locale === "ru" ? "Вкладки менеджера" : "Manager tabs"}>
                <button
                  type="button"
                  className={stickerManagerTab === "packs" ? "sticker-manager__tab sticker-manager__tab--active" : "sticker-manager__tab"}
                  role="tab"
                  aria-selected={stickerManagerTab === "packs"}
                  onClick={() => setStickerManagerTab("packs")}
                >
                  {locale === "ru" ? "Паки" : "Packs"}
                </button>
                <button
                  type="button"
                  className={stickerManagerTab === "stickers" ? "sticker-manager__tab sticker-manager__tab--active" : "sticker-manager__tab"}
                  role="tab"
                  aria-selected={stickerManagerTab === "stickers"}
                  onClick={() => setStickerManagerTab("stickers")}
                >
                  {locale === "ru" ? "Стикеры" : "Stickers"}
                </button>
              </div>
            </div>
            <div className="sticker-manager__create">
              <input
                value={newPackTitle}
                onChange={(event) => setNewPackTitle(event.target.value)}
                placeholder={locale === "ru" ? "Название нового пака" : "New pack title"}
              />
              <input value={newPackSlug} onChange={(event) => setNewPackSlug(event.target.value)} placeholder="slug (optional)" />
              <button type="button" onClick={() => void submitNewStickerPack()}>
                {locale === "ru" ? "Создать пак" : "Create pack"}
              </button>
            </div>
            <div className="sticker-manager__create">
              <select value={newStickerPackId} onChange={(event) => setNewStickerPackId(event.target.value)}>
                <option value="">{locale === "ru" ? "Выбери пак" : "Select pack"}</option>
                {stickerPacks.filter((pack) => !pack.isSystem).map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.title}
                  </option>
                ))}
              </select>
              <input value={newStickerCode} onChange={(event) => setNewStickerCode(event.target.value)} placeholder={locale === "ru" ? "Код стикера" : "Sticker code"} />
              <input value={newStickerLabel} onChange={(event) => setNewStickerLabel(event.target.value)} placeholder={locale === "ru" ? "Подпись" : "Label"} />
              <input
                value={newStickerAssetUrl}
                onChange={(event) => setNewStickerAssetUrl(event.target.value)}
                placeholder={locale === "ru" ? "URL изображения (/stickers/...)" : "Image URL (/stickers/...)"}
              />
              <select value={newStickerRender} onChange={(event) => setNewStickerRender(event.target.value === "inline" ? "inline" : "large")}>
                <option value="large">{locale === "ru" ? "Стикер (отдельное сообщение)" : "Sticker (standalone message)"}</option>
                <option value="inline">{locale === "ru" ? "Эмодзи в текст" : "Emoji in text"}</option>
              </select>
              <label className="sticker-manager__checkbox">
                <input type="checkbox" checked={newStickerAnimated} onChange={(event) => setNewStickerAnimated(event.target.checked)} />
                <span>{locale === "ru" ? "Анимированный" : "Animated"}</span>
              </label>
              <input value={newStickerTags} onChange={(event) => setNewStickerTags(event.target.value)} placeholder={locale === "ru" ? "Теги через запятую" : "Comma tags"} />
              <button type="button" onClick={() => void submitNewSticker()}>
                {locale === "ru" ? "Добавить стикер" : "Add sticker"}
              </button>
            </div>
            <div className="sticker-manager__list">
              {stickerManagerTab === "packs"
                ? managedStickerPacks.map((pack) => (
                    <article key={pack.id} className="sticker-manager__pack">
                      <div className="sticker-manager__pack-head">
                        <strong>{pack.title}</strong>
                        {!pack.isSystem ? (
                          <StickerManagerRowActions
                            menuId={`pack-${pack.id}`}
                            locale={locale}
                            openMenuId={stickerManagerRowMenuId}
                            setOpenMenuId={setStickerManagerRowMenuId}
                            menuRef={stickerManagerMenuRef}
                            deleteLabel={locale === "ru" ? "Удалить пак" : "Delete pack"}
                            onEdit={() => {
                              setEditingPackId(pack.id);
                              setEditingPackTitle(pack.title);
                            }}
                            onDelete={() => void removePack(pack.id)}
                          />
                        ) : null}
                      </div>
                      {!pack.isSystem && editingPackId === pack.id ? (
                        <div className="sticker-manager__inline-editor">
                          <input
                            value={editingPackTitle}
                            onChange={(event) => setEditingPackTitle(event.target.value)}
                            placeholder={locale === "ru" ? "Новое имя пака" : "New pack title"}
                          />
                          <button type="button" onClick={() => void submitPackRename()}>
                            {locale === "ru" ? "Переименовать" : "Rename"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPackId("");
                              setEditingPackTitle("");
                            }}
                          >
                            {locale === "ru" ? "Отмена" : "Cancel"}
                          </button>
                        </div>
                      ) : null}
                    </article>
                  ))
                : managedStickerPacks.flatMap((pack) =>
                    pack.stickers.map((sticker) => (
                      <div key={sticker.id} className="sticker-manager__sticker-row">
                        <div className="sticker-manager__sticker-main">
                          <span>{sticker.code}</span>
                          <small>
                            {pack.title} - {sticker.label}
                          </small>
                          {!pack.isSystem ? (
                            <StickerManagerRowActions
                              menuId={`sticker-${sticker.id}`}
                              locale={locale}
                              openMenuId={stickerManagerRowMenuId}
                              setOpenMenuId={setStickerManagerRowMenuId}
                              menuRef={stickerManagerMenuRef}
                              deleteLabel={locale === "ru" ? "Удалить" : "Delete"}
                              onEdit={() => {
                                setEditingStickerId(sticker.id);
                                setEditingStickerLabel(sticker.label);
                              }}
                              onDelete={() => void removeSticker(sticker.id)}
                            />
                          ) : null}
                        </div>
                        {!pack.isSystem && editingStickerId === sticker.id ? (
                          <div className="sticker-manager__inline-editor">
                            <input
                              value={editingStickerLabel}
                              onChange={(event) => setEditingStickerLabel(event.target.value)}
                              placeholder={locale === "ru" ? "Новая подпись" : "New label"}
                            />
                            <button type="button" onClick={() => void submitStickerRename()}>
                              {locale === "ru" ? "Сохранить" : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStickerId("");
                                setEditingStickerLabel("");
                              }}
                            >
                              {locale === "ru" ? "Отмена" : "Cancel"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
            </div>
            {stickerToast ? <p className="sticker-manager__toast">{stickerToast}</p> : null}
          </div>
        </div>
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
