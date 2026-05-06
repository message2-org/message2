import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { copy, localeOptions } from "../i18n";
import { BrandLogo, CameraIcon, GitHubMark } from "../components/ui-icons";
function fieldCaptionLine(label, error) {
    if (!error)
        return label;
    return `${label}: ${error}`;
}
export function AuthPage(props) {
    const { theme, locale, authMode, isLanguageOpen, isSubmittingAuth, displayName, username, password, confirmPassword, registerAvatar, displayNameError, usernameError, passwordError, confirmPasswordError, authError, onLocaleToggle, onLocaleSelect, onThemeToggle, onSwitchMode, onDisplayNameChange, onUsernameChange, onPasswordChange, onConfirmPasswordChange, onDisplayNameFocus, onUsernameFocus, onPasswordFocus, onConfirmPasswordFocus, onDisplayNameBlur, onUsernameBlur, onPasswordBlur, onConfirmPasswordBlur, onRegisterAvatarUpload, onRegisterAvatarReset, onSubmit } = props;
    const t = copy[locale];
    const localeFlagIcon = localeOptions[locale].flag;
    const themeIcon = theme === "dark" ? "/icons/moon.svg" : "/icons/sun.svg";
    const [loadingStep, setLoadingStep] = useState(0);
    const [loadingDots, setLoadingDots] = useState(1);
    const loadingLines = useMemo(() => locale === "ru"
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
        ], [locale]);
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
    return (_jsxs("main", { className: `auth-shell theme-${theme}`, children: [_jsxs("div", { className: "top-controls", children: [_jsxs("div", { className: "language-select-wrap", children: [_jsxs("button", { type: "button", className: "language-select", onClick: onLocaleToggle, "aria-haspopup": "listbox", "aria-expanded": isLanguageOpen, "aria-label": t.language, children: [_jsx("img", { className: "language-select__flag", src: localeFlagIcon, alt: "", "aria-hidden": "true" }), _jsx("span", { children: localeOptions[locale].label }), _jsx("span", { className: "language-select__caret", "aria-hidden": "true", children: "\u25BE" })] }), isLanguageOpen ? (_jsx("div", { className: "language-dropdown", role: "listbox", "aria-label": t.language, children: Object.keys(localeOptions).map((value) => (_jsxs("button", { type: "button", className: `language-dropdown__option ${locale === value ? "language-dropdown__option--active" : ""}`, onClick: () => onLocaleSelect(value), children: [_jsx("img", { className: "language-select__flag", src: localeOptions[value].flag, alt: "", "aria-hidden": "true" }), _jsx("span", { children: localeOptions[value].label })] }, value))) })) : null] }), _jsx("button", { className: `theme-toggle ${theme === "dark" ? "theme-toggle--dark" : ""}`, onClick: onThemeToggle, "aria-label": `${t.theme}: ${theme === "dark" ? t.darkTheme : t.lightTheme}`, children: _jsx("span", { className: "theme-toggle__thumb", children: _jsx("img", { src: themeIcon, alt: "", "aria-hidden": "true" }) }) })] }), _jsxs("section", { className: "auth-card", children: [_jsx(BrandLogo, { className: "brand-logo brand-logo--auth", theme: theme }), _jsx("h1", { children: t.brand }), _jsx("p", { className: "auth-card__subtitle", children: t.authSubtitle }), _jsxs("form", { className: "auth-form", onSubmit: onSubmit, children: [authMode === "register" ? (_jsx("div", { className: "auth-register-avatar", children: _jsxs("div", { className: "auth-avatar-picker-wrap", children: [_jsxs("label", { className: "auth-avatar-picker", children: [_jsx("input", { type: "file", accept: "image/*", onChange: (event) => onRegisterAvatarUpload(event.target.files?.[0] ?? null) }), registerAvatar ? _jsx("img", { src: registerAvatar, alt: "" }) : _jsx(CameraIcon, {}), !registerAvatar ? _jsx("span", { children: locale === "ru" ? "Аватар" : "Avatar" }) : null] }), registerAvatar ? (_jsx("button", { type: "button", className: "auth-avatar-clear", onClick: onRegisterAvatarReset, "aria-label": locale === "ru" ? "Удалить фото" : "Remove photo", children: "\u00D7" })) : null] }) })) : null, authMode === "register" ? (_jsxs("div", { className: `input-group ${displayName.trim() ? "touched" : ""} ${displayNameError ? "input-group--invalid" : ""}`, children: [_jsx("div", { className: "input-group__head", children: _jsx("span", { className: `input-group__caption ${displayNameError ? "input-group__caption--invalid" : ""}`, children: _jsx("label", { children: fieldCaptionLine(t.displayNameOptional, displayNameError) }) }) }), _jsx("input", { className: "form-control", value: displayName, onChange: (event) => onDisplayNameChange(event.target.value), onFocus: onDisplayNameFocus, onBlur: onDisplayNameBlur, placeholder: " ", "aria-label": fieldCaptionLine(t.displayNameOptional, displayNameError), "aria-invalid": displayNameError ? true : undefined })] })) : null, _jsxs("div", { className: `input-group ${username.trim() ? "touched" : ""} ${usernameError ? "input-group--invalid" : ""}`, children: [_jsx("div", { className: "input-group__head", children: _jsx("span", { className: `input-group__caption ${usernameError ? "input-group__caption--invalid" : ""}`, children: _jsx("label", { children: fieldCaptionLine(t.username, usernameError) }) }) }), _jsx("input", { className: "form-control", name: "username", value: username, onChange: (event) => onUsernameChange(event.target.value), onFocus: onUsernameFocus, onBlur: onUsernameBlur, placeholder: " ", autoComplete: "username", "aria-label": fieldCaptionLine(t.username, usernameError), "aria-invalid": usernameError ? true : undefined })] }), _jsxs("div", { className: `input-group ${password.trim() ? "touched" : ""} ${passwordError ? "input-group--invalid" : ""}`, children: [_jsx("div", { className: "input-group__head", children: _jsx("span", { className: `input-group__caption ${passwordError ? "input-group__caption--invalid" : ""}`, children: _jsx("label", { children: fieldCaptionLine(t.password, passwordError) }) }) }), _jsx("input", { className: "form-control", name: authMode === "register" ? "new-password" : "password", value: password, onChange: (event) => onPasswordChange(event.target.value), onFocus: onPasswordFocus, onBlur: onPasswordBlur, placeholder: " ", type: "password", autoComplete: authMode === "register" ? "new-password" : "current-password", "aria-label": fieldCaptionLine(t.password, passwordError), "aria-invalid": passwordError ? true : undefined })] }), authMode === "register" ? (_jsxs("div", { className: `input-group ${confirmPassword.trim() ? "touched" : ""} ${confirmPasswordError ? "input-group--invalid" : ""}`, children: [_jsx("div", { className: "input-group__head", children: _jsx("span", { className: `input-group__caption ${confirmPasswordError ? "input-group__caption--invalid" : ""}`, children: _jsx("label", { children: fieldCaptionLine(t.confirmPassword, confirmPasswordError) }) }) }), _jsx("input", { className: "form-control", name: "confirm-password", value: confirmPassword, onChange: (event) => onConfirmPasswordChange(event.target.value), onFocus: onConfirmPasswordFocus, onBlur: onConfirmPasswordBlur, placeholder: " ", type: "password", autoComplete: "new-password", "aria-label": fieldCaptionLine(t.confirmPassword, confirmPasswordError), "aria-invalid": confirmPasswordError ? true : undefined })] })) : null, authError ? _jsx("p", { className: "auth-error", children: authError }) : null, _jsx("button", { type: "submit", className: "primary-button", disabled: isSubmittingAuth, children: authMode === "login" ? t.login : t.register }), _jsx("button", { type: "button", className: "auth-alt-switch", onClick: () => onSwitchMode(authMode === "login" ? "register" : "login"), children: authMode === "login"
                                    ? `${t.noAccount} ${t.switchToRegister}`
                                    : `${t.hasAccount} ${t.switchToLogin}` })] })] }), _jsxs("section", { className: "auth-info", children: [_jsx("div", { className: "auth-info__nav", children: _jsx("span", { children: t.aboutUs }) }), _jsx("p", { children: t.aboutDescription }), _jsx("p", { children: _jsxs("a", { href: "https://github.com/sun-demon", target: "_blank", rel: "noreferrer", className: "auth-info__badge-link", children: [_jsx(GitHubMark, {}), _jsx("span", { children: t.sourceCode })] }) })] }), isSubmittingAuth ? (_jsx("div", { className: "auth-loading-overlay", role: "status", "aria-live": "polite", "aria-label": t.wait, children: _jsxs("div", { className: "auth-loading-stack", children: [_jsx("span", { className: "auth-loading-rocket", "aria-hidden": "true", children: "\uD83D\uDE80" }), _jsxs("p", { className: "auth-loading-text", children: [loadingLines[loadingStep], ".".repeat(loadingDots)] })] }) })) : null] }));
}
