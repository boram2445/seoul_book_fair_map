import { CalendarDays, Info, Map, MessageSquareText, Route, Trophy } from "lucide-react";

export const tabs = [
  { href: "/", label: "지도", icon: Map },
  { href: "/info", label: "행사 정보", icon: Info },
  { href: "/events", label: "이벤트", icon: CalendarDays },
  { href: "/popular", label: "인기", icon: Trophy },
  { href: "/route", label: "내 동선", icon: Route },
  { href: "/reviews", label: "후기", icon: MessageSquareText },
];
