import type { ReactNode } from "react";

import { FairHeader } from "@/app/(fair)/_components/fair-header";
import { FavoritesSync } from "@/components/fair-map/favorites-sync";
import { createClient } from "@/lib/supabase/server";

export default async function FairLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <FairHeader user={user} />
      <FavoritesSync userId={user?.id ?? null} />
      <div className="flex flex-1 min-h-0 flex-col overflow-y-auto bg-brand-surface [&>*]:flex [&>*]:flex-1 [&>*]:flex-col">
        {children}
      </div>
    </main>
  );
}
