import { LogIn, MessageSquareText } from "lucide-react";

import { Panel } from "@/components/fair-app/panel";
import { Button } from "@/components/ui/button";

const reviewRows = [
  {
    target: "A101 고스트북스",
    type: "부스 후기",
    body: "독립출판물 구성이 좋아서 오래 머물렀어요. 이벤트 시간 전에 미리 들르는 게 좋겠습니다.",
    time: "방금 전",
  },
  {
    target: "리딩런 컨퍼런스",
    type: "컨퍼런스 후기",
    body: "현장 동선 안내가 조금 붐볐지만, 발표 내용은 바로 기록해두고 싶을 만큼 좋았습니다.",
    time: "12분 전",
  },
];

export default function ReviewsPage() {
  return (
    <div className="bg-brand-surface">
      <Panel
        title="후기"
        icon={MessageSquareText}
        action={
          <Button type="button" variant="outline" className="border-border bg-white">
            <LogIn className="h-4 w-4" />
            로그인 후 작성
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3">
            <article className="border border-border bg-brand-yellow p-4">
              <p className="text-xs font-black text-brand-rust">부스 후기</p>
              <h3 className="mt-2 text-lg font-black">부스를 선택하고 현장 후기를 남겨요.</h3>
              <p className="mt-3 text-sm font-bold leading-6 text-brand-subtle">
                로그인한 사용자만 작성할 수 있고, 후기는 최신순 피드에 반영됩니다.
              </p>
            </article>
            <article className="border border-border bg-white p-4">
              <p className="text-xs font-black text-brand-muted">컨퍼런스 후기</p>
              <h3 className="mt-2 text-lg font-black">세션 경험도 따로 기록합니다.</h3>
              <p className="mt-3 text-sm font-bold leading-6 text-brand-subtle">
                컨퍼런스별 후기와 부스 후기를 분리해서 나중에 필터링할 수 있게 둡니다.
              </p>
            </article>
          </div>
          <div className="border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-black">실시간 피드</p>
            </div>
            <div className="grid gap-0">
              {reviewRows.map((review) => (
                <article key={`${review.type}-${review.target}`} className="border-b border-border/20 p-4 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="border border-border bg-brand-green px-2 py-1 text-xs font-black">
                      {review.type}
                    </span>
                    <span className="text-xs font-black text-brand-muted">{review.time}</span>
                  </div>
                  <h3 className="mt-3 text-base font-black">{review.target}</h3>
                  <p className="mt-2 text-sm font-bold leading-6 text-brand-subtle">{review.body}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
