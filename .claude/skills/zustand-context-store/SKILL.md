---
name: Zustand Context Store
description: Triggered when the user asks to create a Zustand store, context store, or view-scoped state — e.g. "store 만들어줘", "zustand store", "FooProvider 패턴", "뷰 스코프 상태".
version: 0.1.0
---

# Zustand + Context Store 패턴

특정 Provider 서브트리 내에서만 공유되는 상태는 Zustand + Context 조합으로 구현한다. 하위 컴포넌트는 props 없이 store hook으로 직접 소비한다.

## When to apply

- 여러 컴포넌트가 같은 상태를 공유해야 하고, 그 범위를 특정 화면/서브트리로 한정하고 싶을 때 적용한다.
- 단일 컴포넌트 전용 UI 상태는 `useState`를 유지하고, 이 패턴을 사용하지 않는다.
- 앱 전체에 걸친 싱글톤 상태라면 Provider 없이 모듈 레벨 `createStore` 로 만들어 쓰고, 이 패턴(Provider + Context)은 "마운트된 서브트리 한정" 용도에 한정한다.

## File location

`src/stores/<name>-store.tsx` 경로에 생성한다. 관심사가 다르면 store 파일을 분리한다.

## Canonical template

```tsx
'use client';
import { ReactNode, createContext, useContext, useState } from 'react';

import { StoreApi, createStore, useStore } from 'zustand';

// 순수 상태
interface FooState {
  value: string;
}

// 액션 (상태와 분리)
interface FooActions {
  setValue: (v: string) => void;
}

// Store = State + action 네임스페이스
type FooStore = FooState & { action: FooActions };

const FooContext = createContext<StoreApi<FooStore> | null>(null);

export default function FooProvider({ children, initialValue = '' }: { children: ReactNode; initialValue?: string }) {
  const [store] = useState(() =>
    createStore<FooStore>((set) => ({
      value: initialValue,
      action: {
        setValue: (v) => set({ value: v }),
      },
    })),
  );
  return <FooContext.Provider value={store}>{children}</FooContext.Provider>;
}

const useFooStore = <T,>(selector: (s: FooStore) => T): T => {
  const store = useContext(FooContext);
  if (!store) throw new Error('FooProvider 내부에서만 사용 가능합니다');
  return useStore(store, selector);
};

export const useFooValue = () => useFooStore((s) => s.value);
export const useFooActions = () => useFooStore((s) => s.action);
```

## Rules

- **State 와 Action 타입은 분리해 선언한다.** `interface FooState` 에는 순수 상태 필드만 두고, `interface FooActions` 로 액션을 독립시킨 뒤 `type FooStore = FooState & { action: FooActions }` 로 합친다. State 인터페이스에 `action` 을 인라인으로 넣지 않는다.
- action 은 반드시 `action` 이라는 단일 네임스페이스 키로 묶는다 (`{ action: { ... } }`). 상태 값과 액션을 구분해 selector hook 이 리렌더를 정확히 제어할 수 있도록 한다.
- `useStore`는 모듈 내부(`useFooStore`)로만 노출하고, 외부에는 selector별 hook(`useFooValue`, `useFooActions`)만 export 한다.
- Provider 바깥에서 hook이 호출되면 명시적으로 에러를 throw 한다 (`'FooProvider 내부에서만 사용 가능합니다'`).
- 관심사가 다르면 store 파일을 분리한다. 하나의 파일에 여러 도메인을 묶지 않는다.
- 여러 컴포넌트가 공유하는 상태만 store에 넣는다. 컴포넌트 내부에서만 쓰이는 UI 상태는 `useState`로 남긴다.

## Provider 배치

Provider 는 상태 공유 범위의 최상단에 마운트한다. 예) 특정 라우트 전체 → `src/app/<route>/layout.tsx`, 특정 섹션만 → 해당 섹션 컴포넌트. Provider 바깥에서는 해당 store hook 이 에러를 던지므로 경계가 명확히 드러난다.
