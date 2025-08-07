// app/api/createPatient/route.ts

export const runtime = "nodejs"; // 👈 FORÇA USO DE NODEJS E EVITA ERRO COM crypto.randomBytes

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getFirestoreAdmin, getAuthAdmin, admin } from "@/lib/firebase-admin";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const db = getFirestoreAdmin();
  const auth = getAuthAdmin();

  if (!db || !auth) {
    console.error("❌ Firebase Admin SDK não disponível.");
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 500 });
  }

  const { nome, email, telefone, nutricionistaId } = await req.json();

  const cleanEmail = email.trim().toLowerCase();
  const senhaProvisoria = crypto.randomBytes(4).toString("hex"); // Ex: "f9a1d3b7"

  console.log("📥 Payload:", { nome, cleanEmail, telefone, nutricionistaId });

  try {
    // 🔐 Criação do usuário no Firebase Auth
    const userRecord = await auth.createUser({
      email: cleanEmail,
      password: senhaProvisoria,
      displayName: nome,
    });
    console.log("✅ Usuário criado:", userRecord.uid);

    // 📬 Link de redefinição de senha
    const resetLink = await auth.generatePasswordResetLink(cleanEmail);
    console.log("🔗 Link de redefinição gerado:", resetLink);

    // 📁 Salvando dados no Firestore
    await db
      .collection("nutricionistas")
      .doc(nutricionistaId)
      .collection("pacientes")
      .doc(cleanEmail)
      .set({
        nome,
        email: cleanEmail,
        telefone,
        uid: userRecord.uid,
        isFirstLogin: true,
        senhaProvisoria,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log("✅ Dados do paciente gravados no Firestore.");

    // ✉️ E-mail via Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"NutriDash" <${process.env.EMAIL_FROM}>`,
      to: cleanEmail,
      subject: "Acesso ao NutriDash - sua senha provisória",
      html: `
        <h2>Olá, ${nome}!</h2>
        <p>Você foi cadastrado(a) por seu nutricionista no NutriDash.</p>

        <p><strong>Credenciais de acesso:</strong></p>
        <ul>
          <li><strong>Email:</strong> ${cleanEmail}</li>
          <li><strong>Senha provisória:</strong> ${senhaProvisoria}</li>
        </ul>

        <p>Você pode trocar sua senha a qualquer momento clicando no botão abaixo ou dentro do próprio App:</p>

        <p style="margin: 16px 0;">
          <a href="${resetLink}" style="background-color:#6366f1;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
            Redefinir minha senha
          </a>
        </p>

        <p>Recomendamos que altere sua senha após o primeiro login.</p>

        <p>Qualquer dúvida, entre em contato com sua nutricionista.</p>
        <hr />
        <p style="font-size: 12px; color: #888;">NutriDash - Plataforma de acompanhamento nutricional</p>
      `,
    });

    console.log("✅ E-mail enviado com sucesso para:", cleanEmail);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Erro ao criar paciente:", err);
    return NextResponse.json({ error: err.message || "Erro interno." }, { status: 500 });
  }
}
