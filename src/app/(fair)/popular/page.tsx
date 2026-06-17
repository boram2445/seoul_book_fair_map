import { Suspense } from "react";
import { Trophy } from "lucide-react";

import { GetPublisherEvents, GetPublishers } from "@/api/fair-map/fair-map";
import { Panel } from "@/components/fair-app/panel";
import { PopularList } from "@/app/(fair)/popular/_components/popular-list";

export default async function PopularPage() {
  const [publishers, eventsByBooth] = await Promise.all([
    GetPublishers(),
    GetPublisherEvents(),
  ]);

  return (
    <div className="bg-brand-surface">
      <Panel title="인기 순위" icon={Trophy}>
        <Suspense>
          <PopularList publishers={publishers} eventsByBooth={eventsByBooth} />
        </Suspense>
      </Panel>
    </div>
  );
}
