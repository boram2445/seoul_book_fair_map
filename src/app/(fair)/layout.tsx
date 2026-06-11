import type { ReactNode } from "react";

import { FairHeader } from "@/app/(fair)/_components/fair-header";

export default function FairLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <FairHeader />
      {children}
    </main>
  );
}
