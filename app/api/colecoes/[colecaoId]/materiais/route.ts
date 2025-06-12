import { NextResponse, NextRequest } from 'next/server';
// Importando firestoreAdmin e admin do Firebase Admin SDK
import { getFirestoreAdmin, getAuthAdmin, admin } from '@/lib/firebase-admin'

const firestoreAdmin = getFirestoreAdmin()
const authAdmin = getAuthAdmin()


// Função auxiliar para obter o ID do nutricionista a partir do token de autenticação
async function getNutricionistaId(req: NextRequest): Promise<string | null> {
  // VERIFICAÇÃO CRÍTICA: Garante que admin está disponível para authAdmin
  if (!admin) {
    console.error("Firebase Admin SDK (admin object) não inicializado. Não é possível verificar o token de autenticação.");
    return null;
  }

  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    console.log('Token de autenticação não encontrado ou formato incorreto.');
    return null; // Token não encontrado ou formato incorreto
  }

  const token = authHeader.split(' ')[1];

  try {
    // Usando admin.auth() do Admin SDK para verificar o token
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Token verificado com sucesso. UID:', decodedToken.uid);
    return decodedToken.uid;
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return null; // Token inválido
  }
}

export async function GET(req: NextRequest, { params }: { params: { colecaoId: string } }) {
  // VERIFICAÇÃO CRÍTICA: Garante que firestoreAdmin e admin estão disponíveis
  if (!firestoreAdmin || !admin) {
    console.error("Serviços do Firebase Admin SDK não estão disponíveis. Verifique as variáveis de ambiente no ambiente de deploy.");
    return NextResponse.json({ message: "Serviço indisponível. Tente novamente mais tarde." }, { status: 500 });
  }

  const { colecaoId } = params;

  // Obter o ID do nutricionista a partir do token de autenticação
  const nutricionistaId = await getNutricionistaId(req);

  if (!nutricionistaId) {
    return NextResponse.json({ message: "Nutricionista não autenticado.", status: 401 });
  }

  try {
    // Usando firestoreAdmin e a estrutura correta para acessar a subcoleção de materiais
    // Assumindo que os materiais estão em: nutricionistas/{nutricionistaId}/colecoes/{colecaoId}/materiais
    const materiaisRef = firestoreAdmin
      .collection('nutricionistas')
      .doc(nutricionistaId)
      .collection('colecoes')
      .doc(colecaoId)
      .collection('materiais'); // Acessando a subcoleção 'materiais'

    const snapshot = await materiaisRef.get();
    const materiais = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`Materiais encontrados para coleção ${colecaoId} do nutricionista ${nutricionistaId}:`, materiais.length);
    return NextResponse.json(materiais, { status: 200 });
  } catch (error: any) {
    console.error(`Erro ao buscar materiais da coleção ${colecaoId}:`, error);
    return NextResponse.json({ message: `Erro ao buscar materiais da coleção ${colecaoId}` }, { status: 500 });
  }
}

// Se você também tiver uma rota POST para adicionar materiais a esta subcoleção, ela deve ser semelhante:
/*
export async function POST(req: NextRequest, { params }: { params: { colecaoId: string } }) {
  // VERIFICAÇÃO CRÍTICA: Garante que firestoreAdmin e admin estão disponíveis
  if (!firestoreAdmin || !admin) {
    console.error("Serviços do Firebase Admin SDK não estão disponíveis. Verifique as variáveis de ambiente no ambiente de deploy.");
    return NextResponse.json({ message: "Serviço indisponível. Tente novamente mais tarde." }, { status: 500 });
  }

  const { colecaoId } = params;
  const nutricionistaId = await getNutricionistaId(req);

  if (!nutricionistaId) {
    return NextResponse.json({ message: "Nutricionista não autenticado.", status: 401 });
  }

  try {
    const { nome, url, tipo } = await req.json(); // Exemplo de dados para o material

    if (!nome || !url || !tipo) {
      return NextResponse.json({ message: "Dados do material incompletos.", status: 400 });
    }

    const materiaisSubcollectionRef = firestoreAdmin
      .collection('nutricionistas')
      .doc(nutricionistaId)
      .collection('colecoes')
      .doc(colecaoId)
      .collection('materiais');

    const newMaterialRef = await materiaisSubcollectionRef.add({
      nome,
      url,
      tipo,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ownerId: nutricionistaId, // Opcional, mas útil
      colecaoId: colecaoId // Opcional, mas útil para consultas de grupo de coleção
    });

    const newMaterial = {
      id: newMaterialRef.id,
      nome,
      url,
      tipo,
      createdAt: new Date().toISOString(), // Para retorno imediato
      ownerId: nutricionistaId,
      colecaoId: colecaoId
    };

    console.log("Novo material adicionado:", newMaterial.id);
    return NextResponse.json(newMaterial, { status: 201 });

  } catch (error: any) {
    console.error("Erro ao adicionar material:", error);
    return NextResponse.json({ message: "Erro ao adicionar material.", status: 500 });
  }
}
*/
