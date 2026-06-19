import type { AuthUser } from "../types";
import type { Locale } from "../i18n";
import { UserAvatar } from "./UserAvatar";
import {
  AtIcon,
  CameraIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GiftIcon,
  GridIcon,
  MegaphoneIcon,
  PaletteIcon,
  PhoneIcon,
  PlusCircleIcon,
  SparkleIcon,
  SettingsIcon,
  UserIcon
} from "./ui-icons";

type EditKind = "name" | "username" | "password";

type Props = {
  locale: Locale;
  authUser: AuthUser;
  accessToken: string | null;
  userAvatarRef: string | null;
  onlineLabel: string;
  activeProfileEdit: EditKind | null;
  profileName: string;
  profileUsername: string;
  profileOldPassword: string;
  profileNewPassword: string;
  profileConfirmPassword: string;
  profileSubmitError: string;
  profileNameError: string;
  profileUsernameError: string;
  profileOldPasswordError: string;
  profileNewPasswordError: string;
  profileConfirmPasswordError: string;
  isAvatarClearHover: boolean;
  editorTitle: string;
  fieldCaptionLine: (label: string, error: string) => string;
  onBack: () => void;
  onClose: () => void;
  onCopyUsername: () => void;
  onShowStub: (label: string) => void;
  onStartEdit: (kind: EditKind) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onUploadAvatar: (file: File | null) => void;
  onResetAvatar: () => void;
  onAvatarClearHover: (hover: boolean) => void;
  onProfileNameChange: (value: string) => void;
  onProfileUsernameChange: (value: string) => void;
  onProfileOldPasswordChange: (value: string) => void;
  onProfileNewPasswordChange: (value: string) => void;
  onProfileConfirmPasswordChange: (value: string) => void;
};

export function ProfileInfoPanel(props: Props) {
  const {
    locale,
    authUser,
    accessToken,
    userAvatarRef,
    onlineLabel,
    activeProfileEdit,
    profileName,
    profileUsername,
    profileOldPassword,
    profileNewPassword,
    profileConfirmPassword,
    profileSubmitError,
    profileNameError,
    profileUsernameError,
    profileOldPasswordError,
    profileNewPasswordError,
    profileConfirmPasswordError,
    isAvatarClearHover,
    editorTitle,
    fieldCaptionLine,
    onBack,
    onClose,
    onCopyUsername,
    onShowStub,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onUploadAvatar,
    onResetAvatar,
    onAvatarClearHover,
    onProfileNameChange,
    onProfileUsernameChange,
    onProfileOldPasswordChange,
    onProfileNewPasswordChange,
    onProfileConfirmPasswordChange
  } = props;

  const displayName = authUser.displayName || authUser.username;
  const nameColorPreview = displayName.split(/\s+/)[0] || displayName;

  return (
    <>
      <header className="profile-info__header">
        <button type="button" className="icon-button icon-button--ghost profile-info__back" onClick={onBack} aria-label={locale === "ru" ? "Назад" : "Back"}>
          <ChevronLeftIcon />
        </button>
        <h3 className="profile-info__title">{activeProfileEdit ? editorTitle : locale === "ru" ? "Информация" : "Info"}</h3>
        <div className="profile-info__header-actions">
          <button type="button" className="icon-button icon-button--ghost" onClick={onCopyUsername} aria-label={locale === "ru" ? "Скопировать имя пользователя" : "Copy username"}>
            <GridIcon />
          </button>
          <button type="button" className="icon-button drawer-close-btn" onClick={onClose} aria-label={locale === "ru" ? "Закрыть" : "Close"}>
            ×
          </button>
        </div>
      </header>

      {activeProfileEdit ? (
        <div className="profile-info__editor auth-form">
          {activeProfileEdit === "name" ? (
            <div className={`input-group ${profileName.trim() ? "touched" : ""} ${profileNameError ? "input-group--invalid" : ""}`}>
              <div className="input-group__head">
                <span className={`input-group__caption ${profileNameError ? "input-group__caption--invalid" : ""}`}>
                  <label>{fieldCaptionLine(locale === "ru" ? "Имя" : "Name", profileNameError)}</label>
                </span>
              </div>
              <input className="form-control" value={profileName} onChange={(event) => onProfileNameChange(event.target.value)} placeholder=" " autoFocus />
            </div>
          ) : null}
          {activeProfileEdit === "username" ? (
            <div className={`input-group ${profileUsername.trim() ? "touched" : ""} ${profileUsernameError ? "input-group--invalid" : ""}`}>
              <div className="input-group__head">
                <span className={`input-group__caption ${profileUsernameError ? "input-group__caption--invalid" : ""}`}>
                  <label>{fieldCaptionLine(locale === "ru" ? "Имя пользователя" : "Username", profileUsernameError)}</label>
                </span>
              </div>
              <input className="form-control" value={profileUsername} onChange={(event) => onProfileUsernameChange(event.target.value)} placeholder=" " autoFocus />
            </div>
          ) : null}
          {activeProfileEdit === "password" ? (
            <div className="profile-password-stack">
              <div className={`input-group ${profileOldPassword.trim() ? "touched" : ""} ${profileOldPasswordError ? "input-group--invalid" : ""}`}>
                <div className="input-group__head">
                  <span className={`input-group__caption ${profileOldPasswordError ? "input-group__caption--invalid" : ""}`}>
                    <label>{fieldCaptionLine(locale === "ru" ? "Старый пароль" : "Current password", profileOldPasswordError)}</label>
                  </span>
                </div>
                <input className="form-control" type="password" value={profileOldPassword} onChange={(event) => onProfileOldPasswordChange(event.target.value)} placeholder=" " autoFocus />
              </div>
              <div className={`input-group ${profileNewPassword.trim() ? "touched" : ""} ${profileNewPasswordError ? "input-group--invalid" : ""}`}>
                <div className="input-group__head">
                  <span className={`input-group__caption ${profileNewPasswordError ? "input-group__caption--invalid" : ""}`}>
                    <label>{fieldCaptionLine(locale === "ru" ? "Новый пароль" : "New password", profileNewPasswordError)}</label>
                  </span>
                </div>
                <input className="form-control" type="password" value={profileNewPassword} onChange={(event) => onProfileNewPasswordChange(event.target.value)} placeholder=" " />
              </div>
              <div className={`input-group ${profileConfirmPassword.trim() ? "touched" : ""} ${profileConfirmPasswordError ? "input-group--invalid" : ""}`}>
                <div className="input-group__head">
                  <span className={`input-group__caption ${profileConfirmPasswordError ? "input-group__caption--invalid" : ""}`}>
                    <label>{fieldCaptionLine(locale === "ru" ? "Повтор пароля" : "Repeat password", profileConfirmPasswordError)}</label>
                  </span>
                </div>
                <input className="form-control" type="password" value={profileConfirmPassword} onChange={(event) => onProfileConfirmPasswordChange(event.target.value)} placeholder=" " />
              </div>
            </div>
          ) : null}
          {profileSubmitError ? <p className="auth-error profile-password-error">{profileSubmitError}</p> : null}
          <div className="profile-info__editor-actions">
            <button type="button" className="ghost-button" onClick={onCancelEdit}>
              {locale === "ru" ? "Отмена" : "Cancel"}
            </button>
            <button type="button" className="primary-button" onClick={onSaveEdit}>
              {locale === "ru" ? "Сохранить" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="profile-info__scroll">
          <div className="profile-info__hero">
            <div className={`profile-info__avatar-wrap ${isAvatarClearHover ? "profile-info__avatar-wrap--clear-hover" : ""}`}>
              <UserAvatar
                userId={authUser.id}
                name={displayName}
                avatarUrl={userAvatarRef ?? authUser.avatarUrl}
                accessToken={accessToken}
                className="profile-info__avatar"
              />
              <label className="profile-info__camera-btn" title={locale === "ru" ? "Изменить фото" : "Change photo"}>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onUploadAvatar(event.target.files?.[0] ?? null)} />
                <CameraIcon />
              </label>
              {userAvatarRef ? (
                <button
                  type="button"
                  className="auth-avatar-clear profile-info__avatar-clear"
                  onMouseEnter={() => onAvatarClearHover(true)}
                  onMouseLeave={() => onAvatarClearHover(false)}
                  onClick={onResetAvatar}
                  aria-label={locale === "ru" ? "Удалить фото" : "Remove photo"}
                >
                  ×
                </button>
              ) : null}
            </div>
            <h2 className="profile-info__name">{displayName}</h2>
            <p className="profile-info__status">{onlineLabel}</p>
          </div>

          <section className="profile-info__bio">
            <div className="profile-info__bio-head">
              <span>{locale === "ru" ? "О себе" : "Bio"}</span>
              <span className="profile-info__bio-limit">70</span>
            </div>
            <button type="button" className="profile-info__bio-btn" onClick={() => onShowStub(locale === "ru" ? "О себе" : "Bio")}>
              {locale === "ru"
                ? "Любые детали: возраст, род занятий, город. Например: дизайнер из Москвы, 23 года."
                : "Any details such as age, occupation or city. Example: 23 y.o. designer from San Francisco."}
            </button>
          </section>

          <section className="profile-info__group">
            <button type="button" className="profile-info__row" onClick={() => onStartEdit("name")}>
              <span className="profile-info__row-icon"><UserIcon /></span>
              <span className="profile-info__row-label">{locale === "ru" ? "Имя" : "Name"}</span>
              <span className="profile-info__row-trailing">
                <span className="profile-info__row-value">{displayName}</span>
                <span className="profile-info__row-chevron" aria-hidden="true"><ChevronRightIcon /></span>
              </span>
            </button>
            <button type="button" className="profile-info__row" onClick={() => onShowStub(locale === "ru" ? "Номер телефона" : "Phone number")}>
              <span className="profile-info__row-icon"><PhoneIcon /></span>
              <span className="profile-info__row-label">{locale === "ru" ? "Номер телефона" : "Phone number"}</span>
              <span className="profile-info__row-trailing">
                <span className="profile-info__row-value profile-info__row-value--muted">{locale === "ru" ? "Добавить" : "Add"}</span>
                <span className="profile-info__row-chevron" aria-hidden="true"><ChevronRightIcon /></span>
              </span>
            </button>
            <button type="button" className="profile-info__row" onClick={() => onStartEdit("username")}>
              <span className="profile-info__row-icon"><AtIcon /></span>
              <span className="profile-info__row-label">{locale === "ru" ? "Имя пользователя" : "Username"}</span>
              <span className="profile-info__row-trailing">
                <span className="profile-info__row-value">@{authUser.username}</span>
                <span className="profile-info__row-chevron" aria-hidden="true"><ChevronRightIcon /></span>
              </span>
            </button>
            <p className="profile-info__hint">
              {locale === "ru"
                ? "По имени пользователя другие люди смогут связаться с вами, не зная номера телефона."
                : "Username lets people contact you on Message2 without needing your phone number."}
            </p>
            <button type="button" className="profile-info__row" onClick={() => onStartEdit("password")}>
              <span className="profile-info__row-icon"><SettingsIcon /></span>
              <span className="profile-info__row-label">{locale === "ru" ? "Пароль" : "Password"}</span>
              <span className="profile-info__row-trailing">
                <span className="profile-info__row-value profile-info__row-value--muted">{locale === "ru" ? "Изменить" : "Change"}</span>
                <span className="profile-info__row-chevron" aria-hidden="true"><ChevronRightIcon /></span>
              </span>
            </button>
          </section>

          <div className="profile-info__divider" role="separator" />

          <section className="profile-info__group">
            <button type="button" className="profile-info__row" onClick={() => onShowStub(locale === "ru" ? "Личный канал" : "Personal channel")}>
              <span className="profile-info__row-icon"><MegaphoneIcon /></span>
              <span className="profile-info__row-label">{locale === "ru" ? "Личный канал" : "Personal channel"}</span>
              <span className="profile-info__row-value profile-info__row-value--action">{locale === "ru" ? "Добавить" : "Add"}</span>
            </button>
            <button type="button" className="profile-info__row" onClick={() => onShowStub(locale === "ru" ? "Автоматизация чатов" : "Chat automation")}>
              <span className="profile-info__row-icon"><SparkleIcon /></span>
              <span className="profile-info__row-label">{locale === "ru" ? "Автоматизация чатов" : "Chat automation"}</span>
              <span className="profile-info__row-trailing">
                <span className="profile-info__badge">NEW</span>
                <span className="profile-info__row-value profile-info__row-value--muted">{locale === "ru" ? "Выкл." : "Off"}</span>
              </span>
            </button>
            <button type="button" className="profile-info__row" onClick={() => onShowStub(locale === "ru" ? "Цвет имени" : "Your name color")}>
              <span className="profile-info__row-icon"><PaletteIcon /></span>
              <span className="profile-info__row-label">{locale === "ru" ? "Цвет имени" : "Your name color"}</span>
              <span className="profile-info__name-color-pill">{nameColorPreview}</span>
            </button>
          </section>

          <div className="profile-info__divider" role="separator" />

          <section className="profile-info__group">
            <button type="button" className="profile-info__row" onClick={() => onShowStub(locale === "ru" ? "День рождения" : "Birthday")}>
              <span className="profile-info__row-icon"><GiftIcon /></span>
              <span className="profile-info__row-label">{locale === "ru" ? "День рождения" : "Birthday"}</span>
              <span className="profile-info__row-value profile-info__row-value--action">{locale === "ru" ? "Добавить" : "Add"}</span>
            </button>
            <p className="profile-info__hint">
              {locale === "ru" ? "День рождения видят только ваши контакты." : "Only your contacts can see your birthday."}{" "}
              <button type="button" className="profile-info__hint-link" onClick={() => onShowStub(locale === "ru" ? "Настройки дня рождения" : "Birthday settings")}>
                {locale === "ru" ? "Изменить >" : "Change >"}
              </button>
            </p>
          </section>

          <button type="button" className="profile-info__add-account" onClick={() => onShowStub(locale === "ru" ? "Добавить аккаунт" : "Add Account")}>
            <PlusCircleIcon />
            <span>{locale === "ru" ? "Добавить аккаунт" : "Add Account"}</span>
          </button>
        </div>
      )}
    </>
  );
}
