import { useSyncExternalStore } from "react";

import { createClient } from "@/lib/supabase/client";

const FAVORITES_KEY = "sibf-map-favorites-v2";
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
    const isRemoving = current.includes(booth);
    const next = isRemoving
      ? current.filter((item) => item !== booth)
      : [...current, booth];
    cache = null;
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    notifyChange();

    // fire-and-forget: 카운트 집계(익명 공용) + 로그인 시 찜 영속화
    const supabase = createClient();
    const no = Number(booth);
    supabase
      .rpc("bump_favorite_count", { p_exhibitor_no: no, p_delta: isRemoving ? -1 : 1 })
      .then(({ error }) => {
        if (error) console.warn("[favorites] bump_favorite_count failed:", error.message);
      });
    supabase
      .rpc(isRemoving ? "remove_favorite" : "add_favorite", { p_exhibitor_no: no })
      .then(({ error }) => {
        if (error) console.warn("[favorites] add/remove_favorite failed:", error.message);
      });
  }

  function reorderFavorites(newOrder: string[]) {
    cache = null;
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(newOrder));
    notifyChange();

    // fire-and-forget: 로그인 사용자의 기기 간 순서 동기화
    const supabase = createClient();
    supabase
      .rpc("set_favorite_order", { p_exhibitor_nos: newOrder.map(Number) })
      .then(({ error }) => {
        if (error) console.warn("[favorites] set_favorite_order failed:", error.message);
      });
  }

  return { favorites, toggleFavorite, reorderFavorites };
}
