"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { useFavorites } from "./use-favorites";
import { useBoothMemo } from "./use-booth-memo";

export function FavoritesSync() {
  const { favorites, reorderFavorites } = useFavorites();
  const { memos, updateMemo } = useBoothMemo();
  const [userId, setUserId] = useState<string | null>(null);

  // 클라이언트에서 user를 직접 구독 — layout의 서버 인증 의존 제거
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // userId 변경(로그인/로그아웃)에만 반응 — favorites/memos는 스냅샷 용도
  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    // userId 변경 시점의 localStorage 상태를 스냅샷
    const localNos = favorites;
    const localSet = new Set(localNos);
    const localMemos = memos;

    // ── 찜 동기화 ──────────────────────────────────────────────────────────────
    supabase.rpc("list_my_favorite_nos").then(({ data, error }) => {
      if (error) {
        console.warn("[favorites-sync] list_my_favorite_nos failed:", error.message);
        return;
      }

      const dbNos = ((data as number[]) ?? []).map(String);
      const dbSet = new Set(dbNos);

      // DB에만 있는 찜 → localStorage에 추가 (저장소 삭제 후 복원)
      const onlyInDb = dbNos.filter((no) => !localSet.has(no));
      if (onlyInDb.length > 0) {
        reorderFavorites([...localNos, ...onlyInDb]);
      }

      // localStorage에만 있는 찜 → DB push
      const onlyInLocal = localNos.filter((no) => !dbSet.has(no));
      onlyInLocal.forEach((no) => {
        supabase
          .rpc("add_favorite", { p_exhibitor_no: Number(no) })
          .then(({ error: rpcError }) => {
            if (rpcError) console.warn("[favorites-sync] add_favorite failed:", rpcError.message);
          });
      });
    });

    // ── 메모 동기화 (로컬 우선) ────────────────────────────────────────────────
    supabase.rpc("list_my_favorite_memos").then(({ data, error }) => {
      if (error) {
        console.warn("[favorites-sync] list_my_favorite_memos failed:", error.message);
        return;
      }

      type MemoRow = { exhibitor_no: number; visit_memo: string };
      const dbMemos = (data as MemoRow[]) ?? [];

      dbMemos.forEach(({ exhibitor_no, visit_memo }) => {
        const no = String(exhibitor_no);
        // DB에만 있는 메모 → 로컬에 주입 (로컬에 값 없을 때만)
        if (!localMemos[no]) {
          updateMemo(no, visit_memo);
        }
      });

      // 로컬에 있는 메모 → DB push (현재 찜 목록에 있는 부스만)
      // 찜 해제된 부스의 잔존 메모를 push하면 set_visit_memo가 favorites 행을 재생성하고
      // 이후 list_my_favorite_nos 동기화가 그 부스를 찜 목록에 다시 추가하는 버그가 발생함.
      const dbMemoMap = new Map(dbMemos.map((r) => [String(r.exhibitor_no), r.visit_memo]));
      Object.entries(localMemos).forEach(([no, text]) => {
        if (!localSet.has(no)) return; // 찜 해제된 부스의 메모는 push 건너뜀
        if (text && text !== dbMemoMap.get(no)) {
          supabase
            .rpc("set_visit_memo", { p_exhibitor_no: Number(no), p_memo: text })
            .then(({ error: rpcError }) => {
              if (rpcError) console.warn("[favorites-sync] set_visit_memo failed:", rpcError.message);
            });
        }
      });
    });
  // userId 변경에만 반응 — favorites/memos는 스냅샷 용도
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
