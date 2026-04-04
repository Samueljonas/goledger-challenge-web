"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { fetcher, extractArray } from "@/lib/fetcher";
import { TvShow, Watchlist, getAgeClass, getAgeLabel } from "@/src/types";

export default function WatchlistDetailPage() {
  const params = useParams();

  // Decodificamos o título da URL (ex: "Para%20Ver" vira "Para Ver")
  const rawTitle = params.title as string;
  const watchlistTitle = rawTitle ? decodeURIComponent(rawTitle) : "";

  // Procuramos os dados necessários na API
  const { data: wlData, isLoading: loadingWl } = useSWR(
    "/api/watchlist",
    fetcher,
  );
  const { data: showsData, isLoading: loadingShows } = useSWR(
    "/api/tvshows",
    fetcher,
  );

  const isLoading = loadingWl || loadingShows;

  if (isLoading) {
    return (
      <main className="container">
        <div className="status-box">A carregar conteúdo da Watchlist...</div>
      </main>
    );
  }

  const watchlists = extractArray<Watchlist>(wlData);
  const tvShows = extractArray<TvShow>(showsData);

  // Encontramos a watchlist específica que corresponde ao título na URL
  const watchlist = watchlists.find((wl) => wl.title === watchlistTitle);

  if (!watchlist) {
    return (
      <main className="container">
        <div className="status-box">
          Watchlist não encontrada.{" "}
          <Link href="/watchlists" style={{ color: "var(--gold)" }}>
            Voltar
          </Link>
        </div>
      </main>
    );
  }

  // Resolvemos as referências (@key) para obter os objetos completos das séries
  const watchlistShows = (watchlist.tvShows || [])
    .map((ref) => {
      // Tentamos encontrar a série pela @key ou pelo formato composto
      return tvShows.find(
        (s) =>
          s["@key"] === ref["@key"] || `tvShows:${s.title}` === ref["@key"],
      );
    })
    .filter(Boolean) as TvShow[];

  return (
    <main className="container">
      {/* Navegação de retorno */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/watchlists"
          style={{ color: "var(--gold)", textDecoration: "none" }}
        >
          ← Voltar às Watchlists
        </Link>
      </div>

      <header className="page-header">
        <h1>{watchlist.title}</h1>
        {watchlist.description && <p>{watchlist.description}</p>}
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            marginTop: "0.5rem",
          }}
        >
          {watchlistShows.length}{" "}
          {watchlistShows.length === 1
            ? "série adicionada"
            : "séries adicionadas"}
        </p>
      </header>

      {/* Listagem de Conteúdo */}
      {watchlistShows.length === 0 ? (
        <div className="status-box">
          Esta watchlist está vazia. Utilize o botão &quot;Editar séries&quot;
          na página anterior para adicionar conteúdo.
        </div>
      ) : (
        <div className="card-grid">
          {watchlistShows.map((show) => (
            <div className="card" key={show["@key"] || show.title}>
              <div>
                <h2 className="card-title">{show.title}</h2>
                <p className="card-desc">
                  {show.description?.substring(0, 120)}
                  {show.description && show.description.length > 120
                    ? "..."
                    : ""}
                </p>

                <div style={{ marginTop: "1rem" }}>
                  {show.recommendedAge !== undefined && (
                    <span className={getAgeClass(show.recommendedAge)}>
                      {getAgeLabel(show.recommendedAge)}
                    </span>
                  )}
                </div>
              </div>

              <div className="card-actions">
                <Link
                  href={`/series/${encodeURIComponent(show["@key"] || "")}`}
                  className="btn btn-primary"
                  style={{
                    textAlign: "center",
                    display: "block",
                    textDecoration: "none",
                  }}
                >
                  Abrir Série
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
