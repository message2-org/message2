import { useMemo, useState } from "react";
import type { ChatItem } from "../types";
import { copy, type Locale } from "../i18n";
import { chatMatchesSearch, normalizeSearchQuery } from "../search-utils";
import { AppChatIcon, ArchiveIcon, SavedMessagesIcon, StarIcon, UsersIcon } from "./ui-icons";

const OPEN_DIRECT_CHAT_TIMEOUT_MS = 10_000;

type DiscoveryCopy = (typeof copy)[Locale];

export type DiscoveryTabId =
  | "chats"
  | "channels"
  | "apps"
  | "posts"
  | "media"
  | "links"
  | "files"
  | "music"
  | "voice";

type Props = {
  locale: Locale;
  tab: DiscoveryTabId;
  onTabChange: (next: DiscoveryTabId) => void;
  t: DiscoveryCopy;
  search: string;
  chats: ChatItem[];
  users: { id: string; username: string; displayName: string }[];
  joinedChannels: { id: string; name: string; subscribers: number }[];
  similarChannels: { id: string; name: string; subscribers: number }[];
  onOpenDirectChat: (user: { id: string; username: string; displayName: string }) => void | Promise<void>;
  onSelectChat: (id: string) => void;
  chatGradient: (id: string) => string;
  getChatInitials: (name: string) => string;
  onCloseDiscovery: () => void;
};

function subscriberCountFor(chatId: string): number {
  let h = 0;
  for (let i = 0; i < chatId.length; i++) h = (h + chatId.charCodeAt(i) * (i + 1)) % 1000000;
  return 120 + (h % 19_800);
}

function chatNameToken(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

function asLowerText(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function isAppSystemChat(chat: ChatItem) {
  const token = chatNameToken(chat.name);
  return chat.peerUsername === "message2_bot" || token === "послание2" || token === "message2" || token === "message2bot";
}

function isSavedSystemChat(chat: ChatItem) {
  const token = chatNameToken(chat.name);
  return token.startsWith("сохран") || token.startsWith("saved");
}

const TAB_ORDER: DiscoveryTabId[] = [
  "chats",
  "channels",
  "apps",
  "posts",
  "media",
  "links",
  "files",
  "music",
  "voice"
];

export function SidebarDiscovery(props: Props) {
  const {
    locale,
    tab,
    onTabChange,
    t,
    search,
    chats,
    users,
    joinedChannels,
    similarChannels,
    onOpenDirectChat,
    onSelectChat,
    chatGradient,
    getChatInitials,
    onCloseDiscovery
  } = props;
  const [openingUserId, setOpeningUserId] = useState<string | null>(null);
  const [openDirectChatError, setOpenDirectChatError] = useState("");

  const needle = normalizeSearchQuery(search);

  const joinedGroups = useMemo(
    () =>
      joinedChannels.filter((channel) =>
        needle ? asLowerText(channel.name).includes(needle) : true
      ),
    [joinedChannels, needle]
  );

  const suggestedChannels = useMemo(
    () =>
      similarChannels.filter((channel) =>
        needle ? asLowerText(channel.name).includes(needle) : true
      ),
    [similarChannels, needle]
  );

  const chatsForStrip = useMemo(
    () => chats.filter((chat) => chatMatchesSearch(chat, search)),
    [chats, search]
  );
  const usersForList = useMemo(() => {
    if (!needle) return users;
    return users.filter(
      (user) =>
        asLowerText(user.username).includes(needle) ||
        asLowerText(user.displayName).includes(needle)
    );
  }, [needle, users]);

  const tabLabels: Record<DiscoveryTabId, string> = {
    chats: t.discoveryTabChats,
    channels: t.discoveryTabChannels,
    apps: t.discoveryTabApps,
    posts: t.discoveryTabPosts,
    media: t.discoveryTabMedia,
    links: t.discoveryTabLinks,
    files: t.discoveryTabFiles,
    music: t.discoveryTabMusic,
    voice: t.discoveryTabVoice
  };

  const renderDiscoveryChatAvatar = (chat: ChatItem) => {
    if (chat.group === "favorite") {
      return (
        <span className="chat-avatar chat-avatar--favorite chat-avatar--discovery">
          <StarIcon />
        </span>
      );
    }
    if (chat.group === "archived") {
      return (
        <span className="chat-avatar chat-avatar--archived chat-avatar--discovery">
          <ArchiveIcon />
        </span>
      );
    }
    if (isAppSystemChat(chat)) {
      return (
        <span className="chat-avatar chat-avatar--app chat-avatar--discovery">
          <AppChatIcon />
        </span>
      );
    }
    if (isSavedSystemChat(chat)) {
      return (
        <span className="chat-avatar chat-avatar--saved chat-avatar--discovery">
          <SavedMessagesIcon />
        </span>
      );
    }
    return (
      <span className="chat-avatar chat-avatar--discovery" style={{ backgroundImage: chatGradient(chat.id) }}>
        {getChatInitials(chat.name)}
      </span>
    );
  };

  return (
    <div className="sidebar-discovery">
      <div className="discovery-tabs" role="tablist" aria-label={t.discoveryTabsLabel}>
        {TAB_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`discovery-tabs__btn ${tab === id ? "discovery-tabs__btn--active" : ""}`}
            onClick={() => onTabChange(id)}
          >
            {tabLabels[id]}
          </button>
        ))}
      </div>

      <div className="discovery-body">
        {tab === "chats" ? (
          <div className="discovery-stack">
            <p className="discovery-section-title">{t.discoveryTabChats}</p>
            {chatsForStrip.length === 0 ? (
              <p className="discovery-empty">{t.discoveryEmpty}</p>
            ) : (
              <div className="discovery-chat-strip">
                {chatsForStrip.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    className="discovery-chat-pill"
                    onClick={() => {
                      onSelectChat(chat.id);
                      onCloseDiscovery();
                    }}
                  >
                    <span className="discovery-chat-pill__avatar">
                      {renderDiscoveryChatAvatar(chat)}
                    </span>
                    <span className="discovery-chat-pill__name">{chat.name}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="discovery-section-title discovery-section-title--spaced">{t.discoveryUsersTitle}</p>
            {usersForList.length === 0 ? (
              <p className="discovery-muted">{t.discoveryUsersEmpty}</p>
            ) : (
              <>
                <ul className="discovery-channel-list">
                  {usersForList.map((user) => (
                    <li key={user.id}>
                      <button
                        type="button"
                        className="discovery-channel-row"
                        disabled={openingUserId === user.id}
                        onClick={() => {
                          setOpenDirectChatError("");
                          setOpeningUserId(user.id);
                          const timeout = new Promise<never>((_, reject) => {
                            setTimeout(() => reject(new Error("open direct chat timed out")), OPEN_DIRECT_CHAT_TIMEOUT_MS);
                          });
                          void Promise.race([Promise.resolve(onOpenDirectChat(user)), timeout])
                            .then(() => {
                              onCloseDiscovery();
                            })
                            .catch((error: unknown) => {
                              const fallback = locale === "ru" ? "Не удалось открыть чат. Попробуйте еще раз." : "Unable to open chat. Please try again.";
                              const message = error instanceof Error && error.message ? error.message : fallback;
                              setOpenDirectChatError(message);
                              console.error("[discovery/open-direct-chat]", error);
                            })
                            .finally(() => {
                              setOpeningUserId(null);
                            });
                        }}
                      >
                        <span className="chat-avatar discovery-channel-row__icon" style={{ backgroundImage: chatGradient(user.id) }}>
                          {getChatInitials(user.displayName || user.username)}
                        </span>
                        <span className="discovery-channel-row__main">
                          <span className="discovery-channel-row__name">{user.displayName || user.username}</span>
                          <span className="discovery-channel-row__meta">
                            {openingUserId === user.id ? t.discoveryOpeningChat : `@${user.username}`}
                          </span>
                        </span>
                        {openingUserId === user.id ? (
                          <span className="discovery-channel-row__users-icn" aria-hidden>
                            <svg className="discovery-inline-spinner" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="28 28" />
                            </svg>
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
                {openDirectChatError ? <p className="discovery-muted">{openDirectChatError}</p> : null}
              </>
            )}
          </div>
        ) : null}

        {tab === "channels" ? (
          <div className="discovery-stack">
            <p className="discovery-section-title">{t.discoveryChannelsJoined}</p>
            {joinedGroups.length === 0 ? (
              <p className="discovery-muted">{t.discoveryChannelsJoinedEmpty}</p>
            ) : (
              <ul className="discovery-channel-list">
                {joinedGroups.map((chat) => (
                  <li key={chat.id}>
                    <button
                      type="button"
                      className="discovery-channel-row"
                      onClick={() => {
                        onSelectChat(chat.id);
                        onCloseDiscovery();
                      }}
                    >
                      <span className="chat-avatar discovery-channel-row__icon" style={{ backgroundImage: chatGradient(chat.id) }}>
                        {getChatInitials(chat.name)}
                      </span>
                      <span className="discovery-channel-row__main">
                        <span className="discovery-channel-row__name">{chat.name}</span>
                        <span className="discovery-channel-row__meta">
                          {subscriberCountFor(chat.id).toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}{" "}
                          {t.discoverySubscribers}
                        </span>
                      </span>
                      <span className="discovery-channel-row__users-icn" aria-hidden>
                        <UsersIcon />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="discovery-section-title discovery-section-title--spaced">{t.discoveryChannelsSimilar}</p>
            {suggestedChannels.length === 0 ? (
              <p className="discovery-muted">{t.discoveryEmpty}</p>
            ) : (
              <ul className="discovery-channel-list">
                {suggestedChannels.map((channel) => (
                  <li key={channel.id}>
                    <div className="discovery-channel-row discovery-channel-row--static">
                      <span className="chat-avatar discovery-channel-row__icon" style={{ backgroundImage: chatGradient(channel.id) }}>
                        {getChatInitials(channel.name)}
                      </span>
                      <span className="discovery-channel-row__main">
                        <span className="discovery-channel-row__name">{channel.name}</span>
                        <span className="discovery-channel-row__meta">
                          {channel.subscribers.toLocaleString(locale === "ru" ? "ru-RU" : "en-US")} {t.discoverySubscribers}
                        </span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {tab !== "chats" && tab !== "channels" ? (
          <div className="discovery-stack">
            <p className="discovery-muted">{t.discoveryV2Placeholder}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
