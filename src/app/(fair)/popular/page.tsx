import { Trophy } from "lucide-react";

import { Panel } from "@/components/fair-app/panel";
import { PopularList } from "@/app/(fair)/popular/_components/popular-list";

export default function PopularPage() {
  return (
    <div className="bg-brand-surface">
      <Panel title="인기 순위" icon={Trophy}>
        <PopularList />
      </Panel>
    </div>
  );
}
