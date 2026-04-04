"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { fetcher, extractArray, apiFetch } from "@/lib/fetcher";
import { TvShow, Watchlist } from "@/src/types";

function feedbackClass(msg: string): string {
  if (!msg) return "";
  if (msg.startsWith("Erro")) return "feedback error";
  if (msg.includes("...")) return "feedback loading";
  return "feedback success";
}

export default function WatchlistsPage() {
  const [newName, setNewName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Painel de edição de shows (null = fechado)
  const [editing, setEditing] = useState<Watchlist | null>(null);
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);

  // ── Dados ──────────────────────────────────────────────────────────────────
  const { data: showsData, isLoading: loadingShows } = useSWR(
    "/api/tvshows",
    fetcher,
  );
  const tvShows = extractArray<TvShow>(showsData);

  // CORREÇÃO: Removido o "s" final da URL para bater com a sua pasta app/api/watchlist
  const {
    data: wlData,
    isLoading: loadingWl,
    mutate,
  } = useSWR("/api/watchlist", fetcher);
  const watchlists = extractArray<Watchlist>(wlData);

  const isLoading = loadingShows || loadingWl;

  // ── Criar watchlist ────────────────────────────────────────────────────────
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFeedback("Processando transação...");
    try {
      // CORREÇÃO: URL no singular
      await apiFetch("/api/watchlist", {
        method: "POST",
        body: JSON.stringify({ title: newName, description: "" }),
      });
      setFeedback("Watchlist criada na blockchain.");
      setNewName("");
      mutate();
      setTimeout(() => setFeedback(""), 3500);
    } catch (_err: unknown) {
      const msg = _err instanceof Error ? _err.message : "Erro desconhecido.";
      setFeedback(`Erro: ${msg}`);
    }
  }

  // ── Deletar watchlist ──────────────────────────────────────────────────────
  async function handleDelete(title: string) {
    if (!confirm(`Excluir a watchlist "${title}"?`)) return;
    setFeedback("Removendo da blockchain...");
    try {
      // CORREÇÃO: URL no singular
      await apiFetch("/api/watchlist", {
        method: "DELETE",
        body: JSON.stringify({ title }),
      });
      setFeedback("Watchlist removida.");
      if (editing?.title === title) setEditing(null);
      mutate();
      setTimeout(() => setFeedback(""), 3000);
    } catch (_err: unknown) {
      const msg = _err instanceof Error ? _err.message : "Erro desconhecido.";
      setFeedback(`Erro: ${msg}`);
    }
  }

  // ── Abrir painel de edição ─────────────────────────────────────────────────
  function handleOpenEdit(wl: Watchlist) {
    setEditing(wl);
    // Mapear @key para títulos de séries
    const titles = (wl.tvShows || [])
      .map((ref) => {
        const show = tvShows.find(
          (s) =>
            `tvShows:${s.title}` === ref["@key"] || s["@key"] === ref["@key"],
        );
        return show?.title;
      })
      .filter(Boolean) as string[];
    setSelectedTitles(titles);
    setFeedback("");
  }

  // ── Toggle série no painel ─────────────────────────────────────────────────
  function toggleTitle(title: string) {
    setSelectedTitles((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  }

  // ── Salvar shows na watchlist ──────────────────────────────────────────────
  async function handleSaveShows() {
    if (!editing) return;
    setFeedback("Atualizando na blockchain...");
    try {
      // Converter títulos selecionados para @keys
      const tvShowKeys = selectedTitles
        .map((title) => tvShows.find((s) => s.title === title)?.["@key"])
        .filter(Boolean) as string[];

      // CORREÇÃO: URL no singular
      await apiFetch("/api/watchlist", {
        method: "PUT",
        body: JSON.stringify({
          title: editing.title,
          description: editing.description || "",
          tvShows: tvShowKeys, // Enviando as chaves certinhas pro backend
        }),
      });
      setFeedback("Watchlist atualizada.");
      setEditing(null);
      mutate();
      setTimeout(() => setFeedback(""), 3500);
    } catch (_err: unknown) {
      const msg = _err instanceof Error ? _err.message : "Erro desconhecido.";
      setFeedback(`Erro: ${msg}`);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="container">
      <header className="page-header">
        <h1>Watchlists</h1>
        <p>Suas listas de séries para assistir · Hyperledger Fabric</p>
      </header>

      <div className="form-box">
        <h2>Nova Watchlist</h2>
        <form onSubmit={handleCreate}>
          <div className="input-group">
            <label>
              Nome da Lista
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="Ex: Assistir no fim de semana"
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Criar
            </button>
          </div>
        </form>
      </div>

      {feedback && <div className={feedbackClass(feedback)}>{feedback}</div>}

      <div style={{ marginBottom: "1.5rem" }}>
        <input
          type="text"
          placeholder="🔍 Buscar watchlist por nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input"
          style={{ width: "100%" }}
        />
      </div>

      {editing && (
        <div className="form-box">
          <h2>Editar séries — {editing.title}</h2>
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              marginBottom: "1rem",
            }}
          >
            Selecione as séries que devem fazer parte desta lista.
          </p>

          {tvShows.length === 0 ? (
            <p className="status-box">Nenhuma série cadastrada ainda.</p>
          ) : (
            <div
              className="checkbox-list"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginTop: "1rem",
              }}
            >
              {tvShows.map((show) => {
                const isSelected = selectedTitles.includes(show.title);
                return (
                  <label
                    key={show.title}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      cursor: "pointer",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      backgroundColor: isSelected
                        ? "rgba(255, 215, 0, 0.1)" /* Fundo levemente dourado se selecionado */
                        : "var(--bg-base)",
                      border: isSelected
                        ? "1px solid var(--gold)"
                        : "1px solid var(--border)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Escondemos o checkbox original, mas ele continua funcionando por trás dos panos */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleTitle(show.title)}
                      style={{ display: "none" }}
                    />

                    {/* Nosso checkbox customizado */}
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected
                          ? "var(--gold)"
                          : "transparent",
                        border: isSelected ? "none" : "2px solid var(--border)",
                        color: isSelected ? "#000" : "var(--text-muted)",
                        fontWeight: "900",
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      {isSelected ? "✓" : "✕"}
                    </div>

                    <span
                      style={{
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {show.title}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          <div className="form-actions" style={{ marginTop: "1.25rem" }}>
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

      {isLoading ? (
        <div className="card-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      ) : watchlists.length === 0 ? (
        <div className="status-box">Nenhuma watchlist criada ainda.</div>
      ) : watchlists.filter((wl) =>
          wl.title.toLowerCase().includes(searchQuery.toLowerCase()),
        ).length === 0 ? (
        <div className="status-box">
          Nenhuma watchlist encontrada com "{searchQuery}".
        </div>
      ) : (
        <div className="card-grid">
          {watchlists
            .filter((wl) =>
              wl.title.toLowerCase().includes(searchQuery.toLowerCase()),
            )
            .map((wl) => {
              const titles = (wl.tvShows || [])
                .map((ref) => {
                  const show = tvShows.find((s) => s["@key"] === ref["@key"]);
                  return show?.title;
                })
                .filter(Boolean) as string[];
              return (
                <div className="card" key={wl["@key"]}>
                  <div>
                    <h2 className="card-title">{wl.title}</h2>

                    {titles.length === 0 ? (
                      <p className="card-desc">Nenhuma série adicionada.</p>
                    ) : (
                      <ul className="watchlist-shows">
                        {titles.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                    )}

                    <p className="card-meta" style={{ marginTop: "0.5rem" }}>
                      {titles.length} série(s)
                    </p>
                  </div>

                  <div className="card-actions">
                    <Link
                      href={`/watchlists/${encodeURIComponent(wl.title)}`}
                      className="btn btn-secondary"
                      style={{ textAlign: "center", textDecoration: "none" }}
                    >
                      Abrir Lista
                    </Link>
                    <button
                      className="btn-edit"
                      onClick={() => handleOpenEdit(wl)}
                    >
                      Editar séries
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(wl.title)}
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
