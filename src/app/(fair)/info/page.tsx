import { Info, Ticket } from "lucide-react";

import { Panel, StatBlock } from "@/components/fair-app/panel";
import { Button } from "@/components/ui/button";

const infoRows = [
  { label: "기간", value: "2026.06.24 - 06.28" },
  { label: "장소", value: "코엑스 C홀, D홀" },
  { label: "운영", value: "10:00 - 19:00" },
];

export default function InfoPage() {
  return (
    <div className="bg-brand-surface">
      <Panel
        title="행사 정보"
        icon={Info}
        action={
          <Button type="button" className="border border-border shadow-brutal-sm">
            <Ticket className="h-4 w-4" />
            티켓
          </Button>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="border border-border bg-brand-green p-5">
            <p className="text-sm font-black text-brand-green-deep">Seoul International Book Fair</p>
            <h3 className="mt-3 text-3xl font-black tracking-normal">책을 따라 이동하는 하루</h3>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-6">
              부스, 이벤트, 찜한 동선을 한 화면에서 이어보는 서울국제도서전 안내 화면입니다.
            </p>
          </div>
          <div className="grid gap-3">
            {infoRows.map((row) => (
              <StatBlock key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
