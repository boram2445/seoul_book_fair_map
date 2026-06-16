'use client';

import { ReactNode, useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
  { ssr: false },
);
import { toast } from 'sonner';

import { ApiError } from '@/network/base';
import { Toaster } from '@/components/ui/sonner';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            // 401은 clientFetch가 처리하므로 중복 toast 방지
            if (error instanceof ApiError && error.status === 401) return;
            toast.error(
              error instanceof ApiError ? error.message : '문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
            );
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            if (error instanceof ApiError && error.status === 401) return;
            toast.error(
              error instanceof ApiError ? error.message : '요청을 처리하지 못했어요.',
            );
          },
        }),
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-center" />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
