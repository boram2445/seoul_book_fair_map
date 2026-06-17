export type BoothEvent = {
  time?: string;
  period?: string;
  category: string;
  title: string;
  content: string;
  sourceName: string;
  instagramUrl?: string;
  imageUrl?: string;
};

export function getEventScheduleLabel(event: BoothEvent) {
  return event.period ?? event.time ?? '상시';
}
