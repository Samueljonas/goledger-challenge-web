export const API_BASE = "http://ec2-50-19-36-138.compute-1.amazonaws.com/api";

export function getAuthHeaders() {
  const user = process.env.GOLEDGER_USER;
  const pass = process.env.GOLEDGER_PASS;

  if (!user || !pass) throw new Error("Credenciais ausentes no .env.local");

  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
  };
}

// O nome 'goFetch' diz o que ele faz. Ele devolve DADOS, não um Response genérico.
export async function goFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
    cache: "no-store", // Fixado aqui
  });

  // CORREÇÃO: Programação Defensiva contra corpo vazio
  const text = await response.text();
  let data: { error?: string; [key: string]: unknown } = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.warn(
        "Aviso: A API retornou um texto que não é JSON válido:",
        text,
      );
    }
  }

  // O Deep Error Check
  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Erro HTTP: ${response.status}`);
  }

  return data; // Devolve o objeto JavaScript puro
}
