"use client";

import useSWR, { useSWRConfig } from "swr";
import { useState } from "react";
import { TvShow } from "../src/types"; // Mude para "@/types" se o seu Next.js exigir

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
  const [feedback, setFeedback] = useState(""); // Feedback visual leve

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

      if (!res.ok) throw new Error("Falha na requisição");

      setFormData({ title: "", description: "", recommendedAge: "" });
      setIsEditing(false);
      setFeedback("Sucesso!");
      mutate("/api/tvshows");

      setTimeout(() => setFeedback(""), 3000); // Limpa o aviso após 3s
    } catch (err) {
      setFeedback("Erro: Verifique o console.");
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

    setFeedback("Deletando...");
    try {
      await fetch("/api/tvshows", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      setFeedback("Deletado com sucesso.");
      mutate("/api/tvshows");
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      setFeedback("Erro ao deletar.");
    }
  };

  const shows: TvShow[] = Array.isArray(data) ? data : data?.result || [];

  if (error)
    return (
      <div className="container">
        <div className="status-box" style={{ color: "#f85149" }}>
          Erro crítico ao conectar com a API.
        </div>
      </div>
    );

  return (
    <main className="container">
      <header className="header">
        <h1>GoLedger Kino</h1>
        <p>Catálogo descentralizado de obras cinematográficas</p>
      </header>

      <form onSubmit={handleSubmit} className="form-box">
        <div className="input-group">
          <label>
            Título Original{" "}
            {isEditing && <span style={{ color: "#e3b341" }}>(Bloqueado)</span>}
          </label>
          <input
            required
            type="text"
            className="input"
            placeholder="Ex: Breaking Bad"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            disabled={isEditing}
          />
        </div>
        <div className="input-group">
          <label>Sinopse</label>
          <input
            required
            type="text"
            className="input"
            placeholder="Breve descrição"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>
        <div className="input-group" style={{ flex: "0.5" }}>
          <label>Idade</label>
          <input
            required
            type="number"
            min="0"
            className="input"
            placeholder="Ex: 18"
            value={formData.recommendedAge}
            onChange={(e) =>
              setFormData({ ...formData, recommendedAge: e.target.value })
            }
          />
        </div>

        {isEditing && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setIsEditing(false);
              setFormData({ title: "", description: "", recommendedAge: "" });
            }}
          >
            Cancelar
          </button>
        )}
        <button type="submit" className="btn" disabled={isSubmitting}>
          {isSubmitting ? "Aguarde..." : isEditing ? "Atualizar" : "Catalogar"}
        </button>
      </form>

      {feedback && (
        <div
          style={{ color: "#58a6ff", marginBottom: "1rem", fontWeight: "bold" }}
        >
          {feedback}
        </div>
      )}

      {isLoading ? (
        <div className="status-box">Sincronizando com a blockchain...</div>
      ) : shows.length === 0 ? (
        <div className="status-box">
          O catálogo está vazio. Registre a primeira obra.
        </div>
      ) : (
        <div className="grid">
          {shows.map((show) => (
            <div key={show.title} className="card">
              <div>
                <h2 className="card-title">{show.title}</h2>
                <span className="tag">
                  {show.recommendedAge === 0
                    ? "Livre"
                    : `+${show.recommendedAge} anos`}
                </span>
                <p className="card-desc" style={{ marginTop: "1rem" }}>
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
                  className="btn-delete"
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
