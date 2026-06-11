import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <p className="text-lg font-bold">로그인 중 오류가 발생했습니다.</p>
      <p className="text-sm text-muted-foreground">
        잠시 후 다시 시도해 주세요.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href="/">홈으로 돌아가기</Link>
      </Button>
    </main>
  );
}
