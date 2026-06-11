import { AlertTriangle } from 'lucide-react';

export function RouteWarning() {
  return (
    <div className="flex items-start gap-3 border border-border bg-brand-panel px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-muted" />
      <div className="min-w-0">
        <p className="text-sm font-black">
          로그인을 하지 않으면 찜한 목록과 메모가 사라질 수 있습니다.
        </p>
        <p className="mt-1 text-sm font-bold leading-5 text-brand-muted">
          드래그해서 방문 순서를 바꿀 수 있습니다. 홈에서 지도 경로 추천을 확인해 보세요.
        </p>
      </div>
    </div>
  );
}
