"use client";

import { useMemo } from "react";
import { Heart } from "lucide-react";

import { boothForMap, exhibitors, getDisplayName } from "@/components/fair-map/map-data";
import { useFavorites } from "@/components/fair-map/use-favorites";

export function RouteList() {
  const { favorites } = useFavorites();

  const favoriteItems = useMemo(() => {
    return favorites
      .map((booth) => exhibitors.find((exhibitor) => boothForMap(exhibitor) === booth))
      .filter((exhibitor): exhibitor is (typeof exhibitors)[number] => Boolean(exhibitor));
  }, [favorites]);

  if (!favoriteItems.length) {
    return (
      <div className="border border-border bg-white p-6">
        <p className="text-lg font-black">찜한 부스가 없습니다.</p>
      </div>
    );
  }

  return (
    <ol className="grid gap-3">
      {favoriteItems.map((item, index) => (
        <li key={`${boothForMap(item)}-${item.no}`} className="grid grid-cols-[48px_minmax(0,1fr)_auto] border border-border bg-white">
          <div className="flex items-center justify-center border-r border-border bg-brand-green font-black">
            {index + 1}
          </div>
          <div className="min-w-0 px-4 py-3">
            <h3 className="truncate text-base font-black">{getDisplayName(item)}</h3>
            <p className="text-sm font-bold text-brand-muted">{boothForMap(item)}</p>
          </div>
          <div className="flex items-center border-l border-border px-3">
            <Heart className="h-4 w-4 fill-brand-coral text-brand-coral" />
          </div>
        </li>
      ))}
    </ol>
  );
}
