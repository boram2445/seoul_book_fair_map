'use client';

import { API_BASE_URL, ApiError, parseResponse } from './base';

// 클라이언트 fetch — API_BASE_URL을 붙여 백엔드를 직접 호출한다.
// 인증을 도입할 경우:
//   - httpOnly 세션 쿠키 방식 → credentials: 'include' 추가 & Next /api 프록시 경유로 전환
//   - 401 수신 시 toast 안내 후 로그아웃 처리 추가
export async function clientFetch<T>(
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

  if (res.status === 401) {
    // 인증 도입 시: toast.error('세션이 만료되었어요.') + signOut 처리 추가
    throw new ApiError(401, 'UNAUTHENTICATED', '인증이 필요합니다.');
  }

  return parseResponse<T>(res);
}
