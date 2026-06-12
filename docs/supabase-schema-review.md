# Supabase 스키마 ↔ 기능 매핑

> 2026 SIBF 앱 — 11개 테이블과 6개 탭 기능의 대응표. 마이그레이션/ETL 매핑 명세 겸 설계 근거.
> 전제: **단일 도서전(2026)** · RLS 11개 전부 ON · 누락 정책 advisory 없음.
> **행사정보(fair info)는 변하지 않는 값이라 프로젝트 내 정적 데이터로 유지** → `fairs` 계열 5개 테이블은 DB로 안 받아옴(범위 외).

## 요약

| 테이블                 | 판정             | 비고                                                                   |
| ---------------------- | ---------------- | ---------------------------------------------------------------------- |
| `booth_shapes`         | ✅ 완전 일치     | `BoothShape`와 1:1                                                     |
| `publishers`           | ✅ 전부 커버     | exhibitors + publisher-details 병합을 한 행(428)으로                   |
| `publisher_events`     | ✅ 기능보다 앞섬 | 자유 텍스트 + 구조화 시간 둘 다 보유                                   |
| `favorites`            | ✅               | 순서·메모·집계기준 충족                                                |
| `comments`             | ✅ 기능보다 앞섬 | rating·photo·status는 UI보다 선행                                      |
| `profiles`             | ✅               | 후기 작성자·운영자 권한                                                |
| ~~`fairs` + 자식 4개~~ | ⛔ DB 미사용     | 행사정보는 **정적 데이터 유지** — 컬럼은 정적 파일 스키마 참고용으로만 |

**결론: 실사용 6개 테이블은 컬럼 변경 불필요. `fairs` 계열 5개는 앱이 정적 데이터를 쓰므로 DB에선 불필요(드롭 또는 미사용 방치).**

---

## 탭 → 테이블

| 탭       | 화면                         | 테이블                                                                         |
| -------- | ---------------------------- | ------------------------------------------------------------------------------ |
| 지도     | 부스 사각형                  | `booth_shapes`                                                                 |
| 지도     | 참가사 목록·검색·필터        | `publishers`                                                                   |
| 지도     | 선택 부스 이벤트             | `publisher_events`                                                             |
| 인기     | 순위·카드                    | `publishers` + `favorites`(집계)                                               |
| 찜 내역  | 찜 목록·방문순서·메모·이벤트 | `favorites` + `publishers` + `publisher_events`                                |
| 후기     | 피드(도서전/부스)            | `comments` + `profiles` + `publishers`                                         |
| 행사정보 | 소개·시간·티켓·안내·FAQ      | **정적 데이터** (DB 미사용) — info 페이지 하드코딩 + `data/sibf-2026-faq.json` |

---

## 컬럼 매핑 (앱 필드 → DB 컬럼)

### `booth_shapes` ← `BoothShape` (`types.ts`)

| 앱 필드                | DB 컬럼                        | 비고              |
| ---------------------- | ------------------------------ | ----------------- |
| boothNumber            | `booth_number`                 | PK                |
| x / y / width / height | `x` / `y` / `width` / `height` | numeric           |
| fill                   | `fill`                         | default `'black'` |
| transform              | `transform`                    | default `''`      |

### `publishers` ← `MapExhibitor` + `PublisherDetail` (`map-data.ts` 병합)

| 앱 필드               | DB 컬럼                                                               |
| --------------------- | --------------------------------------------------------------------- |
| no                    | `exhibitor_no`                                                        |
| booth                 | `booth_number`                                                        |
| origBooth             | `original_booth_number`                                               |
| nameKo                | `name`                                                                |
| nameEn                | `name_en`                                                             |
| countryKo / countryEn | `country_ko` / `country_en`                                           |
| special               | `is_special`                                                          |
| categories            | `categories` (text[])                                                 |
| introduction          | `introduction`                                                        |
| instagramUrl          | `instagram`                                                           |
| homepageUrl           | `homepage`                                                            |
| (정렬)                | `sort_order`                                                          |
| — (제거됨)            | `phone`, `email`, `address`, `detail_id`, `source_url`, `source_page` |

> 병합 기준: 지도 exhibitors 436행을 canonical source로 두고, 상세 JSON과 매칭되는 420행만 상세 필드를 채운다.

### `publisher_events` ← `BoothEvent` (`booth-events.ts`, 현재 목업)

| 앱 필드                    | DB 컬럼                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| title / content / category | `title` / `content` / `category`                                               |
| sourceName                 | `source_name`                                                                  |
| instagramUrl / imageUrl    | `instagram_url` / `image_url`                                                  |
| time ("10:30-11:00")       | `display_time`                                                                 |
| period ("06.01-06.14")     | `period_label`                                                                 |
| 보너스(이벤트 탭용)        | `event_date`, `starts_at`, `ends_at`, `status`, `sort_order`, `location_label` |

> 라벨 규칙 `period ?? time ?? '상시'` = `period_label` → `display_time` 순.

### `favorites`

| 앱 동작                              | DB 컬럼                      |
| ------------------------------------ | ---------------------------- |
| 드래그 방문순서 (`reorderFavorites`) | `sort_order`                 |
| 방문 메모 (`use-booth-memo.ts`)      | `visit_memo`                 |
| 인기 집계 기준 시각                  | `created_at`                 |
| 중복 방지                            | PK `(user_id, publisher_id)` |

### `comments` ← `ReviewRow` (`_lib/review-data.ts`, 현재 목업)

| 앱 필드                  | DB 컬럼                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------- |
| scope ('fair'/'booth')   | `scope`                                                                                 |
| target                   | `target_label`                                                                          |
| body                     | `content` (1~1000자)                                                                    |
| author / authorAvatarUrl | `profiles.nickname` / `profiles.avatar_url` (조인)                                      |
| UI 선행 설계             | `rating`(1~5), `photo_urls`(≤4), `status`(pending/published/hidden/deleted) |

### `profiles`

| 용도             | 컬럼                     |
| ---------------- | ------------------------ |
| 후기 작성자 표시 | `nickname`, `avatar_url` |
| 운영자 검수      | `role` (user/admin)      |
| 계정 연결        | `id` → `auth.users`      |

---

## 구현 시 주의 (스키마 오류 아님)

| #   | 항목         | 내용                                                                                                                               |
| --- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 인기 집계    | 인기 순위는 전체 사용자 `favorites` 카운트 필요. 개인 찜=비공개 RLS, 카운트=공개 읽기 → `SECURITY DEFINER` RPC 또는 집계 view 권장 |
| 2   | 메모 키 변화 | 앱=부스 기준(공유), DB=출판사 기준(`visit_memo`). DB가 더 정확하나 동작 미세 변경                                                  |
| 3   | 인스타 파생  | 앱은 `getInstagramUrl(homepage)`로 추출. DB는 `instagram` 직접 보유 → 시드/ETL에서 1회 적용해 채울 것                              |
| 4   | 단일 도서전  | `publishers`/`booth_shapes`/`publisher_events`에 `fair_id` 없음 = 정상. 다년 전환 시에만 FK 추가                                   |

## 검증 방법

| 대상           | 방법                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------ |
| 인기 집계 정책 | 익명/타사용자 세션에서 출판사별 찜 카운트 조회가 RLS에 막히지 않는지(또는 RPC 동작) 테스트 |
| 시드 정합성    | `publishers` 행 수 ≈ exhibitors(428) 일치, `instagram`/`homepage` 파생값 채워짐 샘플 확인  |
