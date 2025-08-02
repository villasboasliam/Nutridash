
"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc,setDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore"
import { ArrowLeft, Camera, FileText, Home, LineChart, Menu, Upload, Users, Video, Trash, X , Pencil} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { useLanguage } from "@/contexts/language-context"
import { useToast } from "@/components/ui/use-toast"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { useParams } from "next/navigation"

export default function PatientDetailPage() {
  const [isDietUploaded, setIsDietUploaded] = useState(false);
  const [isPhotosUploaded, setIsPhotosUploaded] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null); // Para dietas
  const [nomeDieta, setNomeDieta] = useState("");

  // NOVOS ESTADOS PARA MATERIAL INDIVIDUAL
  const [selectedIndividualPDF, setSelectedIndividualPDF] = useState<File | null>(null);
  const [nomeMaterialIndividual, setNomeMaterialIndividual] = useState("");
  const [individualMaterials, setIndividualMaterials] = useState<any[]>([]); // Para exibir os materiais individuais
  const [isSubmittingIndividualMaterial, setIsSubmittingIndividualMaterial] = useState(false);
  const [submitIndividualMaterialText, setSubmitIndividualMaterialText] = useState('Enviar Material');
  const [submitIndividualMaterialColorClass, setSubmitIndividualMaterialColorClass] = useState('bg-indigo-600 hover:bg-indigo-700');

  const params = useParams()
  const id = decodeURIComponent(params?.id as string)
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { t } = useLanguage()
  const { toast } = useToast()
  const [showReplaceDietButton, setShowReplaceDietButton] = useState(false); // Não está sendo usado, pode remover se quiser
  const [patient, setPatient] = useState<any | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [dataNovaMetrica, setDataNovaMetrica] = useState("")
  const [infoParaEditar, setInfoParaEditar] = useState<any>(null)


  // Estados para os campos de ENTRADA (base measurements)
  const [pesoNovo, setPesoNovo] = useState("")
  const [alturaNova, setAlturaNova] = useState("")
  const [cinturaNovo, setCinturaNovo] = useState("") // Adicionado como input para cálculo de RCQ
  const [quadrilNovo, setQuadrilNovo] = useState("") // Adicionado como input para cálculo de RCQ
  const [bracoNovo, setBracoNovo] = useState("") // Adicionado como input para cálculo de CMB
  const [gorduraPercentualNovoInput, setGorduraPercentualNovoInput] = useState("") // Input para Gordura (%)
  const [somatorioDobrasNovo, setSomatorioDobrasNovo] = useState("")
  const [densidadeCorporalNovoInput, setDensidadeCorporalNovoInput] = useState("") // Input para Densidade Corporal

  // Estados para os campos CALCULADOS (desabilitados no formulário)
  const [imcNovo, setImcNovo] = useState("")
  const [classificacaoImcNovo, setClassificacaoImcNovo] = useState("")
  const [rcqNovo, setRcqNovo] = useState("")
  const [riscoRcqNovo, setRiscoRcqNovo] = useState("")
  const [cmbNovo, setCmbNovo] = useState("")
  const [classificacaoCmbNovo, setClassificacaoCmbNovo] = useState("")
  const [classificacaoGorduraNovo, setClassificacaoGorduraNovo] = useState("")
  const [massaGorduraNovo, setMassaGorduraNovo] = useState("")
  const [massaResidualNovo, setMassaResidualNovo] = useState("")
  const [massaLivreGorduraNovo, setMassaLivreGorduraNovo] = useState("")
  const [metricaParaExcluir, setMetricaParaExcluir] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false)

  const [editInfoOpen, setEditInfoOpen] = useState(false)
  const [editMetricsOpen, setEditMetricsOpen] = useState(false)
  const [isSubmittingDiet, setIsSubmittingDiet] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState('Enviar Dieta');
  const [submitButtonColorClass, setSubmitButtonColorClass] = useState('bg-indigo-600 hover:bg-indigo-700');


  const [editData, setEditData] = useState({
    name: "",
    email: "",
    telefone: "",
    birthdate: "",
    valorConsulta: "",
  })

  const [editMetrics, setEditMetrics] = useState({
    peso: 0,
    altura: 0,
    gordura: 0,
    massaMagra: 0,
    cintura: 0,
  })

  // Função auxiliar para converter string com vírgula para número
  const parseNumber = (value: string) => {
    const cleanedValue = value.replace(',', '.');
    // Retorna 0 se o valor for vazio ou não for um número válido após a limpeza
    return isNaN(Number(cleanedValue)) || cleanedValue.trim() === '' ? 0 : Number(cleanedValue);
  };

  // Funções de Cálculo
  const calculateIMC = useCallback((peso: number, altura: number) => {
    if (peso <= 0 || altura <= 0) return 0;
    const alturaMetros = altura / 100;
    return peso / (alturaMetros * alturaMetros);
  }, []);

  const classifyIMC = useCallback((imc: number) => {
    if (imc === 0) return "";
    if (imc < 18.5) return "Baixo Peso";
    if (imc >= 18.5 && imc <= 24.9) return "Normal";
    if (imc >= 25 && imc <= 29.9) return "Sobrepeso";
    if (imc >= 30 && imc <= 34.9) return "Obesidade Grau I";
    if (imc >= 35 && imc <= 39.9) return "Obesidade Grau II";
    return "Obesidade Grau III";
  }, []);

  const calculateRCQ = useCallback((cintura: number, quadril: number) => {
    if (cintura <= 0 || quadril <= 0) return 0;
    return cintura / quadril;
  }, []);

  const classifyRCQ = useCallback((rcq: number, sexo: string = 'feminino') => { // Assumindo 'feminino' como padrão ou você pode passar do paciente
    if (rcq === 0) return "";
    if (sexo === 'feminino') {
      if (rcq < 0.80) return "Baixo";
      if (rcq >= 0.80 && rcq <= 0.84) return "Moderado";
      return "Alto";
    } else { // Masculino
      if (rcq < 0.90) return "Baixo";
      if (rcq >= 0.90 && rcq <= 0.99) return "Moderado";
      return "Alto";
    }
  }, []);

  const calculateCMB = useCallback((braco: number) => {
    // CMB é geralmente a medida direta do braço, mas pode ter classificações
    return braco; // Ou adicione lógica de cálculo se for um valor derivado
  }, []);

  const classifyCMB = useCallback((cmb: number) => {
    if (cmb === 0) return "";
    // Exemplo de classificação simplificada para CMB (Circunferência Muscular do Braço)
    // Valores de referência podem variar por idade, sexo, etc.
    if (cmb < 23) return "Baixo"; // Risco de desnutrição
    if (cmb >= 23 && cmb <= 29) return "Normal";
    return "Alto"; // Risco de obesidade ou massa muscular elevada
  }, []);

  const classifyGordura = useCallback((gorduraPercentual: number) => {
    if (gorduraPercentual === 0) return "";
    // Classificação de gordura corporal (exemplo para adultos, pode variar por sexo/idade)
    if (gorduraPercentual < 10) return "Muito Baixo";
    if (gorduraPercentual >= 10 && gorduraPercentual <= 20) return "Adequado";
    if (gorduraPercentual > 20 && gorduraPercentual <= 25) return "Moderado";
    return "Elevado";
  }, []);

  // Massa de Gordura (kg) = (Gordura % / 100) * Peso (kg)
  const calculateMassaGordura = useCallback((gorduraPercentual: number, peso: number) => {
    if (gorduraPercentual === 0 || peso === 0) return 0;
    return (gorduraPercentual / 100) * peso;
  }, []);

  // Massa Livre de Gordura (kg) = Peso (kg) - Massa de Gordura (kg)
  const calculateMassaLivreGordura = useCallback((peso: number, massaGordura: number) => {
    if (peso === 0 || massaGordura === 0) return 0;
    return peso - massaGordura;
  }, []);

  // Massa Residual (kg) - Geralmente um percentual do peso corporal total (ex: 20-24%)
  const calculateMassaResidual = useCallback((peso: number) => {
    if (peso === 0) return 0;
    return peso * 0.207; // Exemplo: 20.7% do peso
  }, []);


  // Efeito para recalcular métricas sempre que os inputs base mudarem
  useEffect(() => {
    const peso = parseNumber(pesoNovo);
    const altura = parseNumber(alturaNova);
    const cintura = parseNumber(cinturaNovo);
    const quadril = parseNumber(quadrilNovo);
    const braco = parseNumber(bracoNovo);
    const gorduraPercentualInput = parseNumber(gorduraPercentualNovoInput);
    const somatorioDobras = parseNumber(somatorioDobrasNovo);
    const densidadeCorporal = parseNumber(densidadeCorporalNovoInput);

    // IMC e Classificação
    const calculatedIMC = calculateIMC(peso, altura);
    setImcNovo(calculatedIMC > 0 ? calculatedIMC.toFixed(2).replace('.', ',') : "");
    setClassificacaoImcNovo(classifyIMC(calculatedIMC));

    // RCQ e Classificação
    const calculatedRCQ = calculateRCQ(cintura, quadril);
    setRcqNovo(calculatedRCQ > 0 ? calculatedRCQ.toFixed(2).replace('.', ',') : "");
    setRiscoRcqNovo(classifyRCQ(calculatedRCQ, patient?.sexo));

    // CMB e Classificação
    const calculatedCMB = calculateCMB(braco);
    setCmbNovo(calculatedCMB > 0 ? calculatedCMB.toFixed(2).replace('.', ',') : "");
    setClassificacaoCmbNovo(classifyCMB(calculatedCMB));

    // Classificação Gordura
    setClassificacaoGorduraNovo(classifyGordura(gorduraPercentualInput));

    // Massa de Gordura
    const calculatedMassaGordura = calculateMassaGordura(gorduraPercentualInput, peso);
    setMassaGorduraNovo(calculatedMassaGordura > 0 ? calculatedMassaGordura.toFixed(2).replace('.', ',') : "");

    // Massa Livre de Gordura
    const calculatedMassaLivreGordura = calculateMassaLivreGordura(peso, calculatedMassaGordura);
    setMassaLivreGorduraNovo(calculatedMassaLivreGordura > 0 ? calculatedMassaLivreGordura.toFixed(2).replace('.', ',') : "");

    // Massa Residual (se for calculada, não inputada)
    const calculatedMassaResidual = calculateMassaResidual(peso);
    setMassaResidualNovo(calculatedMassaResidual > 0 ? calculatedMassaResidual.toFixed(2).replace('.', ',') : "");

  }, [
    pesoNovo, alturaNova, cinturaNovo, quadrilNovo, bracoNovo, gorduraPercentualNovoInput, somatorioDobrasNovo, densidadeCorporalNovoInput,
    calculateIMC, classifyIMC, calculateRCQ, classifyRCQ, calculateCMB, classifyCMB,
    classifyGordura, calculateMassaGordura, calculateMassaLivreGordura, calculateMassaResidual, patient?.sexo
  ]);


  // Função para upload de fotos (existente)
  const uploadPhoto = async (file: File, patientId: string, imageName: string) => {
    if (!file) return null;
    const storageRef = ref(storage, `pacientes/${patientId}/fotos/${imageName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  };

  // Função para upload de PDF de dieta (existente)
  const uploadPDF = async (file: File, patientId: string) => {
    if (!file) return null;
    const storageRef = ref(storage, `pacientes/${patientId}/dietas/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  }

  // NOVA FUNÇÃO: Upload de PDF de Material Individual
  const uploadIndividualPDF = async (file: File, patientId: string) => {
    if (!file) return null;
    const storageRef = ref(storage, `pacientes/${patientId}/materiais_individuais/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  }

  // Handler para substituir dieta (existente)
  const handleReplaceDiet = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.user?.email) {
      toast({ title: "Erro de autenticação", description: "Usuário não autenticado. Tente novamente." });
      return;
    }

    const file = selectedPDF;
    if (!file) {
      toast({ title: "Nenhum arquivo selecionado", description: "Por favor, selecione um novo arquivo PDF." });
      return;
    }

    if (!nomeDieta.trim()) {
      toast({ title: "Erro", description: "Por favor, insira o nome da dieta." });
      return;
    }

    setIsSubmittingDiet(true);
    try {
      const downloadURL = await uploadPDF(file, id);

      const ref = doc(db, "nutricionistas", session.user.email, "pacientes", id);
      await updateDoc(ref, {
        dietas: [ // Sobrescreve a dieta existente (se houver, ou cria uma nova)
          { nome: file.name, url: downloadURL, dataEnvio: new Date().toLocaleDateString(), nomeDieta: nomeDieta },
        ],
      });
      // 1. Referência ao documento de estatísticas
const statRef = doc(db, "nutricionistas", session.user.email, "estatisticas", "dietas");

try {
  const statSnap = await getDoc(statRef);

  if (statSnap.exists()) {
    const atual = statSnap.data().totalDietasEnviadas || 0;
    await updateDoc(statRef, {
      totalDietasEnviadas: atual + 1,
      ultimaAtualizacao: new Date().toISOString()
    });
  } else {
    await setDoc(statRef, {
      totalDietasEnviadas: 1,
      ultimaAtualizacao: new Date().toISOString()
    });
  }
} catch (error) {
  console.error("Erro ao atualizar estatísticas de dietas:", error);
}

      setIsDietUploaded(true);
      toast({
        title: "Dieta Substituída",
        description: "A dieta do paciente foi substituída com sucesso.",
      });

      setSubmitButtonText("Enviado!");
      setSubmitButtonColorClass("bg-green-500 hover:bg-green-600");

      setTimeout(() => {
        setSubmitButtonText(isDietUploaded ? 'Substituir Dieta' : 'Enviar Dieta');
        setSubmitButtonColorClass('bg-indigo-600 hover:bg-indigo-700');
        setIsSubmittingDiet(false);
      }, 5000);

    } catch (error) {
      console.error("Erro ao substituir a dieta:", error);
      toast({ title: "Erro ao substituir a dieta", description: "Não foi possível substituir o arquivo." });
      setIsSubmittingDiet(false);
    }
  };

  // Handler para upload de fotos (existente)
  const handleUploadPhotos = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.user?.email) {
      toast({ title: "Erro de autenticação", description: "Usuário não autenticado. Tente novamente." });
      return;
    }

    if (!selectedPhotos || selectedPhotos.length === 0) {
      toast({ title: "Nenhuma foto selecionada", description: "Por favor, selecione até 3 fotos." });
      return;
    }

    if (selectedPhotos.length > 3) {
      toast({ title: "Limite de fotos excedido", description: "Você pode enviar no máximo 3 fotos por vez." });
      return;
    }

    try {
      const downloadURLs = await Promise.all(
        selectedPhotos.map(async (file, index) => {
          return await uploadPhoto(file, id, `foto_${Date.now()}_${index + 1}`);
        })
      );

      toast({ title: "Upload concluído", description: `${downloadURLs.length} foto(s) enviada(s) com sucesso.` });
      const ref = doc(db, "nutricionistas", session.user.email, "pacientes", id);
      // Adiciona novas fotos ao array existente
      await updateDoc(ref, {
        fotos: arrayUnion({ data: new Date().toLocaleDateString(), urls: downloadURLs }),
      });
      setIsPhotosUploaded(true);
      setSelectedPhotos([]); // Limpa as fotos selecionadas após o envio
    } catch (error) {
      console.error("Erro ao fazer upload das fotos:", error);
      toast({ title: "Erro ao fazer upload", description: "Não foi possível enviar as fotos." });
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newPhotos = Array.from(files);
      if (newPhotos.length > 3) {
        toast({ title: "Limite de fotos excedido", description: "Você pode selecionar no máximo 3 fotos." });
        return;
      }
      setSelectedPhotos(newPhotos);
    }
  };

  // Handler para upload de PDF de dieta (existente, mas não usado diretamente para upload inicial)
  const handleUploadPDF = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Esta função não é mais usada diretamente para o upload inicial da dieta,
    // pois handleReplaceDiet agora faz o upload e a atualização.
    // Mantenho aqui por compatibilidade, mas pode ser removida se não houver outro uso.
    console.warn("handleUploadPDF foi chamado, mas handleReplaceDiet é o handler principal para dietas.");
  };

  // NOVO HANDLER: Upload de Material Individual
  const handleUploadIndividualMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!session?.user?.email) {
      toast({ title: "Erro de autenticação", description: "Usuário não autenticado. Tente novamente." });
      return;
    }

    const file = selectedIndividualPDF;
    if (!file) {
      toast({ title: "Nenhum arquivo selecionado", description: "Por favor, selecione um arquivo PDF para o material individual." });
      return;
    }

    if (!nomeMaterialIndividual.trim()) {
      toast({ title: "Erro", description: "Por favor, insira o nome do material individual." });
      return;
    }

    setIsSubmittingIndividualMaterial(true);
    try {
      const downloadURL = await uploadIndividualPDF(file, id);

      const ref = doc(db, "nutricionistas", session.user.email, "pacientes", id);
      await updateDoc(ref, {
        materiaisIndividuais: arrayUnion({
          nome: nomeMaterialIndividual,
          url: downloadURL,
          dataEnvio: new Date().toLocaleDateString(),
        }),
      });

      toast({
        title: "Material Individual Enviado",
        description: "O material individual do paciente foi enviado com sucesso.",
      });

      // Atualiza o estado para refletir o novo material
      setIndividualMaterials(prev => [...prev, { nome: nomeMaterialIndividual, url: downloadURL, dataEnvio: new Date().toLocaleDateString() }]);
      setSelectedIndividualPDF(null);
      setNomeMaterialIndividual("");

      setSubmitIndividualMaterialText("Enviado!");
      setSubmitIndividualMaterialColorClass("bg-green-500 hover:bg-green-600");

      setTimeout(() => {
        setSubmitIndividualMaterialText('Enviar Material');
        setSubmitIndividualMaterialColorClass('bg-indigo-600 hover:bg-indigo-700');
        setIsSubmittingIndividualMaterial(false);
      }, 5000);

    } catch (error) {
      console.error("Erro ao enviar material individual:", error);
      toast({ title: "Erro ao enviar material individual", description: "Não foi possível enviar o arquivo." });
      setIsSubmittingIndividualMaterial(false);
    }
  };

  // NOVA FUNÇÃO: Excluir Material Individual
  const handleDeleteIndividualMaterial = async (materialToDelete: any) => {
    if (!session?.user?.email || !patient) return;

    try {
      const refPaciente = doc(db, "nutricionistas", session.user.email, "pacientes", id);

      // 1. Remover do Firestore
      await updateDoc(refPaciente, {
        materiaisIndividuais: arrayRemove(materialToDelete),
      });

      // 2. Remover do Storage (opcional, mas recomendado para evitar lixo)
      // Note: materialToDelete.nome é usado como o nome do arquivo no storage.
      // Certifique-se de que o 'nome' no objeto do Firestore corresponde ao nome do arquivo no Storage.
      const storageRef = ref(storage, `pacientes/${id}/materiais_individuais/${materialToDelete.nome}`);
      await deleteObject(storageRef);

      // 3. Atualizar o estado local
      setIndividualMaterials(prev => prev.filter(m => m.url !== materialToDelete.url));

      toast({ title: "Material Individual Excluído", description: "O material foi removido com sucesso." });
    } catch (error) {
      console.error("Erro ao excluir material individual:", error);
      toast({ title: "Erro ao excluir material individual", description: "Não foi possível remover o material." });
    }
  };


  useEffect(() => {
    const fetchPatient = async () => {
      if (!session?.user?.email) return;
      const ref = doc(db, "nutricionistas", session.user.email, "pacientes", id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        setPatient({
          ...data,
          historicoMetricas: data.historicoMetricas || [],
          dietas: data.dietas || [],
          fotos: data.fotos || [],
          materiaisIndividuais: data.materiaisIndividuais || [], // Captura o array de materiais individuais
        });
        setIsActive(data.status === "Ativo");
        setEditData({
          name: data.nome || "",
          email: data.email || "",
          telefone: data.telefone || "",
          birthdate: data.birthdate || "",
          valorConsulta: data.valorConsulta || "",
        });
        setEditMetrics({
          peso: data.peso_atual || 0,
          altura: data.altura || 0,
          gordura: data.gordura || 0,
          massaMagra: data.massaMagra || 0,
          cintura: data.cintura || 0,
        });
        setIsDietUploaded(data.dietas && data.dietas.length > 0);
        setIsPhotosUploaded(data.fotos && data.fotos.length > 0);
        setIndividualMaterials(data.materiaisIndividuais || []); // Define os materiais individuais
      } else {
        setPatient(null);
      }
    };
    fetchPatient();
  }, [id, session]);

  const handleSaveInfo = async () => {
    if (!session?.user?.email) return
    const ref = doc(db, "nutricionistas", session.user.email, "pacientes", id)
    await updateDoc(ref, {
      nome: editData.name,
      email: editData.email,
      telefone: editData.telefone,
      birthdate: editData.birthdate,
      valorConsulta: editData.valorConsulta,
    })
    setPatient((prev: any) => ({ ...prev, ...editData }))
    toast({ title: "Informações atualizadas com sucesso" })
    setEditInfoOpen(false)
  }
// ⬆️ ANTES do return
const excluirMetrica = async (data: string) => {
  if (!session?.user?.email || !patient) return;

  const historicoAtualizado = (patient.historicoMetricas || []).filter(
    (metrica: any) => metrica.data !== data
  );

  const refPaciente = doc(db, "nutricionistas", session.user?.email, "pacientes", id);

  await updateDoc(refPaciente, {
    historicoMetricas: historicoAtualizado,
  });

  setPatient((prev: any) => ({
    ...prev,
    historicoMetricas: historicoAtualizado,
  }));

  toast({ title: "Métrica excluída com sucesso" });
};

  const handleSaveMetrics = async () => {
    if (!session?.user?.email) return
    const ref = doc(db, "nutricionistas", session.user.email, "pacientes", id)
    await updateDoc(ref, {
      peso_atual: editMetrics.peso,
      altura: editMetrics.altura,
      gordura: editMetrics.gordura,
      massa_magra: editMetrics.massaMagra,
      cintura: editMetrics.cintura,
    })
    setPatient((prev: any) => ({ ...prev, ...editMetrics }))
    toast({ title: "Métricas atualizadas com sucesso" })
    setEditMetricsOpen(false)
  }

  const handleDeletePatient = async () => {
    if (!session?.user?.email) return
    const ref = doc(db, "nutricionistas", session.user.email, "pacientes", id)
    await deleteDoc(ref)
    toast({
      title: "Paciente excluído",
      description: "O paciente foi permanentemente deletado.",
    })
    router.push("/pacientes")
  }

  const togglePatientStatus = async () => {
    if (!session?.user?.email) return
    const novoStatus = isActive ? "Inativo" : "Ativo"
    const ref = doc(db, "nutricionistas", session.user.email, "pacientes", id)
    await updateDoc(ref, { status: novoStatus })
    setIsActive(!isActive)
    toast({
      title: `Paciente ${novoStatus === "Ativo" ? "ativado" : "inativado"}`,
    })
  }

  const salvarNovaMetrica = async () => {
  if (!session?.user?.email || !patient) return;

  // Função auxiliar para converter string com vírgula para número
  const parseNumber = (value: string) => {
    const cleanedValue = value.replace(',', '.');
    // Retorna 0 se o valor for vazio ou não for um número válido após a limpeza
    return isNaN(Number(cleanedValue)) || cleanedValue.trim() === '' ? 0 : Number(cleanedValue);
  };

  const novaMetrica = {
    data: dataNovaMetrica,
    peso: parseNumber(pesoNovo),
    altura: parseNumber(alturaNova),
    cintura: parseNumber(cinturaNovo), // Incluído
    quadril: parseNumber(quadrilNovo), // Incluído
    braco: parseNumber(bracoNovo),     // Incluído
    somatorioDobras: parseNumber(somatorioDobrasNovo), // Incluído
    densidadeCorporal: parseNumber(densidadeCorporalNovoInput), // Incluído
    imc: parseNumber(imcNovo),
    classificacaoImc: classificacaoImcNovo,
    rcq: parseNumber(rcqNovo),
    riscoRcq: riscoRcqNovo,
    cmb: parseNumber(cmbNovo),
    classificacaoCmb: classificacaoCmbNovo,
    gorduraPercentual: parseNumber(gorduraPercentualNovoInput),
    classificacaoGordura: classificacaoGorduraNovo,
    massaGordura: parseNumber(massaGorduraNovo),
    massaResidual: parseNumber(massaResidualNovo),
    massaLivreGordura: parseNumber(massaLivreGorduraNovo),
  };

  const refPaciente = doc(db, "nutricionistas", session.user.email, "pacientes", id);
  const historicoAtualizado = [...(patient.historicoMetricas || []), novaMetrica];

  await updateDoc(refPaciente, {
    historicoMetricas: historicoAtualizado,
  });

  setPatient((prev: any) => ({
    ...prev,
    historicoMetricas: historicoAtualizado,
  }));

  // Resetar campos de entrada
  setDataNovaMetrica("");
  setPesoNovo("");
  setAlturaNova("");
  setCinturaNovo("");
  setQuadrilNovo("");
  setBracoNovo("");
  setGorduraPercentualNovoInput("");
  setSomatorioDobrasNovo("");
  setDensidadeCorporalNovoInput("");

  // Resetar campos calculados (para limpar o formulário)
  setImcNovo("");
  setClassificacaoImcNovo("");
  setRcqNovo("");
  setRiscoRcqNovo("");
  setCmbNovo("");
  setClassificacaoCmbNovo("");
  setClassificacaoGorduraNovo("");
  setMassaGorduraNovo("");
  setMassaResidualNovo("");
  setMassaLivreGorduraNovo("");


  toast({ title: "Nova métrica adicionada com sucesso" });
};

const handleDeleteMetricEntry = async (metricToDelete: MetricaEntry) => { 
  if (!session?.user?.email || !patient) {
    console.error("Autenticação ou dados do paciente ausentes para a operação de exclusão.");
    return;
  }

  console.log("Tentando excluir entrada de métrica:", metricToDelete);
  console.log("Histórico de métricas atual (antes do filtro):", JSON.parse(JSON.stringify(patient.historicoMetricas)));

  toast({
    title: "Confirmar Exclusão da Coluna de Métrica",
    description: `Tem certeza que deseja excluir a coluna de métricas da data ${metricToDelete.data}? Essa ação não pode ser desfeita.`,
    action: (
      <Button
        variant="destructive"
        onClick={async () => {
          try {
            // O caminho completo para o documento do paciente
            const refPaciente = doc(dbInstance, "nutricionistas", session.user.email, "pacientes", id);

            // Filtra o histórico para remover a entrada com base em múltiplos campos para maior precisão.
            // Se você tiver um ID único para cada métrica, use-o para uma comparação ainda mais robusta!
            const historicoAtualizado = (patient.historicoMetricas || []).filter(
              (metrica: MetricaEntry) => {
                // Compara a data E o peso. Adicione outros campos se necessário para garantir unicidade.
                const isMatch = metrica.data === metricToDelete.data && metrica.peso === metricToDelete.peso;
                console.log(`Comparando stored: ${metrica.data} (${metrica.peso}) com target: ${metricToDelete.data} (${metricToDelete.peso}): ${isMatch}`);
                return !isMatch; // Retorna true para manter, false para remover
              }
            );

            console.log("historicoAtualizado (após filtro):", JSON.parse(JSON.stringify(historicoAtualizado)));

            // ESTA É A LINHA QUE ATUALIZA O FIREBASE COM O ARRAY FILTRADO
            await updateDoc(refPaciente, {
              historicoMetricas: historicoAtualizado,
            });

            // Atualiza o estado local para refletir a mudança na UI
            setPatient((prev: any) => ({
              ...prev,
              historicoMetricas: historicoAtualizado,
            }));

            toast({ title: "Coluna de métrica excluída com sucesso" });
            console.log("Métrica excluída com sucesso do Firestore e estado local.");
          } catch (error) {
            console.error("Erro durante a exclusão da métrica no Firestore:", error);
            toast({ title: "Erro ao excluir métrica", description: "Não foi possível remover a coluna. Verifique o console para detalhes." });
          }
        }}
      >
        Excluir
      </Button>
    ),
  });
};
  

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col bg-card border-r border-border lg:flex fixed h-full">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-indigo-600">
            <LineChart className="h-5 w-5" />
            <span>NutriDash</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {/* Usando o componente SidebarLinks para consistência */}
          <SidebarLinks pathname={pathname} t={t} />
        </nav>
      </aside>

      <div className="flex flex-col flex-1 lg:ml-64">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-14 items-center border-b px-4">
                <Link href="/" className="flex items-center gap-2 font-semibold text-indigo-600">
                  <LineChart className="h-5 w-5" />
                  <span>NutriDash</span>
                </Link>
              </div>
              <nav className="flex-1 space-y-1 p-2">
                {/* Usando o componente SidebarLinks para consistência no SheetContent também */}
                <SidebarLinks pathname={pathname} t={t} />
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <div className="flex items-center">
              <h2 className="text-lg font-medium">Detalhes do Paciente</h2>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 md:p-6">
          {/* Adicionado div para controlar a largura máxima e centralizar */}
          <div className="max-w-4xl mx-auto w-full">
     <div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-4">
    {/* Botão Voltar */}
    <Button variant="outline" size="icon" asChild>
      <Link href="/pacientes">
        <ArrowLeft className="h-4 w-4" />
        <span className="sr-only">Voltar</span>
      </Link>
    </Button>

    {/* Switch Paciente Ativo */}
    <div className="flex items-center gap-2">
      <Switch
        id="patient-status"
        checked={isActive}
        onCheckedChange={togglePatientStatus}
      />
      <Label htmlFor="patient-status">
        {isActive ? "Paciente Ativo" : "Paciente Inativo"}
      </Label>
    </div>

    {/* Botão de Excluir */}
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive hover:bg-muted"
          title="Excluir paciente"
        >
          <Trash className="h-5 w-5" />
          <span className="sr-only">Excluir paciente</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza que deseja excluir este paciente?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. Isso removerá permanentemente o paciente e todos os seus dados do Firestore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeletePatient} className="bg-red-600 hover:bg-red-700 text-white">
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</div>



            {/* Informações Pessoais */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Informações Pessoais</CardTitle>
                </div>
                <Button
                  onClick={() => setEditInfoOpen(true)}
                  className="bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Editar
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{patient?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p>{patient?.telefone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Nascimento</p>
                  <p>{patient?.birthdate}</p>
                </div>
               
              </CardContent>
            </Card>

            {/* Modal Editar Informações */}
            <Dialog open={editInfoOpen} onOpenChange={setEditInfoOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Informações Pessoais</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-4">
  <div className="grid gap-1">
    <Label>Nome</Label>
    <Input
      value={editData.name}
      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
    />
  </div>

  <div className="grid gap-1">
    <Label>Email</Label>
    <Input
      value={editData.email}
      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
    />
  </div>

  <div className="grid gap-1">
    <Label>Telefone</Label>
    <Input
      value={editData.telefone}
      onChange={(e) => {
        const onlyNumbers = e.target.value.replace(/\D/g, "").slice(0, 11)
        const match = onlyNumbers.match(/^(\d{2})(\d{5})(\d{4})$/)
        const formatted = match ? `(${match[1]}) ${match[2]}-${match[3]}` : onlyNumbers
        setEditData({ ...editData, telefone: formatted })
      }}
      placeholder="(99) 99999-9999"
    />
  </div>

  <div className="grid gap-1">
    <Label>Data de Nascimento</Label>
    <Input
      type="date"
      value={editData.birthdate}
      onChange={(e) => setEditData({ ...editData, birthdate: e.target.value })}
    />
  </div>
</div>

                </div>
               <DialogFooter className="mt-4">
  <Button
    type="button"
    onClick={async () => {
      setIsSaving(true)
      await handleSaveInfo()
      setIsSaving(false)
      setInfoParaEditar(null) // Fecha o popup

      toast({
        title: "Sucesso",
        description: "Métrica atualizada com sucesso!",
      })
    }}
    disabled={isSaving}
    className="bg-indigo-600 text-white hover:bg-indigo-700"
  >
    {isSaving ? "Salvando..." : "Salvar"}
  </Button>
</DialogFooter>



              </DialogContent>
            </Dialog>

            {/* Modal Editar Métricas */}
            <Dialog open={editMetricsOpen} onOpenChange={setEditMetricsOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Métricas</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {Object.entries(editMetrics).map(([field, value]) => (
                    <div key={field} className="grid gap-1">
                      <Label>{field}</Label>
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) =>
                          setEditMetrics({ ...editMetrics, [field]: Number(e.target.value) })
                        }
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter className="mt-4">
                  <Button
                    onClick={handleSaveMetrics}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Tabs Início */}
            <Tabs defaultValue="metricas" className="w-full mt-6">
              <TabsList className="grid w-full grid-cols-4 md:w-[600px]">
                <TabsTrigger value="metricas">Métricas</TabsTrigger>
                <TabsTrigger value="dietas">Dietas</TabsTrigger>
                <TabsTrigger value="fotos">Fotos</TabsTrigger>
                <TabsTrigger value="material-individual">Material Individual</TabsTrigger>
              </TabsList>

              {/* Aba Métricas */}
              <TabsContent value="metricas" className="mt-4">
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Histórico de Métricas</CardTitle>
                    <CardDescription>Veja o histórico de medições do paciente</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {patient?.historicoMetricas?.length > 0 ? (
                      <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border">
                <thead className="bg-muted">
  <tr>
    <th className="text-left p-2">Métrica</th>
    {patient.historicoMetricas.map((item: any, index: number) => (
      <th key={index} className="text-center p-2 font-semibold">
        <div className="flex items-center justify-center gap-1">
          <span>
            {item.data && !isNaN(new Date(item.data).getTime())
              ? new Date(item.data).toLocaleDateString("pt-BR")
              : "Sem data"}
          </span>

{/* Botão de editar */}
<Dialog>
  <DialogTrigger asChild>
    <button
      onClick={() => setMetricaParaExcluir(item)}
      className="text-blue-500 hover:text-blue-700 text-xs font-bold leading-none"
      title="Editar esta medição"
    >
      <Pencil className="w-3 h-3" />
    </button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Editar Métrica</DialogTitle>
      <DialogDescription>
        Atualize os valores da medição de <strong>{item.data}</strong>.
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-2 py-2">
  <Label htmlFor="cintura-edit">Cintura (cm)</Label>
  <Input
    id="cintura-edit"
    type="number"
    defaultValue={item.cintura}
    onChange={(e) => (item.cintura = Number(e.target.value))}
  />

  <Label htmlFor="peso-edit">Peso (kg)</Label>
  <Input
    id="peso-edit"
    type="number"
    defaultValue={item.peso}
    onChange={(e) => (item.peso = Number(e.target.value))}
  />

  <Label htmlFor="altura-edit">Altura (cm)</Label>
  <Input
    id="altura-edit"
    type="number"
    defaultValue={item.altura}
    onChange={(e) => (item.altura = Number(e.target.value))}
  />

  <Label htmlFor="gorduraPercentual-edit">% Gordura</Label>
  <Input
    id="gorduraPercentual-edit"
    type="number"
    defaultValue={item.gorduraPercentual}
    onChange={(e) => (item.gorduraPercentual = Number(e.target.value))}
  />

  <Label htmlFor="imc-edit">IMC</Label>
  <Input
    id="imc-edit"
    type="number"
    defaultValue={item.imc}
    onChange={(e) => (item.imc = Number(e.target.value))}
  />

  <Label htmlFor="rcq-edit">RCQ</Label>
  <Input
    id="rcq-edit"
    type="number"
    defaultValue={item.rcq}
    onChange={(e) => (item.rcq = Number(e.target.value))}
  />
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto py-2 pr-2">
  <div>
    <Label htmlFor="cintura-edit">Cintura (cm)</Label>
    <Input id="cintura-edit" type="number" defaultValue={item.cintura} onChange={(e) => (item.cintura = Number(e.target.value))} />
  </div>

  <div>
    <Label htmlFor="peso-edit">Peso (kg)</Label>
    <Input id="peso-edit" type="number" defaultValue={item.peso} onChange={(e) => (item.peso = Number(e.target.value))} />
  </div>

  <div>
    <Label htmlFor="altura-edit">Altura (cm)</Label>
    <Input id="altura-edit" type="number" defaultValue={item.altura} onChange={(e) => (item.altura = Number(e.target.value))} />
  </div>

  <div>
    <Label htmlFor="gordura-edit">% Gordura</Label>
    <Input id="gordura-edit" type="number" defaultValue={item.gorduraPercentual} onChange={(e) => (item.gorduraPercentual = Number(e.target.value))} />
  </div>

  <div>
    <Label htmlFor="imc-edit">IMC</Label>
    <Input id="imc-edit" type="number" defaultValue={item.imc} onChange={(e) => (item.imc = Number(e.target.value))} />
  </div>

  <div>
    <Label htmlFor="rcq-edit">RCQ</Label>
    <Input id="rcq-edit" type="number" defaultValue={item.rcq} onChange={(e) => (item.rcq = Number(e.target.value))} />
  </div>
</div>



    <DialogFooter className="mt-4">
      <Button
        onClick={async () => {
          const ref = doc(db, "nutricionistas", session.user.email, "pacientes", id)
          const historicoAtualizado = patient.historicoMetricas.map((metrica: any) =>
            metrica.data === item.data ? item : metrica
          )
          await updateDoc(ref, { historicoMetricas: historicoAtualizado })
          setPatient((prev: any) => ({
            ...prev,
            historicoMetricas: historicoAtualizado,
          }))
          toast({ title: "Métrica atualizada com sucesso" })
        }}
        className="bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        Salvar Alterações
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* Botão de excluir */}
<AlertDialog>
  <AlertDialogTrigger asChild>
    <button
      onClick={() => setMetricaParaExcluir(item)}
      className="text-red-500 hover:text-red-700 text-xs font-bold leading-none"
      title="Excluir esta medição"
    >
      ×
    </button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Excluir Métrica</AlertDialogTitle>
      <AlertDialogDescription>
        Tem certeza que deseja excluir a métrica do dia {item.data}?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        className="bg-red-600 hover:bg-red-700 text-white"
        onClick={() => {
          excluirMetrica(item.data)
          setMetricaParaExcluir(null)
        }}
      >
        Excluir
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

         

        </div>
      </th>
    ))}
  </tr>
</thead>


                        <tbody>
                          
{[
  { label: "Peso atual (Kg)", key: "peso" },
  { label: "Altura atual (cm)", key: "altura" },
  { label: "Cintura (cm)", key: "cintura" },
  { label: "Quadril (cm)", key: "quadril" },
  { label: "Braço (cm)", key: "braco" },
  { label: "IMC (Kg/m²)", key: "imc" },
  { label: "Classificação do IMC", key: "classificacaoImc" },
  { label: "RCQ", key: "rcq" },
  { label: "Risco por RCQ", key: "riscoRcq" },
  { label: "CMB (cm)", key: "cmb" },
  { label: "Classificação CMB", key: "classificacaoCmb" },
  { label: "Gordura (%)", key: "gorduraPercentual" },
  { label: "% de Gordura", key: "classificacaoGordura" },
  { label: "Massa de Gordura (Kg)", key: "massaGordura" },
  { label: "Massa Residual (Kg)", key: "massaResidual" },
  { label: "Massa livre de gordura (Kg)", key: "massaLivreGordura" },
  { label: "Somatório de dobras (mm)", key: "somatorioDobras" },
  { label: "Densidade Corporal (g/mL)", key: "densidadeCorporal" },
].map(({ label, key }) => (
  <tr key={key} className="border-b hover:bg-muted/50">
    <td className="p-2 font-medium">{label}</td>
    {patient.historicoMetricas.map((item: any, index: number) => (
      <td key={index} className="p-2 text-center">
  {item[key] === 0 || item[key] === "" || item[key] == null ? "-" : item[key]}
</td>

    ))}
  </tr>
))}
                        </tbody>
                      </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma métrica registrada ainda.</p>
                    )}
                  </CardContent>
                </Card>
                {/* Formulário Nova Medição */}
                <Card>
                  <CardHeader>
                    <CardTitle>Nova Medição</CardTitle>
                    <CardDescription>Preencha os campos para adicionar uma nova medição</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4 max-w-xl mx-auto">
                      <div className="grid gap-2">
                        <Label>Data da Medição</Label>
                        <Input
                          type="date"
                          value={dataNovaMetrica}
                          onChange={(e) => setDataNovaMetrica(e.target.value)}
                        />
                      </div>

                      {/* Campos da Nova Medição - Organizados em grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Peso */}
                        <div className="grid gap-2">
                          <Label>Peso</Label>
                          <Input
                            type="text"
                            placeholder="70,5 kg"
                            value={pesoNovo.replace('.', ',')}
                            onChange={(e) => setPesoNovo(e.target.value.replace(',', '.'))}
                          />
                        </div>
                        {/* Altura */}
                        <div className="grid gap-2">
                          <Label>Altura</Label>
                          <Input
                            type="text"
                            placeholder="170 cm"
                            value={alturaNova.replace('.', ',')}
                            onChange={(e) => setAlturaNova(e.target.value.replace(',', '.'))}
                          />
                        </div>
                        {/* Cintura - Adicionado como input para cálculo de RCQ */}
                        <div className="grid gap-2">
                          <Label>Cintura</Label>
                          <Input
                            type="text"
                            placeholder="82 cm"
                            value={cinturaNovo.replace('.', ',')}
                            onChange={(e) => setCinturaNovo(e.target.value.replace(',', '.'))}
                          />
                        </div>
                        {/* Quadril - Adicionado como input para cálculo de RCQ */}
                        <div className="grid gap-2">
                          <Label>Quadril</Label>
                          <Input
                            type="text"
                            placeholder="95 cm"
                            value={quadrilNovo.replace('.', ',')}
                            onChange={(e) => setQuadrilNovo(e.target.value.replace(',', '.'))}
                          />
                        </div>
                        {/* Braço - Adicionado como input para cálculo de CMB */}
                        <div className="grid gap-2">
                          <Label>Braço</Label>
                          <Input
                            type="text"
                            placeholder="30 cm"
                            value={bracoNovo.replace('.', ',')}
                            onChange={(e) => setBracoNovo(e.target.value.replace(',', '.'))}
                          />
                        </div>
                        {/* Gordura Percentual */}
                        <div className="grid gap-2">
                          <Label>Gordura</Label>
                          <Input
                            type="text"
                            placeholder="22,5 %"
                            value={gorduraPercentualNovoInput.replace('.', ',')}
                            onChange={(e) => setGorduraPercentualNovoInput(e.target.value.replace(',', '.'))}
                          />
                        </div>
                        {/* Somatório de Dobras */}
                        <div className="grid gap-2">
                          <Label>Somatório de Dobras</Label>
                          <Input
                            type="text"
                            placeholder="120 mm"
                            value={somatorioDobrasNovo.replace('.', ',')}
                            onChange={(e) => setSomatorioDobrasNovo(e.target.value.replace(',', '.'))}
                          />
                        </div>
                        {/* Densidade Corporal */}
                        <div className="grid gap-2">
                          <Label>Densidade Corporal</Label>
                          <Input
                            type="text"
                            placeholder="1,07 g/mL"
                            value={densidadeCorporalNovoInput.replace('.', ',')}
                            onChange={(e) => setDensidadeCorporalNovoInput(e.target.value.replace(',', '.'))}
                          />
                        </div>

                        {/* CAMPOS CALCULADOS - DESABILITADOS */}
                        {/* IMC */}
                        <div className="grid gap-2">
                          <Label>IMC</Label>
                          <Input
                            type="text"
                            placeholder="Calculado"
                            value={imcNovo}
                            disabled // Desabilitado
                          />
                        </div>
                        {/* Classificação IMC */}
                        <div className="grid gap-2">
                          <Label>Classificação IMC</Label>
                          <Input
                            type="text"
                            placeholder="Calculado"
                            value={classificacaoImcNovo}
                            disabled // Desabilitado
                          />
                        </div>
                        {/* RCQ */}
                        <div className="grid gap-2">
                          <Label>RCQ</Label>
                          <Input
                            type="text"
                            placeholder="Calculado"
                            value={rcqNovo}
                            disabled // Desabilitado
                          />
                        </div>
                        {/* Risco por RCQ */}
                        <div className="grid gap-2">
                          <Label>Risco por RCQ</Label>
                          <Input
                            type="text"
                            placeholder="Calculado"
                            value={riscoRcqNovo}
                            disabled // Desabilitado
                          />
                        </div>
                        {/* CMB */}
                        <div className="grid gap-2">
                          <Label>CMB</Label>
                          <Input
                            type="text"
                            placeholder="Calculado"
                            value={cmbNovo}
                            disabled // Desabilitado
                          />
                        </div>
                        {/* Classificação CMB */}
                        <div className="grid gap-2">
                          <Label>Classificação CMB</Label>
                          <Input
                            type="text"
                            placeholder="Calculado"
                            value={classificacaoCmbNovo}
                            disabled // Desabilitado
                          />
                        </div>
                        {/* Classificação Gordura */}
                        <div className="grid gap-2">
                          <Label>Classificação Gordura</Label>
                          <Input
                            type="text"
                            placeholder="Calculado"
                            value={classificacaoGorduraNovo}
                            disabled // Desabilitado
                          />
                        </div>
                        {/* Massa de Gordura */}
                        <div className="grid gap-2">
                          <Label>Massa de Gordura</Label>
                          <Input
                            type="text"
                            placeholder="Calculado"
                            value={massaGorduraNovo}
                            disabled // Desabilitado
                          />
                        </div>
                        {/* Massa Residual */}
                        <div className="grid gap-2">
                          <Label>Massa Residual</Label>
                          <Input
                            type="text"
                            placeholder="Calculado"
                            value={massaResidualNovo}
                            disabled // Desabilitado
                          />
                        </div>
                        {/* Massa Livre de Gordura */}
                        <div className="grid gap-2">
                          <Label>Massa Livre de Gordura</Label>
                          <Input
                            type="text"
                            placeholder="Calculado"
                            value={massaLivreGorduraNovo}
                            disabled // Desabilitado
                          />
                        </div>
                      </div>

                      {/* Botão Salvar Medição - Ajustado para ter o mesmo tamanho do Excluir Paciente */}
                      <div className="flex justify-center mt-4">
                        <div className="w-full md:w-3/5 lg:w-1/2 xl:w-2/5">
                          <Button
                            onClick={salvarNovaMetrica}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            Salvar Medição
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Dietas */}
              <TabsContent value="dietas" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Enviar Nova Dieta</CardTitle>
                    <CardDescription>Faça upload de dietas em PDF para o paciente</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleReplaceDiet}>
                      <div className="flex flex-col gap-4 max-w-xl mx-auto">
                        <div className="grid gap-2">
                          <Label>Nome da Dieta</Label>
                          <Input
                            placeholder="Ex: Dieta de Emagrecimento - Maio 2025"
                            value={nomeDieta}
                            onChange={(e) => setNomeDieta(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Arquivo PDF</Label>
                          <div className="flex items-center justify-center w-full">
                            <label
                              htmlFor="pdf-upload"
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 dark:border-gray-600"
                            >
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground">
                                  Clique para fazer upload ou arraste o arquivo
                                </p>
                                <p className="text-xs text-muted-foreground">PDF (Máx 10MB)</p>
                              </div>
                              <input
                                id="pdf-upload"
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setSelectedPDF(file);
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        {selectedPDF && (
                          <p className="text-sm text-green-600">{selectedPDF.name}</p>
                        )}
                        {/* Botão Enviar Dieta - Ajustado para ter o mesmo tamanho */}
                        <div className="flex justify-center mt-4">
                          <div className="w-full md:w-3/5 lg:w-1/2 xl:w-2/5">
                            <Button
                              type="submit"
                              className={`w-full text-white ${submitButtonColorClass}`}
                              disabled={!selectedPDF || isSubmittingDiet}
                            >
                              {submitButtonText}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>
                {patient?.dietas?.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Dietas Enviadas</CardTitle>
                      <CardDescription>Visualize as dietas já enviadas para este paciente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {patient.dietas.map((dieta: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                            <div className="flex items-center gap-4">
                              <FileText className="h-5 w-5 text-indigo-600" />
                              <div>
                                <p className="font-medium">{dieta.nomeDieta || dieta.nome}</p>
                                <p className="text-sm text-muted-foreground">Enviado em: {dieta.dataEnvio}</p>
                              </div>
                            </div>
                            <Link href={dieta.url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                Visualizar
                              </Button>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Aba Fotos */}
              <TabsContent value="fotos" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Enviar Fotos de Acompanhamento</CardTitle>
                    <CardDescription>Envie até 3 fotos para registrar o progresso do paciente</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUploadPhotos}>
                      <div className="flex flex-col gap-4 max-w-xl mx-auto">
                        <div className="grid w-full gap-2">
                          <Label>Data das Fotos</Label>
                          <Input type="date" />
                        </div>
                        <div className="grid w-full gap-2">
                          <Label>Descrição (Opcional)</Label>
                          <Input placeholder="Ex: Fotos da primeira semana" />
                        </div>
                        <div className="grid w-full gap-2">
                          <Label>Fotos (Máximo 3)</Label>
                          <div className="flex items-center justify-center w-full">
                            <label
                              htmlFor="photo-upload"
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 dark:border-gray-600"
                            >
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground">
                                  Clique para selecionar até 3 fotos
                                </p>
                                <p className="text-xs text-muted-foreground">JPG, PNG (Máx 5MB por foto)</p>
                              </div>
                              <input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                multiple
                                onChange={handlePhotoChange}
                              />
                            </label>
                          </div>
                        </div>
                        {selectedPhotos.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedPhotos.map((file, index) => (
                              <span key={index} className="text-sm text-blue-600">
                                {file.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Botão Enviar Fotos - Ajustado para ter o mesmo tamanho */}
                        <div className="flex justify-center mt-4">
                          <div className="w-full md:w-3/5 lg:w-1/2 xl:w-2/5">
                            <Button
                              type="submit"
                              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                              disabled={selectedPhotos.length === 0}
                            >
                              Enviar Fotos
                            </Button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>
                {patient?.fotos?.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Histórico de Fotos</CardTitle>
                      <CardDescription>Visualize as fotos de acompanhamento do paciente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {patient.fotos.map((fotoGroup: any, groupIndex: number) => (
                          <div key={groupIndex} className="border rounded-lg p-4">
                            <p className="text-sm font-medium mb-2">Data: {fotoGroup.data}</p>
                            <div className="grid grid-cols-1 gap-2">
                              {fotoGroup.urls.map((url: string, urlIndex: number) => (
                                <Image
                                  key={urlIndex}
                                  src={url}
                                  alt={`Foto ${groupIndex + 1}-${urlIndex + 1}`}
                                  width={200}
                                  height={200}
                                  className="rounded-md object-cover w-full h-auto"
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* NOVA ABA: Material Individual */}
              <TabsContent value="material-individual" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Enviar Material Individual</CardTitle>
                    <CardDescription>Faça upload de PDFs específicos para este paciente.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUploadIndividualMaterial}>
                      <div className="flex flex-col gap-4 max-w-xl mx-auto">
                        <div className="grid gap-2">
                          <Label>Nome do Material</Label>
                          <Input
                            placeholder="Ex: Exercícios para Casa - Semana 1"
                            value={nomeMaterialIndividual}
                            onChange={(e) => setNomeMaterialIndividual(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Arquivo PDF</Label>
                          <div className="flex items-center justify-center w-full">
                            <label
                              htmlFor="individual-pdf-upload"
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 dark:border-gray-600"
                            >
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground">
                                  Clique para fazer upload ou arraste o arquivo
                                </p>
                                <p className="text-xs text-muted-foreground">PDF (Máx 10MB)</p>
                              </div>
                              <input
                                id="individual-pdf-upload"
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setSelectedIndividualPDF(file);
                                }}
                              />
                            </label>
                          </div>
                        </div>
                        {selectedIndividualPDF && (
                          <p className="text-sm text-green-600">{selectedIndividualPDF.name}</p>
                        )}
                        {/* Botão Enviar Material Individual - Ajustado para ter o mesmo tamanho */}
                        <div className="flex justify-center mt-4">
                          <div className="w-full md:w-3/5 lg:w-1/2 xl:w-2/5">
                            <Button
                              type="submit"
                              className={`w-full text-white ${submitIndividualMaterialColorClass}`}
                              disabled={!selectedIndividualPDF || isSubmittingIndividualMaterial}
                            >
                              {submitIndividualMaterialText}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Lista de Materiais Individuais Enviados */}
                {individualMaterials.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Materiais Individuais Enviados</CardTitle>
                      <CardDescription>Visualize e gerencie os materiais enviados para este paciente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {individualMaterials.map((material: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                            <div className="flex items-center gap-4">
                              <FileText className="h-5 w-5 text-indigo-600" />
                              <div>
                                <p className="font-medium">{material.nome}</p>
                                <p className="text-sm text-muted-foreground">Enviado em: {material.dataEnvio}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Link href={material.url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">
                                  Visualizar
                                </Button>
                              </Link>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    Excluir
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este material individual? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteIndividualMaterial(material)}
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            
          </div> {/* Fim do div de controle de largura principal */}
        </main>
      </div>
    </div>
  )
}

// Componente SidebarLinks extraído para consistência
function SidebarLinks({ pathname, t }: { pathname: string, t: any }) {
  const links = [
    { href: "/", label: t("dashboard"), icon: Home },
    { href: "/pacientes", label: t("patients"), icon: Users },
    { href: "/materiais", label: "Materiais", icon: FileText },
    { href: "/financeiro", label: "Financeiro", icon: LineChart },
    { href: "/perfil", label: t("profile"), icon: Users },
  ]

  return (
    <>
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
            pathname === href || pathname.startsWith(`${href}/`)
              ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </>
  )
}
