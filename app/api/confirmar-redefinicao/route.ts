import { auth } from '@/lib/firebase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json()

    if (!email || !senha) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    const user = await auth.getUserByEmail(email)

    await auth.updateUser(user.uid, { password: senha })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ERRO_CONFIRMAR_SENHA]', error)
    return NextResponse.json({ error: 'Erro ao redefinir a senha.' }, { status: 500 })
  }
}
