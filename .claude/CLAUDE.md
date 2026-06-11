# CLAUDE.md

## 프로젝트 개요

**2026 서울국제도서전(SIBF) 인터랙티브 지도 앱** — Next.js 16.2.4 / React 19.2.3 / Tailwind v4 / shadcn(new-york).

- **정적 앱**: 백엔드·API 없음. 모든 데이터는 번들된 로컬 파일(`src/data/*.json`, `public/data/*`)을 직접 import.
- **6개 탭** (지도 / 행사정보 / 이벤트 / 인기 / 내 동선 / 후기) — `src/app/(fair)/` 라우트 그룹 + 공통 헤더로 구성.
- 핵심 기능은 `src/components/fair-map/`의 부스 배치 지도 (`book-fair-map.tsx`).

---

## 작업 & 학습 모드

### 실행 단위

**task 1개씩 진행 후 정지.** 빌드 확인(`pnpm build`·`pnpm lint`)은 해당 task에 포함.

### 2단 ask — 침묵 = 동의 금지

① 완료 보고 → 검토 대기 → ② `"다음 스텝 시작할까요? — {요약}"` → 명시적 승인 대기.

### 플랜

현재 task 하나만. 이모지 타이틀. 파일 나열·구현 세부(px·CSS 클래스·함수명) 금지.

### task 완료 보고

```
## 📋 Task N — 변경 내용 + 전/후 스니펫
## 💡 적용한 이유 — 문제 / 왜 이 방식 / 동작 원리
## 🔜 다음 task — Task N+1: 한 줄 요약
```

---

## Git 커밋 규칙

**사용자의 명시적 요청 없이 커밋하지 않는다.**

커밋 메시지에 `Co-Authored-By: Claude` 를 추가하지 않는다.

---

## 커맨드

패키지 매니저는 **pnpm** 고정.

| 커맨드                   | 설명                                    | 실행 시점           |
| ------------------------ | --------------------------------------- | ------------------- |
| `pnpm dev`               | 개발 서버 (localhost:3000)              | —                   |
| `pnpm storybook`         | Storybook (port 6006)                   | —                   |
| `pnpm lint` / `lint:fix` | ESLint                                  | UI·컴포넌트 변경 후 |
| `npx tsc --noEmit`       | 타입 검사                               | 타입 영향 있을 때   |
| `pnpm test`              | Vitest — Storybook stories → Playwright | story 추가·수정 후  |
| `pnpm build`             | 프로덕션 빌드                           | 배포 전·큰 변경     |

---

## 스택 gotcha

- **Tailwind v4** — `tailwind.config.*` 없음. 토큰은 `globals.css` `@theme inline`. 하드코딩 HEX 금지.
- **shadcn/ui** — `src/components/ui/` **직접 수정 금지**. lint/type 보정만 예외.
- **인증 없음** — 도입 시 프로젝트에 맞게 추가.

---

## 디렉터리 구조

```
src/
├── app/
│   ├── (fair)/                 # 라우트 그룹 (URL 세그먼트 없음)
│   │   ├── layout.tsx          # FairHeader + 콘텐츠 영역
│   │   ├── _components/        # fair-header.tsx (탭 네비)
│   │   ├── _lib/tabs.ts        # 6개 탭 정의 (단일 소스)
│   │   ├── page.tsx            # / → <BookFairMap />
│   │   ├── info/               # /info — 소개/티켓/FAQ 서브탭
│   │   │   └── _components/faq-search.tsx
│   │   ├── events/             # /events — 목업 UI
│   │   ├── popular/_components/popular-list.tsx
│   │   ├── route/_components/route-list.tsx
│   │   └── reviews/            # /reviews — 목업 UI
│   ├── providers.tsx           # next-themes / QueryClient / Toaster
│   └── globals.css             # Tailwind v4 토큰 원천
├── components/
│   ├── ui/                     # shadcn 원본 (수정 금지)
│   ├── fair-map/               # 핵심 지도 도메인 (아래 gotcha 참고)
│   │   ├── book-fair-map.tsx   # 메인 지도 (pan/zoom, 검색, 즐겨찾기)
│   │   ├── map-data.ts         # JSON 3종 로드·병합
│   │   ├── types.ts            # BoothShape / MapExhibitor
│   │   └── use-favorites.ts    # localStorage 즐겨찾기 훅
│   └── fair-app/panel.tsx      # Panel / StatBlock 레이아웃 프리미티브
├── data/                       # sibf-2026-*.json (booths / exhibitors / publisher-details / faq)
├── hooks/use-mobile.ts
├── lib/utils.ts                # cn()
└── network/                    # base·client·server (현재 미사용 — 아래 참고)

public/data/                    # sibf-2026-floor-plan.svg, sibf-2026-poster.png
```

**배치 판단**: 라우트 전용 → `(fair)/<route>/_components/` | 지도 도메인 → `fair-map/` | 레이아웃 프리미티브 → `fair-app/`

---

## 컴포넌트 배치

**분리 기준**: 200라인 초과 + variant·event·layout·action 혼재 → 분리 후보. **"역할이 독립적으로 설명 가능한가"**

---

## Server/Client & 상태 관리

### 현재 데이터 패턴

- **정적 로컬 JSON** — `src/data/*.json`을 `map-data.ts` 또는 페이지에서 직접 import. 네트워크 호출 없음.
- **클라이언트 상태** — 로컬 `useState` + localStorage (`use-favorites.ts`, `useSyncExternalStore`).
- React Query / Zustand 현재 **미사용** (Provider만 마운트됨 — 아래 "도입 시" 참고).

### Server/Client Component 원칙

- **`'use client'`는 가능한 한 하위로.** 페이지·표시 전용은 Server Component 유지.
- 클라이언트 상태·이벤트·브라우저 API가 필요한 컴포넌트만 client island로 분리.

---

## 🗺️ 도메인 & gotcha

- **부스 vs 참여사**: `booths`(지도 사각형, `boothNumber` 키) ↔ `exhibitors`(참여사, `booth` 키). 한 부스에 여러 참여사 가능. `map-data.ts`가 로드 시 `boothNumber::nameKo`로 `publisher-details`를 조인해 `categories`/`introduction`/`homepage` 병합. 지도 배치용 `origBooth` 별도 존재.
- **지도 렌더링**: 맵 라이브러리 없음. `sibf-2026-floor-plan.svg`를 `<Image fill unoptimized>` 배경으로 깔고, 부스를 절대배치 `<button>`으로 오버레이. pan/zoom은 CSS `translate3d + scale` 손수 구현 (`MAP_WIDTH=3230`, `MAP_HEIGHT=3650`, scale `0.16`~`2.4`).
- **즐겨찾기**: localStorage 키 `sibf-map-favorites`, 커스텀 이벤트 `sibf-favorites-change`로 크로스 컴포넌트 동기화.
- **하드코딩 mock**: 부스 이벤트(`getBoothEvents`)와 instagram 링크(`instagramLinksByNo`)는 데이터 파일이 아닌 코드에 인라인. 데이터 갱신 시 코드 수정 필요.

---

## 🌱 아직 미사용 / 도입 시

현재 동작 코드 없음. 해당 기능을 **처음 추가할 때** 아래 패턴을 따른다.

- **`src/network/` 래퍼** (`clientFetch` / `publicFetch`) — 백엔드 API 도입 시. 그 전엔 직접 fetch 불필요.
- **React Query** — 검색·낙관적 업데이트 등 클라이언트 인터랙션 도입 시 (`providers.tsx`에 Provider만 마운트됨).
  - GET → `useQuery`, 그 외 → `useMutation`
  - query key: `['<feature>', '<entity>', '<action>', ...deps]` 계층형 배열로 상수화
- **Zustand + Context 스토어** — 화면 한정 공유 상태 도입 시 (`src/stores/<name>-store.tsx`).
- **기능 생성 순서** (API 연동 기능 첫 추가 시):
  1. 타입 — `src/lib/types/<feature>/{request,response,type}.ts`
  2. API 함수 — `src/api/<feature>/<feature>.ts` (`register-api-hook` 스킬)
  3. React Query 훅 — `src/app/<route>/_hooks/use-*.ts`
  4. 컴포넌트 → Story → 검증
- **Storybook/Vitest** — 설정만 돼 있고 story·test 0건. `core/`·`common/` 신설 시 `generate-story` 스킬로 작성.

---

## 컨벤션

- **파일/폴더명**: kebab-case. 컴포넌트 폴더는 `index.tsx` barrel, import 시 `/index` suffix 명시.
- **Export**: 훅/함수는 named export. default export는 Next 페이지/레이아웃 등 프레임워크 요구 시만.
- **타입**: Props·상태 타입은 명시적으로 정의.
- **import 순서**: React → 3rd-party → `@/*` → 상대경로.
- **색상**: `globals.css` 토큰 변수만. 하드코딩 HEX 금지.

---
