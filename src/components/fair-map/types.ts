export type BoothShape = {
  boothNumber: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  transform: string;
};

export type MapExhibitor = {
  no: number;
  booth: string;
  origBooth?: string;
  nameKo: string;
  nameEn: string;
  countryKo: string;
  countryEn: string;
  special: boolean;
  instagramUrl?: string;
  websiteUrl?: string;
};
