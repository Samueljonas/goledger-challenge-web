"use client";

import useSWR, { useSWRConfig } from "swr";
import { useState } from "react";
import { AGE_RATINGS, TvShow } from "@/src/types";

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
  const { data, error, isLoading } = useSWR("/api/tvshows", fetcher);
  const { mutate } = useSWRConfig();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    recommendedAge: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState("");

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

      setFormData({ title: "", description: "", recommendedAge: "" });
      setIsEditing(false);
      setFeedback("Série registrada na blockchain.");
      mutate("/api/tvshows");
      setTimeout(() => setFeedback(""), 3500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido.";
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
    });
    setIsEditing(true);
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido.";
      setFeedback(`Erro: ${message}`);
    }
  };

  const shows: TvShow[] = Array.isArray(data) ? data : (data?.result ?? []);

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

      {/* ── Formulário ──────────────────────────────────────────── */}
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
                  setFormData({
                    title: "",
                    description: "",
                    recommendedAge: "",
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

      {/* ── Feedback ────────────────────────────────────────────── */}
      {feedback && <div className={feedbackClass(feedback)}>{feedback}</div>}

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
      ) : (
        <div className="grid">
          {shows.map((show) => (
            <div key={show.title} className="card">
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
                  onClick={() => handleEditClick(show)}
                  className="btn-edit"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(show.title)}
                  className="btn btn-danger"
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
