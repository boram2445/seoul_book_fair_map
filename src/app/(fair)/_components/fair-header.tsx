"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { tabs } from "@/app/(fair)/_lib/tabs";
import { AuthMenu } from "@/components/auth/auth-menu";
import { useFavorites } from "@/components/fair-map/use-favorites";
import { cn } from "@/lib/utils";

function isActiveTab(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

interface FairHeaderProps {
  user: User | null;
}

export function FairHeader({ user }: FairHeaderProps) {
  const pathname = usePathname();
  const { favorites } = useFavorites();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-brand-panel">
      <div className="flex flex-col gap-2 px-3 py-2 sm:px-4 sm:py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.22em] text-brand-rust uppercase sm:text-xs sm:tracking-[0.28em]">
              SIBF 2026
            </p>
            <h1 className="mt-0.5 text-xl font-black tracking-normal sm:mt-1 sm:text-2xl">
              서울국제도서전 맵
            </h1>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden h-8 items-center gap-1.5 border border-border bg-brand-yellow px-2.5 text-xs font-black sm:flex sm:h-9 sm:gap-2 sm:px-3 sm:text-sm">
              <Heart className="h-3.5 w-3.5 fill-brand-coral text-brand-coral sm:h-4 sm:w-4" />
              {favorites.length}
            </div>
            <AuthMenu user={user} />
          </div>
        </div>

        <nav className="grid h-10 w-full grid-cols-5 gap-0 overflow-hidden border border-border bg-white sm:h-12 lg:w-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActiveTab(pathname, tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex h-10 items-center justify-center gap-1 border-r border-border px-1 text-[11px] font-black last:border-r-0 sm:h-12 sm:min-w-20 sm:gap-1.5 sm:px-1.5 sm:text-sm xl:min-w-24",
                  active ? "bg-brand-ink text-white" : "hover:bg-brand-yellow"
                )}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
