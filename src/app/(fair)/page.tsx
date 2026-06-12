import { GetPublishers } from "@/api/fair-map/fair-map";
import { BookFairMap } from "@/components/fair-map/book-fair-map";
import { shapes } from "@/components/fair-map/map-data";

export default async function MapPage() {
  const publishers = await GetPublishers();

  return <BookFairMap exhibitors={publishers} shapes={shapes} />;
}
