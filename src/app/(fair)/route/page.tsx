import { Heart } from "lucide-react";

import { Panel } from "@/components/fair-app/panel";
import { RouteWarning } from "@/app/(fair)/route/_components/route-warning";
import { RouteList } from "@/app/(fair)/route/_components/route-list";

export default function RoutePage() {
  return (
    <div className="bg-brand-surface">
      <Panel title="찜 내역" icon={Heart}>
        <RouteWarning />
        <RouteList />
      </Panel>
    </div>
  );
}
