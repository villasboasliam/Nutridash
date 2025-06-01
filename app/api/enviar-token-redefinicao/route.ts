export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
  const { email, token } = await req.json();

  if (!email || !token) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/redefinir-senha?token=${token}&email=${email}`;

  try {
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
      to: email,
      subject: "Redefinição de senha - NutriDash",
      html: `
        <h2>Redefinição de Senha</h2>
        <p>Você solicitou a redefinição da sua senha. Clique no botão abaixo para criar uma nova senha:</p>
        <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background-color:#6366f1;color:white;text-decoration:none;border-radius:5px;">Redefinir Senha</a>
        <p>Se você não solicitou essa mudança, ignore este e-mail.</p>
      `,
    });

    // 🔐 Salvar token no Firestore
    await updateDoc(doc(db, "nutricionistas", email), {
      resetToken: token,
    });

    return NextResponse.json({ success: true, message: "Email enviado com sucesso" });
  } catch (err) {
    console.error("Erro ao enviar email:", err);
    return NextResponse.json({ error: "Erro ao enviar email" }, { status: 500 });
  }
}
