export interface TVShowReference {
  "@assetType": "tvShows";
  "@key": string;
}

export interface Watchlist {
  "@assetType": "watchlist";
  "@key": string;
  "@lastTouchBy": string;
  "@lastTx": string;
  "@lastTxID": string;
  "@lastUpdated": string;
  title: string;
  description: string;
  tvShows: TVShowReference[];
}

export interface WatchlistResponse {
  metadata: null | Record<string, unknown>;
  result: Watchlist[];
}

export interface CreateWatchlistRequest {
  title: string;
  description: string;
}

export interface UpdateWatchlistRequest {
  title: string;
  description: string;
  tvShows: string[]; // Array de @key values
}
