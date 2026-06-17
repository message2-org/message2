import "./styles.css";
import { detectLocale, getMessages, persistLocale, type Locale, type Messages } from "./i18n/index.js";
import { fetchInstanceProfile, isOfficialSite } from "./instance.js";
import { fetchReleases, resolveProductUrl, type ReleaseProduct } from "./releases.js";
import { applyTheme, detectTheme, toggleTheme, type Theme } from "./theme.js";

type ProductLabelKey = keyof Pick<
  Messages,
  | "productWeb"
  | "productServerLinuxDeb"
  | "productServerWindows"
  | "productDesktopLinux"
  | "productDesktopWindows"
  | "productAndroidApk"
  | "productAndroidRustore"
  | "productIos"
>;

const PRODUCT_LABELS: Record<string, ProductLabelKey> = {
  web: "productWeb",
  "server-linux-deb": "productServerLinuxDeb",
  "server-windows": "productServerWindows",
  "desktop-linux": "productDesktopLinux",
  "desktop-windows": "productDesktopWindows",
  "android-apk": "productAndroidApk",
  "android-rustore": "productAndroidRustore",
  ios: "productIos"
};

const SERVER_IDS = new Set(["server-linux-deb", "server-windows"]);
const CLIENT_IDS = new Set([
  "web",
  "desktop-linux",
  "desktop-windows",
  "android-apk",
  "android-rustore",
  "ios"
]);

function productLabel(messages: Messages, id: string): string {
  const key = PRODUCT_LABELS[id];
  return key ? messages[key] : id;
}

function statusLabel(messages: Messages, status: string, isOfficial: boolean, id: string): string {
  if (!isOfficial && SERVER_IDS.has(id) && status === "coming_soon") {
    return messages.statusInstanceDeployed;
  }
  if (status === "available") {
    return messages.statusAvailable;
  }
  return messages.statusComingSoon;
}

function profileLabel(messages: Messages, profile: string | undefined): string {
  if (profile === "public") {
    return messages.profilePublic;
  }
  if (profile === "corporate") {
    return messages.profileCorporate;
  }
  return messages.profileUnknown;
}

function renderCard(
  messages: Messages,
  product: ReleaseProduct,
  isOfficial: boolean,
  officialBaseUrl: string
): string {
  const url = resolveProductUrl(product, officialBaseUrl, isOfficial);
  const status = statusLabel(messages, product.status, isOfficial, product.id);
  const statusClass =
    product.status === "available" ? "badge badge--ok" : isOfficial || !SERVER_IDS.has(product.id) ? "badge" : "badge badge--ok";

  const action =
    url && product.status === "available"
      ? `<a class="card__action" href="${url}">${messages.openWebApp}</a>`
      : `<span class="card__soon">${status}</span>`;

  return `
    <article class="card">
      <div class="card__head">
        <h3 class="card__title">${productLabel(messages, product.id)}</h3>
        <span class="${statusClass}">${status}</span>
      </div>
      ${action}
    </article>
  `;
}

function renderSection(title: string, cards: string): string {
  if (!cards.trim()) {
    return "";
  }
  return `
    <section class="section">
      <h2 class="section__title">${title}</h2>
      <div class="grid">${cards}</div>
    </section>
  `;
}

function renderApp(params: {
  locale: Locale;
  theme: Theme;
  isOfficial: boolean;
  deploymentProfile: string;
  host: string;
  serverCards: string;
  clientCards: string;
}) {
  const messages = getMessages(params.locale);
  const heroTitle = params.isOfficial ? messages.heroOfficialTitle : messages.heroInstanceTitle;
  const heroLead = params.isOfficial ? messages.heroOfficialLead : messages.heroInstanceLead;

  const root = document.getElementById("app");
  if (!root) {
    return;
  }

  root.innerHTML = `
    <div class="page">
      <header class="topbar">
        <div class="brand">
          <img class="brand__logo" src="/brand/logo.svg" width="44" height="44" alt="" />
          <div>
            <div class="brand__name">${messages.brandName}</div>
            <div class="brand__sub">${messages.brandSubtitle}</div>
          </div>
        </div>
        <div class="controls">
          <div class="segmented" role="group" aria-label="Language">
            <button type="button" data-locale="ru" class="segmented__btn ${params.locale === "ru" ? "is-active" : ""}">${messages.langRu}</button>
            <button type="button" data-locale="en" class="segmented__btn ${params.locale === "en" ? "is-active" : ""}">${messages.langEn}</button>
          </div>
          <button type="button" class="icon-btn" data-theme-toggle aria-label="Theme">
            ${params.theme === "dark" ? "☀" : "☾"}
          </button>
        </div>
      </header>

      <main class="main">
        <section class="hero">
          <p class="hero__eyebrow">${params.isOfficial ? "Message2" : profileLabel(messages, params.deploymentProfile)}</p>
          <h1 class="hero__title">${heroTitle}</h1>
          <p class="hero__lead">${heroLead}</p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="/app/">${messages.openWebApp}</a>
          </div>
          ${
            params.isOfficial
              ? ""
              : `<p class="hero__meta">${messages.instanceHost}: <code>${params.host}</code></p>`
          }
        </section>

        <section class="downloads">
          <h2 class="downloads__title">${messages.downloadsTitle}</h2>
          <p class="downloads__lead">${messages.downloadsLead}</p>
          ${renderSection(messages.serverSection, params.serverCards)}
          ${renderSection(messages.clientsSection, params.clientCards)}
        </section>
      </main>

      <footer class="footer">
        <p>${messages.footerTagline}</p>
        <a href="https://github.com/message2-org/message2" rel="noopener noreferrer">${messages.footerDocs}</a>
      </footer>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>("[data-locale]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.locale as Locale;
      persistLocale(next);
      window.location.reload();
    });
  });

  root.querySelector<HTMLButtonElement>("[data-theme-toggle]")?.addEventListener("click", () => {
    toggleTheme(params.theme);
    window.location.reload();
  });
}

async function boot() {
  const locale = detectLocale();
  const theme = detectTheme();
  applyTheme(theme);
  document.documentElement.lang = locale;

  const isOfficial = isOfficialSite();
  const [releases, profile] = await Promise.all([
    fetchReleases().catch(() => ({
      officialBaseUrl: "https://message2.ru",
      products: [] as ReleaseProduct[]
    })),
    isOfficial ? Promise.resolve(null) : fetchInstanceProfile()
  ]);

  const messages = getMessages(locale);
  const serverCards = releases.products
    .filter((p) => SERVER_IDS.has(p.id))
    .map((p) => renderCard(messages, p, isOfficial, releases.officialBaseUrl))
    .join("");
  const clientCards = releases.products
    .filter((p) => CLIENT_IDS.has(p.id))
    .map((p) => renderCard(messages, p, isOfficial, releases.officialBaseUrl))
    .join("");

  renderApp({
    locale,
    theme,
    isOfficial,
    deploymentProfile: profile?.deploymentProfile ?? "",
    host: window.location.host,
    serverCards,
    clientCards
  });
}

void boot();
