'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">문제가 발생했습니다</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || '알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.'}
      </p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
