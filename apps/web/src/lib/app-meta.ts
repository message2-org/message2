declare const __APP_VERSION__: string;

export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.1.0";

export function appDisplayName(locale: "ru" | "en") {
  return locale === "ru" ? "Послание2 Web" : "Message2 Web";
}
