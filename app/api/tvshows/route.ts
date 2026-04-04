import { NextRequest, NextResponse } from "next/server";
import { goFetch } from "@/lib/auth";

function errorResponse(err: unknown, status = 500) {
  const message = err instanceof Error ? err.message : "Erro desconhecido";
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    let query: any = { "@assetType": "tvShows" };

    if (key) {
      query = {
        "@assetType": "tvShows",
        "@key": key,
      };
    }

    const data = await goFetch("/query/search", {
      method: "POST",
      body: JSON.stringify({
        query: { selector: query },
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
            "@assetType": "tvShows",
            title: body.title,
            description: body.description,
            recommendedAge: Number(body.recommendedAge),
          },
        ],
      }),
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return errorResponse(err, 409);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await goFetch("/invoke/updateAsset", {
      method: "PUT",
      body: JSON.stringify({
        update: {
          "@assetType": "tvShows",
          title: body.title, // isKey — necessário para resolver
          description: body.description,
          recommendedAge: Number(body.recommendedAge),
        },
      }),
    });
    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err, 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    await goFetch("/invoke/deleteAsset", {
      method: "DELETE",
      body: JSON.stringify({
        key: { "@assetType": "tvShows", title: body.title },
      }),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err, 400);
  }
}
