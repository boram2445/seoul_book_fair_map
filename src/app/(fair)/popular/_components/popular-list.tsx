"use client";

import { useMemo } from "react";
import { Heart } from "lucide-react";

import { boothForMap, exhibitors, getDisplayName } from "@/components/fair-map/map-data";
import { useFavorites } from "@/components/fair-map/use-favorites";
import { cn } from "@/lib/utils";

export function PopularList() {
  const { favorites } = useFavorites();
  const favoriteSet = useMemo(() => new Set(favorites), [favorites]);

  const popularItems = useMemo(() => {
    return [...exhibitors]
      .sort((first, second) => {
        const firstFavorite = favoriteSet.has(boothForMap(first)) ? 1 : 0;
        const secondFavorite = favoriteSet.has(boothForMap(second)) ? 1 : 0;
        return secondFavorite - firstFavorite || first.no - second.no;
      })
      .slice(0, 6);
  }, [favoriteSet]);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {popularItems.map((item, index) => {
        const booth = boothForMap(item);
        const isFavorite = favoriteSet.has(booth);

        return (
          <article key={`${booth}-${item.no}`} className="grid grid-cols-[56px_minmax(0,1fr)_auto] border border-border bg-white">
            <div className="flex items-center justify-center border-r border-border bg-brand-yellow text-xl font-black">
              {index + 1}
            </div>
            <div className="min-w-0 px-4 py-3">
              <h3 className="truncate text-base font-black">{getDisplayName(item)}</h3>
              <p className="text-sm font-bold text-brand-muted">{booth}</p>
            </div>
            <div className="flex items-center gap-2 border-l border-border px-3 font-black">
              <Heart className={cn("h-4 w-4", isFavorite && "fill-brand-coral text-brand-coral")} />
              {isFavorite ? 1 : 0}
            </div>
          </article>
        );
      })}
    </div>
  );
}
