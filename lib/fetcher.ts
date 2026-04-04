/**
 * lib/fetcher.ts
 * Utilitários client-side compartilhados entre todas as pages.
 */

/** * Fetcher padrão para o SWR com leitura defensiva
 */
export const fetcher = async (url: string) => {
  const res = await fetch(url);
  const text = await res.text();
  return text ? JSON.parse(text) : {};
};

/**
 * Extração defensiva: a API GoLedger devolve { result: [...] }, não um array puro.
 * Trata os dois casos para não quebrar em nenhum cenário.
 */
export function extractArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  return (data as { result?: T[] })?.result ?? [];
}

/**
 * Wrapper de fetch para mutations (POST, PUT, DELETE) nas rotas internas.
 * Lança erro se a resposta não for ok ou se vier { error } no body.
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // CORREÇÃO: Leitura em duas etapas no Client-side
  const text = await res.text();
  let data: { error?: string; [key: string]: unknown } = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      console.warn("Front-end: Resposta não é JSON válido", text);
    }
  }

  if (!res.ok || data?.error) {
    throw new Error(data?.error ?? `Erro HTTP ${res.status}`);
  }

  return data as T;
}
