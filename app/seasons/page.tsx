"use client";

import useSWR from "swr";
// Ajuste o caminho do fetcher conforme a sua refatoração recente
import { fetcher } from "@/lib/fetcher";

export default function SeasonsPage() {
  // Chamando a sua API de temporadas que você já refatorou
  const { data, error, isLoading } = useSWR("/api/seasons", fetcher);

  if (error) {
    return (
      <div className="container">
        <div className="status-box" style={{ color: "#f85149" }}>
          Erro ao carregar temporadas.
        </div>
      </div>
    );
  }

  return (
    <main className="container">
      <header className="header">
        <h1>Temporadas</h1>
        <p>Gerenciamento de temporadas do catálogo</p>
      </header>

      {isLoading ? (
        <div className="status-box">Buscando dados na blockchain...</div>
      ) : (
        <div className="status-box">
          Página carregada com sucesso!
          <br />
          (Aqui entrará o formulário e a lista de temporadas em breve)
        </div>
      )}
    </main>
  );
}
