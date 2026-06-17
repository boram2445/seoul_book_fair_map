export type BoothEvent = {
  time?: string;
  period?: string;
  startAt?: string;
  endAt?: string;
  category: string;
  title: string;
  content: string;
  sourceName: string;
  instagramUrl?: string;
  imageUrl?: string;
};

function getSeoulDateTimeParts(date: Date) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return {
    month: parts.find((part) => part.type === "month")?.value ?? "",
    day: parts.find((part) => part.type === "day")?.value ?? "",
    hour: parts.find((part) => part.type === "hour")?.value ?? "",
    minute: parts.find((part) => part.type === "minute")?.value ?? "",
  };
}

function formatTimePart(date: Date) {
  const parts = getSeoulDateTimeParts(date);
  return `${parts.hour}:${parts.minute}`;
}

function formatDatePart(date: Date) {
  const parts = getSeoulDateTimeParts(date);
  return `${parts.month}/${parts.day}`;
}

function isScheduledCategory(category: string) {
  return category === "토크/강연" || category === "사인회";
}

function formatDateTimeRange(startAt: string, endAt?: string) {
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  const startLabel = `${formatDatePart(start)} ${formatTimePart(start)}`;

  if (!end) return startLabel;

  const isSameDate =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();

  if (isSameDate) {
    return `${startLabel}-${formatTimePart(end)}`;
  }

  return `${startLabel}-${formatDatePart(end)} ${formatTimePart(end)}`;
}

export function getEventScheduleLabel(event: BoothEvent) {
  if (event.startAt) {
    return formatDateTimeRange(event.startAt, event.endAt);
  }

  if (event.period) return event.period;
  if (event.time) return event.time;
  if (isScheduledCategory(event.category)) return "일정 확인";

  return "상시";
}
