import { Heart } from "lucide-react";

import { GetPublishers } from "@/api/fair-map/fair-map";
import { Panel } from "@/components/fair-app/panel";
import { RouteWarning } from "@/app/(fair)/route/_components/route-warning";
import { RouteList } from "@/app/(fair)/route/_components/route-list";

export default async function RoutePage() {
  const publishers = await GetPublishers();

  return (
    <div className="bg-brand-surface">
      <Panel title="찜 내역" icon={Heart}>
        <RouteWarning />
        <RouteList publishers={publishers} />
      </Panel>
    </div>
  );
}
