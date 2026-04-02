import { NextRequest, NextResponse } from "next/server";

const API_BASE = "http://ec2-50-19-36-138.compute-1.amazonaws.com/api";

function getAuthHeaders(): HeadersInit {
  const credentials = Buffer.from(
    `${process.env.GOLEDGER_USER}:${process.env.GOLEDGER_PASS}`,
  ).toString("base64");
  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${credentials}`,
  };
}

// ─── GET: lista todas as seasons ─────────────────────────────────────────────
export async function GET() {
  const res = await fetch(`${API_BASE}/query/search`, {
    method: "POST",
    headers: getAuthHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      query: { selector: { "@assetType": "season" } },
    }),
  });

  const data = await res.json();
  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ─── POST: cria nova season ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();

  const payload = {
    asset: [
      {
        "@assetType": "season",
        tvShowName: body.tvShowName, // isKey — chave composta pt.1
        seasonNumber: Number(body.seasonNumber), // isKey — chave composta pt.2
        episodes: Number(body.episodes ?? 0),
      },
    ],
  };

  const res = await fetch(`${API_BASE}/invoke/createAsset`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  // Falso positivo: HTTP 200 com erro no body
  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 409 });
  }

  return NextResponse.json(data, { status: 201 });
}

// ─── PUT: atualiza season (chaves primárias NUNCA são enviadas no body) ───────
export async function PUT(req: NextRequest) {
  const body = await req.json();

  const payload = {
    update: {
      "@assetType": "season",
      tvShowName: body.tvShowName, // obrigatório para resolver o asset
      seasonNumber: Number(body.seasonNumber), // obrigatório para resolver o asset
      episodes: Number(body.episodes),
    },
  };

  const res = await fetch(`${API_BASE}/invoke/updateAsset`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 400 });
  }

  return NextResponse.json(data);
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const body = await req.json();

  const payload = {
    key: {
      "@assetType": "season",
      tvShowName: body.tvShowName,
      seasonNumber: Number(body.seasonNumber),
    },
  };

  const res = await fetch(`${API_BASE}/invoke/deleteAsset`, {
    method: "DELETE",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
