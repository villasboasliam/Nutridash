// app/api/nutricionistas/colecoes/[colecaoId]/materiais/route.ts
import { NextResponse } from 'next/server'
import { getFirestoreAdmin } from '@/lib/firebase-admin'

export async function GET(req: Request, { params }: { params: { colecaoId: string } }) {
  const db = getFirestoreAdmin()
  if (!db) {
    return NextResponse.json({ message: 'Erro ao inicializar Firebase Admin.' }, { status: 500 })
  }

  try {
    const snapshot = await db
      .collectionGroup('materiais')
      .where('colecaoId', '==', params.colecaoId)
      .get()

    const materiais = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json(materiais, { status: 200 })
  } catch (error) {
    console.error('Erro ao buscar materiais:', error)
    return NextResponse.json({ message: 'Erro ao buscar materiais.' }, { status: 500 })
  }
}
