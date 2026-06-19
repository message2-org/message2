import type { ReactNode } from "react";
import type { AuthUser } from "../types";
import type { Locale } from "../i18n";
import { UserAvatar } from "./UserAvatar";
import {
  AppChatIcon,
  BatteryIcon,
  BellIcon,
  ChatBubbleIcon,
  ChevronLeftIcon,
  ClockIcon,
  DevicesIcon,
  DotsVerticalIcon,
  EyeIcon,
  FolderIcon,
  GiftIcon,
  GridIcon,
  LanguageIcon,
  LightbulbIcon,
  LockIcon,
  MailIcon,
  MicIcon,
  QuestionIcon,
  SearchIcon,
  ShieldIcon,
  SlidersIcon,
  StarIcon,
  StoreIcon,
  UserIcon
} from "./ui-icons";

export type SettingsScreen = "main" | "privacy";

type Props = {
  locale: Locale;
  screen: SettingsScreen;
  authUser: AuthUser;
  accessToken: string | null;
  userAvatarRef: string | null;
  localeLabel: string;
  frequentContactsEnabled: boolean;
  onClose: () => void;
  onScreenChange: (screen: SettingsScreen) => void;
  onOpenProfile: () => void;
  onShowStub: (label: string) => void;
  onToggleFrequentContacts: () => void;
};

function SettingsRow(props: {
  icon: ReactNode;
  label: string;
  value?: string;
  valueMuted?: boolean;
  onClick: () => void;
}) {
  const { icon, label, value, valueMuted, onClick } = props;
  return (
    <button type="button" className="settings-modal__row" onClick={onClick}>
      <span className="settings-modal__row-icon">{icon}</span>
      <span className="settings-modal__row-label">{label}</span>
      {value ? <span className={`settings-modal__row-value ${valueMuted ? "settings-modal__row-value--muted" : ""}`}>{value}</span> : null}
    </button>
  );
}

export function SettingsModal(props: Props) {
  const {
    locale,
    screen,
    authUser,
    accessToken,
    userAvatarRef,
    localeLabel,
    frequentContactsEnabled,
    onClose,
    onScreenChange,
    onOpenProfile,
    onShowStub,
    onToggleFrequentContacts
  } = props;

  const ru = locale === "ru";
  const displayName = authUser.displayName || authUser.username;
  const off = ru ? "Выкл." : "Off";
  const everybody = ru ? "Все" : "Everybody";
  const nobody = ru ? "Никто" : "Nobody";
  const myContacts = ru ? "Мои контакты" : "My contacts";

  if (screen === "privacy") {
    return (
      <>
        <header className="settings-modal__header">
          <button type="button" className="icon-button icon-button--ghost settings-modal__back" onClick={() => onScreenChange("main")} aria-label={ru ? "Назад" : "Back"}>
            <ChevronLeftIcon />
          </button>
          <h3 className="settings-modal__title">{ru ? "Конфиденциальность и безопасность" : "Privacy and Security"}</h3>
          <button type="button" className="icon-button drawer-close-btn" onClick={onClose} aria-label={ru ? "Закрыть" : "Close"}>
            ×
          </button>
        </header>
        <div className="settings-modal__scroll">
          <h4 className="settings-modal__section-title">{ru ? "Безопасность" : "Security"}</h4>
          <SettingsRow icon={<ShieldIcon />} label={ru ? "Двухэтапная аутентификация" : "Two-Step Verification"} value={off} valueMuted onClick={() => onShowStub(ru ? "Двухэтапная аутентификация" : "Two-Step Verification")} />
          <SettingsRow icon={<ClockIcon />} label={ru ? "Автоудаление сообщений" : "Auto-Delete Messages"} value={off} valueMuted onClick={() => onShowStub(ru ? "Автоудаление сообщений" : "Auto-Delete Messages")} />
          <SettingsRow icon={<LockIcon />} label={ru ? "Локальный код-пароль" : "Local passcode"} value={off} valueMuted onClick={() => onShowStub(ru ? "Локальный код-пароль" : "Local passcode")} />
          <SettingsRow icon={<MailIcon />} label={ru ? "Почта для входа" : "Login Email"} value={ru ? "Не задана" : "Not set"} valueMuted onClick={() => onShowStub(ru ? "Почта для входа" : "Login Email")} />
          <SettingsRow icon={<UserIcon />} label={ru ? "Заблокированные" : "Blocked users"} value="0" onClick={() => onShowStub(ru ? "Заблокированные" : "Blocked users")} />
          <SettingsRow icon={<DevicesIcon />} label={ru ? "Активные сессии" : "Active sessions"} value="1" onClick={() => onShowStub(ru ? "Активные сессии" : "Active sessions")} />
          <p className="settings-modal__hint">{ru ? "Управляйте сессиями на всех устройствах." : "Manage your sessions on all your devices."}</p>

          <h4 className="settings-modal__section-title">{ru ? "Конфиденциальность" : "Privacy"}</h4>
          <SettingsRow icon={<PhoneIcon />} label={ru ? "Номер телефона" : "Phone number"} value={myContacts} onClick={() => onShowStub(ru ? "Номер телефона" : "Phone number")} />
          <SettingsRow icon={<EyeIcon />} label={ru ? "Был(а) в сети" : "Last seen & online"} value={nobody} onClick={() => onShowStub(ru ? "Был(а) в сети" : "Last seen & online")} />
          <SettingsRow icon={<UserIcon />} label={ru ? "Фото профиля" : "Profile photos"} value={everybody} onClick={() => onShowStub(ru ? "Фото профиля" : "Profile photos")} />
          <SettingsRow icon={<ForwardIcon />} label={ru ? "Пересланные сообщения" : "Forwarded messages"} value={everybody} onClick={() => onShowStub(ru ? "Пересланные сообщения" : "Forwarded messages")} />
          <SettingsRow icon={<MicIcon />} label={ru ? "Звонки" : "Calls"} value={everybody} onClick={() => onShowStub(ru ? "Звонки" : "Calls")} />
          <SettingsRow icon={<MicIcon />} label={ru ? "Голосовые сообщения" : "Voice messages"} value={everybody} onClick={() => onShowStub(ru ? "Голосовые сообщения" : "Voice messages")} />
          <SettingsRow icon={<ChatBubbleIcon />} label={ru ? "Сообщения" : "Messages"} value={everybody} onClick={() => onShowStub(ru ? "Сообщения" : "Messages")} />
          <SettingsRow icon={<GiftIcon />} label={ru ? "День рождения" : "Birthday"} value={myContacts} onClick={() => onShowStub(ru ? "День рождения" : "Birthday")} />
          <SettingsRow icon={<GiftIcon />} label={ru ? "Подарки" : "Gifts"} value={everybody} onClick={() => onShowStub(ru ? "Подарки" : "Gifts")} />
          <SettingsRow icon={<UserIcon />} label="Bio" value={everybody} onClick={() => onShowStub("Bio")} />
          <SettingsRow icon={<MicIcon />} label={ru ? "Сохранённая музыка" : "Saved Music"} value={everybody} onClick={() => onShowStub(ru ? "Сохранённая музыка" : "Saved Music")} />
          <SettingsRow icon={<UserIcon />} label={ru ? "Приглашения" : "Invites"} value={everybody} onClick={() => onShowStub(ru ? "Приглашения" : "Invites")} />

          <h4 className="settings-modal__section-title">{ru ? "Боты и сайты" : "Bots and websites"}</h4>
          <button type="button" className="settings-modal__link-row" onClick={() => onShowStub(ru ? "Платёжные данные" : "Payment and shipping info")}>
            {ru ? "Очистить платёжные и адресные данные" : "Clear Payment and Shipping Info"}
          </button>

          <h4 className="settings-modal__section-title">{ru ? "Частые контакты" : "Frequent contacts"}</h4>
          <button type="button" className="settings-modal__row settings-modal__row--toggle" onClick={onToggleFrequentContacts}>
            <span className="settings-modal__row-label">{ru ? "Предлагать частые контакты" : "Suggest frequent contacts"}</span>
            <span className={`sidebar-drawer__switch ${frequentContactsEnabled ? "sidebar-drawer__switch--on" : ""}`} aria-hidden="true" />
          </button>
          <p className="settings-modal__hint">
            {ru
              ? "Показывать часто используемые контакты вверху поиска для быстрого доступа."
              : "Display people you message frequently at the top of the search section for quick access."}
          </p>

          <h4 className="settings-modal__section-title">{ru ? "Удаление аккаунта" : "Delete my account"}</h4>
          <SettingsRow icon={<ClockIcon />} label={ru ? "Если отсутствую…" : "If away for..."} value={ru ? "18 месяцев" : "18 months"} onClick={() => onShowStub(ru ? "Удаление аккаунта" : "Delete my account")} />
        </div>
      </>
    );
  }

  return (
    <>
      <header className="settings-modal__header settings-modal__header--main">
        <h3 className="settings-modal__title settings-modal__title--left">{ru ? "Настройки" : "Settings"}</h3>
        <div className="settings-modal__header-actions">
          <button type="button" className="icon-button icon-button--ghost" onClick={() => onShowStub(ru ? "Поиск" : "Search")} aria-label={ru ? "Поиск" : "Search"}>
            <SearchIcon />
          </button>
          <button type="button" className="icon-button icon-button--ghost" onClick={() => onShowStub(ru ? "Меню" : "Menu")} aria-label={ru ? "Меню" : "Menu"}>
            <DotsVerticalIcon />
          </button>
          <button type="button" className="icon-button drawer-close-btn" onClick={onClose} aria-label={ru ? "Закрыть" : "Close"}>
            ×
          </button>
        </div>
      </header>
      <div className="settings-modal__scroll">
        <button type="button" className="settings-modal__profile-card" onClick={onOpenProfile}>
          <UserAvatar userId={authUser.id} name={displayName} avatarUrl={userAvatarRef ?? authUser.avatarUrl} accessToken={accessToken} className="settings-modal__profile-avatar" />
          <span className="settings-modal__profile-text">
            <span className="settings-modal__profile-name">{displayName}</span>
            <span className="settings-modal__profile-meta">{ru ? "Телефон не указан" : "No phone number"}</span>
            <span className="settings-modal__profile-meta">@{authUser.username}</span>
          </span>
          <span className="settings-modal__profile-qr" aria-hidden="true">
            <GridIcon />
          </span>
        </button>

        <div className="settings-modal__banner">
          <p className="settings-modal__banner-title">{ru ? "Добавить номер телефона?" : "Add a phone number?"}</p>
          <p className="settings-modal__banner-text">
            {ru
              ? "Номер поможет восстановить доступ к аккаунту. Подробнее"
              : "Keep your number up to date to ensure you can always log in. Learn More"}
          </p>
          <div className="settings-modal__banner-actions">
            <button type="button" className="settings-modal__banner-btn" onClick={() => onShowStub(ru ? "Номер телефона" : "Phone number")}>
              {ru ? "Да" : "Yes"}
            </button>
            <button type="button" className="settings-modal__banner-btn" onClick={() => onShowStub(ru ? "Номер телефона" : "Phone number")}>
              {ru ? "Нет" : "No"}
            </button>
          </div>
        </div>

        <SettingsRow icon={<UserIcon />} label={ru ? "Мой аккаунт" : "My Account"} onClick={onOpenProfile} />
        <SettingsRow icon={<BellIcon />} label={ru ? "Уведомления и звуки" : "Notifications and Sounds"} onClick={() => onShowStub(ru ? "Уведомления и звуки" : "Notifications and Sounds")} />
        <SettingsRow icon={<LockIcon />} label={ru ? "Конфиденциальность и безопасность" : "Privacy and Security"} onClick={() => onScreenChange("privacy")} />
        <SettingsRow icon={<ChatBubbleIcon />} label={ru ? "Настройки чатов" : "Chat Settings"} onClick={() => onShowStub(ru ? "Настройки чатов" : "Chat Settings")} />
        <SettingsRow icon={<FolderIcon />} label={ru ? "Папки" : "Folders"} onClick={() => onShowStub(ru ? "Папки" : "Folders")} />
        <SettingsRow icon={<SlidersIcon />} label={ru ? "Продвинутые" : "Advanced"} onClick={() => onShowStub(ru ? "Продвинутые" : "Advanced")} />
        <SettingsRow icon={<MicIcon />} label={ru ? "Динамики и камера" : "Speakers and Camera"} onClick={() => onShowStub(ru ? "Динамики и камера" : "Speakers and Camera")} />
        <SettingsRow icon={<BatteryIcon />} label={ru ? "Батарея и анимации" : "Battery and Animations"} onClick={() => onShowStub(ru ? "Батарея и анимации" : "Battery and Animations")} />
        <SettingsRow icon={<LanguageIcon />} label={ru ? "Язык" : "Language"} value={localeLabel} onClick={() => onShowStub(ru ? "Язык" : "Language")} />

        <h4 className="settings-modal__section-title">{ru ? "Масштаб интерфейса" : "Interface scale"}</h4>
        <button type="button" className="settings-modal__row settings-modal__row--toggle" onClick={() => onShowStub(ru ? "Масштаб интерфейса" : "Interface scale")}>
          <span className="settings-modal__row-icon"><EyeIcon /></span>
          <span className="settings-modal__row-label">{ru ? "Масштаб по умолчанию" : "Default interface scale"}</span>
          <span className="sidebar-drawer__switch sidebar-drawer__switch--on" aria-hidden="true" />
        </button>
        <div className="settings-modal__scale">
          <div className="settings-modal__scale-track">
            <div className="settings-modal__scale-fill" />
            <div className="settings-modal__scale-thumb" />
          </div>
          <span className="settings-modal__scale-value">100%</span>
        </div>

        <h4 className="settings-modal__section-title">{ru ? "Сервисы" : "Services"}</h4>
        <SettingsRow icon={<StarIcon />} label="Message2 Premium" onClick={() => onShowStub("Message2 Premium")} />
        <SettingsRow icon={<StarIcon />} label={ru ? "Мои звёзды" : "My Stars"} onClick={() => onShowStub(ru ? "Мои звёзды" : "My Stars")} />
        <SettingsRow icon={<StoreIcon />} label="Message2 Business" onClick={() => onShowStub("Message2 Business")} />
        <SettingsRow icon={<GiftIcon />} label={ru ? "Отправить подарок" : "Send a Gift"} onClick={() => onShowStub(ru ? "Отправить подарок" : "Send a Gift")} />

        <h4 className="settings-modal__section-title">{ru ? "Поддержка" : "Support"}</h4>
        <SettingsRow icon={<QuestionIcon />} label="Message2 FAQ" onClick={() => onShowStub("FAQ")} />
        <SettingsRow icon={<LightbulbIcon />} label={ru ? "Возможности Message2" : "Message2 Features"} onClick={() => onShowStub(ru ? "Возможности Message2" : "Message2 Features")} />
        <SettingsRow icon={<AppChatIcon />} label={ru ? "Задать вопрос" : "Ask a Question"} onClick={() => onShowStub(ru ? "Задать вопрос" : "Ask a Question")} />
      </div>
    </>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.2 4.8c.4-.9 1.3-1.4 2.3-1.2l2 .4c1 .2 1.7 1 1.7 2v2.1c0 .8-.5 1.5-1.2 1.8l-1.3.6c1.2 2.4 3.1 4.3 5.5 5.5l.6-1.3c.3-.7 1-.1.2 1.2v2.1c0 1-.8 1.8-1.8 1.7l-2-.4c-5.2-1-9.3-5.1-10.3-10.3l-.4-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ForwardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14 19 5M19 10v9H5V5h9" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
