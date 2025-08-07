import { NextRequest, NextResponse } from "next/server"
import { getFirestoreAdmin, getAuthAdmin, admin } from "@/lib/firebase-admin" // admin para FieldValue e auth() direto
import crypto from "crypto"
import nodemailer from "nodemailer"

export async function POST(req: NextRequest) {
  const db = getFirestoreAdmin()
  const auth = getAuthAdmin()

  // Verificação de segurança
  if (!db || !auth) {
    console.error("❌ Serviços do Firebase Admin SDK não estão disponíveis.")
    return NextResponse.json({ error: "Serviço indisponível. Tente novamente mais tarde." }, { status: 500 })
  }

  const { nome, email, telefone, nutricionistaId } = await req.json()
  console.log("📥 Payload createPatient:", { nome, email, telefone, nutricionistaId })

  const tempPassword = crypto.randomBytes(6).toString("base64url")
  console.log("🔑 Senha temporária:", tempPassword)

  try {
    console.log("⏳ Criando usuário no Firebase Auth...")
    const userRecord = await auth.createUser({ email, password: tempPassword })
    console.log("✅ Usuário criado:", userRecord.uid)

    await db
      .collection("nutricionistas")
      .doc(nutricionistaId)
      .collection("pacientes")
      .doc(email)
      .set({
        nome,
        email,
        telefone,
        uid: userRecord.uid,
        isFirstLogin: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    console.log("✅ Dados do paciente gravados no Firestore.")

    console.log("🔌 Configurando Nodemailer com:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
    })

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })

    console.log(`✉️  Enviando e-mail para ${email}...`)
    await transporter.sendMail({
      from: `"NutriDash" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Seja bem-vindo — sua senha temporária",
      html: `
        <h2>Bem-vindo ao NutriDash</h2>
        <p>${nome}, você foi cadastrado pela sua nutricionista.</p>
        <p>Clique no botão abaixo para criar sua senha e acessar o aplicativo:</p>
        <ul>
          <li><b>E-mail:</b> ${email}</li>
          <li><b>Senha temporária:</b> ${tempPassword}</li>
        </ul>
        <p>Ao entrar no app, você será solicitado a escolher uma nova senha.</p>
      `,
    })
    console.log("✅ E-mail enviado com sucesso!")

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("❌ Erro ao criar paciente ou enviar e-mail:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
