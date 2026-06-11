import { Route, Sparkles } from "lucide-react";

import { Panel } from "@/components/fair-app/panel";
import { Button } from "@/components/ui/button";
import { RouteList } from "@/app/(fair)/route/_components/route-list";

export default function RoutePage() {
  return (
    <div className="bg-brand-surface">
      <Panel
        title="내 동선"
        icon={Route}
        action={
          <Button type="button" variant="outline" className="border-border bg-white">
            <Sparkles className="h-4 w-4" />
            정렬
          </Button>
        }
      >
        <RouteList />
      </Panel>
    </div>
  );
}
