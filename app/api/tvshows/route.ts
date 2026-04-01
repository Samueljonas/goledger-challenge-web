import { NextResponse } from "next/server";
import { buffer } from "stream/consumers";

export async function GET() {
  const user = process.env.GOLEDGER_USER;
  const pass = process.env.GOLEDGER_PASS;

  if (!user || !pass) {
    console.log(
      "FATAL: Variaáveis de ambiente GOLEDGER_USER ou GOLEDGER_PASS não estão definidas.",
    );
    return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
  }

  const basicAuth = Buffer.from(`${user}:${pass}`).toString("base64");

  try {
    const response = await fetch(
      "http://ec2-50-19-36-138.compute-1.amazonaws.com/api/query/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          query: {
            selector: {
              "@assetType": "tvshows",
            },
          },
        }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Error GoLedger (Status ${response.status}):`, errorData);
      return NextResponse.json(
        { error: "Falha ao buscar dados na blockchain" },
        { status: response.status },
      );
    }
    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro catastrófico no BFF:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = process.env.GOLEDGER_USER;
  const pass = process.env.GOLEDGER_PASS;
  const basicAuth = Buffer.from(`${user}:${pass}`).toString("base64");

  try {
    // 1. Recebe os dados limpos do seu front-end (React)
    const body = await request.json();

    // 2. Faz o POST para a rota de criação da GoLedger (Verifique no Swagger se a URL exata é essa)
    const response = await fetch(
      "http://ec2-50-19-36-138.compute-1.amazonaws.com/api/invoke/createAsset",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        // 3. Monta o payload do jeito burocrático que a blockchain exige
        body: JSON.stringify({
          asset: [
            {
              "@assetType": "tvShows",
              title: body.title,
              description: body.description,
              // Lembra do schema? recommendedAge tem que ser Number, não String.
              recommendedAge: Number(body.recommendedAge),
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da GoLedger ao criar:", errorText);
      return NextResponse.json(
        { error: "Falha ao gravar na blockchain." },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro no POST do BFF:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const user = process.env.GOLEDGER_USER;
  const pass = process.env.GOLEDGER_PASS;
  const basicAuth = Buffer.from(`${user}:${pass}`).toString("base64");

  try {
    const body = await request.json();

    const response = await fetch(
      "http://ec2-50-19-36-138.compute-1.amazonaws.com/api/invoke/updateAsset",
      {
        method: "POST",
        headers: {
          "Content-type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          update: {
            "@assetType": "tvShows",
            title: body.title,
            description: body.description,
            recommendedAge: Number(body.recommendedAge),
          },
        }),
      },
    );
    if (!response.ok) throw new Error("Falha ao atualizar na blockchain");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = process.env.GOLEDGER_USER;
  const pass = process.env.GOLEDGER_PASS;
  const basicAuth = Buffer.from(`${user}:${pass}`).toString("base64");

  try {
    const { title } = await request.json();

    const response = await fetch(
      "http://ec2-50-19-36-138.compute-1.amazonaws.com/api/invoke/deleteAsset",
      {
        method: "POST", //A GoLedger exige POST até para deletar, olha o Swagger
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        body: JSON.stringify({
          key: {
            "@assetType": "tvShows",
            title: title,
          },
        }),
      },
    );
    if (!response.ok) throw new Error("Falha ao deletar na blockchain");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao deletar na blockchain." },
      { status: 500 },
    );
  }
}
