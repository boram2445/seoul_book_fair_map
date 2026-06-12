export type FairMapPublisher = {
  id: string;
  no: number;
  booth: string;
  origBooth?: string;
  nameKo: string;
  nameEn: string;
  countryKo: string;
  countryEn: string;
  special: boolean;
  categories: string[];
  introduction?: string;
  instagramUrl?: string;
  homepageUrl?: string;
  favoriteCount: number;
};

