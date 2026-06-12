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
          카드를 드래그해 방문 순서를 조정하고, 홈에서 PDF로 내보내 메모와 함께 방문 리스트를
          추출해보세요.
        </p>
      </div>
    </div>
  );
}
