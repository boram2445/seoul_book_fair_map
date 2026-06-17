import { ExternalLink, Info, Ticket } from "lucide-react";
import Image from "next/image";

import { Panel, StatBlock } from "@/components/fair-app/panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import faqData from "../../../../data/sibf-2026-faq.json";
import { FaqSearch } from "./_components/faq-search";

const infoRows = [
  { label: "기간", value: "2026.06.24 - 06.28" },
  { label: "장소", value: "코엑스 A&B1홀" },
  { label: "주제", value: "인간선언" },
  { label: "주빈국", value: "프랑스" },
];

const operationRows = [
  { label: "06.24 - 06.27", value: "10:00 - 19:00" },
  { label: "06.28", value: "10:00 - 17:00" },
  { label: "입장 마감", value: "운영 종료 30분 전" },
];

const ticketRows = [
  { type: "얼리버드", period: "06.08 - 06.12", start: new Date(2026, 5, 8), end: new Date(2026, 5, 12), adult: "6,000원", youth: "3,000원" },
  { type: "일반", period: "06.13 - 06.23", start: new Date(2026, 5, 13), end: new Date(2026, 5, 23), adult: "12,000원", youth: "6,000원" },
  { type: "당일", period: "06.24 - 06.28", start: new Date(2026, 5, 24), end: new Date(2026, 5, 28), adult: "12,000원", youth: "6,000원" },
  { type: "두두리 패키지", period: "06.08 - 06.23", start: new Date(2026, 5, 8), end: new Date(2026, 5, 23), adult: "66,000원", youth: "-" },
];

function getTodayKST(): Date {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return new Date(kst.getFullYear(), kst.getMonth(), kst.getDate());
}

function getTicketStatus(start: Date, end: Date): "active" | "upcoming" | "expired" {
  const today = getTodayKST();
  const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  if (today > endOfDay) return "expired";
  if (today < start) return "upcoming";
  return "active";
}

const entrySteps = [
  "온라인 구매자는 등록 데스크에서 네이버 모바일 티켓을 확인하고 입장 팔찌를 수령합니다.",
  "현장 티켓은 현장 구매 전용 등록 데스크에서 구매 후 입장 팔찌를 수령합니다.",
  "초대권은 사전 등록 후 전용 등록 데스크에서 등록 내역을 확인합니다.",
  "무료 대상자는 증빙자료와 본인 확인 후 입장 팔찌를 수령합니다.",
];

const ticketNotes = [
  "온라인 티켓은 지정한 날짜에만 입장할 수 있습니다.",
  "방문일 하루 전까지 100% 환불 가능하며, 당일 환불은 불가합니다.",
  "당일 티켓은 구매 후 취소 및 환불이 불가합니다.",
  "재입장은 방문 당일 입장 팔찌를 소지한 경우에만 가능합니다.",
];

export default function InfoPage() {
  return (
    <div className="bg-brand-surface">
      <Panel
        title="행사 정보"
        icon={Info}
      >
        <Tabs defaultValue="intro" className="gap-4">
          <TabsList className="grid !h-11 w-full grid-cols-3 gap-0 overflow-hidden rounded-none border border-border bg-white p-0 sm:w-[420px]">
            <TabsTrigger
              value="intro"
              className="!h-11 cursor-pointer rounded-none border-r border-border text-sm font-black after:hidden data-[state=active]:bg-brand-ink data-[state=active]:text-white"
            >
              소개
            </TabsTrigger>
            <TabsTrigger
              value="ticket"
              className="!h-11 cursor-pointer rounded-none border-r border-border text-sm font-black after:hidden data-[state=active]:bg-brand-ink data-[state=active]:text-white"
            >
              티켓
            </TabsTrigger>
            <TabsTrigger
              value="faq"
              className="!h-11 cursor-pointer rounded-none text-sm font-black after:hidden data-[state=active]:bg-brand-ink data-[state=active]:text-white"
            >
              FAQ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="intro" className="m-0">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="grid gap-5 border border-border bg-brand-green p-5 md:grid-cols-[minmax(0,1fr)_220px]">
                <div>
                  <p className="text-sm font-black text-brand-green-deep">Seoul International Book Fair</p>
                  <h3 className="mt-3 text-2xl font-black tracking-normal md:text-3xl">책과 질문이 모이는 자리</h3>
                  <p className="mt-4 text-sm font-bold leading-6">
                    서울국제도서전은 1954년부터 이어진 국내 최대 규모의 책 축제입니다. 출판사,
                    저자, 독자, 예술가, 편집자 등이 한자리에 모여 책과 지식, 문화를 교류합니다.
                  </p>
                  <p className="mt-3 text-sm font-bold leading-6">
                    2026년 주제는 인간선언입니다. 공식 소개는 AI 시대에 더 큰 질문을 던지는 인간의
                    사유와 독서의 의미를 호모 두두리라는 키워드로 풀어냅니다.
                  </p>
                  <Button asChild type="button" variant="outline" className="mt-5 rounded-none border-border bg-white">
                    <a href="https://sibf.kr/page/11" target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      공식 소개
                    </a>
                  </Button>
                </div>
                <div className="border border-border bg-white p-2">
                  <Image
                    src="/data/sibf-2026-poster.png"
                    alt="2026 서울국제도서전 인간선언 포스터"
                    width={440}
                    height={560}
                    className="h-auto w-full object-contain"
                    priority
                  />
                </div>
              </section>

              <div className="grid gap-3">
                {infoRows.map((row) => (
                  <StatBlock key={row.label} label={row.label} value={row.value} />
                ))}
              </div>
            </div>

            <section className="mt-4 border border-border bg-white">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-black">운영 정보</h3>
              </div>
              <div className="grid gap-0 sm:grid-cols-3">
                {operationRows.map((row) => (
                  <div key={row.label} className="border-b border-border/20 px-4 py-3 sm:border-r sm:border-b-0 sm:last:border-r-0">
                    <p className="text-xs font-black text-brand-muted">{row.label}</p>
                    <strong className="mt-1 block text-base font-black">{row.value}</strong>
                  </div>
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="ticket" className="m-0">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
              <section className="border border-border bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-border bg-brand-yellow px-4 py-3">
                  <h3 className="text-sm font-black">온라인 티켓</h3>
                  <Button asChild type="button" size="sm" className="h-8 rounded-none border border-border bg-brand-ink text-white hover:bg-brand-green hover:text-brand-ink">
                    <a href="https://sibf.kr/page/61#p2" target="_blank" rel="noreferrer">
                      <Ticket className="h-4 w-4" />
                      구매
                    </a>
                  </Button>
                </div>
                <div className="grid gap-0">
                  {ticketRows.map((ticket) => {
                    const status = getTicketStatus(ticket.start, ticket.end);
                    return (
                      <article
                        key={ticket.type}
                        className={cn(
                          "grid gap-2 border-b border-border/20 px-4 py-3 last:border-b-0 sm:grid-cols-[120px_minmax(0,1fr)_112px_112px] sm:items-center",
                          status === "active" && "bg-brand-green/15",
                          status === "expired" && "opacity-40",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {status === "active" && (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green-deep opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green-deep" />
                            </span>
                          )}
                          <strong className="font-black">{ticket.type}</strong>
                        </div>
                        <span className={cn("text-sm font-bold", status === "active" ? "text-brand-green-deep" : "text-brand-muted")}>
                          {ticket.period}
                          {status === "active" && <span className="ml-2 font-black">판매중</span>}
                        </span>
                        <span className="text-sm font-black whitespace-nowrap">성인 {ticket.adult}</span>
                        <span className="text-sm font-black whitespace-nowrap">청소년 {ticket.youth}</span>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="border border-border bg-brand-panel p-4">
                <p className="text-xs font-black text-brand-rust">Ticket Notice</p>
                <h3 className="mt-2 text-xl font-black">입장 전 확인</h3>
                <ul className="mt-4 space-y-2">
                  {ticketNotes.map((note) => (
                    <li key={note} className="border border-border bg-white px-3 py-2 text-sm font-bold leading-5">
                      {note}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="mt-4 border border-border bg-white">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-black">입장 방법</h3>
              </div>
              <ol className="grid gap-0 lg:grid-cols-4">
                {entrySteps.map((step, index) => (
                  <li key={step} className="flex items-start gap-3 border-b border-border/20 p-4 lg:border-r lg:border-b-0 lg:last:border-r-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-brand-green text-sm font-black">
                      {index + 1}
                    </span>
                    <p className="text-sm font-bold leading-6">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          </TabsContent>

          <TabsContent value="faq" className="m-0">
            <FaqSearch items={faqData.items} />
          </TabsContent>
        </Tabs>
      </Panel>
    </div>
  );
}
