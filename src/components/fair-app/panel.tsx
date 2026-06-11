import type { ComponentType, ReactNode } from "react";

export function Panel({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-b border-border bg-brand-panel">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-brand-yellow">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="truncate text-xl font-black">{title}</h2>
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

export function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border bg-white px-4 py-3">
      <p className="text-xs font-black text-brand-muted uppercase">{label}</p>
      <strong className="mt-1 block text-lg font-black">{value}</strong>
    </div>
  );
}
