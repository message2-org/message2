import { FormEvent, useEffect, useMemo, useState } from "react";
import { copy, localeOptions, Locale } from "../i18n";
import { AuthMode } from "../types";
import { BrandLogo, CameraIcon, GitHubMark } from "../components/ui-icons";

type AuthPageProps = {
  theme: "light" | "dark";
  locale: Locale;
  authMode: AuthMode;
  isLanguageOpen: boolean;
  isSubmittingAuth: boolean;
  displayName: string;
  username: string;
  password: string;
  confirmPassword: string;
  registerAvatar: string | null;
  displayNameError?: string;
  usernameError?: string;
  passwordError?: string;
  confirmPasswordError?: string;
  authError: string;
  onLocaleToggle: () => void;
  onLocaleSelect: (value: Locale) => void;
  onThemeToggle: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  onDisplayNameChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onDisplayNameFocus: () => void;
  onUsernameFocus: () => void;
  onPasswordFocus: () => void;
  onConfirmPasswordFocus: () => void;
  onDisplayNameBlur: () => void;
  onUsernameBlur: () => void;
  onPasswordBlur: () => void;
  onConfirmPasswordBlur: () => void;
  onRegisterAvatarUpload: (file: File | null) => void;
  onRegisterAvatarReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function fieldCaptionLine(label: string, error: string | undefined): string {
  if (!error) return label;
  return `${label}: ${error}`;
}

export function AuthPage(props: AuthPageProps) {
  const {
    theme,
    locale,
    authMode,
    isLanguageOpen,
    isSubmittingAuth,
    displayName,
    username,
    password,
    confirmPassword,
    registerAvatar,
    displayNameError,
    usernameError,
    passwordError,
    confirmPasswordError,
    authError,
    onLocaleToggle,
    onLocaleSelect,
    onThemeToggle,
    onSwitchMode,
    onDisplayNameChange,
    onUsernameChange,
    onPasswordChange,
    onConfirmPasswordChange,
    onDisplayNameFocus,
    onUsernameFocus,
    onPasswordFocus,
    onConfirmPasswordFocus,
    onDisplayNameBlur,
    onUsernameBlur,
    onPasswordBlur,
    onConfirmPasswordBlur,
    onRegisterAvatarUpload,
    onRegisterAvatarReset,
    onSubmit
  } = props;
  const t = copy[locale];
  const localeFlagIcon = localeOptions[locale].flag;
  const themeIcon = theme === "dark" ? "/icons/moon.svg" : "/icons/sun.svg";
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingDots, setLoadingDots] = useState(1);
  const loadingLines = useMemo(
    () =>
      locale === "ru"
        ? [
            "Ракета прогревает двигатели",
            "Проверяем логин и пароль",
            "Стыкуемся с сервером",
            "Ждем ответ, не улетайте далеко",
            "Ракета вернулась с новостями"
          ]
        : [
            "Rocket warms up engines",
            "Checking login and password",
            "Docking with server",
            "Waiting for response, stay tuned",
            "Rocket returned with updates"
          ],
    [locale]
  );

  useEffect(() => {
    if (!isSubmittingAuth) {
      setLoadingStep(0);
      setLoadingDots(1);
      return;
    }
    const stepTimer = window.setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % loadingLines.length);
    }, 1700);
    const dotsTimer = window.setInterval(() => {
      setLoadingDots((prev) => (prev % 3) + 1);
    }, 360);
    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(dotsTimer);
    };
  }, [isSubmittingAuth, loadingLines.length]);

  return (
    <main className={`auth-shell theme-${theme}`}>
      <div className="top-controls">
        <div className="language-select-wrap">
          <button
            type="button"
            className="language-select"
            onClick={onLocaleToggle}
            aria-haspopup="listbox"
            aria-expanded={isLanguageOpen}
            aria-label={t.language}
          >
            <img className="language-select__flag" src={localeFlagIcon} alt="" aria-hidden="true" />
            <span>{localeOptions[locale].label}</span>
            <span className="language-select__caret" aria-hidden="true">
              ▾
            </span>
          </button>
          {isLanguageOpen ? (
            <div className="language-dropdown" role="listbox" aria-label={t.language}>
              {(Object.keys(localeOptions) as Locale[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`language-dropdown__option ${locale === value ? "language-dropdown__option--active" : ""}`}
                  onClick={() => onLocaleSelect(value)}
                >
                  <img className="language-select__flag" src={localeOptions[value].flag} alt="" aria-hidden="true" />
                  <span>{localeOptions[value].label}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button
          className={`theme-toggle ${theme === "dark" ? "theme-toggle--dark" : ""}`}
          onClick={onThemeToggle}
          aria-label={`${t.theme}: ${theme === "dark" ? t.darkTheme : t.lightTheme}`}
        >
          <span className="theme-toggle__thumb">
            <img src={themeIcon} alt="" aria-hidden="true" />
          </span>
        </button>
      </div>
      <section className="auth-card">
        <BrandLogo className="brand-logo brand-logo--auth" theme={theme} />
        <h1>{t.brand}</h1>
        <p className="auth-card__subtitle">{t.authSubtitle}</p>

        <form className="auth-form" onSubmit={onSubmit}>
          {authMode === "register" ? (
            <div className="auth-register-avatar">
              <div className="auth-avatar-picker-wrap">
                <label className="auth-avatar-picker">
                  <input type="file" accept="image/*" onChange={(event) => onRegisterAvatarUpload(event.target.files?.[0] ?? null)} />
                  {registerAvatar ? <img src={registerAvatar} alt="" /> : <CameraIcon />}
                  {!registerAvatar ? <span>{locale === "ru" ? "Аватар" : "Avatar"}</span> : null}
                </label>
                {registerAvatar ? (
                  <button type="button" className="auth-avatar-clear" onClick={onRegisterAvatarReset} aria-label={locale === "ru" ? "Удалить фото" : "Remove photo"}>
                    ×
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {authMode === "register" ? (
            <div className={`input-group ${displayName.trim() ? "touched" : ""} ${displayNameError ? "input-group--invalid" : ""}`}>
              <div className="input-group__head">
                <span className={`input-group__caption ${displayNameError ? "input-group__caption--invalid" : ""}`}>
                  <label>{fieldCaptionLine(t.displayNameOptional, displayNameError)}</label>
                </span>
              </div>
              <input
                className="form-control"
                value={displayName}
                onChange={(event) => onDisplayNameChange(event.target.value)}
                onFocus={onDisplayNameFocus}
                onBlur={onDisplayNameBlur}
                placeholder=" "
                aria-label={fieldCaptionLine(t.displayNameOptional, displayNameError)}
                aria-invalid={displayNameError ? true : undefined}
              />
            </div>
          ) : null}
          <div className={`input-group ${username.trim() ? "touched" : ""} ${usernameError ? "input-group--invalid" : ""}`}>
            <div className="input-group__head">
              <span className={`input-group__caption ${usernameError ? "input-group__caption--invalid" : ""}`}>
                <label>{fieldCaptionLine(t.username, usernameError)}</label>
              </span>
            </div>
            <input
              className="form-control"
              name="username"
              value={username}
              onChange={(event) => onUsernameChange(event.target.value)}
              onFocus={onUsernameFocus}
              onBlur={onUsernameBlur}
              placeholder=" "
              autoComplete="username"
              aria-label={fieldCaptionLine(t.username, usernameError)}
              aria-invalid={usernameError ? true : undefined}
            />
          </div>

          <div className={`input-group ${password.trim() ? "touched" : ""} ${passwordError ? "input-group--invalid" : ""}`}>
            <div className="input-group__head">
              <span className={`input-group__caption ${passwordError ? "input-group__caption--invalid" : ""}`}>
                <label>{fieldCaptionLine(t.password, passwordError)}</label>
              </span>
            </div>
            <input
              className="form-control"
              name={authMode === "register" ? "new-password" : "password"}
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              onFocus={onPasswordFocus}
              onBlur={onPasswordBlur}
              placeholder=" "
              type="password"
              autoComplete={authMode === "register" ? "new-password" : "current-password"}
              aria-label={fieldCaptionLine(t.password, passwordError)}
              aria-invalid={passwordError ? true : undefined}
            />
          </div>
          {authMode === "register" ? (
            <div className={`input-group ${confirmPassword.trim() ? "touched" : ""} ${confirmPasswordError ? "input-group--invalid" : ""}`}>
              <div className="input-group__head">
                <span className={`input-group__caption ${confirmPasswordError ? "input-group__caption--invalid" : ""}`}>
                  <label>{fieldCaptionLine(t.confirmPassword, confirmPasswordError)}</label>
                </span>
              </div>
              <input
                className="form-control"
                name="confirm-password"
                value={confirmPassword}
                onChange={(event) => onConfirmPasswordChange(event.target.value)}
                onFocus={onConfirmPasswordFocus}
                onBlur={onConfirmPasswordBlur}
                placeholder=" "
                type="password"
                autoComplete="new-password"
                aria-label={fieldCaptionLine(t.confirmPassword, confirmPasswordError)}
                aria-invalid={confirmPasswordError ? true : undefined}
              />
            </div>
          ) : null}

          {authError ? <p className="auth-error">{authError}</p> : null}

          <button type="submit" className="primary-button" disabled={isSubmittingAuth}>
            {authMode === "login" ? t.login : t.register}
          </button>
          <button
            type="button"
            className="auth-alt-switch"
            onClick={() => onSwitchMode(authMode === "login" ? "register" : "login")}
          >
            {authMode === "login"
              ? `${t.noAccount} ${t.switchToRegister}`
              : `${t.hasAccount} ${t.switchToLogin}`}
          </button>
        </form>
      </section>
      <section className="auth-info">
        <div className="auth-info__nav">
          <span>{t.aboutUs}</span>
        </div>
        <p>{t.aboutDescription}</p>
        <p>
          <a href="https://github.com/sun-demon" target="_blank" rel="noreferrer" className="auth-info__badge-link">
            <GitHubMark />
            <span>{t.sourceCode}</span>
          </a>
        </p>
      </section>
      {isSubmittingAuth ? (
        <div className="auth-loading-overlay" role="status" aria-live="polite" aria-label={t.wait}>
          <div className="auth-loading-stack">
            <span className="auth-loading-rocket" aria-hidden="true">
              🚀
            </span>
            <p className="auth-loading-text">
              {loadingLines[loadingStep]}
              {".".repeat(loadingDots)}
            </p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
