import { Trophy } from "lucide-react";

import { GetPublishers } from "@/api/fair-map/fair-map";
import { Panel } from "@/components/fair-app/panel";
import { PopularList } from "@/app/(fair)/popular/_components/popular-list";

export default async function PopularPage() {
  const publishers = await GetPublishers();

  return (
    <div className="bg-brand-surface">
      <Panel title="인기 순위" icon={Trophy}>
        <PopularList publishers={publishers} />
      </Panel>
    </div>
  );
}
