"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, extractArray, apiFetch } from "@/lib/fetcher";
import { TvShow, Season, Episode, buildTvShowMap } from "@/src/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Monta mapa "@key" → Season para resolver referências dos episodes */
function buildSeasonMap(seasons: Season[]): Record<string, Season> {
  return seasons.reduce<Record<string, Season>>((acc, s) => {
    acc[s["@key"]] = s;
    return acc;
  }, {});
}

/** Formata ISO date para input[type=date] (YYYY-MM-DD) */
function toDateInput(iso: string): string {
  return iso ? iso.slice(0, 10) : "";
}

type FormState = {
  "@key": string; // vazio no create, preenchido no edit
  tvShowKey: string; // para filtrar seasons no select
  seasonKey: string; // @key da season selecionada
  title: string;
  description: string;
  episodeNumber: string;
  rating: string;
  releaseDate: string; // YYYY-MM-DD
};

const EMPTY_FORM: FormState = {
  "@key": "",
  tvShowKey: "",
  seasonKey: "",
  title: "",
  description: "",
  episodeNumber: "",
  rating: "",
  releaseDate: "",
};

function feedbackClass(msg: string): string {
  if (!msg) return "";
  if (msg.startsWith("Erro")) return "feedback error";
  if (msg.includes("...")) return "feedback loading";
  return "feedback success";
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EpisodesPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Filtros de listagem (independentes do formulário)
  const [filterTvShow, setFilterTvShow] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Dados ──────────────────────────────────────────────────────────────────
  const { data: showsData, isLoading: loadingShows } = useSWR(
    "/api/tvshows",
    fetcher,
  );
  const { data: seasonsData, isLoading: loadingSeasons } = useSWR(
    "/api/seasons",
    fetcher,
  );
  const {
    data: episodesData,
    isLoading: loadingEpisodes,
    mutate,
  } = useSWR("/api/episodes", fetcher);

  const tvShows = extractArray<TvShow>(showsData);
  const allSeasons = extractArray<Season>(seasonsData);
  const allEpisodes = extractArray<Episode>(episodesData);

  // Mapas para joins client-side
  const tvShowMap = buildTvShowMap(tvShows); // "@key" → title
  const seasonMap = buildSeasonMap(allSeasons); // "@key" → Season

  // Seasons filtradas pelo tvShow selecionado NO FORMULÁRIO
  const seasonsForForm = allSeasons.filter(
    (s) => s.tvShow["@key"] === form.tvShowKey,
  );

  // Seasons filtradas pelo tvShow selecionado NO FILTRO DE LISTAGEM
  const seasonsForFilter = allSeasons.filter(
    (s) => s.tvShow["@key"] === filterTvShow,
  );

  // Listagem filtrada
  const episodes = allEpisodes.filter((ep) => {
    const epSeason = seasonMap[ep.season["@key"]];
    if (filterTvShow && epSeason?.tvShow["@key"] !== filterTvShow) return false;
    if (filterSeason && ep.season["@key"] !== filterSeason) return false;
    return true;
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = e.target;
    setForm((prev) => {
      // Reset em cascata: trocar série limpa a season
      if (name === "tvShowKey")
        return { ...prev, tvShowKey: value, seasonKey: "" };
      return { ...prev, [name]: value };
    });
  }

  function handleEdit(ep: Episode) {
    const season = seasonMap[ep.season["@key"]];
    setForm({
      "@key": ep["@key"],
      tvShowKey: season?.tvShow["@key"] ?? "",
      seasonKey: ep.season["@key"],
      title: ep.title,
      description: ep.description,
      episodeNumber: String(ep.episodeNumber),
      rating: ep.rating != null ? String(ep.rating) : "",
      releaseDate: toDateInput(ep.releaseDate),
    });
    setIsEditing(true);
    setIsDrawerOpen(true);
    setFeedback("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancel() {
    setForm(EMPTY_FORM);
    setIsEditing(false);
    setIsDrawerOpen(false);
    setFeedback("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback("Processando transação...");
    try {
      await apiFetch("/api/episodes", {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setFeedback(
        isEditing
          ? "Episódio atualizado."
          : "Episódio registrado na blockchain.",
      );
      mutate();
      handleCancel();
      setTimeout(() => setFeedback(""), 3500);
    } catch (_err: unknown) {
      const msg = _err instanceof Error ? _err.message : "Erro desconhecido.";
      setFeedback(`Erro: ${msg}`);
    }
  }

  async function handleDelete(ep: Episode) {
    if (!confirm(`Excluir "${ep.title}" (E${ep.episodeNumber})?`)) return;
    setFeedback("Removendo da blockchain...");
    try {
      await apiFetch("/api/episodes", {
        method: "DELETE",
        body: JSON.stringify({ "@key": ep["@key"] }),
      });
      setFeedback("Episódio removido.");
      mutate();
      setTimeout(() => setFeedback(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido.";
      setFeedback(`Erro: ${msg}`);
    }
  }

  const isLoading = loadingShows || loadingSeasons || loadingEpisodes;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="container">
      <header className="page-header">
        <h1>Episódios</h1>
        <p>Gerencie os episódios por temporada · Hyperledger Fabric</p>
      </header>

      {/* ── Botão para abrir drawer ────────────────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="btn btn-primary"
          style={{ width: "100%" }}
        >
          {isDrawerOpen ? "✖ Fechar Formulário" : "✎ Adicionar Episódio"}
        </button>
      </div>

      {/* ── Drawer (Formulário) ─────────────────────────────────────────── */}
      {isDrawerOpen && (
        <div className="form-box">
          <h2>{isEditing ? "Editar Episódio" : "Registrar Episódio"}</h2>

          <form onSubmit={handleSubmit}>
            {/* Série (não isKey, só para filtrar seasons no select) */}
            <div className="input-group">
              <label>
                Série{" "}
                {isEditing && (
                  <span style={{ color: "#e3b341", fontWeight: 400 }}>
                    · bloqueado
                  </span>
                )}
                <select
                  name="tvShowKey"
                  value={form.tvShowKey}
                  onChange={handleChange}
                  disabled={isEditing}
                  required
                >
                  <option value="">Selecione uma série…</option>
                  {tvShows.map((s) => (
                    <option key={s["@key"]} value={s["@key"]}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Season — referência por @key */}
            <div className="input-group">
              <label>
                Temporada{" "}
                {isEditing && (
                  <span style={{ color: "#e3b341", fontWeight: 400 }}>
                    · bloqueado
                  </span>
                )}
                <select
                  name="seasonKey"
                  value={form.seasonKey}
                  onChange={handleChange}
                  disabled={isEditing || !form.tvShowKey}
                  required
                >
                  <option value="">
                    {form.tvShowKey
                      ? "Selecione a temporada…"
                      : "Selecione a série primeiro"}
                  </option>
                  {seasonsForForm.map((s) => (
                    <option key={s["@key"]} value={s["@key"]}>
                      Temporada {s.number} ({s.year})
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
                  value={form.episodeNumber}
                  onChange={handleChange}
                  min={1}
                  required
                  placeholder="Ex: 1"
                />
              </label>
            </div>

            <div className="input-group">
              <label>
                Título do Episódio
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Winter Is Coming"
                />
              </label>
            </div>

            <div className="input-group">
              <label>
                Descrição
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Sinopse do episódio"
                  style={{
                    background: "var(--bg-base)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-body)",
                    fontSize: "0.9rem",
                    padding: "0.65rem 0.9rem",
                    width: "100%",
                    resize: "vertical",
                    outline: "none",
                  }}
                />
              </label>
            </div>

            <div className="input-group">
              <label>
                Nota (0–10)
                <input
                  type="number"
                  name="rating"
                  value={form.rating}
                  onChange={handleChange}
                  min={0}
                  max={10}
                  step={0.1}
                  placeholder="Ex: 9.2"
                />
              </label>
            </div>

            <div className="input-group">
              <label>
                Data de Lançamento
                <input
                  type="date"
                  name="releaseDate"
                  value={form.releaseDate}
                  onChange={handleChange}
                />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {isEditing ? "Salvar Alterações" : "Registrar"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── Feedback ────────────────────────────────────────────────────── */}
      {feedback && <div className={feedbackClass(feedback)}>{feedback}</div>}

      {/* ── Campo de Busca ──────────────────────────────────────────────── */}
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

      {/* ── Filtros em cascata ───────────────────────────────────────────── */}
      <div className="filters">
        <select
          value={filterTvShow}
          onChange={(e) => {
            setFilterTvShow(e.target.value);
            setFilterSeason("");
          }}
        >
          <option value="">Todas as séries</option>
          {tvShows
            .filter((s) =>
              s.title.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((s) => (
              <option key={s["@key"]} value={s["@key"]}>
                {s.title}
              </option>
            ))}
        </select>

        <select
          value={filterSeason}
          onChange={(e) => setFilterSeason(e.target.value)}
          disabled={!filterTvShow}
        >
          <option value="">Todas as temporadas</option>
          {seasonsForFilter.map((s) => (
            <option key={s["@key"]} value={s["@key"]}>
              Temporada {s.number} ({s.year})
            </option>
          ))}
        </select>
      </div>

      {/* ── Lista ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="card-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : episodes.length === 0 ? (
        <div className="status-box">
          {filterTvShow
            ? "Nenhum episódio encontrado para os filtros selecionados."
            : "Nenhum episódio cadastrado ainda."}
        </div>
      ) : (
        <div className="card-grid">
          {episodes.map((ep) => {
            const season = seasonMap[ep.season["@key"]];
            const showTitle = season ? tvShowMap[season.tvShow["@key"]] : "—";
            return (
              <div className="card" key={ep["@key"]}>
                <div>
                  <p className="card-meta">
                    {showTitle} · T{season?.number ?? "?"}
                  </p>
                  <h2 className="card-title">
                    E{ep.episodeNumber} — {ep.title}
                  </h2>
                  {ep.description && (
                    <p className="card-desc">{ep.description}</p>
                  )}
                  <p className="card-meta" style={{ marginTop: "0.5rem" }}>
                    {ep.rating != null && <>⭐ {ep.rating} · </>}
                    {ep.releaseDate ? toDateInput(ep.releaseDate) : ""}
                  </p>
                </div>
                <div className="card-actions">
                  <button className="btn-edit" onClick={() => handleEdit(ep)}>
                    Editar
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(ep)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
