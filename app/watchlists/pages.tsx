"use client";

import { useState } from "react";
import useSWR from "swr";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TvShow {
  title: string;
}

// A API retorna tvShows como refs: { '@assetType': 'tvshow', title: string }
// ou como strings dependendo do schema — tratamos os dois casos
interface TvShowRef {
  "@assetType"?: string;
  title: string;
}

interface Watchlist {
  name: string;
  tvShows: TvShowRef[];
}

const EMPTY_FORM = { name: "" };

// ─── Fetcher ──────────────────────────────────────────────────────────────────
const fetcher = (url: string) => fetch(url).then((r) => r.json());

function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  return (data as { result?: T[] })?.result ?? [];
}

// Normaliza refs ou strings para título puro
function toTitle(ref: TvShowRef | string): string {
  if (typeof ref === "string") return ref;
  return ref.title;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WatchlistsPage() {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Watchlist expandida para edição de shows (null = nenhuma aberta)
  const [editing, setEditing] = useState<Watchlist | null>(null);
  // Cópia local dos títulos selecionados enquanto edita
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);

  // ── Dados ──────────────────────────────────────────────────────────────────
  const { data: showsData } = useSWR("/api/tvshows", fetcher);
  const tvShows = extractArray<TvShow>(showsData);

  const { data: wlData, mutate } = useSWR("/api/watchlists", fetcher);
  const watchlists = extractArray<Watchlist>(wlData);

  // ── Criar watchlist ────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/watchlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      setError(data.error ?? "Erro ao criar watchlist.");
      return;
    }

    setNewName("");
    mutate();
  }

  // ── Deletar watchlist ──────────────────────────────────────────────────────
  async function handleDelete(name: string) {
    if (!confirm(`Excluir a watchlist "${name}"?`)) return;

    const res = await fetch("/api/watchlists", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();
    if (data.error) {
      setError(data.error);
      return;
    }

    // Fecha o painel de edição se for a que foi deletada
    if (editing?.name === name) setEditing(null);
    mutate();
  }

  // ── Abrir painel de edição de shows ───────────────────────────────────────
  function handleOpenEdit(wl: Watchlist) {
    setEditing(wl);
    setSelectedTitles(wl.tvShows.map(toTitle));
    setError(null);
  }

  // ── Toggle de série no painel de edição ───────────────────────────────────
  function toggleTitle(title: string) {
    setSelectedTitles((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  }

  // ── Salvar lista de shows na watchlist ────────────────────────────────────
  async function handleSaveShows() {
    if (!editing) return;
    setError(null);

    const res = await fetch("/api/watchlists", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editing.name,
        tvShows: selectedTitles,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      setError(data.error ?? "Erro ao salvar.");
      return;
    }

    setEditing(null);
    mutate();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="container">
      <h1>Watchlists</h1>

      {error && <p className="error-message">{error}</p>}

      {/* ── Criar nova watchlist ─────────────────────────────────────────── */}
      <div className="form-box">
        <h2>Nova Watchlist</h2>
        <form onSubmit={handleCreate}>
          <label>
            Nome
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="Ex: Assistir no fim de semana"
            />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Criar
            </button>
          </div>
        </form>
      </div>

      {/* ── Painel de edição de shows (inline, abre abaixo do card) ─────── */}
      {editing && (
        <div className="form-box">
          <h2>Editar séries — {editing.name}</h2>
          <p
            style={{
              marginBottom: "1rem",
              color: "var(--color-text-secondary, #8b949e)",
            }}
          >
            Selecione as séries que devem fazer parte desta lista.
          </p>

          {tvShows.length === 0 ? (
            <p>Nenhuma série cadastrada ainda.</p>
          ) : (
            <div className="checkbox-list">
              {tvShows.map((show) => {
                const checked = selectedTitles.includes(show.title);
                return (
                  <label key={show.title} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTitle(show.title)}
                    />
                    {show.title}
                  </label>
                );
              })}
            </div>
          )}

          <div className="form-actions" style={{ marginTop: "1rem" }}>
            <button className="btn btn-primary" onClick={handleSaveShows}>
              Salvar
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setEditing(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Lista de watchlists ──────────────────────────────────────────── */}
      {watchlists.length === 0 ? (
        <p>Nenhuma watchlist criada.</p>
      ) : (
        <div className="card-grid">
          {watchlists.map((wl) => {
            const titles = wl.tvShows.map(toTitle);
            return (
              <div className="card" key={wl.name}>
                <h3>{wl.name}</h3>

                {titles.length === 0 ? (
                  <p style={{ color: "var(--color-text-secondary, #8b949e)" }}>
                    Nenhuma série adicionada.
                  </p>
                ) : (
                  <ul className="watchlist-shows">
                    {titles.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}

                <div className="card-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleOpenEdit(wl)}
                  >
                    Editar séries
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(wl.name)}
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
