import { NextResponse } from "next/server";

const BASE_URL = "http://ec2-50-19-36-138.compute-1.amazonaws.com/api";

// Helper para gerar os headers de autenticação e evitar repetição de código
function getAuthHeaders() {
  const user = process.env.GOLEDGER_USER;
  const pass = process.env.GOLEDGER_PASS;

  if (!user || !pass) {
    throw new Error(
      "Variáveis GOLEDGER_USER ou GOLEDGER_PASS não configuradas no .env.local",
    );
  }

  const basicAuth = Buffer.from(`${user}:${pass}`).toString("base64");

  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${basicAuth}`,
  };
}

// ==========================================
// 1. LER (GET) - Busca todas as séries
// ==========================================
export async function GET() {
  try {
    const response = await fetch(`${BASE_URL}/query/search`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        query: {
          selector: {
            "@assetType": "tvShows",
          },
        },
      }),
      cache: "no-store", // Essencial no Next.js para não congelar os dados
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return NextResponse.json(
        { error: data.error || "Falha ao buscar dados na blockchain." },
        { status: response.status === 200 ? 400 : response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro no GET do BFF:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

// ==========================================
// 2. CRIAR (POST) - Adiciona uma nova série
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${BASE_URL}/invoke/createAsset`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        asset: [
          {
            "@assetType": "tvShows",
            title: body.title,
            description: body.description,
            recommendedAge: Number(body.recommendedAge), // Conversão vital para número
          },
        ],
      }),
    });

    // Lemos a resposta REAL para capturar erros disfarçados de sucesso
    const responseData = await response.json();
    console.log("🔥 RESPOSTA REAL DA GOLEDGER (POST):", responseData);

    if (!response.ok || responseData.error) {
      return NextResponse.json(
        { error: responseData.error || "Falha ao gravar na blockchain." },
        { status: response.status === 200 ? 400 : response.status },
      );
    }

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    console.error("Erro no POST do BFF:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

// ==========================================
// 3. ATUALIZAR (PUT) - Edita descrição e idade
// ==========================================
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${BASE_URL}/invoke/updateAsset`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        update: {
          "@assetType": "tvShows",
          title: body.title, // Chave primária: aponta QUEM vai ser atualizado
          description: body.description,
          recommendedAge: Number(body.recommendedAge),
        },
      }),
    });

    const responseData = await response.json();

    if (!response.ok || responseData.error) {
      return NextResponse.json(
        { error: responseData.error || "Falha ao atualizar na blockchain" },
        { status: response.status === 200 ? 400 : response.status },
      );
    }

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    console.error("Erro no PUT do BFF:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar" },
      { status: 500 },
    );
  }
}

// ==========================================
// 4. DELETAR (DELETE) - Remove a série pelo título
// ==========================================
export async function DELETE(request: Request) {
  try {
    const { title } = await request.json();

    const response = await fetch(`${BASE_URL}/invoke/deleteAsset`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        key: {
          "@assetType": "tvShows",
          title: title,
        },
      }),
    });

    const responseData = await response.json();

    if (!response.ok || responseData.error) {
      return NextResponse.json(
        { error: responseData.error || "Falha ao deletar na blockchain" },
        { status: response.status === 200 ? 400 : response.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no DELETE do BFF:", error);
    return NextResponse.json(
      { error: "Erro interno ao deletar" },
      { status: 500 },
    );
  }
}
