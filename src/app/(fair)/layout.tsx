import type { ReactNode } from "react";

import { FairHeader } from "@/app/(fair)/_components/fair-header";
import { FavoritesSync } from "@/components/fair-map/favorites-sync";
import { ViewportHeightFix } from "@/components/fair-app/viewport-height-fix";

export default function FairLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex h-[var(--app-h)] flex-col overflow-hidden bg-background text-foreground">
      <FairHeader />
      <FavoritesSync />
      <ViewportHeightFix />
      <div className="flex flex-1 min-h-0 flex-col overflow-y-auto bg-brand-surface [&>*]:flex [&>*]:flex-1 [&>*]:flex-col">
        {children}
      </div>
    </main>
  );
}
