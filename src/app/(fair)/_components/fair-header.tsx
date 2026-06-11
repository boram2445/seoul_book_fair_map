"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LogIn } from "lucide-react";

import { tabs } from "@/app/(fair)/_lib/tabs";
import { useFavorites } from "@/components/fair-map/use-favorites";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function isActiveTab(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function FairHeader() {
  const pathname = usePathname();
  const { favorites } = useFavorites();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-brand-panel">
      <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.28em] text-brand-rust uppercase">SIBF 2026</p>
            <h1 className="mt-1 text-2xl font-black tracking-normal">서울국제도서전 맵</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-9 items-center gap-2 border border-border bg-brand-yellow px-3 text-sm font-black">
              <Heart className="h-4 w-4 fill-brand-coral text-brand-coral" />
              {favorites.length}
            </div>
            <Button type="button" variant="outline" size="sm" className="h-9 border-border bg-white">
              <LogIn className="h-4 w-4" />
              로그인
            </Button>
          </div>
        </div>

        <nav className="grid h-12 w-full grid-cols-6 gap-0 overflow-hidden border border-border bg-white lg:w-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActiveTab(pathname, tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex h-12 items-center justify-center gap-1.5 border-r border-border px-1.5 text-xs font-black last:border-r-0 sm:min-w-20 sm:text-sm xl:min-w-24",
                  active ? "bg-brand-ink text-white" : "hover:bg-brand-yellow"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
