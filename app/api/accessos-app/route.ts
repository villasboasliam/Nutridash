// app/api/accessos-app/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/authOptions"
import { getPatientAppAccesses } from '@/lib/acess-data'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 })
  }

  try {
    const nutricionistaEmail = session.user.email
    const acessos = await getPatientAppAccesses(nutricionistaEmail)
    return NextResponse.json(acessos, { status: 200 })
  } catch (error) {
    console.error('Erro ao buscar dados de acesso na API:', error)
    return NextResponse.json({ message: 'Erro ao buscar dados de acesso.' }, { status: 500 })
  }
}
