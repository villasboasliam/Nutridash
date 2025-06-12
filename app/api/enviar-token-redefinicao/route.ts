import { NextRequest, NextResponse } from "next/server";
// Importando firestoreAdmin, authAdmin e admin do Firebase Admin SDK
import * as admin from 'firebase-admin'
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin'


const firestoreAdmin = getFirestoreAdmin()
const authAdmin = getAuthAdmin()

import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  // VERIFICAÇÃO CRÍTICA: Garante que os serviços do Admin SDK estão disponíveis
  if (!firestoreAdmin || !authAdmin || !admin) {
    console.error("Serviços do Firebase Admin SDK não estão disponíveis. Verifique as variáveis de ambiente no ambiente de deploy.");
    return NextResponse.json({ error: "Serviço indisponível. Tente novamente mais tarde." }, { status: 500 });
  }

  const { nome, email, telefone, nutricionistaId } = await req.json();

  if (!nome || !email || !telefone || !nutricionistaId) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const token = uuidv4();

  try {
    // ✅ Cria o usuário no Firebase Auth se ainda não existir
    try {
      // Usando authAdmin do Admin SDK
      await authAdmin.createUser({ email });
    } catch (err: any) {
      if (err.code === "auth/email-already-exists") {
        // tudo bem, já existe
        console.log(`Usuário com e-mail ${email} já existe no Auth.`);
      } else {
        console.error("Erro ao criar usuário no Auth:", err);
        throw err;
      }
    }

    // ✅ Cria paciente no Firestore (admin)
    // Usando firestoreAdmin do Admin SDK e sua sintaxe
    const pacienteRef = firestoreAdmin
      .collection("nutricionistas")
      .doc(nutricionistaId)
      .collection("pacientes")
      .doc(email); // Usando email como ID do documento do paciente

    await pacienteRef.set({
      nome,
      email,
      telefone,
      // Usando serverTimestamp do Admin SDK
      dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
      tokenCriacaoSenha: token,
      status: "Ativo",
    });
    console.log("✅ Dados do paciente gravados no Firestore.");

    // ✅ Gera o link com base no ambiente
    // Certifique-se que NEXT_PUBLIC_APP_URL está configurado no seu .env.local e no ambiente de deploy
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/criar-senha?token=${token}&email=${encodeURIComponent(email)}`;

    // ✅ Envia o e-mail
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    console.log(`✉️  Tentando enviar e-mail para ${email}...`);
    await transporter.sendMail({
      from: `"NutriDash" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Crie sua senha no NutriDash",
      html: `
        <h2>Bem-vindo ao NutriDash</h2>
        <p>${nome}, você foi cadastrado pela sua nutricionista.</p>
        <p>Clique no botão abaixo para criar sua senha e acessar o aplicativo:</p>
        <a href="${url}" style="padding: 10px 20px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px;">Criar minha senha</a>
        <p>Se você não reconhece este cadastro, ignore este e-mail.</p>
      `,
    });
    console.log("✅ E-mail enviado com sucesso!");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Erro ao criar paciente ou enviar e-mail:", error);
    return NextResponse.json({ error: error.message || "Erro ao criar paciente" }, { status: 500 });
  }
}
