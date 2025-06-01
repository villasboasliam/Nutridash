import { db } from "@/lib/firebase"
import { NextRequest, NextResponse } from "next/server"
import { doc, getDoc } from "firebase/firestore"

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== "https://nutriapp-42e7f.web.app") {
    return NextResponse.json({ valid: false, reason: "Domínio não autorizado" }, { status: 403 });
  }

  const email = req.nextUrl.searchParams.get("email");
  const token = req.nextUrl.searchParams.get("token");
  const nutricionistaId = req.nextUrl.searchParams.get("nutricionistaId");

  if (!email || !token) {
    return NextResponse.json({ valid: false, reason: "Parâmetros ausentes" }, { status: 400 });
  }

  try {
    const docRef = doc(db, "nutricionistas", nutricionistaId!, "pacientes", email);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return NextResponse.json({ valid: false, reason: "Paciente não encontrado" }, { status: 404 });
    }

    const data = snap.data();

    if (data.tokenCriacaoSenha !== token) {
      return NextResponse.json({ valid: false, reason: "Token inválido" }, { status: 403 });
    }

    const criado = data.dataCriacao?.toDate?.() || new Date(data.dataCriacao);
    const agora = new Date();
    const limite = 1000 * 60 * 60 * 24;

    if (agora.getTime() - criado.getTime() > limite) {
      return NextResponse.json({ valid: false, reason: "Token expirado" }, { status: 410 });
    }

    return NextResponse.json({ valid: true });
  } catch (e) {
    console.error("[ERRO_VERIFICAR_TOKEN]", e);
    return NextResponse.json({ valid: false, reason: "Erro interno" }, { status: 500 });
  }
}
