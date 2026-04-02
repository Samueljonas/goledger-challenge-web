import { NextRequest, NextResponse } from "next/server";
import { goFetch } from "@/lib/auth"; // <-- Sem o GoLedgerError inventado

// O seu tratador de erros agora usa a classe nativa do JavaScript
function errorResponse(err: unknown) {
  if (err instanceof Error) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  return NextResponse.json(
    { error: "Erro catastrófico e desconhecido." },
    { status: 500 },
  );
}

// ... resto do seu código (GET, POST, etc)

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await goFetch("/invoke/createAsset", {
      method: "POST",
      body: JSON.stringify({
        asset: [
          {
            "@assetType": "watchlist",
            name: body.name,
            tvShows: [],
          },
        ],
      }),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    const tvShowRefs = (body.tvShows as string[]).map((title) => ({
      "@assetType": "tvshow",
      title,
    }));

    const data = await goFetch("/invoke/updateAsset", {
      method: "PUT",
      body: JSON.stringify({
        update: {
          "@assetType": "watchlist",
          name: body.name,
          tvShows: tvShowRefs,
        },
      }),
    });
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    await goFetch("/invoke/deleteAsset", {
      method: "DELETE",
      body: JSON.stringify({
        key: { "@assetType": "watchlist", name: body.name },
      }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
