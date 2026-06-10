// fetch 래퍼 공통 토대 — ApiError, API_BASE_URL, 공통 응답 파서

export class ApiError extends Error {
  name = 'ApiError';
  status: number; // HTTP 상태 코드
  code?: string; // 백엔드 에러 코드 (예: 'UNAUTHORIZED')

  constructor(status: number, code?: string, message?: string) {
    super(message ?? `요청 실패 (${status})`);
    this.status = status;
    this.code = code;
  }
}

// 백엔드 base URL — 서버/클라이언트 래퍼에서 경로 앞에 붙인다. 미설정 시 빈 문자열로 폴백.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

// 공통 응답 파서 — 2xx면 본문을 반환하고 그 외엔 ApiError를 던진다
export async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return null as T;

  const contentType = res.headers.get('content-type') ?? '';
  type JsonBody = { code?: string; message?: string };
  let body: JsonBody | null = null;
  if (contentType.includes('application/json')) {
    try {
      body = (await res.json()) as JsonBody;
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.code,
      body?.message ?? `요청 실패 (${res.status})`,
    );
  }

  return body as T;
}
