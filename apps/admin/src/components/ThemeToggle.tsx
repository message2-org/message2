import type { Theme } from "../hooks/useTheme";

type ThemeToggleProps = {
  theme: Theme;
  onToggle: () => void;
  label?: string;
};

export function ThemeToggle({ theme, onToggle, label = "Theme" }: ThemeToggleProps) {
  const icon = theme === "dark" ? "/icons/moon.svg" : "/icons/sun.svg";
  return (
    <button
      type="button"
      className={`theme-toggle ${theme === "dark" ? "theme-toggle--dark" : ""}`}
      onClick={onToggle}
      aria-label={`${label}: ${theme === "dark" ? "dark" : "light"}`}
    >
      <span className="theme-toggle__thumb">
        <img src={icon} alt="" aria-hidden="true" />
      </span>
    </button>
  );
}
