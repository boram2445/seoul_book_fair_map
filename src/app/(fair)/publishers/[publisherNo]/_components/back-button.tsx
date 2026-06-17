"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => router.back()}
      className="rounded-none border-border bg-white font-black hover:bg-brand-yellow"
    >
      <ChevronLeft className="h-4 w-4" />
      뒤로
    </Button>
  );
}
