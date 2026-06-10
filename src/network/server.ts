import 'server-only';

import { API_BASE_URL, parseResponse } from './base';

// 공개 데이터용 서버 fetch — 인증 토큰 없음.
// Next 데이터 캐시 옵션(tags, revalidate)을 그대로 통과시킨다.
export async function publicFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) ?? {}),
    },
    ...options,
  });
  return parseResponse<T>(res);
}

// 인증 사용자 전용 서버 fetch — 인증 도입 시 아래를 참고해 추가한다.
//
// import { auth } from '@/auth';
//
// export async function authedFetch<T>(path: string, options?: RequestInit): Promise<T> {
//   const session = await auth();
//   const extraHeaders: Record<string, string> = session?.accessToken
//     ? { Authorization: `Bearer ${session.accessToken}` }
//     : {};
//
//   const res = await fetch(`${API_BASE_URL}${path}`, {
//     cache: 'no-store',
//     headers: { 'Content-Type': 'application/json', ...extraHeaders, ...options?.headers },
//     ...options,
//   });
//   return parseResponse<T>(res);
// }
