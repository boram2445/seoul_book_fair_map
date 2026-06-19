import { useSyncExternalStore } from "react";

import { createClient } from "@/lib/supabase/client";

const ENTRANCE_KEY = "sibf-route-entrance";
const ENTRANCE_EVENT = "sibf-entrance-change";
const SERVER_SNAPSHOT: "A" | "B" | null = null;

let cache: { raw: string; parsed: "A" | "B" | null } | null = null;

function readStorage(): "A" | "B" | null {
  try {
    const raw = window.localStorage.getItem(ENTRANCE_KEY) ?? "null";
    if (cache && cache.raw === raw) return cache.parsed;
    const parsed: unknown = JSON.parse(raw);
    const result = parsed === "A" || parsed === "B" ? parsed : null;
    cache = { raw, parsed: result };
    return result;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(ENTRANCE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(ENTRANCE_EVENT, callback);
  };
}

function notifyChange() {
  window.dispatchEvent(new Event(ENTRANCE_EVENT));
}

/** 찜 탭과 지도 탭이 별도 라우트라 localStorage + 커스텀 이벤트로 공유 */
export function useRouteEntrance() {
  const entrance = useSyncExternalStore(subscribe, readStorage, () => SERVER_SNAPSHOT);

  function setEntrance(value: "A" | "B" | null) {
    cache = null;
    window.localStorage.setItem(ENTRANCE_KEY, JSON.stringify(value));
    notifyChange();

    // fire-and-forget: 로그인 사용자의 기기 간 입구 선택 동기화
    const supabase = createClient();
    supabase
      .rpc("set_route_entrance", { p_entrance: value })
      .then(({ error }) => {
        if (error) console.warn("[route-entrance] set_route_entrance failed:", error.message);
      });
  }

  return { entrance, setEntrance };
}
