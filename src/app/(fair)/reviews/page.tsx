import { MessageSquareText } from "lucide-react";

import { ReviewsBoard } from "@/app/(fair)/_components/reviews-board";
import { Panel } from "@/components/fair-app/panel";

export default function ReviewsPage() {
  return (
    <div className="bg-brand-surface">
      <Panel title="후기" icon={MessageSquareText}>
        <ReviewsBoard />
      </Panel>
    </div>
  );
}
