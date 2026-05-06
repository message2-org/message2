import { useMemo, useState } from "react";
import type { ChatItem } from "../types";
import { copy, type Locale } from "../i18n";
import { chatMatchesSearch, normalizeSearchQuery } from "../search-utils";
import { ArchiveIcon, StarIcon, UsersIcon } from "./ui-icons";

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

type SimpleRow = { id: string; title: string; subtitle: string };

function mockRows(tab: DiscoveryTabId, locale: Locale): SimpleRow[] {
  const ru = locale === "ru";
  const map: Record<DiscoveryTabId, SimpleRow[]> = {
    chats: [],
    channels: [],
    apps: ru
      ? [
          { id: "a1", title: "Календарь", subtitle: "Совещания и напоминания" },
          { id: "a2", title: "Доска задач", subtitle: "Статусы проектов" },
          { id: "a3", title: "Скудгер", subtitle: "Доступ в офис" }
        ]
      : [
          { id: "a1", title: "Calendar", subtitle: "Meetings and reminders" },
          { id: "a2", title: "Task board", subtitle: "Project status" },
          { id: "a3", title: "Access desk", subtitle: "Office access" }
        ],
    posts: ru
      ? [
          { id: "p1", title: "Обновление API", subtitle: "Сегодня, команда платформы" },
          { id: "p2", title: "Релиз мобильного клиента", subtitle: "Вчера" }
        ]
      : [
          { id: "p1", title: "API update", subtitle: "Today, platform team" },
          { id: "p2", title: "Mobile client release", subtitle: "Yesterday" }
        ],
    media: ru
      ? [
          { id: "md1", title: "Фото с конференции", subtitle: "72 файла" },
          { id: "md2", title: "Обучающее видео", subtitle: "12 мин" }
        ]
      : [
          { id: "md1", title: "Conference photos", subtitle: "72 files" },
          { id: "md2", title: "Training video", subtitle: "12 min" }
        ],
    links: ru
      ? [
          { id: "l1", title: "Вики проекта", subtitle: "internal.example/wiki" },
          { id: "l2", title: "Статус сервисов", subtitle: "status.example" }
        ]
      : [
          { id: "l1", title: "Project wiki", subtitle: "internal.example/wiki" },
          { id: "l2", title: "Service status", subtitle: "status.example" }
        ],
    files: ru
      ? [
          { id: "f1", title: "Спецификация.pdf", subtitle: "2,4 МБ · сегодня" },
          { id: "f2", title: "Отчёт.xlsx", subtitle: "840 КБ · вчера" }
        ]
      : [
          { id: "f1", title: "Spec.pdf", subtitle: "2.4 MB · today" },
          { id: "f2", title: "Report.xlsx", subtitle: "840 KB · yesterday" }
        ],
    music: ru
      ? [
          { id: "mu1", title: "Плейлист «Фокус»", subtitle: "24 трека" },
          { id: "mu2", title: "Подкаст команды", subtitle: "45 мин" }
        ]
      : [
          { id: "mu1", title: "Focus playlist", subtitle: "24 tracks" },
          { id: "mu2", title: "Team podcast", subtitle: "45 min" }
        ],
    voice: ru
      ? [
          { id: "v1", title: "Комната «Стендап»", subtitle: "3 участника" },
          { id: "v2", title: "Запись звонка", subtitle: "22 мая, 18:04" }
        ]
      : [
          { id: "v1", title: "Standup room", subtitle: "3 members" },
          { id: "v2", title: "Call recording", subtitle: "May 22, 18:04" }
        ]
  };
  return map[tab];
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
        needle ? channel.name.toLowerCase().includes(needle) : true
      ),
    [joinedChannels, needle]
  );

  const suggestedChannels = useMemo(
    () =>
      similarChannels.filter((channel) =>
        needle ? channel.name.toLowerCase().includes(needle) : true
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
        user.username.toLowerCase().includes(needle) ||
        user.displayName.toLowerCase().includes(needle)
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
                      {chat.group === "favorite" ? (
                        <span className="chat-avatar chat-avatar--favorite chat-avatar--discovery">
                          <StarIcon />
                        </span>
                      ) : chat.group === "archived" ? (
                        <span className="chat-avatar chat-avatar--archived chat-avatar--discovery">
                          <ArchiveIcon />
                        </span>
                      ) : (
                        <span className="chat-avatar chat-avatar--discovery" style={{ backgroundImage: chatGradient(chat.id) }}>
                          {getChatInitials(chat.name)}
                        </span>
                      )}
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
                            .catch(() => {
                              setOpenDirectChatError(locale === "ru" ? "Не удалось открыть чат. Попробуйте еще раз." : "Unable to open chat. Please try again.");
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
                          <span className="discovery-channel-row__name">{user.displayName}</span>
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
            <p className="discovery-section-title">{t.discoverySectionSuggested}</p>
            {(() => {
              const rows = mockRows(tab, locale).filter((row) => {
                if (!needle) return true;
                return (
                  row.title.toLowerCase().includes(needle) ||
                  row.subtitle.toLowerCase().includes(needle) ||
                  row.id.toLowerCase().includes(needle)
                );
              });
              return rows.length === 0 ? (
                <p className="discovery-empty">{t.discoveryEmpty}</p>
              ) : (
                rows.map((row) => (
                  <button key={row.id} type="button" className="discovery-generic-row">
                    <span className="discovery-generic-row__title">{row.title}</span>
                    <span className="discovery-generic-row__sub">{row.subtitle}</span>
                  </button>
                ))
              );
            })()}
          </div>
        ) : null}
      </div>
    </div>
  );
}
