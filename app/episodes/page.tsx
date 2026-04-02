"use client";

import { useState } from "react";
import useSWR from "swr";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TvShow {
  title: string;
}

interface Season {
  tvShowName: string;
  seasonNumber: number;
}

interface Episode {
  tvShowName: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeName: string;
}

// No form, números chegam como string — convertemos antes do fetch
type FormState = {
  tvShowName: string;
  seasonNumber: string;
  episodeNumber: string;
  episodeName: string;
};

const EMPTY_FORM: FormState = {
  tvShowName: "",
  seasonNumber: "",
  episodeNumber: "",
  episodeName: "",
};

// ─── Fetcher ──────────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then((r) => r.json());

function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  return (data as { result?: T[] })?.result ?? [];
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EpisodesPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros de visualização (independentes do formulário)
  const [filterShow, setFilterShow] = useState("");
  const [filterSeason, setFilterSeason] = useState("");

  // ── Dados via SWR ──────────────────────────────────────────────────────────
  const { data: showsData } = useSWR("/api/tvshows", fetcher);
  const tvShows = extractArray<TvShow>(showsData);

  const { data: seasonsData } = useSWR("/api/seasons", fetcher);
  const allSeasons = extractArray<Season>(seasonsData);

  const { data: episodesData, mutate } = useSWR("/api/episodes", fetcher);
  const allEpisodes = extractArray<Episode>(episodesData);

  // ── Selects em cascata ─────────────────────────────────────────────────────
  // Seasons disponíveis para o tvShow selecionado NO FORMULÁRIO
  const seasonsForFormShow = allSeasons.filter(
    (s) => s.tvShowName === form.tvShowName,
  );

  // Seasons disponíveis para o tvShow selecionado NO FILTRO
  const seasonsForFilter = allSeasons.filter(
    (s) => s.tvShowName === filterShow,
  );

  // Lista final de episódios filtrada
  const episodes = allEpisodes.filter((ep) => {
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
      // Ao trocar de série no form, resetar season (dependência em cascata)
      if (name === "tvShowName")
        return { ...prev, tvShowName: value, seasonNumber: "" };
      return { ...prev, [name]: value };
    });
  }

  function handleEdit(ep: Episode) {
    setForm({
      tvShowName: ep.tvShowName,
      seasonNumber: String(ep.seasonNumber),
      episodeNumber: String(ep.episodeNumber),
      episodeName: ep.episodeName,
    });
    setIsEditing(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancel() {
    setForm(EMPTY_FORM);
    setIsEditing(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/episodes", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      setError(data.error ?? "Erro desconhecido.");
      return;
    }

    mutate();
    handleCancel();
  }

  async function handleDelete(ep: Episode) {
    if (
      !confirm(
        `Excluir episódio ${ep.episodeNumber} "${ep.episodeName}" da T${ep.seasonNumber}?`,
      )
    )
      return;

    const res = await fetch("/api/episodes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tvShowName: ep.tvShowName,
        seasonNumber: ep.seasonNumber,
        episodeNumber: ep.episodeNumber,
      }),
    });

    const data = await res.json();
    if (data.error) {
      setError(data.error);
      return;
    }

    mutate();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="container">
      <h1>Episodes</h1>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div className="form-box">
        <h2>{isEditing ? "Editar Episódio" : "Novo Episódio"}</h2>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit}>
          {/* isKey pt.1 — disabled no edit */}
          <label>
            Série
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

          {/* isKey pt.2 — cascata de season, disabled no edit */}
          <label>
            Temporada
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
              {seasonsForFormShow.map((s) => (
                <option key={s.seasonNumber} value={s.seasonNumber}>
                  Temporada {s.seasonNumber}
                </option>
              ))}
            </select>
          </label>

          {/* isKey pt.3 — disabled no edit */}
          <label>
            Número do Episódio
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

          {/* Campo mutável */}
          <label>
            Nome do Episódio
            <input
              type="text"
              name="episodeName"
              value={form.episodeName}
              onChange={handleChange}
              required
              placeholder="Ex: Pilot"
            />
          </label>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              {isEditing ? "Salvar alterações" : "Criar Episódio"}
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

      {/* ── Filtros em cascata ───────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          margin: "1.5rem 0 1rem",
          flexWrap: "wrap",
        }}
      >
        <select
          value={filterShow}
          onChange={(e) => {
            setFilterShow(e.target.value);
            setFilterSeason("");
          }}
        >
          <option value="">Todas as séries</option>
          {tvShows.map((s) => (
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

      {/* ── Lista ────────────────────────────────────────────────────────── */}
      {episodes.length === 0 ? (
        <p>Nenhum episódio cadastrado.</p>
      ) : (
        <div className="card-grid">
          {episodes.map((ep) => (
            <div
              className="card"
              key={`${ep.tvShowName}-${ep.seasonNumber}-${ep.episodeNumber}`}
            >
              <h3>
                E{ep.episodeNumber} — {ep.episodeName}
              </h3>
              <p>
                {ep.tvShowName} · T{ep.seasonNumber}
              </p>

              <div className="card-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => handleEdit(ep)}
                >
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
