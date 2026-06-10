# CLAUDE.md

## 프로젝트 개요

Next.js 16 App Router + shadcn/ui + Tailwind v4 기반 **프로젝트 시작 템플릿**. 실제 비즈니스 로직은 없고, 툴링·컨벤션만 세팅돼 있다.

새 프로젝트에서는 `src/components/core/`, `src/app/page.tsx`부터 채우기 시작한다.

---

## 작업 & 학습 모드

### 실행 단위

**task 1개씩 진행 후 정지.** 빌드 확인(`pnpm build`·`pnpm lint`)은 해당 task에 포함.

### Learn by Doing (매우 엄격)

Claude는 **구조·스캐폴드·가이드만 제공**하고, 핵심 자리에 `TODO(human)` 하나를 남긴다.

**구현 코드 직접 작성 금지. 파일 생성·타입 정의·import 추가도 사용자에게 요청한다.**

> 예외: 오타·한 줄 수정, 검증 명령 실행 등 학습 대상이 아닌 작업.

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

| 커맨드 | 설명 | 실행 시점 |
|---|---|---|
| `pnpm dev` | 개발 서버 (localhost:3000) | — |
| `pnpm storybook` | Storybook (port 6006) | — |
| `pnpm lint` / `lint:fix` | ESLint | UI·컴포넌트 변경 후 |
| `npx tsc --noEmit` | 타입 검사 | 타입 영향 있을 때 |
| `pnpm test` | Vitest — Storybook stories → Playwright | story 추가·수정 후 |
| `pnpm build` | 프로덕션 빌드 | 배포 전·큰 변경 |

---

## 스택 gotcha

- **Tailwind v4** — `tailwind.config.*` 없음. 토큰은 `globals.css` `@theme inline`. 하드코딩 HEX 금지.
- **shadcn/ui** — `src/components/ui/` **직접 수정 금지**. lint/type 보정만 예외.
- **network 레이어** — `src/network/` 3분할. 클라이언트·훅 → `clientFetch`, Server Component → `publicFetch`. 직접 `fetch()` 호출 금지.
- **인증 없음** — 첫 사용 시 프로젝트에 맞게 추가.

---

## 디렉터리 구조

```
src/
├── app/                    # Next App Router (RSC 기본)
│   ├── globals.css         # Tailwind v4 + 디자인 토큰 원천
│   ├── layout.tsx          # 루트 레이아웃
│   ├── providers.tsx       # Theme / QueryClient / Toaster
│   ├── page.tsx / loading.tsx / error.tsx / not-found.tsx
│   └── <route>/            # 라우트 세그먼트 예시
│       ├── _components/    # 해당 라우트 전용 컴포넌트
│       ├── _hooks/         # 해당 라우트 전용 React Query 훅
│       ├── _lib/           # 해당 라우트 전용 비즈니스 로직·검증 스키마·외부 연동 헬퍼
│       ├── _utils/         # 해당 라우트 전용 작고 순수한 helper (formatPrice, clamp 등)
│       └── page.tsx
├── components/
│   ├── ui/                 # shadcn 원본 (수정 금지)
│   ├── core/               # ui/ 프리미티브를 감싼 공통 컴포넌트
│   └── common/             # 도메인 없는 완전 공용 UI
├── features/               # 여러 라우트에서 공유하는 도메인 단위 묶음
│   └── {feature}/
│       └── components/
├── hooks/                  # 여러 라우트 공유 React Query 훅
├── lib/                    # 앱 전역 비즈니스 로직·검증 스키마·외부 연동 헬퍼
│   └── utils.ts            # cn()
├── utils/                  # 앱 전역 작고 순수한 helper (formatPrice, clamp 등)
└── network/                # base · client · server
```

**배치 판단 순서**: 라우트 전용 → `_components/` | 여러 라우트 공유(도메인 있음) → `features/{feature}/components/` | 도메인 없는 공용 UI → `common/` / `core/`

---

## 컴포넌트 배치

**배치 판단**: 라우트 전용 → `_components/` | 여러 라우트 공유(도메인) → `features/{feature}/components/` | 도메인 없는 공용 UI → `common/` / `core/`

**분리 기준**: 200라인 초과 + variant·event·layout·action 혼재 → 분리 후보. **"역할이 독립적으로 설명 가능한가"**

---

## Server/Client & 상태 관리

### Server/Client Component

- **`'use client'`는 가능한 한 하위로.** 페이지·feature root·표시 전용은 Server Component 유지.
- **서버 데이터**: native fetch + Next 캐시(`next: { tags, revalidate }`). React Query는 검색·낙관적 업데이트 등 클라이언트 인터랙션 한정.
- 클라이언트 상태·이벤트·브라우저 API가 필요한 컴포넌트만 client island로 분리.

### 상태

| 범위 | 방법 |
|---|---|
| 페이지 안 UI 상태 | 로컬 state |
| 여러 하위 컴포넌트 공유 + 화면 한정 | Zustand + Context 스토어 (`src/stores/<name>-store.tsx`) |
| 서버 데이터 | React Query (로컬/전역 복제 금지) |

---

## 기능 개발

### 생성 순서

1. **타입** — `src/lib/types/<feature>/{request,response,type}.ts`
2. **API 함수** — `src/api/<feature>/<feature>.ts` (`register-api-hook` 스킬)
3. **React Query 훅** — `src/app/<route>/_hooks/use-*.ts`
4. **컴포넌트** — 계층 규칙에 따라 배치
5. **Story** — `core/`·`common/`은 필수(`src/stories/`), 라우트 전용은 복잡할 때만. `generate-story` 스킬 사용.
6. **검증** — 범위에 맞는 기준 실행

### API 규칙

- `src/network/` 래퍼 사용 필수 — 직접 `fetch()` 호출 금지.
  - 클라이언트·훅 → `clientFetch` / Server Component → `publicFetch`
- 함수명: PascalCase verb-first (예: `GetUserDetail`, `CreateOrder`)
- GET → `useQuery`, 그 외 → `useMutation`
- query key: `['<feature>', '<entity>', '<action>', ...deps]` 계층형 배열로 상수화
- `src/hooks/`는 공통 훅 전용 — 페이지 전용 훅 금지
- 자세한 패턴: `register-api-hook` 스킬 참조

---

## 컨벤션

- **파일/폴더명**: kebab-case. 컴포넌트 폴더는 `index.tsx` barrel, import 시 `/index` suffix 명시.
- **Export**: 훅/함수는 named export. default export는 Next 페이지/레이아웃 등 프레임워크 요구 시만.
- **타입**: Props·상태 타입은 명시적으로 정의.
- **import 순서**: React → 3rd-party → `@/*` → 상대경로.
- **색상**: `globals.css` 토큰 변수만. 하드코딩 HEX 금지.

---

