"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AuthMenuProps {
  user: User | null;
}

export function AuthMenu({ user: initialUser }: AuthMenuProps) {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(initialUser);

  // 탭 내 로그인/로그아웃 이벤트(예: 다른 탭)를 실시간 반영
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      router.refresh(); // 서버 상태(layout user)도 동기화
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  async function handleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (!user) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 border-border bg-white"
        onClick={handleLogin}
      >
        <LogIn className="h-4 w-4" />
        로그인
      </Button>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const fullName = user.user_metadata?.full_name as string | undefined;
  const email = user.email ?? "";
  const initials = (fullName ?? email).slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 cursor-pointer items-center gap-2 rounded-full focus:outline-none"
        >
          <Avatar size="sm" className="h-9 w-9 border border-border">
            <AvatarImage src={avatarUrl} alt={fullName ?? email} />
            <AvatarFallback className="text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="max-w-28 truncate text-sm font-bold">
            {fullName ?? email}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={handleLogout}
        >
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
