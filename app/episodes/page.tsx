"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, extractArray, apiFetch } from "@/lib/fetcher";
import { TvShow, Season, Episode } from "@/src/types";

type FormState = {
  tvShowName: string;
  seasonNumber: string;
  episodeNumber: string;
  title: string; // Mudado de episodeName para title
};

const EMPTY_FORM: FormState = {
  tvShowName: "",
  seasonNumber: "",
  episodeNumber: "",
  title: "",
};

function feedbackClass(msg: string): string {
  if (!msg) return "";
  if (msg.startsWith("Erro")) return "feedback error";
  if (msg.includes("...")) return "feedback loading";
  return "feedback success";
}

export default function EpisodesPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEpisodeKey, setEditingEpisodeKey] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [filterShow, setFilterShow] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

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

  // Denormalizar seasons com tvShowName
  const seasonsWithShowName = allSeasons.map((s) => {
    const show = tvShows.find((tv) => tv["@key"] === s.tvShow?.["@key"]);
    return {
      ...s,
      seasonNumber: s.number,
      tvShowName: show?.title || "",
    };
  });

  // Denormalizar episodes com tvShowName e seasonNumber
  const episodesWithMeta = allEpisodes.map((ep) => {
    const season = allSeasons.find((s) => s["@key"] === ep.season?.["@key"]);
    const show = tvShows.find((tv) => tv["@key"] === season?.tvShow?.["@key"]);
    return {
      ...ep,
      episodeName: ep.title,
      seasonNumber: season?.number || 0,
      tvShowName: show?.title || "",
    };
  });

  // Selects em cascata — formulário
  const seasonsForForm = seasonsWithShowName.filter(
    (Season) => Season.tvShowName === form.tvShowName,
  );

  // Selects em cascata — filtro de listagem
  const seasonsForFilter = seasonsWithShowName.filter(
    (s) => s.tvShowName === filterShow,
  );

  // Filtro aplicado à listagem
  const episodes = episodesWithMeta.filter((ep) => {
    if (filterShow && ep.tvShowName !== filterShow) return false;
    if (filterSeason && ep.seasonNumber !== Number(filterSeason)) return false;
    return true;
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => {
      // Reset em cascata: trocar série limpa a season
      if (name === "tvShowName")
        return { ...prev, tvShowName: value, seasonNumber: "" };
      return { ...prev, [name]: value };
    });
  }

  function handleEdit(ep: Episode) {
    setForm({
      tvShowName: ep.tvShowName || "",
      seasonNumber: String(ep.seasonNumber || 0),
      episodeNumber: String(ep.episodeNumber),
      title: ep.title,
    });
    setEditingEpisodeKey(ep["@key"]);
    setIsEditing(true);
    setIsDrawerOpen(true);
    setFeedback("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancel() {
    setForm(EMPTY_FORM);
    setEditingEpisodeKey("");
    setIsEditing(false);
    setIsDrawerOpen(false);
    setFeedback("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback("Processando transação...");
    try {
      // Encontrar a season pelo tvShowName e seasonNumber
      const season = allSeasons.find(
        (s) =>
          s.seasonNumber === Number(form.seasonNumber) &&
          tvShows.find((tv) => tv["@key"] === s.tvShow?.["@key"])?.title ===
            form.tvShowName,
      );

      if (!season && !isEditing) {
        setFeedback("Erro: Temporada não encontrada");
        return;
      }

      // Preparar payload correto para a API
      const payload = isEditing
        ? {
            "@key": editingEpisodeKey,
            title: form.title,
            description: "",
            episodeNumber: Number(form.episodeNumber),
            releaseDate: new Date().toISOString(),
          }
        : {
            seasonKey: season!["@key"],
            title: form.title,
            description: "",
            episodeNumber: Number(form.episodeNumber),
            releaseDate: new Date().toISOString(),
          };

      await apiFetch("/api/episodes", {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload),
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
    if (!confirm(`Excluir E${ep.episodeNumber} "${ep.title}"?`)) return;
    setFeedback("Removendo da blockchain...");
    try {
      await apiFetch("/api/episodes", {
        method: "DELETE",
        body: JSON.stringify({
          "@key": ep["@key"],
        }),
      });
      setFeedback("Episódio removido.");
      mutate();
      setTimeout(() => setFeedback(""), 3000);
    } catch (_err: unknown) {
      const msg = _err instanceof Error ? _err.message : "Erro desconhecido.";
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
            <div className="input-group">
              <label>
                Série{" "}
                {isEditing && (
                  <span style={{ color: "#e3b341", fontWeight: 400 }}>
                    · bloqueado
                  </span>
                )}
                <select
                  name="tvShowName"
                  value={form.tvShowName}
                  onChange={handleChange}
                  disabled={isEditing}
                  required
                >
                  <option value="">Selecione uma série…</option>
                  {tvShows.map((s) => (
                    <option key={s.title} value={s.title}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="input-group">
              <label>
                Temporada{" "}
                {isEditing && (
                  <span style={{ color: "#e3b341", fontWeight: 400 }}>
                    · bloqueado
                  </span>
                )}
                <select
                  name="seasonNumber"
                  value={form.seasonNumber}
                  onChange={handleChange}
                  disabled={isEditing || !form.tvShowName}
                  required
                >
                  <option value="">
                    {form.tvShowName
                      ? "Selecione a temporada…"
                      : "Selecione a série primeiro"}
                  </option>
                  {seasonsForForm.map((s) => (
                    <option key={s.seasonNumber} value={s.seasonNumber}>
                      Temporada {s.seasonNumber}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="input-group">
              <label>
                Número do Episódio{" "}
                {isEditing && (
                  <span style={{ color: "#e3b341", fontWeight: 400 }}>
                    · bloqueado
                  </span>
                )}
                <input
                  type="number"
                  name="episodeNumber"
                  value={form.episodeNumber}
                  onChange={handleChange}
                  disabled={isEditing}
                  min={1}
                  required
                  placeholder="Ex: 1"
                />
              </label>
            </div>

            <div className="input-group">
              <label>
                Nome do Episódio
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Pilot"
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
      <div style={{ marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="🔍 Buscar episódio por série..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input"
          style={{ width: "100%" }}
        />
      </div>

      {/* ── Filtros em cascata ───────────────────────────────────────────── */}
      <div className="filters">
        <select
          value={filterShow}
          onChange={(e) => {
            setFilterShow(e.target.value);
            setFilterSeason("");
          }}
        >
          <option value="">Todas as séries</option>
          {tvShows
            .filter((s) =>
              s.title.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((s) => (
              <option key={s.title} value={s.title}>
                {s.title}
              </option>
            ))}
        </select>

        <select
          value={filterSeason}
          onChange={(e) => setFilterSeason(e.target.value)}
          disabled={!filterShow}
        >
          <option value="">Todas as temporadas</option>
          {seasonsForFilter.map((s) => (
            <option key={s.seasonNumber} value={s.seasonNumber}>
              Temporada {s.seasonNumber}
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
          {filterShow
            ? "Nenhum episódio encontrado para os filtros selecionados."
            : "Nenhum episódio cadastrado ainda."}
        </div>
      ) : (
        <div className="card-grid">
          {episodes.map((ep) => (
            <div
              className="card"
              key={`${ep.tvShowName}-${ep.seasonNumber}-${ep.episodeNumber}`}
            >
              <div>
                <p className="card-meta">
                  {ep.tvShowName} · T{ep.seasonNumber}
                </p>
                <h2 className="card-title">
                  E{ep.episodeNumber} — {ep.episodeName}
                </h2>
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
          ))}
        </div>
      )}
    </main>
  );
}
