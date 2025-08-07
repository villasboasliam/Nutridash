import { NextRequest, NextResponse } from "next/server"
import { getFirestoreAdmin, getAuthAdmin, admin } from "@/lib/firebase-admin"
import nodemailer from "nodemailer"

export async function POST(req: NextRequest) {
  const db = getFirestoreAdmin()
  const auth = getAuthAdmin()

  // Segurança
  if (!db || !auth) {
    console.error("❌ Firebase Admin SDK não disponível.")
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 500 })
  }

  const { nome, email, telefone, nutricionistaId } = await req.json()

  const cleanEmail = email.trim().toLowerCase()
  console.log("📥 Payload:", { nome, cleanEmail, telefone, nutricionistaId })

  try {
    // 🔐 Criação do usuário no Firebase Auth
    const userRecord = await auth.createUser({
      email: cleanEmail,
      password: crypto.randomBytes(16).toString("base64url"), // não usada, só exigência do Firebase
    })
    console.log("✅ Usuário criado:", userRecord.uid)

    // 📬 Geração do link de redefinição de senha
    const resetLink = await auth.generatePasswordResetLink(cleanEmail)
    console.log("🔗 Link de redefinição gerado:", resetLink)

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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    console.log("✅ Dados do paciente gravados no Firestore.")

    // ✉️ Envio de e-mail via Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: `"NutriDash" <${process.env.EMAIL_FROM}>`,
      to: cleanEmail,
      subject: "Crie sua senha no NutriDash",
      html: `
        <h2>Olá, ${nome}!</h2>
        <p>Você foi cadastrado pela sua nutricionista no NutriDash.</p>
        <p>Clique no botão abaixo para criar sua senha e acessar o app:</p>
        <p><a href="${resetLink}" style="background-color:#6366f1;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Criar minha senha</a></p>
        <p>Se já tiver uma senha, basta acessar normalmente com seu e-mail.</p>
      `,
    })

    console.log("✅ E-mail enviado com sucesso para:", cleanEmail)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("❌ Erro ao criar paciente:", err)
    return NextResponse.json({ error: err.message || "Erro interno." }, { status: 500 })
  }
}

