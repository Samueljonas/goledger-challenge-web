"use client";

import useSWR, { useSWRConfig } from "swr";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AGE_RATINGS, TvShow, Watchlist } from "../src/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

/* Retorna a classe CSS do badge conforme a faixa etária */
function getAgeClass(age: number): string {
  if (age === 0) return "tag tag-livre";
  if (age <= 10) return "tag tag-10";
  if (age <= 12) return "tag tag-12";
  if (age <= 14) return "tag tag-14";
  if (age <= 16) return "tag tag-16";
  return "tag tag-18";
}

function getAgeLabel(age: number): string {
  return AGE_RATINGS.find((r) => r.value === age)?.label ?? `${age} anos`;
}

/* Classifica o feedback para aplicar a classe correta */
function feedbackClass(msg: string): string {
  if (!msg) return "";
  if (msg.startsWith("Erro") || msg.startsWith("Falha"))
    return "feedback error";
  if (msg.includes("...") || msg.includes("Aguard")) return "feedback loading";
  return "feedback success";
}

export default function Home() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR("/api/tvshows", fetcher);
  const { data: watchlistsData } = useSWR("/api/watchlist", fetcher);
  const { mutate } = useSWRConfig();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    recommendedAge: "",
    seasons: "", // número de temporadas
    episodesPerSeason: "", // episódios por temporada
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShowForWatchlist, setSelectedShowForWatchlist] = useState<
    string | null
  >(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback("Processando transação...");

    try {
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch("/api/tvshows", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const responseData = await res.json();

      if (!res.ok || responseData.error) {
        throw new Error(responseData.error ?? "Falha na requisição");
      }

      setFormData({
        title: "",
        description: "",
        recommendedAge: "",
        seasons: "",
        episodesPerSeason: "",
      });
      setIsEditing(false);
      setIsDrawerOpen(false);
      setFeedback("Série registrada na blockchain.");
      mutate("/api/tvshows");
      setTimeout(() => setFeedback(""), 3500);
    } catch (_err: unknown) {
      const message =
        _err instanceof Error ? _err.message : "Erro desconhecido.";
      setFeedback(`Erro: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (show: TvShow) => {
    setFormData({
      title: show.title,
      description: show.description,
      recommendedAge: String(show.recommendedAge),
      seasons: "",
      episodesPerSeason: "",
    });
    setIsEditing(true);
    setIsDrawerOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (title: string) => {
    if (!window.confirm(`Tem certeza que deseja DELETAR "${title}"?`)) return;

    setFeedback("Removendo da blockchain...");
    try {
      const res = await fetch("/api/tvshows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      const responseData = await res.json();
      if (!res.ok || responseData.error) {
        throw new Error(responseData.error ?? "Falha ao deletar.");
      }

      setFeedback("Registro removido.");
      mutate("/api/tvshows");
      setTimeout(() => setFeedback(""), 3000);
    } catch (_err: unknown) {
      const message =
        _err instanceof Error ? _err.message : "Erro desconhecido.";
      setFeedback(`Erro: ${message}`);
    }
  };

  const handleAddToWatchlist = async (
    watchlistKey: string,
    showKey: string,
  ) => {
    setFeedback("Adicionando série à watchlist...");
    try {
      const watchlists = Array.isArray(watchlistsData)
        ? watchlistsData
        : (watchlistsData?.result ?? []);
      const watchlist = watchlists.find(
        (w: Record<string, unknown>) => w["@key"] === watchlistKey,
      );

      if (!watchlist) {
        throw new Error("Watchlist não encontrada");
      }

      const tvShows = watchlist.tvShows || [];

      // Verificar se a série já está na watchlist
      if (
        tvShows.some((ref: Record<string, unknown>) => ref["@key"] === showKey)
      ) {
        setFeedback("Esta série já está nesta watchlist");
        setTimeout(() => setFeedback(""), 3000);
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
            showKey,
          ],
        }),
      });

      const responseData = await res.json();
      if (!res.ok || responseData.error) {
        throw new Error(responseData.error ?? "Falha ao adicionar");
      }

      setFeedback("Série adicionada à watchlist!");
      setSelectedShowForWatchlist(null);
      mutate("/api/watchlist");
      setTimeout(() => setFeedback(""), 3000);
    } catch (_err: unknown) {
      const message =
        _err instanceof Error ? _err.message : "Erro desconhecido.";
      setFeedback(`Erro: ${message}`);
    }
  };

  const shows: TvShow[] = Array.isArray(data) ? data : (data?.result ?? []);
  const watchlists = Array.isArray(watchlistsData)
    ? watchlistsData
    : (watchlistsData?.result ?? []);

  // Filtrar shows pela busca
  const filteredShows = shows.filter((show) =>
    show.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (error)
    return (
      <div className="container">
        <div className="status-box" style={{ color: "#e07070" }}>
          Erro crítico ao conectar com a API da blockchain.
        </div>
      </div>
    );

  return (
    <main className="container">
      <header className="header">
        <h1>Séries</h1>
        <p>Catálogo descentralizado · Hyperledger Fabric</p>
      </header>

      {/* ── Botão para abrir drawer ────────────────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="btn btn-primary"
          style={{ width: "100%" }}
        >
          {isDrawerOpen ? "✖ Fechar Formulário" : "✎ Registrar Nova Série"}
        </button>
      </div>

      {/* ── Drawer (Formulário) ─────────────────────────────────────────── */}
      {isDrawerOpen && (
        <div className="form-box">
          <h2>{isEditing ? "Editar Série" : "Registrar Nova Série"}</h2>

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>
                Título Original{" "}
                {isEditing && (
                  <span style={{ color: "#e3b341", fontWeight: 400 }}>
                    · bloqueado
                  </span>
                )}
                <input
                  required
                  type="text"
                  name="title"
                  className="input"
                  placeholder="Ex: Breaking Bad"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={isEditing}
                />
              </label>
            </div>

            <div className="input-group">
              <label>
                Sinopse
                <input
                  required
                  type="text"
                  name="description"
                  className="input"
                  placeholder="Breve descrição da série"
                  value={formData.description}
                  onChange={handleChange}
                />
              </label>
            </div>

            <div className="input-group">
              <label>
                Classificação Indicativa
                <select
                  name="recommendedAge"
                  className="input"
                  value={formData.recommendedAge}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecione…</option>
                  {AGE_RATINGS.map((rating) => (
                    <option key={rating.value} value={rating.value}>
                      {rating.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!isEditing && (
              <>
                <div className="input-group">
                  <label>
                    Número de Temporadas
                    <input
                      type="number"
                      name="seasons"
                      className="input"
                      placeholder="Ex: 5"
                      value={formData.seasons}
                      onChange={handleChange}
                    />
                  </label>
                </div>

                <div className="input-group">
                  <label>
                    Episódios por Temporada (média)
                    <input
                      type="number"
                      name="episodesPerSeason"
                      className="input"
                      placeholder="Ex: 10"
                      value={formData.episodesPerSeason}
                      onChange={handleChange}
                    />
                  </label>
                </div>
              </>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Aguarde…"
                  : isEditing
                    ? "Salvar Alterações"
                    : "Registrar"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setIsDrawerOpen(false);
                    setFormData({
                      title: "",
                      description: "",
                      recommendedAge: "",
                      seasons: "",
                      episodesPerSeason: "",
                    });
                    setFeedback("");
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── Feedback ────────────────────────────────────────────── */}
      {feedback && <div className={feedbackClass(feedback)}>{feedback}</div>}

      {/* ── Campo de Busca ──────────────────────────────────────── */}
      <div style={{ marginBottom: "2rem" }}>
        <input
          type="text"
          placeholder="🔍 Buscar série por nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input"
          style={{ width: "100%" }}
        />
      </div>

      {/* ── Lista ───────────────────────────────────────────────── */}
      {isLoading ? (
        /* Skeleton loading */
        <div className="grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : shows.length === 0 ? (
        <div className="status-box">
          O catálogo está vazio. Registre a primeira série.
        </div>
      ) : filteredShows.length === 0 ? (
        <div className="status-box">
          Nenhuma série encontrada com &quot;{searchQuery}&quot;{" "}
        </div>
      ) : (
        <div className="grid">
          {filteredShows.map((show) => (
            <div
              key={show.title}
              className="card"
              onClick={() => router.push(`/series/${show["@key"]}`)}
              style={{ cursor: "pointer" }}
            >
              <div>
                <h2 className="card-title">{show.title}</h2>
                <span className={getAgeClass(show.recommendedAge)}>
                  {getAgeLabel(show.recommendedAge)}
                </span>
                <p className="card-desc" style={{ marginTop: "0.75rem" }}>
                  {show.description}
                </p>
              </div>

              <div className="actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedShowForWatchlist(show.title);
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem", padding: "0.5rem 1rem" }}
                >
                  ➕ Watchlist
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(show);
                  }}
                  className="btn-edit"
                  style={{ fontSize: "0.75rem", padding: "0.5rem 1rem" }}
                >
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(show.title);
                  }}
                  className="btn btn-danger"
                  style={{ fontSize: "0.75rem", padding: "0.5rem 1rem" }}
                >
                  Excluir
                </button>
              </div>

              {/* Modal para escolher watchlist */}
              {selectedShowForWatchlist === show.title && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    backgroundColor: "#1a1a1a",
                    borderRadius: "0.5rem",
                    border: "1px solid #333",
                  }}
                >
                  <p style={{ marginBottom: "0.75rem", fontSize: "0.9rem" }}>
                    Adicionar em qual watchlist?
                  </p>
                  {watchlists.length === 0 ? (
                    <p style={{ fontSize: "0.85rem", color: "#888" }}>
                      Nenhuma watchlist criada ainda
                    </p>
                  ) : (
                    watchlists.map((wl: Watchlist) => (
                      <button
                        key={wl["@key"]}
                        onClick={() =>
                          handleAddToWatchlist(wl["@key"], show["@key"] || "")
                        }
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "0.5rem",
                          marginBottom: "0.5rem",
                          backgroundColor: "#2a2a2a",
                          border: "1px solid #444",
                          borderRadius: "0.25rem",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#3a3a3a";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#2a2a2a";
                        }}
                      >
                        {wl.title}
                      </button>
                    ))
                  )}
                  <button
                    onClick={() => setSelectedShowForWatchlist(null)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "0.5rem",
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #555",
                      borderRadius: "0.25rem",
                      color: "#aaa",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
