import type { BoothEvent } from "@/components/fair-map/booth-events";
import type { FairMapPublisher } from "./type";

export type GetPublishersResponse = FairMapPublisher[];

export type GetPublisherByExhibitorNoResponse = FairMapPublisher | null;

export type GetPublisherEventsResponse = Record<string, BoothEvent[]>;
