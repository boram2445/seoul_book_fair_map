import { useSyncExternalStore } from "react";

const ROUTE_VISIBLE_KEY = "sibf-route-visible";
const ROUTE_VISIBLE_EVENT = "sibf-route-visible-change";
const SERVER_SNAPSHOT = false;

let cache: { raw: string; parsed: boolean } | null = null;

function readStorage(): boolean {
  try {
    const raw = window.localStorage.getItem(ROUTE_VISIBLE_KEY) ?? "false";
    if (cache && cache.raw === raw) return cache.parsed;
    const parsed: unknown = JSON.parse(raw);
    const result = parsed === true;
    cache = { raw, parsed: result };
    return result;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(ROUTE_VISIBLE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(ROUTE_VISIBLE_EVENT, callback);
  };
}

function notifyChange() {
  window.dispatchEvent(new Event(ROUTE_VISIBLE_EVENT));
}

/** 지도 경로 버튼 ON/OFF 상태를 localStorage에 영속 */
export function useRouteVisible() {
  const visible = useSyncExternalStore(subscribe, readStorage, () => SERVER_SNAPSHOT);

  function setVisible(value: boolean) {
    cache = null;
    window.localStorage.setItem(ROUTE_VISIBLE_KEY, JSON.stringify(value));
    notifyChange();
  }

  return { visible, setVisible };
}
