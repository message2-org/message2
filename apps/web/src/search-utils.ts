import type { ChatItem } from "./types";

export function normalizeSearchQuery(q: string): string {
  return q.trim().toLowerCase().replace(/^@+/, "");
}

/** Matches chat title, group name, or DM peer username (with or without leading @). */
export function chatMatchesSearch(chat: ChatItem, q: string): boolean {
  const needle = normalizeSearchQuery(q);
  if (!needle) return true;
  if (chat.name.toLowerCase().includes(needle)) return true;
  if (chat.peerUsername && chat.peerUsername.toLowerCase().includes(needle)) return true;
  return false;
}
