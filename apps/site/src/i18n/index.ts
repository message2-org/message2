export type Locale = "ru" | "en";

export type Messages = {
  brandName: string;
  brandSubtitle: string;
  heroOfficialTitle: string;
  heroOfficialLead: string;
  heroInstanceTitle: string;
  heroInstanceLead: string;
  openWebApp: string;
  downloadsTitle: string;
  downloadsLead: string;
  serverSection: string;
  clientsSection: string;
  statusAvailable: string;
  statusComingSoon: string;
  statusInstanceDeployed: string;
  profilePublic: string;
  profileCorporate: string;
  profileUnknown: string;
  instanceHost: string;
  themeLight: string;
  themeDark: string;
  langRu: string;
  langEn: string;
  footerTagline: string;
  footerDocs: string;
  productWeb: string;
  productServerLinuxDeb: string;
  productServerWindows: string;
  productDesktopLinux: string;
  productDesktopWindows: string;
  productAndroidApk: string;
  productAndroidRustore: string;
  productIos: string;
};

export const ru: Messages = {
  brandName: "Послание2",
  brandSubtitle: "Message2",
  heroOfficialTitle: "Защищённый мессенджер для интернета и корпоративных контуров",
  heroOfficialLead:
    "Один сервер — два профиля развёртывания: публичный и корпоративный. Скачивайте клиенты и поднимайте свой инстанс.",
  heroInstanceTitle: "Сервер Послание2",
  heroInstanceLead: "Это развёрнутый инстанс мессенджера. Откройте веб-клиент или скачайте приложения для ваших устройств.",
  openWebApp: "Открыть веб-мессенджер",
  downloadsTitle: "Загрузки",
  downloadsLead: "Доступные сборки и планируемые релизы для сервера и клиентов.",
  serverSection: "Сервер",
  clientsSection: "Клиенты",
  statusAvailable: "Доступно",
  statusComingSoon: "Скоро",
  statusInstanceDeployed: "Развёрнуто на этом хосте",
  profilePublic: "Публичный профиль",
  profileCorporate: "Корпоративный профиль",
  profileUnknown: "Профиль не определён",
  instanceHost: "Хост",
  themeLight: "Светлая",
  themeDark: "Тёмная",
  langRu: "RU",
  langEn: "EN",
  footerTagline: "Безопасный клиент-серверный мессенджер с поддержкой мультимедиа.",
  footerDocs: "Документация на GitHub",
  productWeb: "Веб-клиент",
  productServerLinuxDeb: "Сервер Linux (.deb)",
  productServerWindows: "Сервер Windows",
  productDesktopLinux: "Desktop Linux",
  productDesktopWindows: "Desktop Windows",
  productAndroidApk: "Android (APK)",
  productAndroidRustore: "Android (RuStore)",
  productIos: "iOS"
};

export const en: Messages = {
  brandName: "Message2",
  brandSubtitle: "Послание2",
  heroOfficialTitle: "Secure messenger for public internet and corporate perimeters",
  heroOfficialLead:
    "One server stack — two deployment profiles: public and corporate. Download clients or self-host your instance.",
  heroInstanceTitle: "Message2 server",
  heroInstanceLead: "This is a deployed messenger instance. Open the web client or download apps for your devices.",
  openWebApp: "Open web messenger",
  downloadsTitle: "Downloads",
  downloadsLead: "Available builds and planned releases for server and client platforms.",
  serverSection: "Server",
  clientsSection: "Clients",
  statusAvailable: "Available",
  statusComingSoon: "Coming soon",
  statusInstanceDeployed: "Deployed on this host",
  profilePublic: "Public profile",
  profileCorporate: "Corporate profile",
  profileUnknown: "Profile unknown",
  instanceHost: "Host",
  themeLight: "Light",
  themeDark: "Dark",
  langRu: "RU",
  langEn: "EN",
  footerTagline: "Secure client-server messenger with multimedia support.",
  footerDocs: "Documentation on GitHub",
  productWeb: "Web client",
  productServerLinuxDeb: "Linux server (.deb)",
  productServerWindows: "Windows server",
  productDesktopLinux: "Desktop Linux",
  productDesktopWindows: "Desktop Windows",
  productAndroidApk: "Android (APK)",
  productAndroidRustore: "Android (RuStore)",
  productIos: "iOS"
};

const catalogs = { ru, en } as const;

export function getMessages(locale: Locale): Messages {
  return catalogs[locale];
}

export function detectLocale(): Locale {
  const params = new URLSearchParams(window.location.search);
  const queryLang = params.get("lang");
  if (queryLang === "ru" || queryLang === "en") {
    return queryLang;
  }

  const stored = localStorage.getItem("message2-site-locale");
  if (stored === "ru" || stored === "en") {
    return stored;
  }

  const nav = navigator.language.toLowerCase();
  return nav.startsWith("ru") ? "ru" : "en";
}

export function persistLocale(locale: Locale) {
  localStorage.setItem("message2-site-locale", locale);
}
