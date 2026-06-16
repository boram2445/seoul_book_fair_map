import type { ReactNode } from "react";

import { FairHeader } from "@/app/(fair)/_components/fair-header";
import { FavoritesSync } from "@/components/fair-map/favorites-sync";

export default function FairLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <FairHeader />
      <FavoritesSync />
      <div className="flex flex-1 min-h-0 flex-col overflow-y-auto bg-brand-surface [&>*]:flex [&>*]:flex-1 [&>*]:flex-col">
        {children}
      </div>
    </main>
  );
}
