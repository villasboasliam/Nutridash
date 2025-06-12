import { NextRequest, NextResponse } from 'next/server'
import { getAuthAdmin } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  const authAdmin = getAuthAdmin()

  // Verificação crítica
  if (!authAdmin) {
    console.error("❌ Firebase Auth Admin não inicializado. Verifique variáveis de ambiente.")
    return NextResponse.json({ error: 'Serviço indisponível. Tente novamente mais tarde.' }, { status: 500 })
  }

  try {
    const { email, senha } = await req.json()

    if (!email || !senha) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    const user = await authAdmin.getUserByEmail(email)
    await authAdmin.updateUser(user.uid, { password: senha })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[ERRO_CONFIRMAR_SENHA]', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao redefinir a senha.' },
      { status: 500 }
    )
  }
}
