import { useSyncExternalStore } from "react";

const FAVORITES_KEY = "sibf-map-favorites";
const FAVORITES_EVENT = "sibf-favorites-change";
const SERVER_SNAPSHOT: string[] = [];

let cache: { raw: string; parsed: string[] } | null = null;

function readStorage(): string[] {
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY) ?? "[]";
    if (cache && cache.raw === raw) return cache.parsed;
    const parsed = JSON.parse(raw);
    const result = Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
    cache = { raw, parsed: result };
    return result;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(FAVORITES_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(FAVORITES_EVENT, callback);
  };
}

function notifyChange() {
  window.dispatchEvent(new Event(FAVORITES_EVENT));
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, readStorage, () => SERVER_SNAPSHOT);

  function toggleFavorite(booth: string) {
    const current = readStorage();
    const next = current.includes(booth)
      ? current.filter((item) => item !== booth)
      : [...current, booth];
    cache = null;
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    notifyChange();
  }

  function reorderFavorites(newOrder: string[]) {
    cache = null;
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(newOrder));
    notifyChange();
  }

  return { favorites, toggleFavorite, reorderFavorites };
}
