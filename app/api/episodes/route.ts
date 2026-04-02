import { NextRequest, NextResponse } from "next/server";

const API_BASE = "http://ec2-50-19-36-138.compute-1.amazonaws.com/api";

// ─── Reutilize o mesmo helper — idealmente mova para lib/auth.ts ─────────────
function getAuthHeaders(): HeadersInit {
  const credentials = Buffer.from(
    `${process.env.GOLEDGER_USER}:${process.env.GOLEDGER_PASS}`,
  ).toString("base64");
  return {
    "Content-Type": "application/json",
    Authorization: `Basic ${credentials}`,
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  const res = await fetch(`${API_BASE}/query/search`, {
    method: "POST",
    headers: getAuthHeaders(),
    cache: "no-store",
    body: JSON.stringify({
      query: { selector: { "@assetType": "episode" } },
    }),
  });

  const data = await res.json();
  if (data.error) {
    return NextResponse.json({ error: data.error }, { status: 500 });
  }

  return NextResponse.json(data);
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json();

  const payload = {
    asset: [
      {
        "@assetType": "episode",
        tvShowName: body.tvShowName, // isKey — chave composta pt.1
        seasonNumber: Number(body.seasonNumber), // isKey — chave composta pt.2
        episodeNumber: Number(body.episodeNumber), // isKey — chave composta pt.3
        episodeName: body.episodeName, // campo editável
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

// ─── PUT ──────────────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const body = await req.json();

  const payload = {
    update: {
      "@assetType": "episode",
      // As três chaves são necessárias para resolver o asset no ledger
      tvShowName: body.tvShowName,
      seasonNumber: Number(body.seasonNumber),
      episodeNumber: Number(body.episodeNumber),
      // Único campo mutável
      episodeName: body.episodeName,
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
      "@assetType": "episode",
      tvShowName: body.tvShowName,
      seasonNumber: Number(body.seasonNumber),
      episodeNumber: Number(body.episodeNumber),
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
