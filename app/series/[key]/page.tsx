"use client";

import useSWR, { useSWRConfig } from "swr";
import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Season, Episode, Watchlist, AGE_RATINGS } from "../../../src/types"; // IMPORT WATCHLIST ADICIONADO

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function getAgeClass(age: number): string {
  if (age === 0) return "tag tag-livre";
  if (age <= 10) return "tag tag-10";
  if (age <= 12) return "tag tag-12";
  if (age <= 14) return "tag tag-14";
  if (age <= 16) return "tag tag-16";
  return "tag tag-18";
}

function getAgeLabel(age: number): string {
  return (
    AGE_RATINGS.find((r: { label: string; value: number }) => r.value === age)
      ?.label ?? `${age} anos`
  );
}

function feedbackClass(msg: string): string {
  if (!msg) return "";
  if (msg.startsWith("Erro") || msg.startsWith("Falha"))
    return "feedback error";
  if (msg.includes("...") || msg.includes("Aguard")) return "feedback loading";
  return "feedback success";
}

function toDateInput(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR");
}

export default function SeriesDetailPage() {
  const params = useParams();
  const rawKey = params.key as string;
  const seriesKey = rawKey ? decodeURIComponent(rawKey) : "";

  const { data: tvShowData, isLoading: tvShowLoading } = useSWR(
    seriesKey ? `/api/tvshows?key=${seriesKey}` : null,
    fetcher,
  );

  // Extrair série do array
  const tvShow = Array.isArray(tvShowData)
    ? tvShowData[0]
    : tvShowData?.result?.[0];

  const { data: seasonData } = useSWR(
    seriesKey ? `/api/seasons?tvShowKey=${seriesKey}` : null,
    fetcher,
  );

  const seasons = Array.isArray(seasonData)
    ? seasonData
    : (seasonData?.result ?? []);

  const { data: episodeData } = useSWR(
    seriesKey ? `/api/episodes?tvShowKey=${seriesKey}` : null,
    fetcher,
  );

  const episodes = Array.isArray(episodeData)
    ? episodeData
    : (episodeData?.result ?? []);

  const { data: watchlistsData } = useSWR("/api/watchlist", fetcher);

  const { mutate } = useSWRConfig();

  // Drawer states
  const [seasonDrawerOpen, setSeasonDrawerOpen] = useState(false);
  const [episodeDrawerOpen, setEpisodeDrawerOpen] = useState(false);
  const [watchlistDrawerOpen, setWatchlistDrawerOpen] = useState(false);
  const [watchlistFeedback, setWatchlistFeedback] = useState("");
  const [expandedSeason, setExpandedSeason] = useState<string | null>(null);

  // Season form
  const [seasonForm, setSeasonForm] = useState({
    number: "",
    year: "",
    title: "",
    description: "",
  });
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [seasonFeedback, setSeasonFeedback] = useState("");

  // Episode form
  const [episodeForm, setEpisodeForm] = useState({
    seasonKey: "",
    title: "",
    description: "",
    episodeNumber: "",
    rating: "",
    releaseDate: "",
  });
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [episodeFeedback, setEpisodeFeedback] = useState("");

  // Handlers for season
  const handleSeasonChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setSeasonForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSeasonSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSeasonFeedback("Salvando temporada...");

    try {
      const method = editingSeason ? "PUT" : "POST";
      const payload = editingSeason
        ? {
            "@key": editingSeason["@key"],
            year: parseInt(seasonForm.year),
          }
        : {
            // Usamos a chave ABSOLUTA do objeto carregado do banco
            tvShow: { "@key": tvShow["@key"] },
            number: parseInt(seasonForm.number),
            year: parseInt(seasonForm.year),
          };

      const response = await fetch(`/api/seasons`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Falha ao salvar temporada");

      setSeasonFeedback("✓ Temporada salva com sucesso!");
      setSeasonForm({ number: "", year: "", title: "", description: "" });
      setEditingSeason(null);
      setSeasonDrawerOpen(false);
      mutate(`/api/seasons?tvShowKey=${seriesKey}`);
    } catch {
      setSeasonFeedback("Erro ao salvar temporada");
    }
  };

  const handleSeasonEdit = (season: Season) => {
    setEditingSeason(season);
    setSeasonForm({
      number: season.number.toString(),
      year: season.year.toString(),
      title: "",
      description: "",
    });
    setSeasonDrawerOpen(true);
  };

  const handleSeasonCancel = () => {
    setSeasonDrawerOpen(false);
    setEditingSeason(null);
    setSeasonForm({ number: "", year: "", title: "", description: "" });
    setSeasonFeedback("");
  };

  const handleSeasonDelete = async (season: Season) => {
    if (confirm(`Deletar temporada ${season.number}?`)) {
      try {
        const response = await fetch(`/api/seasons`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "@key": season["@key"] }),
        });

        if (!response.ok) throw new Error("Falha ao deletar");

        setSeasonFeedback("✓ Temporada deletada!");
        mutate(`/api/seasons?tvShowKey=${seriesKey}`);
      } catch {
        setSeasonFeedback("Erro ao deletar");
      }
    }
  };

  // Handlers for episode
  const handleEpisodeChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setEpisodeForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEpisodeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEpisodeFeedback("Salvando episódio...");

    try {
      const method = editingEpisode ? "PUT" : "POST";
      const selectedSeason = seasons?.find(
        (s: Season) => s["@key"] === episodeForm.seasonKey,
      );

      if (!selectedSeason) {
        throw new Error("Selecione uma temporada válida");
      }
      if (episodeForm.releaseDate) {
        const episodeYear = new Date(episodeForm.releaseDate).getFullYear();
        if (episodeYear < selectedSeason.year) {
          throw new Error(
            `Violação de data: O episódio (${episodeYear}) não pode lançar antes da Temporada (${selectedSeason.year}).`,
          );
        }
      }

      const payload = editingEpisode
        ? {
            "@key": editingEpisode["@key"],
            title: episodeForm.title,
            description: episodeForm.description,
            episodeNumber: parseInt(episodeForm.episodeNumber),
            rating: episodeForm.rating ? parseFloat(episodeForm.rating) : null,
            releaseDate: episodeForm.releaseDate,
          }
        : {
            season: { "@key": episodeForm.seasonKey },
            title: episodeForm.title,
            description: episodeForm.description,
            episodeNumber: parseInt(episodeForm.episodeNumber),
            rating: episodeForm.rating ? parseFloat(episodeForm.rating) : null,
            releaseDate: episodeForm.releaseDate,
          };

      const response = await fetch(`/api/episodes`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Falha ao salvar episódio");

      setEpisodeFeedback("✓ Episódio salvo com sucesso!");
      setEpisodeForm({
        seasonKey: "",
        title: "",
        description: "",
        episodeNumber: "",
        rating: "",
        releaseDate: "",
      });
      setEditingEpisode(null);
      setEpisodeDrawerOpen(false);
      mutate(`/api/episodes?tvShowKey=${seriesKey}`);
    } catch {
      setEpisodeFeedback("Erro ao salvar episódio");
    }
  };

  const handleEpisodeEdit = (episode: Episode) => {
    setEditingEpisode(episode);
    setEpisodeForm({
      seasonKey: episode.season["@key"],
      title: episode.title,
      description: episode.description,
      episodeNumber: episode.episodeNumber.toString(),
      rating: episode.rating?.toString() ?? "",
      releaseDate: episode.releaseDate ?? "",
    });
    setEpisodeDrawerOpen(true);
  };

  const handleEpisodeCancel = () => {
    setEpisodeDrawerOpen(false);
    setEditingEpisode(null);
    setEpisodeForm({
      seasonKey: "",
      title: "",
      description: "",
      episodeNumber: "",
      rating: "",
      releaseDate: "",
    });
    setEpisodeFeedback("");
  };

  const handleAddToWatchlist = async (watchlistKey: string) => {
    setWatchlistFeedback("Adicionando série à watchlist...");
    try {
      const watchlists = Array.isArray(watchlistsData)
        ? watchlistsData
        : (watchlistsData?.result ?? []);
      // SUBSTITUÍDO: de (w: any) para (w: Watchlist)
      const watchlist = watchlists.find(
        (w: Watchlist) => w["@key"] === watchlistKey,
      );

      if (!watchlist) {
        throw new Error("Watchlist não encontrada");
      }

      const tvShows = watchlist.tvShows || [];

      // Verificar se a série já está na watchlist
      if (
        tvShows.some(
          (ref: Record<string, unknown>) => ref["@key"] === seriesKey,
        )
      ) {
        setWatchlistFeedback("Esta série já está nesta watchlist");
        setTimeout(() => setWatchlistFeedback(""), 3000);
        return;
      }

      const res = await fetch("/api/watchlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: watchlist.title,
          description: watchlist.description || "",
          tvShows: [
            ...(tvShows || []).map(
              (ref: Record<string, unknown>) => ref["@key"],
            ),
            seriesKey,
          ],
        }),
      });

      const responseData = await res.json();
      if (!res.ok || responseData.error) {
        throw new Error(responseData.error ?? "Falha ao adicionar");
      }

      setWatchlistFeedback("Série adicionada à watchlist!");
      setWatchlistDrawerOpen(false);
      mutate("/api/watchlist");
      setTimeout(() => setWatchlistFeedback(""), 3000);
    } catch (_err: unknown) {
      const message =
        _err instanceof Error ? _err.message : "Erro desconhecido.";
      setWatchlistFeedback(`Erro: ${message}`);
    }
  };

  const handleEpisodeDelete = async (episode: Episode) => {
    if (
      confirm(`Deletar episódio ${episode.episodeNumber} - ${episode.title}?`)
    ) {
      try {
        const response = await fetch(`/api/episodes`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "@key": episode["@key"] }),
        });

        if (!response.ok) throw new Error("Falha ao deletar");

        setEpisodeFeedback("✓ Episódio deletado!");
        mutate(`/api/episodes?tvShowKey=${seriesKey}`);
      } catch {
        setEpisodeFeedback("Erro ao deletar");
      }
    }
  };

  if (tvShowLoading) {
    return (
      <main className="container">
        <div className="status-box">Carregando série...</div>
      </main>
    );
  }

  if (!tvShow) {
    return (
      <main className="container">
        <div className="status-box">
          Série não encontrada.{" "}
          <Link href="/" style={{ color: "var(--gold)" }}>
            Voltar
          </Link>
        </div>
      </main>
    );
  }

  const seasonList = seasons || [];
  const episodeList = episodes || [];

  return (
    <main className="container">
      {/* Breadcrumb */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--gold)", textDecoration: "none" }}>
          ← Voltar às séries
        </Link>
      </div>

      {/* Header */}
      <header className="page-header">
        <h1>{tvShow.title}</h1>
        <p>
          {tvShow.description}
          {tvShow.recommendedAge && (
            <span className={getAgeClass(tvShow.recommendedAge)}>
              {getAgeLabel(tvShow.recommendedAge)}
            </span>
          )}
        </p>
      </header>

      {/* Watchlist Section */}
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setWatchlistDrawerOpen(!watchlistDrawerOpen);
          }}
          className="btn btn-primary"
          style={{ marginBottom: "1rem" }}
        >
          {watchlistDrawerOpen ? "✖ Fechar" : "★ Adicionar a Watchlist"}
        </button>

        {watchlistDrawerOpen && (
          <div className="form-box">
            <h3 style={{ color: "var(--blue)" }}>Selecione uma Watchlist</h3>

            {watchlistFeedback && (
              <div
                className={feedbackClass(watchlistFeedback)}
                style={{ marginBottom: "1rem" }}
              >
                {watchlistFeedback}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {(() => {
                const watchlists = Array.isArray(watchlistsData)
                  ? watchlistsData
                  : (watchlistsData?.result ?? []);
                return watchlists.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                    Nenhuma watchlist disponível
                  </p>
                ) : (
                  watchlists.map(
                    (
                      wl: Watchlist, // SUBSTITUÍDO: de (wl: any) para (wl: Watchlist)
                    ) => (
                      <button
                        key={wl["@key"]}
                        onClick={() => handleAddToWatchlist(wl["@key"])}
                        className="btn btn-secondary"
                        style={{ justifyContent: "flex-start", width: "100%" }}
                      >
                        {wl.title}
                      </button>
                    ),
                  )
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Seasons Section */}
      <div style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: "700",
            color: "var(--purple)",
            marginBottom: "1rem",
          }}
        >
          Temporadas
        </h2>

        <button
          onClick={() => setSeasonDrawerOpen(!seasonDrawerOpen)}
          className="btn btn-primary"
          style={{ marginBottom: "1.5rem" }}
        >
          {seasonDrawerOpen ? "✖ Fechar" : "✎ Adicionar Temporada"}
        </button>

        {seasonDrawerOpen && (
          <div className="form-box">
            <h3 style={{ color: "var(--blue)" }}>
              {editingSeason
                ? `Editar Temporada ${editingSeason.number}`
                : "Adicionar Temporada"}
            </h3>

            {seasonFeedback && (
              <div className={feedbackClass(seasonFeedback)}>
                {seasonFeedback}
              </div>
            )}

            <form onSubmit={handleSeasonSubmit}>
              <div className="input-group">
                <label>
                  Número da Temporada
                  <input
                    type="number"
                    name="number"
                    value={seasonForm.number}
                    onChange={handleSeasonChange}
                    min={1}
                    required
                    disabled={!!editingSeason}
                  />
                </label>
              </div>

              <div className="input-group">
                <label>
                  Ano
                  <input
                    type="number"
                    name="year"
                    value={seasonForm.year}
                    onChange={handleSeasonChange}
                    min={1900}
                    required
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingSeason ? "Salvar" : "Adicionar"}
                </button>
                {editingSeason && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleSeasonCancel}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <div className="card-grid">
          {seasonList.length === 0 ? (
            <div className="status-box">Nenhuma temporada cadastrada.</div>
          ) : (
            seasonList.map((season: Season) => {
              const seasonEpisodes = episodeList.filter(
                (ep: Episode) => ep.season["@key"] === season["@key"],
              );
              const isExpanded = expandedSeason === season["@key"];

              return (
                <div key={season["@key"]} className="card">
                  <div>
                    <h3 className="card-title">Temporada {season.number}</h3>
                    <p className="card-meta">{season.year}</p>
                    {seasonEpisodes.length > 0 && (
                      <p className="card-meta" style={{ marginTop: "0.5rem" }}>
                        {seasonEpisodes.length}{" "}
                        {seasonEpisodes.length === 1 ? "episódio" : "episódios"}
                      </p>
                    )}
                  </div>

                  {/* Episódios da temporada */}
                  {seasonEpisodes.length > 0 && (
                    <div
                      style={{
                        marginTop: "1rem",
                        borderTop: "1px solid var(--border)",
                        paddingTop: "1rem",
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedSeason(isExpanded ? null : season["@key"]);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--blue)",
                          cursor: "pointer",
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          padding: 0,
                          marginBottom: isExpanded ? "0.75rem" : 0,
                          width: "100%",
                          textAlign: "left",
                        }}
                      >
                        {isExpanded ? "▼" : "▶"} Episódios
                      </button>

                      {isExpanded && (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.75rem",
                          }}
                        >
                          {seasonEpisodes.map((episode: Episode) => (
                            <div
                              key={episode["@key"]}
                              style={{
                                padding: "0.75rem",
                                backgroundColor: "var(--bg-base)",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--border)",
                                fontSize: "0.9rem",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                <div>
                                  <p
                                    style={{
                                      color: "var(--text-primary)",
                                      fontWeight: 600,
                                      margin: 0,
                                    }}
                                  >
                                    E{episode.episodeNumber} - {episode.title}
                                  </p>
                                  {episode.description && (
                                    <p
                                      style={{
                                        color: "var(--text-secondary)",
                                        fontSize: "0.85rem",
                                        margin: "0.25rem 0 0 0",
                                      }}
                                    >
                                      {episode.description}
                                    </p>
                                  )}
                                  {(episode.rating || episode.releaseDate) && (
                                    <p
                                      style={{
                                        color: "var(--text-muted)",
                                        fontSize: "0.8rem",
                                        margin: "0.25rem 0 0 0",
                                      }}
                                    >
                                      {episode.rating && (
                                        <>⭐ {episode.rating}</>
                                      )}
                                      {episode.rating &&
                                        episode.releaseDate &&
                                        " · "}
                                      {episode.releaseDate &&
                                        toDateInput(episode.releaseDate)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEpisodeEdit(episode);
                                  }}
                                  className="btn-edit"
                                  style={{
                                    fontSize: "0.75rem",
                                    padding: "0.4rem 0.8rem",
                                    flex: 1,
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEpisodeDelete(episode);
                                  }}
                                  className="btn btn-danger"
                                  style={{
                                    fontSize: "0.75rem",
                                    padding: "0.4rem 0.8rem",
                                    flex: 1,
                                  }}
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className="card-actions"
                    style={{
                      marginTop: seasonEpisodes.length > 0 ? "1rem" : "auto",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeasonEdit(season);
                      }}
                      className="btn-edit"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSeasonDelete(season);
                      }}
                      className="btn btn-danger"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Episodes Section - Drawer only */}
      <div style={{ marginTop: "2rem" }}>
        <button
          onClick={() => setEpisodeDrawerOpen(!episodeDrawerOpen)}
          className="btn btn-primary"
          style={{ marginBottom: "1rem" }}
        >
          {episodeDrawerOpen ? "✖ Fechar" : "✎ Adicionar Episódio"}
        </button>

        {episodeDrawerOpen && (
          <div className="form-box">
            <h3 style={{ color: "var(--blue)" }}>
              {editingEpisode
                ? `Editar Episódio ${editingEpisode.episodeNumber}`
                : "Adicionar Episódio"}
            </h3>

            {episodeFeedback && (
              <div className={feedbackClass(episodeFeedback)}>
                {episodeFeedback}
              </div>
            )}

            <form onSubmit={handleEpisodeSubmit}>
              <div className="input-group">
                <label>
                  Temporada
                  <select
                    name="seasonKey"
                    value={episodeForm.seasonKey}
                    onChange={handleEpisodeChange}
                    required
                  >
                    <option value="">Selecione uma temporada</option>
                    {seasonList.map((s: Season) => (
                      <option key={s["@key"]} value={s["@key"]}>
                        Temporada {s.number}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="input-group">
                <label>
                  Número do Episódio
                  <input
                    type="number"
                    name="episodeNumber"
                    value={episodeForm.episodeNumber}
                    onChange={handleEpisodeChange}
                    min={1}
                    required
                  />
                </label>
              </div>

              <div className="input-group">
                <label>
                  Título
                  <input
                    type="text"
                    name="title"
                    value={episodeForm.title}
                    onChange={handleEpisodeChange}
                    required
                  />
                </label>
              </div>

              <div className="input-group">
                <label>
                  Descrição
                  <textarea
                    name="description"
                    value={episodeForm.description}
                    onChange={handleEpisodeChange}
                    rows={3}
                  />
                </label>
              </div>

              <div className="input-group">
                <label>
                  Nota (0–10)
                  <input
                    type="number"
                    name="rating"
                    value={episodeForm.rating}
                    onChange={handleEpisodeChange}
                    min={0}
                    max={10}
                    step={0.1}
                  />
                </label>
              </div>

              <div className="input-group">
                <label>
                  Data de Lançamento
                  <input
                    type="date"
                    name="releaseDate"
                    value={episodeForm.releaseDate}
                    onChange={handleEpisodeChange}
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingEpisode ? "Salvar" : "Adicionar"}
                </button>
                {editingEpisode && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleEpisodeCancel}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
