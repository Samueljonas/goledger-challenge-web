import { NextRequest, NextResponse } from "next/server";
import { goFetch } from "@/lib/auth";

function errorResponse(err: unknown, status = 500) {
  const message = err instanceof Error ? err.message : "Erro desconhecido";
  return NextResponse.json({ error: message }, { status });
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const { searchParams } = new URL(_req.url);
    const tvShowKey = searchParams.get("tvShowKey");

    // Buscamos todas as temporadas
    const data = await goFetch("/query/search", {
      method: "POST",
      body: JSON.stringify({
        query: { selector: { "@assetType": "seasons" } },
      }),
    });

    if (tvShowKey && data && Array.isArray(data.result)) {
      data.result = data.result.filter(
        (season: { tvShow?: { "@key": string } }) =>
          season.tvShow?.["@key"] === tvShowKey,
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(_req: NextRequest) {
  try {
    const body = await _req.json();

    const payloadParaAWS = {
      asset: [
        {
          "@assetType": "seasons",
          number: Number(body.number),
          year: Number(body.year),
          tvShow: {
            "@assetType": "tvShows",
            "@key": body.tvShow["@key"], // Se isso vier undefined, o 409 é certo
          },
        },
      ],
    };

    // IMPRIME O PAYLOAD NO TERMINAL DO SEU VS CODE
    console.log(
      "🔥 PAYLOAD INDO PARA A AWS:",
      JSON.stringify(payloadParaAWS, null, 2),
    );

    const data = await goFetch("/invoke/createAsset", {
      method: "POST",
      body: JSON.stringify(payloadParaAWS),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return errorResponse(err, 409);
  }
}

// ─── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(_req: NextRequest) {
  try {
    const body = await _req.json();
    const data = await goFetch("/invoke/updateAsset", {
      method: "POST", // CORRIGIDO: Invoke é SEMPRE POST na AWS
      body: JSON.stringify({
        update: {
          "@assetType": "seasons",
          "@key": body["@key"],
          year: Number(body.year),
          // 'number' foi removido daqui pois o Schema diz que é isKey: true
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
      method: "POST", // CORRIGIDO: Invoke é SEMPRE POST na AWS
      body: JSON.stringify({
        key: {
          "@assetType": "seasons",
          "@key": body["@key"],
        },
      }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, 400);
  }
}
