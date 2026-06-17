import { GetPublisherEvents, GetPublishers } from "@/api/fair-map/fair-map";
import { BookFairMap } from "@/components/fair-map/book-fair-map";
import { shapes } from "@/components/fair-map/map-data";

export default async function MapPage() {
  const [publishers, eventsByBooth] = await Promise.all([
    GetPublishers(),
    GetPublisherEvents(),
  ]);

  return <BookFairMap exhibitors={publishers} shapes={shapes} eventsByBooth={eventsByBooth} />;
}
