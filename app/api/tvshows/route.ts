import { NextResponse } from "next/server";
import { goFetch } from "@/lib/auth"; // Importa o seu motor blindado

// ==========================================
// 1. LER (GET)
// ==========================================
export async function GET() {
  try {
    const data = await goFetch("/query/search", {
      method: "POST",
      body: JSON.stringify({
        query: { selector: { "@assetType": "tvShows" } },
      }),
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ==========================================
// 2. CRIAR (POST)
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = await goFetch("/invoke/createAsset", {
      method: "POST",
      body: JSON.stringify({
        asset: [
          {
            "@assetType": "tvShows",
            title: body.title,
            description: body.description,
            recommendedAge: Number(body.recommendedAge), // Tipagem estrita
          },
        ],
      }),
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ==========================================
// 3. ATUALIZAR (PUT)
// ==========================================
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const data = await goFetch("/invoke/updateAsset", {
      method: "POST", // ATENÇÃO: Na Hyperledger, invoke é SEMPRE POST!
      body: JSON.stringify({
        update: {
          "@assetType": "tvShows",
          title: body.title, // Chave primária (imexível)
          description: body.description,
          recommendedAge: Number(body.recommendedAge),
        },
      }),
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ==========================================
// 4. DELETAR (DELETE)
// ==========================================
export async function DELETE(request: Request) {
  try {
    const { title } = await request.json();
    const data = await goFetch("/invoke/deleteAsset", {
      method: "POST", // ATENÇÃO: Na Hyperledger, invoke é SEMPRE POST!
      body: JSON.stringify({
        key: {
          "@assetType": "tvShows",
          title: title,
        },
      }),
    });
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
