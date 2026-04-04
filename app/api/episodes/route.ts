import { NextRequest, NextResponse } from "next/server";
import { goFetch } from "@/lib/auth";

function errorResponse(err: unknown, status = 500) {
  const message = err instanceof Error ? err.message : "Erro desconhecido";
  return NextResponse.json({ error: message }, { status });
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const data = await goFetch("/query/search", {
      method: "POST",
      body: JSON.stringify({
        query: { selector: { "@assetType": "episodes" } },
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

    // Montagem estrita baseada no getSchema
    const assetPayload: Record<string, unknown> = {
      "@assetType": "episodes",
      season: {
        "@assetType": "seasons",
        "@key": body.season["@key"], // CORRIGIDO: Lendo do objeto aninhado que o Front-end envia
      },
      episodeNumber: Number(body.episodeNumber),
      title: body.title,
      description: body.description,
      releaseDate: new Date(body.releaseDate).toISOString(), // A API exige datetime
    };

    // Rating é o único opcional. Só enviamos se o usuário preencheu.
    if (body.rating) {
      assetPayload.rating = Number(body.rating);
    }

    // IMPRIME O PAYLOAD NO TERMINAL DO SEU VS CODE PARA PROVA REAL
    console.log(
      "🎬 PAYLOAD DO EPISÓDIO INDO PARA AWS:",
      JSON.stringify({ asset: [assetPayload] }, null, 2),
    );

    const data = await goFetch("/invoke/createAsset", {
      method: "POST",
      body: JSON.stringify({ asset: [assetPayload] }),
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

    // ATENÇÃO: Nunca enviamos season e episodeNumber no update porque são isKey: true
    const updatePayload: any = {
      "@assetType": "episodes",
      "@key": body["@key"],
      title: body.title,
      description: body.description,
      releaseDate: new Date(body.releaseDate).toISOString(),
    };

    if (body.rating) {
      updatePayload.rating = Number(body.rating);
    }

    const data = await goFetch("/invoke/updateAsset", {
      method: "POST", // Invoke é sempre POST
      body: JSON.stringify({ update: updatePayload }),
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
      method: "POST", // Invoke é sempre POST
      body: JSON.stringify({
        key: { "@assetType": "episodes", "@key": body["@key"] },
      }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, 400);
  }
}
