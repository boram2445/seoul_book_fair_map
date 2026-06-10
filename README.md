# Start Template

Next.js 16 App Router 기반 **프로젝트 시작 템플릿**. 새 프로젝트를 빠르게 띄울 수 있도록 UI 컴포넌트, 테스트 파이프라인, 코드 생성 스킬이 미리 세팅돼 있다.

## 스택

- **Next.js 16.2.4** (App Router, Turbopack) + **React 19.2.3** + **TypeScript 5** (strict)
- **Tailwind CSS v4** (config 파일 없이 `src/app/globals.css`의 `@theme` + CSS 변수로 토큰 관리)
- **shadcn/ui** — new-york 스타일, neutral base, 37개 컴포넌트 소스 설치 완료
- **TanStack Query / Table**, **Zustand**, **next-themes**, **sonner**, **lucide-react**
- **Storybook 10** + **Vitest 4** (Playwright Chromium browser mode)
- **ESLint 9** flat config + **Prettier**
- 패키지 매니저: **pnpm**

## 시작하기

```bash
pnpm install
cp .env.example .env.local   # 필요 시 값 채우기
pnpm dev                     # http://localhost:3000
```

자주 쓰는 스크립트:

```bash
pnpm build            # 프로덕션 빌드
pnpm lint             # ESLint
pnpm test             # Vitest (Storybook stories browser-mode)
pnpm storybook        # Storybook (port 6006)
npx tsc --noEmit      # 타입 검사
```

## 디렉터리 구조 (핵심만)

```
src/
├── app/                # Next App Router (RSC 기본)
│   ├── globals.css     # Tailwind v4 + 디자인 토큰 원천
│   ├── providers.tsx   # Theme / QueryClient / Toaster
│   └── {error,loading,not-found,global-error}.tsx
├── components/
│   ├── core/           # 프로젝트 도메인 컴포넌트 (비어 있음 — 여기서 시작)
│   └── ui/             # shadcn 컴포넌트 (직접 수정 금지)
├── hooks/
└── lib/
    ├── axios.ts        # api 인스턴스 (NEXT_PUBLIC_API_BASE_URL)
    └── utils.ts        # cn() 헬퍼
```

## 포함된 Claude Code 자산

`.claude/` 에 프로젝트 컨벤션을 자동화하는 스킬/에이전트가 세팅돼 있다.

- **skill `/register-api-hook`** — 백엔드 스펙을 받아 axios 함수 + React Query 훅 생성
- **skill `/zustand-context-store`** — 서브트리 스코프 Zustand + Context 스토어 생성
- **skill `/generate-story`** — 컴포넌트 분석 후 Storybook 스토리 자동 생성
- **agent `frontend-code-reviewer`** — 변경된 코드에 대한 컨벤션 체크 리뷰
- **hooks** — 수정 파일 추적, 타입체크 자동 실행, `.env*` 읽기 차단

세부 컨벤션·패턴·아키텍처 규약은 [`CLAUDE.md`](./CLAUDE.md)에 정리돼 있다.

## 새 프로젝트 시작 시 체크리스트

- [ ] `package.json`의 `name` 을 프로젝트 이름으로 변경
- [ ] `src/app/layout.tsx` 의 `metadata.title` / `description` 교체
- [ ] 필요 시 `.env.local` 구성 (템플릿은 기본 env 없음)
- [ ] `src/app/page.tsx` placeholder 를 실제 랜딩으로 교체
