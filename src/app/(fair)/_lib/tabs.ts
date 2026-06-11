import { /* CalendarDays, */ Heart, Info, Map, MessageSquareText, Trophy } from "lucide-react";

export const tabs = [
  { href: "/", label: "지도", icon: Map },
  // { href: "/events", label: "이벤트", icon: CalendarDays },
  { href: "/popular", label: "인기", icon: Trophy },
  { href: "/route", label: "찜 내역", icon: Heart },
  { href: "/reviews", label: "후기", icon: MessageSquareText },
  { href: "/info", label: "행사 정보", icon: Info },
];
