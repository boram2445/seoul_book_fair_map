"use client";

import { Heart } from "lucide-react";

import { useFavorites } from "@/components/fair-map/use-favorites";

interface PublisherFavoriteCountProps {
  baseCount: number;
  favoriteKey: string;
}

export function PublisherFavoriteCount({ baseCount, favoriteKey }: PublisherFavoriteCountProps) {
  const { favorites } = useFavorites();
  const isFavorite = favorites.includes(favoriteKey);
  const count = baseCount + (isFavorite ? 1 : 0);

  return (
    <span className="inline-flex items-center gap-1 border border-border bg-white px-2 py-1 text-xs font-black text-brand-coral-deep">
      <Heart className="h-3.5 w-3.5 fill-brand-coral text-brand-coral" />
      {count}
    </span>
  );
}
