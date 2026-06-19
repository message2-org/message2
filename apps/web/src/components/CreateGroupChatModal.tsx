import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Locale } from "../i18n";
import { buildAvatarGradient, buildUserInitials } from "../lib/avatar";
import { UserAvatar } from "./UserAvatar";

export type CreateChatKind = "group" | "channel";

export type CreateChatMember = {
  id: string;
  username: string;
  displayName: string;
};

type Props = {
  locale: Locale;
  kind: CreateChatKind;
  authUserId: string;
  accessToken: string | null;
  onClose: () => void;
  onSearchUsers: (query: string) => Promise<CreateChatMember[]>;
  onSubmit: (title: string, members: CreateChatMember[]) => Promise<void>;
};

export function CreateGroupChatModal({
  locale,
  kind,
  authUserId,
  accessToken,
  onClose,
  onSearchUsers,
  onSubmit
}: Props) {
  const ru = locale === "ru";
  const titleId = useId();
  const memberSearchId = useId();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const memberSearchRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const onSearchUsersRef = useRef(onSearchUsers);
  const searchSeqRef = useRef(0);
  const [title, setTitle] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<CreateChatMember[]>([]);
  const [rawSuggestions, setRawSuggestions] = useState<CreateChatMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const heading =
    kind === "group"
      ? ru
        ? "Новая группа"
        : "New Group"
      : ru
        ? "Новый канал"
        : "New Channel";

  const selectedIds = useMemo(() => new Set(selectedMembers.map((member) => member.id)), [selectedMembers]);
  const suggestions = useMemo(
    () => rawSuggestions.filter((user) => user.id !== authUserId && !selectedIds.has(user.id)),
    [authUserId, rawSuggestions, selectedIds]
  );

  onSearchUsersRef.current = onSearchUsers;

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        if (suggestionsOpen) {
          setSuggestionsOpen(false);
          return;
        }
        onClose();
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [isSubmitting, onClose, suggestionsOpen]);

  useEffect(() => {
    if (!suggestionsOpen) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (suggestionsRef.current?.contains(target)) return;
      if (memberSearchRef.current?.contains(target)) return;
      setSuggestionsOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [suggestionsOpen]);

  useEffect(() => {
    if (!suggestionsOpen) return;
    const query = memberQuery.trim();
    const seq = ++searchSeqRef.current;
    const timer = window.setTimeout(() => {
      setIsSearching((prev) => prev || rawSuggestions.length === 0);
      void onSearchUsersRef
        .current(query)
        .then((users) => {
          if (seq !== searchSeqRef.current) return;
          setRawSuggestions(users);
        })
        .catch(() => {
          if (seq !== searchSeqRef.current) return;
          setRawSuggestions([]);
        })
        .finally(() => {
          if (seq !== searchSeqRef.current) return;
          setIsSearching(false);
        });
    }, 220);
    return () => {
      window.clearTimeout(timer);
    };
  }, [memberQuery, suggestionsOpen]);

  function addMember(member: CreateChatMember) {
    if (member.id === authUserId || selectedIds.has(member.id)) return;
    setSelectedMembers((prev) => [...prev, member]);
    setMemberQuery("");
    setSuggestionsOpen(false);
    setError("");
    memberSearchRef.current?.focus();
  }

  function removeMember(memberId: string) {
    setSelectedMembers((prev) => prev.filter((member) => member.id !== memberId));
    setError("");
  }

  function handleMemberSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const first = suggestions[0];
      if (first) addMember(first);
      return;
    }
    if (event.key === "Backspace" && !memberQuery && selectedMembers.length > 0) {
      removeMember(selectedMembers[selectedMembers.length - 1].id);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(ru ? "Введите название." : "Enter a name.");
      return;
    }

    if (selectedMembers.length < 2) {
      setError(
        ru ? "Добавьте минимум двух участников из списка." : "Add at least two members from search."
      );
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await onSubmit(trimmedTitle, selectedMembers);
      onClose();
    } catch (submitError) {
      const fallback =
        kind === "group"
          ? ru
            ? "Не удалось создать группу"
            : "Failed to create group"
          : ru
            ? "Не удалось создать канал"
            : "Failed to create channel";
      const message = submitError instanceof Error && submitError.message ? submitError.message : fallback;
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="profile-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="profile-modal create-chat-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="create-chat-modal__header">
          <h3 id={titleId} className="create-chat-modal__title">
            {heading}
          </h3>
          <button
            type="button"
            className="icon-button drawer-close-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={ru ? "Закрыть" : "Close"}
          >
            ×
          </button>
        </header>

        <form className="create-chat-modal__form" onSubmit={(event) => void handleSubmit(event)}>
          <div className={`input-group ${title.trim() ? "touched" : ""} ${error && !title.trim() ? "input-group--invalid" : ""}`}>
            <div className="input-group__head">
              <span className="input-group__caption">
                <label htmlFor="create-chat-title">
                  {kind === "group"
                    ? ru
                      ? "Название группы"
                      : "Group name"
                    : ru
                      ? "Название канала"
                      : "Channel name"}
                </label>
              </span>
            </div>
            <input
              ref={titleInputRef}
              id="create-chat-title"
              className="form-control"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isSubmitting}
              autoComplete="off"
              placeholder=" "
            />
          </div>

          <div className="create-chat-modal__field">
            <label className="create-chat-modal__label" htmlFor={memberSearchId}>
              {ru ? "Участники" : "Members"}
            </label>

            <div className="create-chat-modal__member-box">
              {selectedMembers.length > 0 ? (
                <ul className="create-chat-modal__chips" aria-label={ru ? "Выбранные участники" : "Selected members"}>
                  {selectedMembers.map((member) => (
                    <li key={member.id} className="create-chat-modal__chip">
                      <UserAvatar
                        userId={member.id}
                        name={member.displayName || member.username}
                        accessToken={accessToken}
                        className="create-chat-modal__chip-avatar"
                      />
                      <span className="create-chat-modal__chip-text">
                        <span className="create-chat-modal__chip-name">{member.displayName || member.username}</span>
                        <span className="create-chat-modal__chip-meta">@{member.username}</span>
                      </span>
                      <button
                        type="button"
                        className="create-chat-modal__chip-remove"
                        onClick={() => removeMember(member.id)}
                        disabled={isSubmitting}
                        aria-label={ru ? `Убрать @${member.username}` : `Remove @${member.username}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="create-chat-modal__search-wrap">
                <input
                  ref={memberSearchRef}
                  id={memberSearchId}
                  className="create-chat-modal__search"
                  type="search"
                  value={memberQuery}
                  onChange={(event) => {
                    setMemberQuery(event.target.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  onKeyDown={handleMemberSearchKeyDown}
                  disabled={isSubmitting}
                  autoComplete="off"
                  placeholder={ru ? "Поиск по имени или @username" : "Search by name or @username"}
                />
                {suggestionsOpen ? (
                  <div
                    className={`create-chat-modal__suggestions ${isSearching ? "create-chat-modal__suggestions--loading" : ""}`}
                    ref={suggestionsRef}
                    role="listbox"
                  >
                    {isSearching && suggestions.length === 0 ? (
                      <p className="create-chat-modal__suggestions-empty">{ru ? "Поиск…" : "Searching…"}</p>
                    ) : suggestions.length === 0 ? (
                      <p className="create-chat-modal__suggestions-empty">
                        {memberQuery.trim()
                          ? ru
                            ? "Пользователи не найдены"
                            : "No users found"
                          : ru
                            ? "Начните вводить имя или @username"
                            : "Start typing a name or @username"}
                      </p>
                    ) : (
                      <ul className="create-chat-modal__suggestion-list">
                        {suggestions.map((user) => (
                          <li key={user.id}>
                            <button
                              type="button"
                              className="create-chat-modal__suggestion"
                              role="option"
                              onClick={() => addMember(user)}
                            >
                              <span
                                className="chat-avatar create-chat-modal__suggestion-avatar"
                                style={{ backgroundImage: buildAvatarGradient(user.id) }}
                              >
                                {buildUserInitials(user.displayName, user.username)}
                              </span>
                              <span className="create-chat-modal__suggestion-main">
                                <span className="create-chat-modal__suggestion-name">{user.displayName || user.username}</span>
                                <span className="create-chat-modal__suggestion-meta">@{user.username}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <p className="create-chat-modal__hint">
              {ru
                ? `Выбрано: ${selectedMembers.length}. Нужно минимум 2 участника. Нажмите на пользователя в списке или Enter.`
                : `Selected: ${selectedMembers.length}. At least 2 members required. Pick from the list or press Enter.`}
            </p>
          </div>

          {error ? <p className="create-chat-modal__error">{error}</p> : null}

          <div className="create-chat-modal__actions">
            <button type="button" className="create-chat-modal__btn create-chat-modal__btn--ghost" onClick={onClose} disabled={isSubmitting}>
              {ru ? "Отмена" : "Cancel"}
            </button>
            <button type="submit" className="create-chat-modal__btn create-chat-modal__btn--primary" disabled={isSubmitting}>
              {isSubmitting ? (ru ? "Создание…" : "Creating…") : ru ? "Создать" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
