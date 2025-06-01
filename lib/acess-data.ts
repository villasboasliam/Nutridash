import { db } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

interface AcessoDia {
  dia: string;
  acessos: number;
}

async function getPatientAppAccesses(nutricionistaEmail: string): Promise<AcessoDia[]> {
  try {
    const nutricionistaRef = db.collection('nutricionistas').doc(nutricionistaEmail);
    const pacientesSnapshot = await nutricionistaRef.collection('pacientes').get();
    const acessosPorDia: { [key: string]: number } = {};
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    for (const pacienteDoc of pacientesSnapshot.docs) {
      const acessosSnapshot = await pacienteDoc.ref.collection('acessosApp').get();
      for (const acessoDoc of acessosSnapshot.docs) {
        const timestamp = acessoDoc.data().timestamp as Timestamp | undefined;
        if (timestamp) {
          const dataAcesso = timestamp.toDate();
          if (dataAcesso >= seteDiasAtras) {
            const dia = dataAcesso.toISOString().slice(0, 10); // Formato YYYY-MM-DD
            acessosPorDia[dia] = (acessosPorDia[dia] || 0) + 1;
          }
        }
      }
    }

    const resultado: AcessoDia[] = Object.entries(acessosPorDia)
      .sort((a, b) => a[0].localeCompare(b[0])) // Ordenar por data
      .map(([dia, acessos]) => ({ dia, acessos }));

    // Preencher dias faltantes com zero acessos
    const todosOsDias: { [key: string]: number } = {};
    for (let i = 0; i < 7; i++) {
      const data = new Date();
      data.setDate(data.getDate() - i);
      const diaFormatado = data.toISOString().slice(0, 10);
      todosOsDias[diaFormatado] = acessosPorDia[diaFormatado] || 0;
    }

    return Object.entries(todosOsDias)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dia, acessos]) => ({ dia, acessos }));

  } catch (error) {
    console.error('Erro ao buscar acessos dos pacientes:', error);
    return [];
  }
}

export { getPatientAppAccesses };