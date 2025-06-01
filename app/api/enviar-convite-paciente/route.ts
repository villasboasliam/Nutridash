import { db } from "@/lib/firebase"
import { doc, setDoc } from "firebase/firestore"
import { v4 as uuidv4 } from "uuid"
import { NextResponse, NextRequest } from "next/server"
import nodemailer from "nodemailer"
import { auth } from "@/lib/firebase-admin" // IMPORTANTE: firebase-admin, não o firebase client

export async function POST(req: NextRequest) {
  const { nome, email, telefone, nutricionistaId } = await req.json()

  if (!nome || !email || !telefone || !nutricionistaId) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
  }

  const token = uuidv4()

  try {
    // ✅ Cria o usuário no Firebase Auth se ainda não existir
    try {
      await auth.createUser({ email })
    } catch (err: any) {
      if (err.code === "auth/email-already-exists") {
        // tudo bem, já existe
      } else {
        console.error("Erro ao criar usuário no Auth:", err)
        throw err
      }
    }

    // ✅ Cria paciente no Firestore
    const pacienteRef = doc(db, "nutricionistas", nutricionistaId, "pacientes", email)
    await setDoc(pacienteRef, {
      nome,
      email,
      telefone,
      dataCriacao: new Date(),
      tokenCriacaoSenha: token,
      status: "Ativo", // 👈 Novo campo
    })

    // ✅ Gera o link com base no ambiente
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/criar-senha?token=${token}&email=${encodeURIComponent(email)}`

    // ✅ Envia o e-mail
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
      to: email,
      subject: "Crie sua senha no NutriDash",
      html: `
        <h2>Bem-vindo ao NutriDash</h2>
        <p>${nome}, você foi cadastrado pela sua nutricionista.</p>
        <p>Clique no botão abaixo para criar sua senha e acessar o aplicativo:</p>
        <a href="${url}" style="padding: 10px 20px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 5px;">Criar minha senha</a>
        <p>Se você não reconhece este cadastro, ignore este e-mail.</p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao criar paciente ou enviar e-mail:", error)
    return NextResponse.json({ error: "Erro ao criar paciente" }, { status: 500 })
  }
}
