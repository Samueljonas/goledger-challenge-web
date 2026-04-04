import { NextRequest, NextResponse } from "next/server";
import { goFetch } from "@/lib/auth";

function errorResponse(err: unknown, status = 500) {
  const message = err instanceof Error ? err.message : "Erro desconhecido";
  return NextResponse.json({ error: message }, { status });
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const data = await goFetch("/query/search", {
      method: "POST",
      body: JSON.stringify({
        query: { selector: { "@assetType": "watchlist" } },
      }),
    });
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(_req: NextRequest) {
  try {
    const body = await _req.json();
    const data = await goFetch("/invoke/createAsset", {
      method: "POST", // Invoke é sempre POST
      body: JSON.stringify({
        asset: [
          {
            "@assetType": "watchlist",
            title: body.title,
            description: body.description || "",
            tvShows: [], // Uma watchlist nasce vazia
          },
        ],
      }),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return errorResponse(err, 409);
  }
}

// ─── PUT (Usado para adicionar séries ou mudar o título) ───────────────
export async function PUT(_req: NextRequest) {
  try {
    const body = await _req.json();

    // Mapeia o array de strings de IDs para o formato de referência de assets da GoLedger
    const formattedTvShows = (body.tvShows || []).map((id: string) => ({
      "@assetType": "tvShows",
      "@key": id,
    }));

    const data = await goFetch("/invoke/updateAsset", {
      method: "POST", // CORRIGIDO: Sempre POST na AWS
      body: JSON.stringify({
        update: {
          "@assetType": "watchlist",
          title: body.title, // title é a isKey das watchlists
          description: body.description || "",
          tvShows: formattedTvShows,
        },
      }),
    });
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, 400);
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest) {
  try {
    const body = await _req.json();
    await goFetch("/invoke/deleteAsset", {
      method: "POST", // CORRIGIDO: Sempre POST na AWS
      body: JSON.stringify({
        key: {
          "@assetType": "watchlist",
          title: body.title,
        },
      }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, 400);
  }
}
