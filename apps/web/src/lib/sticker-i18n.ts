import type { Locale } from "../i18n";
import type { StickerItem, StickerPack } from "../types";

const PACK_I18N: Record<string, { title: Record<Locale, string>; description?: Record<Locale, string> }> = {
  "default-standard-emotions": {
    title: { en: "Standard emotions", ru: "Стандартные эмоции" },
    description: { en: "Quick common reactions for chats", ru: "Быстрые реакции для чатов" }
  },
  "default-sticker-mood": {
    title: { en: "Mood stickers", ru: "Стикеры настроения" },
    description: { en: "Standalone sticker messages", ru: "Отдельные сообщения-стикеры" }
  }
};

const STICKER_LABEL_I18N: Record<string, Record<Locale, string>> = {
  "slightly smiling": { en: "Slightly smiling", ru: "Лёгкая улыбка" },
  "smiling face": { en: "Smiling face", ru: "Улыбка" },
  "winking face": { en: "Winking face", ru: "Подмигивание" },
  "cool face": { en: "Cool face", ru: "Круто" },
  handshake: { en: "Handshake", ru: "Рукопожатие" },
  thanks: { en: "Thanks", ru: "Спасибо" },
  fire: { en: "Fire", ru: "Огонь" },
  "party popper": { en: "Party popper", ru: "Праздник" },
  "red heart": { en: "Red heart", ru: "Сердце" },
  "thumbs up": { en: "Thumbs up", ru: "Лайк" },
  Happy: { en: "Happy", ru: "Радость" },
  Love: { en: "Love", ru: "Любовь" },
  Wow: { en: "Wow", ru: "Вау" },
  Party: { en: "Party", ru: "Вечеринка" },
  Sleepy: { en: "Sleepy", ru: "Сонный" },
  Angry: { en: "Angry", ru: "Злость" }
};

export function localizeStickerLabel(label: string, locale: Locale): string {
  return STICKER_LABEL_I18N[label]?.[locale] ?? label;
}

export function localizeStickerItem(sticker: StickerItem, locale: Locale): StickerItem {
  return {
    ...sticker,
    label: localizeStickerLabel(sticker.label, locale)
  };
}

export function localizeStickerPack(pack: StickerPack, locale: Locale): StickerPack {
  const packMeta = PACK_I18N[pack.slug];
  return {
    ...pack,
    title: packMeta?.title[locale] ?? pack.title,
    description: packMeta?.description?.[locale] ?? pack.description,
    stickers: pack.stickers.map((sticker) => localizeStickerItem(sticker, locale))
  };
}

export function localizeStickerPacks(packs: StickerPack[], locale: Locale): StickerPack[] {
  return packs.map((pack) => localizeStickerPack(pack, locale));
}

export function stickerPreviewLabel(locale: Locale): string {
  return locale === "ru" ? "Стикер" : "Sticker";
}
