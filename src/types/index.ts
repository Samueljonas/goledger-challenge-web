export interface TvShow {
  title: string;
  description: string;
  recommendedAge: number;
  "@key"?: string;
  "@assetType"?: string;
}

export interface CreateTvShowPayload {
  asset: [
    {
      "@assetType": "tvShows";
      title: string;
      description: string;
      recommendedAge: number;
    },
  ];
}
export interface AgeRating {
  label: string;
  value: number;
}

// Classificação indicativa padrão MJ/Brasil
export const AGE_RATINGS: AgeRating[] = [
  { label: "Livre", value: 0 },
  { label: "10 anos", value: 10 },
  { label: "12 anos", value: 12 },
  { label: "14 anos", value: 14 },
  { label: "16 anos", value: 16 },
  { label: "18 anos", value: 18 },
];
