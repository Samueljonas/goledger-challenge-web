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

// ─── GET: lista todas as watchlists ──────────────────────────────────────────
export async function GET() {
  const res = await fetch(`${API_BASE}/query/search`, {
    method: "POST",
    headers: getAuthHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      query: { selector: { "@assetType": "watchlist" } },
    }),
  });

  const data = await res.json();
  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ─── POST: cria watchlist (sem tvShows ainda) ─────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();

  const payload = {
    asset: [
      {
        "@assetType": "watchlist",
        name: body.name, // isKey
        tvShows: [], // array de referências — populado via PUT
      },
    ],
  };

  const res = await fetch(`${API_BASE}/invoke/createAsset`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 409 });
  }

  return NextResponse.json(data, { status: 201 });
}

// ─── PUT: substitui a lista de tvShows da watchlist ───────────────────────────
// O body esperado: { name: string, tvShows: string[] }
// tvShows é um array de titles — convertemos para referências no formato GoLedger
export async function PUT(req: NextRequest) {
  const body = await req.json();

  // Cada entrada precisa ser uma referência de asset, não uma string pura
  const tvShowRefs = (body.tvShows as string[]).map((title) => ({
    "@assetType": "tvshow",
    title,
  }));

  const payload = {
    update: {
      "@assetType": "watchlist",
      name: body.name, // isKey — identifica o asset no ledger
      tvShows: tvShowRefs,
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

// ─── DELETE: remove a watchlist inteira ──────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const body = await req.json();

  const payload = {
    key: {
      "@assetType": "watchlist",
      name: body.name,
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
