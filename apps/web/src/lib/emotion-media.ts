export type EmotionGifPreset = {
  id: string;
  labelEn: string;
  labelRu: string;
  url: string;
};

export type EmotionVideoPreset = {
  id: string;
  labelEn: string;
  labelRu: string;
  url: string;
  poster?: string;
};

const FALLBACK_GIFS: EmotionGifPreset[] = [
  { id: "happy", labelEn: "Happy", labelRu: "Радость", url: "/emotion-assets/gifs/happy.gif" },
  { id: "wow", labelEn: "Wow", labelRu: "Вау", url: "/emotion-assets/gifs/wow.gif" },
  { id: "party", labelEn: "Party", labelRu: "Вечеринка", url: "/emotion-assets/gifs/party.gif" },
  { id: "thanks", labelEn: "Thanks", labelRu: "Спасибо", url: "/emotion-assets/gifs/thanks.gif" }
];

const FALLBACK_VIDEOS: EmotionVideoPreset[] = [
  { id: "wave", labelEn: "Wave clip", labelRu: "Волна", url: "/emotion-assets/videos/wave.mp4" },
  { id: "flower", labelEn: "Flower clip", labelRu: "Цветок", url: "/emotion-assets/videos/flower.mp4" }
];

export const EMOTION_GIF_PRESETS: EmotionGifPreset[] = FALLBACK_GIFS;
export const EMOTION_VIDEO_PRESETS: EmotionVideoPreset[] = FALLBACK_VIDEOS;
