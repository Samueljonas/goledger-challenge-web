/**
 * src/types/index.ts — schema real confirmado via curl na API GoLedger
 */

// ─── Classificação Indicativa ─────────────────────────────────────────────────
export interface AgeRating {
  label: string;
  value: number;
}

export const AGE_RATINGS: AgeRating[] = [
  { label: "Livre", value: 0 },
  { label: "10 anos", value: 10 },
  { label: "12 anos", value: 12 },
  { label: "14 anos", value: 14 },
  { label: "16 anos", value: 16 },
  { label: "18 anos", value: 18 },
];

// ─── Referência de asset GoLedger ─────────────────────────────────────────────
export interface AssetRef {
  "@assetType": string;
  "@key": string;
}

// ─── TvShow ───────────────────────────────────────────────────────────────────
// @assetType: "tvShows"  |  isKey: title
export interface TvShow {
  "@assetType"?: string;
  "@key"?: string;
  title: string;
  description: string;
  recommendedAge: number;
}

// ─── Season ───────────────────────────────────────────────────────────────────
// @assetType: "seasons"  |  key: UUID gerado pela API
// Campos reais confirmados: number, year, tvShow (AssetRef)
export interface Season {
  "@assetType": string;
  "@key": string;
  number: number;
  year: number;
  tvShow: AssetRef; // { "@assetType": "tvShows", "@key": "tvShows:UUID" }
  // Propriedades denormalizadas para uso frontend
  seasonNumber?: number;
  tvShowName?: string;
}

// ─── Episode ──────────────────────────────────────────────────────────────────
// @assetType: "episodes"  |  key: UUID gerado pela API
// Campos reais confirmados: title, description, episodeNumber, rating, releaseDate, season (AssetRef)
export interface Episode {
  "@assetType": string;
  "@key": string;
  title: string;
  description: string;
  episodeNumber: number;
  rating?: number;
  releaseDate: string; // ISO 8601
  season: AssetRef; // { "@assetType": "seasons", "@key": "seasons:UUID" }
  // Propriedades denormalizadas para uso frontend
  episodeName?: string;
  seasonNumber?: number;
  tvShowName?: string;
}

// ─── Watchlist ────────────────────────────────────────────────────────────────
// @assetType: "watchlist"  |  key: UUID gerado pela API
// Schema real da API: title, description, tvShows (array de AssetRef)
export interface Watchlist {
  "@assetType": string;
  "@key": string;
  title: string;
  description?: string;
  tvShows: AssetRef[];
  // Propriedades legadas (manter compatibilidade)
  name?: string;
}

// ─── Helpers client-side ──────────────────────────────────────────────────────

/** Extrai o título de uma referência de série (usado em watchlists para extrair títulos) */
export function toTitle(ref: AssetRef): string {
  // Formato padrão: "tvShows:UUID" ou "tvShows:title"
  const parts = ref["@key"]?.split(":") ?? [];
  return parts.length > 1 ? parts.slice(1).join(":") : "";
}

/** Monta mapa "@key" → title para resolver referências de seasons no client */
export function buildTvShowMap(tvShows: TvShow[]): Record<string, string> {
  return tvShows.reduce<Record<string, string>>((acc, show) => {
    if (show["@key"]) acc[show["@key"]] = show.title;
    return acc;
  }, {});
}

export function getAgeClass(age: number): string {
  if (age === 0) return "tag tag-livre";
  if (age <= 10) return "tag tag-10";
  if (age <= 12) return "tag tag-12";
  if (age <= 14) return "tag tag-14";
  if (age <= 16) return "tag tag-16";
  return "tag tag-18";
}

export function getAgeLabel(age: number): string {
  return AGE_RATINGS.find((r) => r.value === age)?.label ?? `${age} anos`;
}
