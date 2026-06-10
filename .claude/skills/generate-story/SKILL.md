---
name: generate-story
description: This skill should be used when the user asks to "스토리 만들어줘", "스토리북 생성", "generate story", "create story", "add storybook story", or mentions creating Storybook stories for a component. Analyzes a React component's props, CVA variants, and export patterns, then generates a .stories.tsx file that follows the project's exact Storybook conventions. Use this skill whenever the user wants to create, add, or generate Storybook story files for any component in this project, even if they don't explicitly say "storybook".
---

# Generate Storybook Story

Storybook 스토리 파일을 컴포넌트 분석 기반으로 자동 생성하는 스킬.

## Step 1: Resolve the Component

사용자가 전달한 컴포넌트 이름 또는 경로를 기반으로 소스 파일을 찾는다.

**탐색 순서:**
1. 파일 경로가 직접 전달된 경우 (`/` 또는 `.tsx` 포함) — 해당 경로를 직접 사용
2. 이름만 전달된 경우 — 아래 순서로 탐색:
   - Core: `src/components/core/{kebab-case-name}/index.tsx` (폴더 구조)
   - UI: `src/components/ui/{lowercase-name}.tsx` (단일 파일)

소스 파일을 읽고 다음을 분석한다:
- **Props 타입**: `type {Name}Props`, `interface {Name}Props`, 또는 inline props
- **CVA variants**: `cva(...)` 호출 내 `variants` 객체와 `defaultVariants`
- **Export 방식**: named export (`export { Button }`) vs default export (`export default`)
- **forwardRef 사용 여부**
- **제어형 여부**: `checked/onCheckedChange`, `value/onChange` 같은 패턴 존재 시 제어형 컴포넌트

하위 파일이 있는 Core 컴포넌트의 경우 (`index.ts`가 barrel export하는 구조), 관련 파일도 함께 읽는다.

## Step 2: Determine Story Metadata

**파일 위치:**
- 모든 스토리 → `src/stories/{PascalCaseName}.stories.tsx`

**Title 포맷:**
- `'UI/ComponentName'`

**Import 경로:**
- UI 컴포넌트: `import { Name } from '@/components/ui/{filename}'`
- Core named export: `import { Name } from '@/components/core/{dirname}/index'`
- Core default export: `import Name from '@/components/core/{dirname}/index'`

**Layout:**
- `'centered'` — 대부분의 컴포넌트 (버튼, 뱃지, 스위치 등)
- `'padded'` — 넓은 공간이 필요한 컴포넌트 (테이블, 아코디언, 폼 등)

## Step 3: Generate the Story

모든 설명(description)은 **한글**로 작성한다.

### 필수 구조

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { ComponentName } from '@/components/path';

const meta: Meta<typeof ComponentName> = {
  title: 'UI/ComponentName',
  component: ComponentName,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '한글 컴포넌트 설명',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: { /* ... */ },
};

export default meta;
type Story = StoryObj<typeof meta>;
```

### 생성 규칙

1. **Default 스토리 필수** — 합리적인 기본 args와 함께 항상 포함
2. **Variant 스토리** — CVA variant가 있으면 각 variant 값별로 스토리 생성. 각 variant 스토리에서 size별 렌더링도 포함
3. **상태 스토리** — `disabled`, `isLoading` 등 boolean 상태 props가 있으면 생성
4. **제어형 컴포넌트** — `useState`/`useEffect` 패턴으로 args와 동기화
5. **AllVariants 쇼케이스** — 모든 variant를 한눈에 보여주는 스토리, `layout: 'padded'` 사용
6. **한글 콘텐츠** — 버튼 텍스트: '저장하기', '삭제하기', 뱃지: '활성', '비활성' 등

### argType Control 매핑

| Props 유형 | control |
|---|---|
| CVA variant (select) | `control: 'select', options: [...]` |
| boolean | `control: 'boolean'` |
| string | `control: 'text'` |
| number | `control: 'number'` |
| ReactNode / callback | `control: false` |

모든 argType에 `description`을 한글로 포함한다.

## 참조 스토리

스토리 생성 전, `src/stories/` 아래에 동일한 성격(제어형 / CVA variant / 테이블 / 오버레이 등)의 스토리가 이미 있다면 그 파일을 먼저 읽고 패턴을 맞춘다. 없다면 이 문서의 "필수 구조" + "생성 규칙" 만으로 작성한다.

## Step 4: Verify Before Writing

1. 동일 경로에 스토리 파일이 이미 존재하는지 확인 — 존재 시 사용자에게 덮어쓰기 여부를 묻는다
2. import 경로의 컴포넌트 파일이 실제로 존재하는지 확인
3. argTypes의 variant 값이 소스 코드의 CVA variants와 일치하는지 확인

## Step 5: Write and Report

스토리 파일을 작성한 뒤 다음을 보고한다:
- 생성된 파일 경로
- 생성된 스토리 수
- `pnpm storybook`으로 확인 안내
