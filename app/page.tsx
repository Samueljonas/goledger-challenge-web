"use client";

import useSWR, { useSWRConfig } from "swr"; // Adicione o useSWRConfig
import { useState } from "react";
import { TvShow } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function Home() {
  const { data, error, isLoading } = useSWR("/api/tvshows", fetcher);
  const { mutate } = useSWRConfig(); // O recarregador mágico de cache

  // Estado do formulário
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    recommendedAge: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Impede a página de recarregar (comportamento burro do HTML)
    setIsSubmitting(true);

    try {
      // Bate no SEU servidor (BFF), não na AWS
      const res = await fetch("/api/tvshows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Falha na API local");

      // Sucesso! Limpa os campos
      setFormData({ title: "", description: "", recommendedAge: "" });

      // Força o SWR a buscar os dados novos na blockchain imediatamente
      mutate("/api/tvshows");
    } catch (err) {
      alert("Erro ao criar série. Olhe o console.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const shows: TvShow[] = Array.isArray(data) ? data : data?.result || [];

  if (error) return <div className="text-red-500">Erro fatal.</div>;

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Catálogo GoLedger</h1>

      {/* O Formulário de Criação */}
      <form
        onSubmit={handleSubmit}
        className="bg-gray-50 p-6 rounded-lg border mb-8 flex gap-4 items-end"
      >
        <div className="flex-1">
          <label className="block text-sm font-bold mb-1">
            Título (Chave Única)
          </label>
          <input
            required
            type="text"
            className="w-full border p-2 rounded"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-bold mb-1">Descrição</label>
          <input
            required
            type="text"
            className="w-full border p-2 rounded"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>
        <div className="w-32">
          <label className="block text-sm font-bold mb-1">Idade</label>
          <input
            required
            type="number"
            min="0"
            className="w-full border p-2 rounded"
            value={formData.recommendedAge}
            onChange={(e) =>
              setFormData({ ...formData, recommendedAge: e.target.value })
            }
          />
        </div>
        <button
          disabled={isSubmitting}
          className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando..." : "Criar"}
        </button>
      </form>

      {/* Lista de Séries */}
      {isLoading ? (
        <p>Carregando...</p>
      ) : shows.length === 0 ? (
        <p>Lista vazia.</p>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {shows.map((show) => (
            <div
              key={show.title}
              className="border p-5 rounded bg-white shadow"
            >
              <h2 className="text-xl font-bold">{show.title}</h2>
              <p className="text-gray-600 text-sm">{show.description}</p>
              <span className="mt-2 block text-xs bg-gray-200 w-fit px-2 py-1 rounded">
                Idade: {show.recommendedAge}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
