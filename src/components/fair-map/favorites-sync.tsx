"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";
import { useFavorites } from "./use-favorites";

interface FavoritesSyncProps {
  userId: string | null;
}

export function FavoritesSync({ userId }: FavoritesSyncProps) {
  const { favorites, reorderFavorites } = useFavorites();

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    // userId 변경 시점의 localStorage 상태를 스냅샷
    const localNos = favorites;
    const localSet = new Set(localNos);

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
  // userId 변경(로그인/로그아웃)에만 반응 — favorites는 스냅샷 용도
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
