import { boothForMap, exhibitors, getDisplayName } from "@/components/fair-map/map-data";

export type ReviewRow = {
  id: string;
  scope: "fair" | "booth";
  target: string;
  booth?: string;
  publisherName?: string;
  body: string;
  time: string;
  author: string;
  authorAvatarUrl: string;
};

export const reviewRows: ReviewRow[] = [
  {
    id: "review-1",
    scope: "fair",
    target: "서울국제도서전 전체",
    body: "입장 직후에는 사람이 많았지만, 행사장 구역이 생각보다 명확해서 관심 부스를 빠르게 찾을 수 있었어요.",
    time: "방금 전",
    author: "책갈피",
    authorAvatarUrl: "https://api.dicebear.com/9.x/thumbs/svg?seed=bookmark",
  },
  {
    id: "review-2",
    scope: "booth",
    target: "A101 고스트북스",
    booth: "A101",
    publisherName: "고스트북스",
    body: "독립출판물 구성이 좋아서 오래 머물렀어요. 작은 굿즈까지 차분히 볼 수 있어서 첫 방문 부스로 좋았습니다.",
    time: "12분 전",
    author: "종이산책",
    authorAvatarUrl: "https://api.dicebear.com/9.x/thumbs/svg?seed=paper-walk",
  },
  {
    id: "review-3",
    scope: "booth",
    target: "A301 워크룸 프레스",
    booth: "A301",
    publisherName: "워크룸 프레스",
    body: "디자인 서적을 직접 넘겨보는 재미가 컸고, 직원분이 책마다 결이 다른 부분을 짧게 설명해줘서 좋았어요.",
    time: "28분 전",
    author: "활자수집가",
    authorAvatarUrl: "https://api.dicebear.com/9.x/thumbs/svg?seed=type-collector",
  },
  {
    id: "review-4",
    scope: "booth",
    target: "B504 플랫폼P 입주사",
    booth: "B504",
    publisherName: "플랫폼P 입주사",
    body: "작은 출판사들이 한 부스에 모여 있어서 발견하는 재미가 있었습니다. 공간이 붐비니 오전 방문을 추천해요.",
    time: "1시간 전",
    author: "마포독자",
    authorAvatarUrl: "https://api.dicebear.com/9.x/thumbs/svg?seed=mapo-reader",
  },
];

export function getReviewsForPublisher(booth: string, publisherName: string) {
  return reviewRows.filter((review) => {
    if (review.scope !== "booth") return false;

    return review.booth === booth || review.publisherName === publisherName || review.target.includes(publisherName);
  });
}

export function getPublisherHrefForReview(review: ReviewRow) {
  if (review.scope !== "booth") return undefined;

  const publisher = exhibitors.find((exhibitor) => {
    const booth = boothForMap(exhibitor);
    const name = getDisplayName(exhibitor);

    return booth === review.booth || name === review.publisherName || review.target.includes(name);
  });

  return publisher ? `/publishers/${publisher.no}` : undefined;
}
