/**
 * src/types/index.ts
 * Fonte única de verdade para todos os tipos de domínio.
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

// ─── Entidades do Blockchain ──────────────────────────────────────────────────

export interface TvShow {
  "@assetType"?: string;
  title: string; // isKey
  description: string;
  recommendedAge: number;
}

export interface Season {
  "@assetType"?: string;
  tvShowName: string; // isKey pt.1
  seasonNumber: number; // isKey pt.2
  episodes: number;
}

export interface Episode {
  "@assetType"?: string;
  tvShowName: string; // isKey pt.1
  seasonNumber: number; // isKey pt.2
  episodeNumber: number; // isKey pt.3
  episodeName: string;
}

/** Referência de asset no formato GoLedger */
export interface AssetRef {
  "@assetType": string;
  [key: string]: string | number;
}

export interface Watchlist {
  "@assetType"?: string;
  name: string; // isKey
  tvShows: (AssetRef | TvShow)[];
}

// ─── Helpers de tipo ──────────────────────────────────────────────────────────

/** Normaliza ref GoLedger ou TvShow completo para título puro */
export function toTitle(ref: AssetRef | TvShow | string): string {
  if (typeof ref === "string") return ref;
  return (
    (ref as TvShow).title ?? ((ref as Record<string, unknown>).title as string)
  );
}

/** Retorna a classe CSS do badge de classificação etária */
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
