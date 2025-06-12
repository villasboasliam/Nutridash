import { NextResponse, NextRequest } from 'next/server';
// Importando firestoreAdmin e admin do Firebase Admin SDK
import { getFirestoreAdmin, getAuthAdmin, admin } from '@/lib/firebase-admin'

const firestoreAdmin = getFirestoreAdmin()
const authAdmin = getAuthAdmin()

async function getNutricionistaId(req: NextRequest): Promise<string | null> {
  // VERIFICAÇÃO CRÍTICA: Garante que admin está disponível para authAdmin
  if (!admin) {
    console.error("Firebase Admin SDK (admin object) não inicializado. Não é possível verificar o token.");
    return null;
  }

  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    console.log('Token de autenticação não encontrado ou formato incorreto.');
    return null; // Token não encontrado ou formato incorreto
  }

  const token = authHeader.split(' ')[1];

  try {
    // Usando admin.auth() do Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Token verificado com sucesso. UID:', decodedToken.uid);
    return decodedToken.uid;
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return null; // Token inválido
  }
}

export async function GET(req: NextRequest) {
  // VERIFICAÇÃO CRÍTICA: Garante que firestoreAdmin e admin estão disponíveis
  if (!firestoreAdmin || !admin) {
    console.error("Serviços do Firebase Admin SDK não estão disponíveis. Verifique as variáveis de ambiente no ambiente de deploy.");
    return NextResponse.json({ message: "Serviço indisponível. Tente novamente mais tarde." }, { status: 500 });
  }

  const nutricionistaId = await getNutricionistaId(req);

  if (!nutricionistaId) {
    return NextResponse.json({ message: "Nutricionista não autenticado.", status: 401 });
  }

  try {
    // Usando firestoreAdmin para operações no Firestore
    const nutricionistaDocRef = firestoreAdmin.collection('nutricionistas').doc(nutricionistaId);
    const colecoesSubcollectionRef = nutricionistaDocRef.collection('colecoes');
    const snapshot = await colecoesSubcollectionRef.get();
    const colecoes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`Coleções encontradas para ${nutricionistaId}:`, colecoes.length);
    return NextResponse.json(colecoes, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao buscar coleções:", error);
    return NextResponse.json({ message: "Erro ao buscar coleções.", status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // VERIFICAÇÃO CRÍTICA: Garante que firestoreAdmin e admin estão disponíveis
  if (!firestoreAdmin || !admin) {
    console.error("Serviços do Firebase Admin SDK não estão disponíveis. Verifique as variáveis de ambiente no ambiente de deploy.");
    return NextResponse.json({ message: "Serviço indisponível. Tente novamente mais tarde." }, { status: 500 });
  }

  const nutricionistaId = await getNutricionistaId(req);

  if (!nutricionistaId) {
    return NextResponse.json({ message: "Nutricionista não autenticado.", status: 401 });
  }

  try {
    const { nome, descricao } = await req.json();

    if (!nome) {
      return NextResponse.json({ message: "O nome da coleção é obrigatório.", status: 400 });
    }

    // Usando firestoreAdmin para operações no Firestore
    const nutricionistaDocRef = firestoreAdmin.collection('nutricionistas').doc(nutricionistaId);
    const colecoesSubcollectionRef = nutricionistaDocRef.collection('colecoes');

    const docRef = await colecoesSubcollectionRef.add({
      nome,
      descricao,
      // Usando serverTimestamp do Admin SDK
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ownerId: nutricionistaId,
    });

    const novaColecao = {
      id: docRef.id,
      nome,
      descricao,
      // Para o retorno, se precisar do timestamp, você pode buscar o documento novamente
      // ou retornar um valor placeholder e deixar o cliente lidar com o timestamp real.
      // Para simplificar, vou manter new Date() aqui para o retorno, mas o Firestore terá o serverTimestamp.
      createdAt: new Date().toISOString(), // Usar ISO string para consistência
      ownerId: nutricionistaId,
    };

    console.log("Nova coleção criada:", novaColecao.id);
    return NextResponse.json(novaColecao, { status: 201 }); // 201 Created

  } catch (error: any) {
    console.error("Erro ao criar coleção:", error);
    return NextResponse.json({ message: "Erro ao criar a coleção.", status: 500 });
  }
}
