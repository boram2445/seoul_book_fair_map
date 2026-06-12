# Supabase API 명세

> 실사용 6개 테이블(`booth_shapes`, `publishers`, `publisher_events`, `favorites`, `comments`, `profiles`)을 기준으로 작성해야 할 API 목록.
> 행사정보(`fairs` 계열)는 정적 데이터이므로 API 없음. (참고: [supabase-schema-review.md](./supabase-schema-review.md))

## 전제 / 스택

| 항목 | 내용 |
|---|---|
| 클라이언트 | `@supabase/ssr` — `src/lib/supabase/{client,server,middleware}.ts` 이미 존재 |
| 데이터 패칭 | 공개 읽기 = **Server Component**(`server.ts`), 사용자 상호작용 = **Client + React Query**(`client.ts`) |
| API 함수 위치 | `src/api/<feature>/<feature>.ts` (CLAUDE.md 컨벤션) |
| React Query 훅 | `src/app/<route>/_hooks/use-*.ts` — GET→`useQuery`, 그 외→`useMutation` |
| Query key | `['<feature>', '<entity>', '<action>', ...deps]` 계층 배열로 상수화 |
| 타입 | `src/lib/types/<feature>/{request,response,type}.ts` |

## RLS 권한 요약 (마이그레이션 기준)

| 테이블 | 공개 읽기(anon) | 사용자(authenticated) | 관리자 |
|---|---|---|---|
| `booth_shapes` | ✅ 전체 | — | CUD |
| `publishers` | ✅ 전체 | — | CUD |
| `publisher_events` | ✅ `status='published'`만 | — | CUD |
| `profiles` | ✅ 전체 | 본인 생성/수정 | 수정 |
| `favorites` | ❌ | 본인 행 RUD만 | — |
| `comments` | ✅ visible만 | 본인 pending 생성/수정 | 수정/삭제 |

> ⚠️ `favorites`는 본인 행만 조회 가능 → **인기 집계는 클라이언트 쿼리 불가, RPC 필수**(아래 §인기).

---

## API 목록 (기능별)

### 1. 부스 지도 — `booth-shapes` / `publishers`

| 함수 | 종류 | 권한 | 설명 |
|---|---|---|---|
| `getBoothShapes()` | query | 공개 | 부스 사각형 전체(213개). 지도 렌더용. 거의 정적 → **Server Component**에서 호출, Next `revalidate` 길게 설정(또는 정적 렌더). 클라이언트 island에서 쓸 경우에만 `staleTime: Infinity` |
| `getPublishers()` | query | 공개 | 참가사 **436개** 전체(지도 단일 소스). 상세 병합 420개, 상세 없는 16개는 exhibitors 기본값으로 backfill(categories/introduction 빈 값). |
| `getPublisherByExhibitorNo(no)` | query | 공개 | 상세 페이지 `/publishers/{no}`. 라우트 키 = **`exhibitor_no`** (결정). |

> 검색/카테고리 필터는 현재 앱처럼 **클라이언트에서** `getPublishers()` 결과로 처리(전량 로드라 서버 검색 불필요).

### 2. 이벤트 — `publisher_events`

| 함수 | 종류 | 권한 | 설명 |
|---|---|---|---|
| `getEventsByPublisher(publisherId)` | query | 공개 | 선택 부스/찜 카드의 이벤트. RLS가 published만 반환 |
| `getPublishedEvents(params?)` | query | 공개 | 이벤트 탭(현재 비활성)용 전체 목록. `event_date`/`starts_at` 정렬·필터 |
| `createEvent(input)` / `updateEvent(id, input)` / `deleteEvent(id)` | mutation | 관리자 | 운영자 이벤트 CRUD. `status`, `created_by`, `sort_order` 포함 |

### 3. 찜 — `favorites`

| 함수 | 종류 | 권한 | 설명 |
|---|---|---|---|
| `getMyFavorites()` | query | 인증 | 내 찜 목록 + `publishers` 조인, `sort_order` 정렬 |
| `addFavorite(publisherId)` | mutation | 인증 | 찜 추가 (낙관적 업데이트 권장) |
| `removeFavorite(publisherId)` | mutation | 인증 | 찜 해제 |
| `reorderFavorites(orderedPublisherIds)` | mutation(RPC 권장) | 인증 | 드래그 방문순서 → `sort_order` 일괄 갱신. 여러 행 동시 변경이므로 **원자성 위해 RPC 권장**. batch upsert도 가능(본인 찜이라 부분 실패 저위험·자가복구) |
| `updateVisitMemo(publisherId, memo)` | mutation | 인증 | 방문 메모 저장(onBlur). 빈 값이면 null |

> 기존 localStorage 훅(`use-favorites.ts`/`use-booth-memo.ts`)을 이 API로 대체. 비로그인 사용자는 localStorage 유지 후 로그인 시 머지 전략 고려.

### 4. 인기 — `favorites` 집계 (⚠️ RPC 필요)

| 함수 | 종류 | 권한 | 설명 |
|---|---|---|---|
| `getPublisherFavoriteCounts()` | query(RPC) | 공개 | **신규 `SECURITY DEFINER` RPC.** 출판사별 찜 수 집계 반환. RLS 우회해 전체 카운트 노출(개인 찜 내역은 비노출) |

```sql
-- 신규 작성 필요: 인기 순위용 집계 함수 (Supabase 권장 보안 패턴)
-- 1) 집계 로직은 private 스키마에 격리
create or replace function private.get_publisher_favorite_counts()
returns table (publisher_id uuid, favorite_count bigint)
language sql stable security definer set search_path = '' as $$
  select publisher_id, count(*) as favorite_count
  from public.favorites
  group by publisher_id;
$$;

-- 2) public wrapper — 외부 노출은 이 함수만
create or replace function public.publisher_favorite_counts()
returns table (publisher_id uuid, favorite_count bigint)
language sql stable set search_path = '' as $$
  select * from private.get_publisher_favorite_counts();
$$;

-- 3) 권한 최소화
revoke execute on function public.publisher_favorite_counts() from public;
grant execute on function public.publisher_favorite_counts() to anon, authenticated;
```

> 인기 탭은 `getPublishers()` + `getPublisherFavoriteCounts()`를 합쳐 정렬. 목업 `getMockHeartCount`(`publisher-stats.ts`) 대체.

### 5. 후기 — `comments` (+ `profiles` 조인)

| 함수 | 종류 | 권한 | 설명 |
|---|---|---|---|
| `getComments({scope?, publisherId?})` | query | 공개 | 후기 피드. visible만. `profiles`(nickname/avatar) 조인, `created_at` 정렬 |
| `createComment(input)` | mutation | 인증 | 후기 작성. `status='pending'`로 생성(검수 대기). scope/target_label/content/rating/photo_urls |
| `updateMyComment(id, input)` | mutation | 인증 | 본인 pending 후기 수정 |
| `deleteMyComment(id)` | mutation | 인증 | 본인 후기 삭제(soft: `status='deleted'`) |
| `moderateComment(id, status)` | mutation | 관리자 | 검수 — published/hidden 전환 |

> 사진 업로드는 **Supabase Storage** 필요 → `uploadReviewPhoto(file)` 별도(버킷+정책). `photo_urls`에 URL 배열 저장(≤4).

### 6. 프로필 / 인증 — `profiles` + Supabase Auth

| 함수 | 종류 | 권한 | 설명 |
|---|---|---|---|
| `getMyProfile()` | query | 인증 | 내 프로필 |
| `updateMyProfile({nickname, avatar_url})` | mutation | 인증 | 닉네임/아바타 수정 |
| `signIn / signUp / signOut` | mutation | — | Supabase Auth. 가입 시 `handle_new_user()` 트리거가 `profiles` 자동 생성 |

> 작성자 표시는 보통 별도 호출 없이 `comments`의 `profiles` 조인으로 해결.

---

## React Query key 예시

| 키 | 용도 |
|---|---|
| `['publishers', 'list']` | 참가사 전체 |
| `['publishers', 'detail', no]` | 상세 |
| `['booth-shapes', 'list']` | 부스 사각형 |
| `['events', 'by-publisher', publisherId]` | 부스 이벤트 |
| `['favorites', 'mine']` | 내 찜 |
| `['favorites', 'counts']` | 인기 집계 |
| `['comments', 'feed', scope, publisherId]` | 후기 피드 |
| `['profiles', 'mine']` | 내 프로필 |

---

## 작성 순서 (CLAUDE.md 기능 생성 순서)

1. 타입 — `src/lib/types/<feature>/{request,response,type}.ts`
2. API 함수 — `src/api/<feature>/<feature>.ts` (`register-api-hook` 스킬)
3. React Query 훅 — `src/app/<route>/_hooks/use-*.ts`
4. 컴포넌트 연결(목업 → 실데이터) → Story → 검증

## 선행 작업 (코드 외)

| # | 작업 | 이유 |
|---|---|---|
| 1 | `publisher_favorite_counts()` RPC 작성 | 인기 집계가 RLS에 막힘 (위 SQL 초안 참고) |
| 2 | `reorder_favorites()` RPC 작성 (권장) | `sort_order` 원자적 일괄 갱신 |
| 3 | **시드 ETL: `publishers` 436행 적재** | exhibitors 436 기준 — detail 없는 8개는 기본값 backfill, `instagram` 파생(`getInstagramUrl(homepage)`) 적용, `exhibitor_no` 채움 |
| 4 | **`booth_shapes` 213행 적재** | 현재 DB 0행 — `sibf-2026-floor-booths.json` → DB |
| 5 | `exhibitor_no` unique 제약 추가 | 라우트 키 = `exhibitor_no` 확정 — seed backfill 완료 후 추가 |
| 6 | Supabase Storage 버킷 + 정책 | 후기 사진(`photo_urls`) 업로드 |
| 7 | 비로그인 → 로그인 찜/메모 머지 전략 | 기존 localStorage 데이터 이관 |
