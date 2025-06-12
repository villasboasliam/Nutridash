// lib/acess-data.ts
import { getFirestoreAdmin } from "@/lib/firebase-admin"

/**
 * Retorna os pacientes do nutricionista logado,
 * com nome, email e data de atualização.
 */
export async function getPatientAppAccesses(nutricionistaEmail: string) {
  const db = getFirestoreAdmin()
  if (!db) throw new Error("Firestore Admin não inicializado.")

  const pacientesRef = db
    .collection("nutricionistas")
    .doc(nutricionistaEmail)
    .collection("pacientes")

  const snapshot = await pacientesRef.get()

  const acessos = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      nome: data.nome,
      email: data.email,
      dataAtualizacao: data.data_atualizacao ?? null,
      dietaUrl: data.dieta_pdf_url ?? null,
    }
  })

  return acessos
}
