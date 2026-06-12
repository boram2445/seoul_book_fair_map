import { useSyncExternalStore } from "react";

import { createClient } from "@/lib/supabase/client";

const MEMO_KEY = "sibf-route-memos";
const MEMO_EVENT = "sibf-memos-change";
const SERVER_SNAPSHOT: Record<string, string> = {};

let cache: { raw: string; parsed: Record<string, string> } | null = null;

function readStorage(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(MEMO_KEY) ?? "{}";
    if (cache && cache.raw === raw) return cache.parsed;
    const parsed = JSON.parse(raw);
    const result =
      typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, string>)
        : {};
    cache = { raw, parsed: result };
    return result;
  } catch {
    return SERVER_SNAPSHOT;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(MEMO_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(MEMO_EVENT, callback);
  };
}

function notifyChange() {
  window.dispatchEvent(new Event(MEMO_EVENT));
}

export function useBoothMemo() {
  const memos = useSyncExternalStore(subscribe, readStorage, () => SERVER_SNAPSHOT);

  function updateMemo(booth: string, text: string) {
    const current = readStorage();
    const next = { ...current };
    if (text.trim()) {
      next[booth] = text;
    } else {
      delete next[booth];
    }
    cache = null;
    window.localStorage.setItem(MEMO_KEY, JSON.stringify(next));
    notifyChange();

    // fire-and-forget: 로그인 시 DB 영속화 (auth.uid() null이면 RPC가 no-op)
    const supabase = createClient();
    supabase
      .rpc("set_visit_memo", { p_exhibitor_no: Number(booth), p_memo: text })
      .then(({ error }) => {
        if (error) console.warn("[booth-memo] set_visit_memo failed:", error.message);
      });
  }

  return { memos, updateMemo };
}
