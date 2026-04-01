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
