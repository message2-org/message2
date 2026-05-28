import type { Locale } from "../i18n";
import emojiDataEn from "emoji-picker-react/dist/data/emojis-en";
import emojiDataRu from "emoji-picker-react/dist/data/emojis-ru";
import { Categories, SuggestionMode } from "emoji-picker-react";

export function emojiPickerData(locale: Locale) {
  return locale === "ru" ? emojiDataRu : emojiDataEn;
}

export function emojiPickerCategories(locale: Locale) {
  if (locale === "ru") {
    return [
      { category: Categories.SUGGESTED, name: "Недавние" },
      { category: Categories.SMILEYS_PEOPLE, name: "Смайлы и люди" },
      { category: Categories.ANIMALS_NATURE, name: "Животные и природа" },
      { category: Categories.FOOD_DRINK, name: "Еда и напитки" },
      { category: Categories.TRAVEL_PLACES, name: "Путешествия и места" },
      { category: Categories.ACTIVITIES, name: "Активности" },
      { category: Categories.OBJECTS, name: "Предметы" },
      { category: Categories.SYMBOLS, name: "Символы" },
      { category: Categories.FLAGS, name: "Флаги" }
    ];
  }
  return [
    { category: Categories.SUGGESTED, name: "Recently used" },
    { category: Categories.SMILEYS_PEOPLE, name: "Smileys & People" },
    { category: Categories.ANIMALS_NATURE, name: "Animals & Nature" },
    { category: Categories.FOOD_DRINK, name: "Food & Drink" },
    { category: Categories.TRAVEL_PLACES, name: "Travel & Places" },
    { category: Categories.ACTIVITIES, name: "Activities" },
    { category: Categories.OBJECTS, name: "Objects" },
    { category: Categories.SYMBOLS, name: "Symbols" },
    { category: Categories.FLAGS, name: "Flags" }
  ];
}

export function emojiPickerLabels(locale: Locale) {
  if (locale === "ru") {
    return {
      searchPlaceholder: "Поиск",
      searchClearButtonLabel: "Очистить",
      previewTitle: "Выберите смайл",
      suggestedEmojisMode: SuggestionMode.RECENT
    };
  }
  return {
    searchPlaceholder: "Search",
    searchClearButtonLabel: "Clear",
    previewTitle: "Pick an emoji",
    suggestedEmojisMode: SuggestionMode.RECENT
  };
}
