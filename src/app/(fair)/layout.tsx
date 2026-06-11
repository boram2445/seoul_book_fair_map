import type { ReactNode } from "react";

import { FairHeader } from "@/app/(fair)/_components/fair-header";

export default function FairLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <FairHeader />
      <div className="flex flex-1 flex-col bg-brand-surface [&>*]:flex [&>*]:flex-1 [&>*]:flex-col">
        {children}
      </div>
    </main>
  );
}
