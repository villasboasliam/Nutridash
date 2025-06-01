import { NextRequest, NextResponse } from "next/server";
import { admin, db } from "@/lib/firebase-admin";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
  const { nome, email, telefone, nutricionistaId } = await req.json();
  console.log("📥 Payload createPatient:", { nome, email, telefone, nutricionistaId });

  // 1) Gera senha temporária
  const tempPassword = crypto.randomBytes(6).toString("base64url");
  console.log("🔑 Senha temporária:", tempPassword);

  try {
    // 2) Cria usuário no Auth
    console.log("⏳ Criando usuário no Firebase Auth...");
    const userRecord = await admin.auth().createUser({ email, password: tempPassword });
    console.log("✅ Usuário criado:", userRecord.uid);

    // 3) Salva no Firestore
    await setDoc(
      doc(db, "nutricionistas", nutricionistaId, "pacientes", userRecord.uid),
      {
        nome,
        email,
        telefone,
        uid: userRecord.uid,
        isFirstLogin: true,
        createdAt: serverTimestamp(),
      }
    );
    console.log("✅ Dados do paciente gravados no Firestore.");

    // 4) Configura transporte e envia email
    console.log("🔌 Configurando Nodemailer com:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
    });
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
      subject: "Seja bem-vindo — sua senha temporária",
      html: `
        <p>Olá ${nome},</p>
        <p>Sua conta foi criada. Use estas credenciais no primeiro acesso:</p>
        <ul>
          <li><b>E-mail:</b> ${email}</li>
          <li><b>Senha temporária:</b> ${tempPassword}</li>
        </ul>
        <p>Ao entrar no app, você será solicitado a escolher uma nova senha.</p>
      `,
    });
    console.log("✅ E-mail enviado com sucesso!");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Erro ao criar paciente ou enviar e-mail:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
