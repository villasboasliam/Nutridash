"use client"

/* ---------------------------------------------------------------------------------------
 * PatientDetailPage_full.tsx (atualizado)
 * Mudanças:
 * (1) Data padrão hoje quando vazia
 * (2) Histórico com carrossel de 5 colunas (ordem: antiga → nova)
 * (3) Campos de dobras exibidos conforme protocolo selecionado
 * (4) Três blocos com borda: Métricas básicas / Dobras / Resultados
 * (5) % massa gorda e % massa livre salvos e gráfico empilhado no histórico
 * -------------------------------------------------------------------------------------*/

import {
  getDocs,
  collection,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from "firebase/firestore"
import { useState, useEffect, useCallback, useMemo } from "react"
import { usePathname, useRouter, useParams } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db, storage } from "@/lib/firebase"
import Link from "next/link"
import Image from "next/image"
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogDescription, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import { ArrowLeft, Camera, FileText, Home, LineChart, Menu, Upload, Users, Trash, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Label } from "@/components/ui/label"
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

// 📊 Recharts p/ gráfico empilhado
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"

// ---------------------------------------------------------------------------------------
// Tipos auxiliares
// ---------------------------------------------------------------------------------------

type MetricaEntry = {
  data: string
  peso?: number
  altura?: number
  cintura?: number
  quadril?: number
  braco?: number
  imc?: number
  classificacaoImc?: string
  rcq?: number
  riscoRcq?: string
  cmb?: number
  classificacaoCmb?: string
  gorduraPercentual?: number
  classificacaoGordura?: string
  massaGordura?: number
  massaResidual?: number
  massaLivreGordura?: number
  massaGorduraPercent?: number
  massaLivreGorduraPercent?: number
  somatorioDobras?: number
  densidadeCorporal?: number
  dobras?: {
    tricipital?: number
    bicipital?: number
    abdominal?: number
    subescapular?: number
    axilarMedia?: number
    coxa?: number
    toracica?: number
    suprailiaca?: number
    panturrilha?: number
    supraespinhal?: number
    formula?: "POLLOCK3"|"POLLOCK7"|"DURNIN"|"FAULKNER"|"PETROSKI"|"GUEDES"|"NONE"
    metodoPercentual?: "SIRI"|"BROZEK"
  }
}

type SkinfoldKey =
  | "tricipital"
  | "bicipital"
  | "abdominal"
  | "subescapular"
  | "axilarMedia"
  | "coxa"
  | "toracica"
  | "suprailiaca"
  | "panturrilha"
  | "supraespinhal"

// ---------------------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------------------

export default function PatientDetailPage() {
  const [isDietUploaded, setIsDietUploaded] = useState(false);
  const [isPhotosUploaded, setIsPhotosUploaded] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null);
  const [nomeDieta, setNomeDieta] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [tipoFoto, setTipoFoto] = useState("Foto Frontal");

  // Material Individual
  const [selectedIndividualPDF, setSelectedIndividualPDF] = useState<File | null>(null);
  const [nomeMaterialIndividual, setNomeMaterialIndividual] = useState("");
  const [individualMaterials, setIndividualMaterials] = useState<any[]>([]);
  const [isSubmittingIndividualMaterial, setIsSubmittingIndividualMaterial] = useState(false);
  const [submitIndividualMaterialText, setSubmitIndividualMaterialText] = useState('Enviar Material');
  const [submitIndividualMaterialColorClass, setSubmitIndividualMaterialColorClass] = useState('bg-indigo-600 hover:bg-indigo-700');

  const [metricas, setMetricas] = useState<any[]>([]);
  const params = useParams()
  const id = decodeURIComponent(params?.id as string)
  const pathname = usePathname()
  const router = useRouter()
  const [user, loading] = useAuthState(auth)
  const { t } = useLanguage()
  const { toast } = useToast()
  const [showReplaceDietButton, setShowReplaceDietButton] = useState(false);
  const [patient, setPatient] = useState<any | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [dataNovaMetrica, setDataNovaMetrica] = useState("")
  const [infoParaEditar, setInfoParaEditar] = useState<any>(null)
  const [metricaEditando, setMetricaEditando] = useState<any>(null)
  const [metricaParaExcluir, setMetricaParaExcluir] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false)

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [editInfoOpen, setEditInfoOpen] = useState(false)
  const [editMetricsOpen, setEditMetricsOpen] = useState(false)
  const [isSubmittingDiet, setIsSubmittingDiet] = useState(false);
  const [submitButtonText, setSubmitButtonText] = useState('Enviar Dieta');
  const [submitButtonColorClass, setSubmitButtonColorClass] = useState('bg-indigo-600 hover:bg-indigo-700');

  // Estados para edição de informações
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    telefone: "",
    birthdate: "",
    valorConsulta: "",
  })

  useEffect(() => {
    if (patient) {
      setEditData({
        name: patient.nome || "",
        email: patient.email || "",
        telefone: patient.telefone || "",
        birthdate: patient.birthdate || "",
        valorConsulta: patient.valorConsulta || "",
      });
    }
  }, [patient]);

  // Estados de métricas simples (mantidos)
  const [editMetrics, setEditMetrics] = useState({
    peso: 0,
    altura: 0,
    gordura: 0,
    massaMagra: 0,
    cintura: 0,
  })

  // --- Entradas base para nova medição
  const [pesoNovo, setPesoNovo] = useState("")
  const [alturaNova, setAlturaNova] = useState("")
  const [cinturaNovo, setCinturaNovo] = useState("")
  const [quadrilNovo, setQuadrilNovo] = useState("")
  const [bracoNovo, setBracoNovo] = useState("")
  const [gorduraPercentualNovoInput, setGorduraPercentualNovoInput] = useState("")
  const [somatorioDobrasNovo, setSomatorioDobrasNovo] = useState("")
  const [densidadeCorporalNovoInput, setDensidadeCorporalNovoInput] = useState("")
  const [erroNomeDieta, setErroNomeDieta] = useState(false);

  // --- Campos calculados (mantidos + novos %)
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
  const [massaGorduraPercentNovo, setMassaGorduraPercentNovo] = useState("")
  const [massaLivreGorduraPercentNovo, setMassaLivreGorduraPercentNovo] = useState("")

  // === Dobras & Fórmulas (NOVO) ===
  const [skinfolds, setSkinfolds] = useState<Record<SkinfoldKey, string>>({
    tricipital: "", bicipital: "", abdominal: "", subescapular: "",
    axilarMedia: "", coxa: "", toracica: "", suprailiaca: "",
    panturrilha: "", supraespinhal: "",
  })
  const [formulaDobras, setFormulaDobras] = useState<
    "POLLOCK3"|"POLLOCK7"|"DURNIN"|"FAULKNER"|"PETROSKI"|"GUEDES"|"NONE"
  >("NONE")
  const [densidadeCorporalCalc, setDensidadeCorporalCalc] = useState("")
  const [gorduraPercentualPorDobras, setGorduraPercentualPorDobras] = useState("")
  const [metodoPercentual, setMetodoPercentual] = useState<"SIRI"|"BROZEK">("SIRI")

  // Carrossel do histórico (mostra 5 colunas)
  const [histStart, setHistStart] = useState(0)
  const HIST_WINDOW = 5

  // -------------------------------------------------------------------------------------
  // Utils
  // -------------------------------------------------------------------------------------
  const parseNumber = (value: string) => {
    const cleanedValue = value.replace(',', '.');
    return isNaN(Number(cleanedValue)) || cleanedValue.trim() === '' ? 0 : Number(cleanedValue);
  };
  const formatTelefone = (telefone: string) => {
    const cleaned = telefone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;

    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;

    } else {
      return telefone;
    }
  };

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

  const classifyRCQ = useCallback((rcq: number, sexo: string = 'feminino') => {
    if (rcq === 0) return "";
    if ((sexo || '').toLowerCase().startsWith('f')) {
      if (rcq < 0.80) return "Baixo";
      if (rcq >= 0.80 && rcq <= 0.84) return "Moderado";
      return "Alto";
    } else {
      if (rcq < 0.90) return "Baixo";
      if (rcq >= 0.90 && rcq <= 0.99) return "Moderado";
      return "Alto";
    }
  }, []);

  const calculateCMB = useCallback((braco: number) => {
    return braco;
  }, []);

  const classifyCMB = useCallback((cmb: number) => {
    if (cmb === 0) return "";
    if (cmb < 23) return "Baixo";
    if (cmb >= 23 && cmb <= 29) return "Normal";
    return "Alto";
  }, []);

  const classifyGordura = useCallback((g: number) => {
    if (g === 0) return "";
    if (g < 10) return "Muito Baixo";
    if (g >= 10 && g <= 20) return "Adequado";
    if (g > 20 && g <= 25) return "Moderado";
    return "Elevado";
  }, []);

  const calculateMassaGordura = useCallback((gPercent: number, peso: number) => {
    if (gPercent === 0 || peso === 0) return 0;
    return (gPercent / 100) * peso;
  }, []);

  const calculateMassaLivreGordura = useCallback((peso: number, massaGordura: number) => {
    if (peso === 0) return 0;
    return peso - (massaGordura || 0);
  }, []);

  const calculateMassaResidual = useCallback((peso: number) => {
    if (peso === 0) return 0;
    return peso * 0.207;
  }, []);

  // === Helpers para fórmulas de dobras ===
  function getAgeFromBirthdate(birth?: string): number | null {
    if (!birth) return null
    const d = new Date(birth + "T12:00:00")
    if (isNaN(d.getTime())) return null
    const now = new Date()
    let age = now.getFullYear() - d.getFullYear()
    const m = now.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
    return age
  }
  function n(v: string) { const s=v?.replace?.(",", ".") ?? ""; const x=Number(s); return isNaN(x)?0:x }
  function toPercentFatFromBD(bd: number, method: "SIRI"|"BROZEK" = "SIRI") {
    if (!bd) return 0
    return method === "SIRI" ? (495 / bd - 450) : (457 / bd - 414.2)
  }
  function bdPollock3(sum3: number, age: number, sexo: string) {
    const m = (sexo||"").toLowerCase().startsWith("m")
    return m
      ? 1.10938 - 0.0008267*sum3 + 0.0000016*sum3*sum3 - 0.0002574*age
      : 1.0994921 - 0.0009929*sum3 + 0.0000023*sum3*sum3 - 0.0001392*age
  }
  function bdPollock7(sum7: number, age: number, sexo: string) {
    const m = (sexo||"").toLowerCase().startsWith("m")
    return m
      ? 1.112 - 0.00043499*sum7 + 0.00000055*sum7*sum7 - 0.00028826*age
      : 1.097 - 0.00046971*sum7 + 0.00000056*sum7*sum7 - 0.00012828*age
  }
  type DMRow = { min:number; max:number; cM:number; mM:number; cF:number; mF:number }
  const DURNIN_TABLE: DMRow[] = [
    {min:17,max:19,cM:1.1620,mM:0.0630,cF:1.1549,mF:0.0678},
    {min:20,max:29,cM:1.1631,mM:0.0632,cF:1.1599,mF:0.0717},
    {min:30,max:39,cM:1.1422,mM:0.0544,cF:1.1423,mF:0.0632},
    {min:40,max:49,cM:1.1620,mM:0.0700,cF:1.1333,mF:0.0612},
    {min:50,max:120,cM:1.1715,mM:0.0779,cF:1.1339,mF:0.0645},
  ]
  function bdDurnin(sum4: number, age: number, sexo: string) {
    if (!sum4 || !age) return 0
    const row = DURNIN_TABLE.find(r => age>=r.min && age<=r.max) ?? DURNIN_TABLE[DURNIN_TABLE.length - 1]
    const male = (sexo||"").toLowerCase().startsWith("m")
    const c = male ? row.cM : row.cF
    const m = male ? row.mM : row.mF
    return c - m * Math.log10(sum4)
  }
  function percentFaulkner(sum4: number) {
    if (!sum4) return 0
    return 0.153 * sum4 + 5.783
  }
  function percentPetroski() { return null }
  function percentGuedes() { return null }

  // Quais dobras mostrar por protocolo
  const skinfoldFieldsForProtocol = useMemo(() => {
    const sexo = (patient?.sexo || "feminino").toLowerCase()
    const male = sexo.startsWith("m")
    switch (formulaDobras) {
      case "POLLOCK3":
        // Homens: peitoral(toracica), abdômen, coxa. Mulheres: tríceps, suprailíaca, coxa
        return male ? (["toracica","abdominal","coxa"] as SkinfoldKey[]) : (["tricipital","suprailiaca","coxa"] as SkinfoldKey[])
      case "POLLOCK7":
        return ["toracica","axilarMedia","tricipital","subescapular","abdominal","suprailiaca","coxa"] as SkinfoldKey[]
      case "DURNIN":
        return ["tricipital","bicipital","subescapular","suprailiaca"] as SkinfoldKey[]
      case "FAULKNER":
        return ["tricipital","subescapular","suprailiaca","abdominal"] as SkinfoldKey[]
      case "PETROSKI":
      case "GUEDES":
      case "NONE":
      default:
        return [] as SkinfoldKey[]
    }
  }, [formulaDobras, patient?.sexo])

  // -------------------------------------------------------------------------------------
  // Efeito: recalcular métricas
  // -------------------------------------------------------------------------------------
  useEffect(() => {
    const peso = parseNumber(pesoNovo);
    const altura = parseNumber(alturaNova);
    const cintura = parseNumber(cinturaNovo);
    const quadril = parseNumber(quadrilNovo);
    const braco = parseNumber(bracoNovo);
    const gorduraPercentualInput = parseNumber(gorduraPercentualNovoInput);

    const calculatedIMC = calculateIMC(peso, altura);
    setImcNovo(calculatedIMC > 0 ? calculatedIMC.toFixed(2).replace('.', ',') : "");
    setClassificacaoImcNovo(classifyIMC(calculatedIMC));

    const calculatedRCQ = calculateRCQ(cintura, quadril);
    setRcqNovo(calculatedRCQ > 0 ? calculatedRCQ.toFixed(2).replace('.', ',') : "");
    setRiscoRcqNovo(classifyRCQ(calculatedRCQ, patient?.sexo));

    const calculatedCMB = calculateCMB(braco);
    setCmbNovo(calculatedCMB > 0 ? calculatedCMB.toFixed(2).replace('.', ',') : "");
    setClassificacaoCmbNovo(classifyCMB(calculatedCMB));

    setClassificacaoGorduraNovo(classifyGordura(gorduraPercentualInput));

    const calculatedMassaGordura = calculateMassaGordura(gorduraPercentualInput, peso);
    setMassaGorduraNovo(calculatedMassaGordura > 0 ? calculatedMassaGordura.toFixed(2).replace('.', ',') : "");

    const calculatedMassaLivreGordura = calculateMassaLivreGordura(peso, calculatedMassaGordura);
    setMassaLivreGorduraNovo(calculatedMassaLivreGordura > 0 ? calculatedMassaLivreGordura.toFixed(2).replace('.', ',') : "");

    const calculatedMassaResidual = calculateMassaResidual(peso);
    setMassaResidualNovo(calculatedMassaResidual > 0 ? calculatedMassaResidual.toFixed(2).replace('.', ',') : "");

    // % massa gorda / % massa livre (100%)
    let percMG = 0, percMLG = 0
    if (peso > 0) {
      percMG = (calculatedMassaGordura / peso) * 100
      percMLG = Math.max(0, 100 - percMG)
    }
    setMassaGorduraPercentNovo(percMG > 0 ? percMG.toFixed(1).replace('.', ',') : "")
    setMassaLivreGorduraPercentNovo(percMLG > 0 ? percMLG.toFixed(1).replace('.', ',') : "")

    // === Dobras → BD e %G ===
    const idade = getAgeFromBirthdate(patient?.birthdate) ?? 0
    const sexo = patient?.sexo || "feminino"
    const d = {
      tricipital: n(skinfolds.tricipital),
      bicipital: n(skinfolds.bicipital),
      abdominal: n(skinfolds.abdominal),
      subescapular: n(skinfolds.subescapular),
      axilarMedia: n(skinfolds.axilarMedia),
      coxa: n(skinfolds.coxa),
      toracica: n(skinfolds.toracica),
      suprailiaca: n(skinfolds.suprailiaca),
      panturrilha: n(skinfolds.panturrilha),
      supraespinhal: n(skinfolds.supraespinhal),
    }
    let bd = 0, fat = 0
    switch (formulaDobras) {
      case "POLLOCK3": {
        const sum3 = (sexo.toLowerCase().startsWith("m"))
          ? (d.toracica + d.abdominal + d.coxa)
          : (d.tricipital + d.suprailiaca + d.coxa)
        if (sum3>0 && idade>0) {
          bd = bdPollock3(sum3, idade, sexo)
          fat = toPercentFatFromBD(bd, metodoPercentual)
        }
        break
      }
      case "POLLOCK7": {
        const sum7 = d.toracica + d.axilarMedia + d.tricipital + d.subescapular + d.abdominal + d.suprailiaca + d.coxa
        if (sum7>0 && idade>0) {
          bd = bdPollock7(sum7, idade, sexo)
          fat = toPercentFatFromBD(bd, metodoPercentual)
        }
        break
      }
      case "DURNIN": {
        const sum4 = d.tricipital + d.bicipital + d.subescapular + d.suprailiaca
        if (sum4>0 && idade>0) {
          bd = bdDurnin(sum4, idade, sexo)
          fat = toPercentFatFromBD(bd, metodoPercentual)
        }
        break
      }
      case "FAULKNER": {
        const sum4 = d.tricipital + d.subescapular + d.suprailiaca + d.abdominal
        if (sum4>0) {
          fat = percentFaulkner(sum4)
          bd = fat ? 495/(fat+450) : 0
        }
        break
      }
      case "PETROSKI": {
        // Não implementado
        break
      }
      case "GUEDES": {
        // Não implementado
        break
      }
      case "NONE": default: {}
    }
    setDensidadeCorporalCalc(bd ? bd.toFixed(3).replace(".", ",") : "")
    setGorduraPercentualPorDobras(fat ? fat.toFixed(1).replace(".", ",") : "")

  }, [
    pesoNovo, alturaNova, cinturaNovo, quadrilNovo, bracoNovo, gorduraPercentualNovoInput,
    calculateIMC, classifyIMC, calculateRCQ, classifyRCQ, calculateCMB, classifyCMB,
    classifyGordura, calculateMassaGordura, calculateMassaLivreGordura, calculateMassaResidual,
    patient?.sexo, patient?.birthdate, skinfolds, formulaDobras, metodoPercentual
  ]);

  // -------------------------------------------------------------------------------------
  // Uploads e operações (mantidos)
  // -------------------------------------------------------------------------------------

  const uploadPhoto = async (file: File, patientId: string, imageName: string) => {
    if (!file) return null;
    const storageRef = ref(storage, `pacientes/${patientId}/fotos/${imageName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  };

  const uploadPDF = async (file: File, patientId: string) => {
    if (!file) return null;
    const storageRef = ref(storage, `pacientes/${patientId}/dietas/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  }

  const uploadIndividualPDF = async (file: File, patientId: string) => {
    if (!file) return null;
    const storageRef = ref(storage, `pacientes/${patientId}/materiais_individuais/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  }

  const handleReplaceDiet = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.email) {
      toast({ title: "Erro de autenticação", description: "Usuário não autenticado. Tente novamente." });
      return;
    }
    const file = selectedPDF;
    if (!file) {
      toast({ title: "Nenhum arquivo selecionado", description: "Por favor, selecione um novo arquivo PDF." });
      return;
    }
    if (!nomeDieta.trim()) {
      setErroNomeDieta(true);
      return;
    } else {
      setErroNomeDieta(false);
    }
    setIsSubmittingDiet(true);
    try {
      const downloadURL = await uploadPDF(file, id);
      const novaDieta = {
        nome: file.name,
        url: downloadURL,
        dataEnvio: new Date().toLocaleDateString("pt-BR"),
        nomeDieta: nomeDieta,
      };
      const refPac = doc(db, "nutricionistas", user.email, "pacientes", id);
      await updateDoc(refPac, { dietas: arrayUnion(novaDieta) });
      setPatient((prev: any) => {
        if (!prev) return prev;
        return { ...prev, dietas: prev.dietas ? [...prev.dietas, novaDieta] : [novaDieta] };
      });
      const statRef = doc(db, "nutricionistas", user.email, "estatisticas", "dietas");
      try {
        const statSnap = await getDoc(statRef);
        if (statSnap.exists()) {
          const atual = statSnap.data().totalDietasEnviadas || 0;
          await updateDoc(statRef, {
            totalDietasEnviadas: atual + 1,
            ultimaAtualizacao: new Date().toISOString(),
          });
        } else {
          await setDoc(statRef, {
            totalDietasEnviadas: 1,
            ultimaAtualizacao: new Date().toISOString(),
          });
        }
      } catch (error) {}
      setIsDietUploaded(true);
      toast({ title: "Dieta Enviada", description: "A dieta foi enviada com sucesso." });
      setSubmitButtonText("Enviado!");
      setSubmitButtonColorClass("bg-green-500 hover:bg-green-600");
      setTimeout(() => {
        setSubmitButtonText("Enviar Dieta");
        setSubmitButtonColorClass("bg-indigo-600 hover:bg-indigo-700");
        setIsSubmittingDiet(false);
      }, 5000);
    } catch (error) {
      console.error("Erro ao substituir a dieta:", error);
      toast({ title: "Erro ao substituir a dieta", description: "Não foi possível substituir o arquivo." });
      setIsSubmittingDiet(false);
    }
  };

  const handleDeletePhoto = async (fotoToDelete: any) => {
    if (!user?.email || !patient) return;
    try {
      const novasFotos = (patient.fotos || []).filter((f: any) => f.url !== fotoToDelete.url)
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id);
      await updateDoc(refPaciente, { fotos: novasFotos });
      if (fotoToDelete.nomeArquivo) {
        const storageRefObj = ref(storage, `pacientes/${id}/fotos/${fotoToDelete.nomeArquivo}`);
        await deleteObject(storageRefObj);
      }
      setPatient((prev: any) => ({ ...prev, fotos: novasFotos }));
      toast({ title: "Foto excluída com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir foto:", error);
      toast({ title: "Erro ao excluir foto", description: "Não foi possível remover a foto." });
    }
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedPhoto(file);
  };

  const handleUploadPhotos = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.email) { toast({ title: "Erro de autenticação", description: "Usuário não autenticado. Tente novamente." }); return; }
    if (!selectedPhoto) { toast({ title: "Nenhuma foto selecionada", description: "Por favor, selecione uma foto." }); return; }
    try {
      const downloadURL = await uploadPhoto(
        selectedPhoto,
        id,
        `${tipoFoto.replace(/\s+/g, "_")}_${Date.now()}`
      );
      const novaFoto = { dataEnvio: new Date().toLocaleDateString("pt-BR"), tipo: tipoFoto, url: downloadURL };
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id);
      await updateDoc(refPaciente, { fotos: arrayUnion(novaFoto) });
      setPatient((prev: any) => ({ ...prev, fotos: prev?.fotos ? [...prev.fotos, novaFoto] : [novaFoto] }));
      toast({ title: "Foto enviada", description: "A foto foi enviada com sucesso." });
      setSelectedPhoto(null);
    } catch (error) {
      console.error("Erro ao enviar foto:", error);
      toast({ title: "Erro ao enviar foto", description: "Não foi possível enviar a foto." });
    }
  };

  const handleUploadIndividualMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.email) { toast({ title: "Erro de autenticação", description: "Usuário não autenticado. Tente novamente." }); return; }
    const file = selectedIndividualPDF;
    if (!file) { toast({ title: "Nenhum arquivo selecionado", description: "Selecione um PDF." }); return; }
    if (!nomeMaterialIndividual.trim()) { toast({ title: "Erro", description: "Informe o nome do material." }); return; }
    setIsSubmittingIndividualMaterial(true);
    try {
      const storageRefPath = `pacientes/${id}/materiais_individuais/${file.name}`;
      const storageRefUpload = ref(storage, storageRefPath);
      const snapshot = await uploadBytes(storageRefUpload, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const novoMaterial = {
        nome: file.name,
        nomeMaterial: nomeMaterialIndividual,
        url: downloadURL,
        dataEnvio: new Date().toLocaleDateString("pt-BR"),
      };
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id);
      await updateDoc(refPaciente, { materiaisIndividuais: arrayUnion(novoMaterial) });
      setPatient((prev: any) => ({
        ...prev,
        materiaisIndividuais: prev?.materiaisIndividuais ? [...prev.materiaisIndividuais, novoMaterial] : [novoMaterial],
      }));
      toast({ title: "Material Individual Enviado", description: "O material individual foi enviado com sucesso." });
      setSubmitIndividualMaterialText("Enviado!");
      setSubmitIndividualMaterialColorClass("bg-green-500 hover:bg-green-600");
      setTimeout(() => {
        setSubmitIndividualMaterialText("Enviar Material");
        setSubmitIndividualMaterialColorClass("bg-indigo-600 hover:bg-indigo-700");
        setIsSubmittingIndividualMaterial(false);
      }, 3000);
      setSelectedIndividualPDF(null);
      setNomeMaterialIndividual("");
    } catch (error) {
      console.error("Erro ao enviar material individual:", error);
      toast({ title: "Erro ao enviar material individual", description: "Não foi possível enviar o arquivo." });
      setIsSubmittingIndividualMaterial(false);
    }
  };

  const handleDeleteIndividualMaterial = async (materialToDelete: any) => {
    if (!user?.email || !patient) return;
    try {
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id);
      await updateDoc(refPaciente, { materiaisIndividuais: arrayRemove(materialToDelete) });
      const storageRefPath = ref(storage, `pacientes/${id}/materiais_individuais/${materialToDelete.nome}`);
      try { await deleteObject(storageRefPath); } catch (e) {}
      setIndividualMaterials(prev => prev.filter(m => m.url !== materialToDelete.url));
      setPatient((prev:any)=> ({
        ...prev,
        materiaisIndividuais: (prev?.materiaisIndividuais || []).filter((m:any)=>m.url!==materialToDelete.url)
      }))
      toast({ title: "Material Individual Excluído", description: "O material foi removido com sucesso." });
    } catch (error) {
      console.error("Erro ao excluir material individual:", error);
      toast({ title: "Erro ao excluir material individual", description: "Não foi possível remover o material." });
    }
  };

  const handleDeleteDiet = async (dietaToDelete: any) => {
    if (!user?.email || !patient) return;
    try {
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id);
      await updateDoc(refPaciente, { dietas: arrayRemove(dietaToDelete) });
      const storageRefPath = ref(storage, `pacientes/${id}/dietas/${dietaToDelete.nome}`);
      try { await deleteObject(storageRefPath); } catch (e) {}
      setPatient((prev: any) => ({ ...prev, dietas: (prev?.dietas || []).filter((d: any) => d.url !== dietaToDelete.url) }));
      toast({ title: "Dieta excluída com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir dieta:", error);
      toast({ title: "Erro ao excluir dieta", description: "Não foi possível remover o arquivo." });
    }
  };

  const fetchPatient = async () => {
    if (!user?.email) return;
    try {
      const refp = doc(db, "nutricionistas", user.email, "pacientes", id);
      const snap = await getDoc(refp);
      if (snap.exists()) {
        const data = snap.data();
        setPatient({ ...data });
        const historico = data.historicoMetricas || [];
        // ✅ Ordena do mais antigo → mais novo
        historico.sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
        setMetricas(historico);
        // Inicia a janela (5 últimas)
        const len = historico.length;
        setHistStart(Math.max(0, len - HIST_WINDOW));
        setIsActive((data.status || "Ativo") === "Ativo")
      }
    } catch (error) {
      console.error("Erro ao buscar paciente ou métricas:", error);
    }
  };
  useEffect(() => { fetchPatient(); /* eslint-disable-next-line */ }, [id, user]);

  const handleSaveInfo = async () => {
    if (!user?.email) return
    const refp = doc(db, "nutricionistas", user.email, "pacientes", id);
    await updateDoc(refp, {
      nome: editData.name,
      telefone: editData.telefone,
      birthdate: editData.birthdate,
      valorConsulta: editData.valorConsulta,
    });
    setPatient((prev: any) => ({ ...prev, ...editData }))
    toast({ title: "Informações atualizadas com sucesso" })
    setEditInfoOpen(false)
  }

  const excluirMetrica = async (data: string) => {
    if (!user?.email || !patient) return;
    const historicoAtualizado = (patient.historicoMetricas || []).filter((metrica: any) => metrica.data !== data);
    const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id);
    try {
      await updateDoc(refPaciente, { historicoMetricas: historicoAtualizado });
      await fetchPatient();
      toast({ title: "Métrica excluída com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir métrica:", error);
      toast({ title: "Erro ao excluir métrica", variant: "destructive" });
    }
  };

  const handleSaveMetrics = async () => {
    if (!user?.email) return
    const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
    await updateDoc(refp, {
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
    if (!user?.email) return
    const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
    await deleteDoc(refp)
    toast({ title: "Paciente excluído", description: "O paciente foi permanentemente deletado." })
    router.push("/pacientes")
  }

  // Data hoje em YYYY-MM-DD
  function todayISO() {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth()+1).padStart(2,"0")
    const dd = String(d.getDate()).padStart(2,"0")
    return `${yyyy}-${mm}-${dd}`
  }

  const salvarNovaMetrica = async () => {
    if (!user?.email || !patient) return;

    // (1) Data padrão → hoje
    const dataFinal = dataNovaMetrica && !isNaN(new Date(dataNovaMetrica).getTime())
      ? dataNovaMetrica
      : todayISO()

    const pesoNum = parseNumber(pesoNovo)
    // %s calculados prontos
    const mgKg = massaGorduraNovo ? Number(massaGorduraNovo.replace(",", ".")) : 0
    const mlgKg = massaLivreGorduraNovo ? Number(massaLivreGorduraNovo.replace(",", ".")) : 0
    const mgPerc = (pesoNum > 0 && mgKg > 0) ? (mgKg / pesoNum) * 100 : 0
    const mlgPerc = (pesoNum > 0 && mlgKg >= 0) ? Math.max(0, 100 - mgPerc) : 0

    const novaMetrica: MetricaEntry = {
      data: dataFinal,
      peso: pesoNum,
      altura: parseNumber(alturaNova),
      cintura: parseNumber(cinturaNovo),
      quadril: parseNumber(quadrilNovo),
      braco: parseNumber(bracoNovo),

      dobras: {
        tricipital: n(skinfolds.tricipital),
        bicipital: n(skinfolds.bicipital),
        abdominal: n(skinfolds.abdominal),
        subescapular: n(skinfolds.subescapular),
        axilarMedia: n(skinfolds.axilarMedia),
        coxa: n(skinfolds.coxa),
        toracica: n(skinfolds.toracica),
        suprailiaca: n(skinfolds.suprailiaca),
        panturrilha: n(skinfolds.panturrilha),
        supraespinhal: n(skinfolds.supraespinhal),
        formula: formulaDobras,
        metodoPercentual,
      },

      somatorioDobras: [
        n(skinfolds.tricipital), n(skinfolds.bicipital), n(skinfolds.abdominal),
        n(skinfolds.subescapular), n(skinfolds.axilarMedia), n(skinfolds.coxa),
        n(skinfolds.toracica), n(skinfolds.suprailiaca), n(skinfolds.panturrilha),
        n(skinfolds.supraespinhal)
      ].filter(v=>v>0).reduce((a,b)=>a+b,0),

      // campos calculados
      imc: (() => {
        const v = calculateIMC(pesoNum, parseNumber(alturaNova))
        return v ? Number(v.toFixed(2)) : undefined
      })(),
      classificacaoImc: (() => {
        const v = calculateIMC(pesoNum, parseNumber(alturaNova))
        return v ? classifyIMC(v) : undefined
      })(),
      rcq: (() => {
        const v = calculateRCQ(parseNumber(cinturaNovo), parseNumber(quadrilNovo))
        return v ? Number(v.toFixed(2)) : undefined
      })(),
      riscoRcq: (() => {
        const v = calculateRCQ(parseNumber(cinturaNovo), parseNumber(quadrilNovo))
        return v ? classifyRCQ(v, patient?.sexo) : undefined
      })(),
      cmb: (() => {
        const v = calculateCMB(parseNumber(bracoNovo))
        return v ? Number(v.toFixed(2)) : undefined
      })(),
      classificacaoCmb: (() => {
        const v = calculateCMB(parseNumber(bracoNovo))
        return v ? classifyCMB(v) : undefined
      })(),

      // gordura %: prioridade -> input manual > cálculo por dobras
      gorduraPercentual: (() => {
        const manual = parseNumber(gorduraPercentualNovoInput)
        if (manual > 0) return Number(manual.toFixed(1))
        const porDobras = (gorduraPercentualPorDobras || "").replace(",", ".")
        const v = Number(porDobras)
        return v > 0 ? Number(v.toFixed(1)) : undefined
      })(),
      classificacaoGordura: (() => {
        const manual = parseNumber(gorduraPercentualNovoInput)
        if (manual > 0) return classifyGordura(manual)
        const porDobras = Number((gorduraPercentualPorDobras || "").replace(",", "."))
        return porDobras > 0 ? classifyGordura(porDobras) : undefined
      })(),

      massaGordura: mgKg ? Number(mgKg.toFixed(2)) : undefined,
      massaResidual: mlgKg || mgKg ? Number(calculateMassaResidual(pesoNum).toFixed(2)) : undefined,
      massaLivreGordura: mlgKg ? Number(mlgKg.toFixed(2)) : undefined,
      massaGorduraPercent: mgPerc ? Number(mgPerc.toFixed(1)) : undefined,
      massaLivreGorduraPercent: mlgPerc ? Number(mlgPerc.toFixed(1)) : (mgPerc ? Number((100 - mgPerc).toFixed(1)) : undefined),

      // densidade corporal: prioridade -> input manual > cálculo por dobras
      densidadeCorporal: (() => {
        const manual = parseNumber(densidadeCorporalNovoInput)
        if (manual > 0) return Number(manual.toFixed(3))
        const bd = Number((densidadeCorporalCalc || "").replace(",", "."))
        return bd > 0 ? Number(bd.toFixed(3)) : undefined
      })(),
    }

    try {
      const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
      const snap = await getDoc(refp)
      const hist: MetricaEntry[] = (snap.exists() ? (snap.data().historicoMetricas || []) : []) as MetricaEntry[]

      // substitui a medição se já houver para a mesma data
      const filtrado = hist.filter(m => m.data !== dataFinal)
      const atualizado = [...filtrado, novaMetrica].sort(
        (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
      )

      await updateDoc(refp, { historicoMetricas: atualizado })

      // atualiza estado local
      setPatient(prev => prev ? { ...prev, historicoMetricas: atualizado } : prev)
      setMetricas(atualizado)
      setHistStart(Math.max(0, atualizado.length - HIST_WINDOW))

      // limpa inputs
      setDataNovaMetrica("")
      setPesoNovo(""); setAlturaNova(""); setCinturaNovo(""); setQuadrilNovo(""); setBracoNovo("")
      setGorduraPercentualNovoInput(""); setSomatorioDobrasNovo(""); setDensidadeCorporalNovoInput("")
      setSkinfolds({
        tricipital: "", bicipital: "", abdominal: "", subescapular: "",
        axilarMedia: "", coxa: "", toracica: "", suprailiaca: "",
        panturrilha: "", supraespinhal: "",
      })

      toast({ title: "Medição salva", description: "Histórico atualizado com sucesso." })
    } catch (e) {
      console.error(e)
      toast({ title: "Erro ao salvar medição", variant: "destructive" })
    }
  }

  // -------------------------------------------------------------------------------------
  // Carrossel de histórico (5 colunas)
  // -------------------------------------------------------------------------------------
  const canPrev = histStart > 0
  const canNext = histStart + HIST_WINDOW < metricas.length
  const goPrev = () => setHistStart(s => (s > 0 ? s - 1 : s))
  const goNext = () => setHistStart(s => (s + HIST_WINDOW < metricas.length ? s + 1 : s))

  const janelaMetricas = useMemo(() => {
    return metricas.slice(histStart, histStart + HIST_WINDOW)
  }, [metricas, histStart])

  // Dados p/ gráfico empilhado (% massa gorda vs % livre)
  const chartData = useMemo(() => {
    return metricas.map(m => {
      const label = (() => {
        // dd/mm
        const d = new Date(m.data + "T12:00:00")
        const dd = String(d.getDate()).padStart(2, "0")
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        return `${dd}/${mm}`
      })()
      const mgp = (m.massaGorduraPercent ?? m.gorduraPercentual) || 0
      const mlgp = m.massaLivreGorduraPercent ?? (mgp ? Math.max(0, 100 - mgp) : 0)
      return { data: label, "Massa gorda (%)": Number(mgp.toFixed(1)), "Massa livre (%)": Number(mlgp.toFixed(1)) }
    })
  }, [metricas])

  // -------------------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------------------
  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <div className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 p-3">
          <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="font-medium">{patient?.nome || "Paciente"}</div>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 p-4">
        {/* ==================== Card: Métricas básicas ==================== */}
        <Card>
          <CardHeader>
            <CardTitle>Métricas básicas</CardTitle>
            <CardDescription>Preencha e os cálculos aparecem automaticamente.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div>
                <Label>Data da medição</Label>
                <Input
                  type="date"
                  value={dataNovaMetrica || ""}
                  onChange={(e) => setDataNovaMetrica(e.target.value)}
                  placeholder={todayISO()}
                />
              </div>
              <div>
                <Label>Peso (kg)</Label>
                <Input value={pesoNovo} onChange={(e)=>setPesoNovo(e.target.value)} placeholder="Ex: 72,4" />
              </div>
              <div>
                <Label>Altura (cm)</Label>
                <Input value={alturaNova} onChange={(e)=>setAlturaNova(e.target.value)} placeholder="Ex: 172" />
              </div>
              <div>
                <Label>Cintura (cm)</Label>
                <Input value={cinturaNovo} onChange={(e)=>setCinturaNovo(e.target.value)} placeholder="Ex: 78" />
              </div>
              <div>
                <Label>Quadril (cm)</Label>
                <Input value={quadrilNovo} onChange={(e)=>setQuadrilNovo(e.target.value)} placeholder="Ex: 96" />
              </div>
              <div>
                <Label>Circ. braço (cm)</Label>
                <Input value={bracoNovo} onChange={(e)=>setBracoNovo(e.target.value)} placeholder="Ex: 29" />
              </div>
            </div>

            {/* Calculados resumidos */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div>
                <Label>IMC</Label>
                <Input value={imcNovo} readOnly />
              </div>
              <div>
                <Label>Class. IMC</Label>
                <Input value={classificacaoImcNovo} readOnly />
              </div>
              <div>
                <Label>RCQ</Label>
                <Input value={rcqNovo} readOnly />
              </div>
              <div>
                <Label>Risco RCQ</Label>
                <Input value={riscoRcqNovo} readOnly />
              </div>
              <div>
                <Label>CMB</Label>
                <Input value={cmbNovo} readOnly />
              </div>
              <div>
                <Label>Class. CMB</Label>
                <Input value={classificacaoCmbNovo} readOnly />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================== Card: Dobras cutâneas ==================== */}
        <Card>
          <CardHeader>
            <CardTitle>Dobras cutâneas</CardTitle>
            <CardDescription>Mostra apenas as dobras do protocolo selecionado.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Protocolo</Label>
                <select
                  className="w-full rounded-md border bg-background p-2"
                  value={formulaDobras}
                  onChange={(e)=>setFormulaDobras(e.target.value as any)}
                >
                  <option value="NONE">—</option>
                  <option value="POLLOCK3">Pollock 3</option>
                  <option value="POLLOCK7">Pollock 7</option>
                  <option value="DURNIN">Durnin & Womersley</option>
                  <option value="FAULKNER">Faulkner</option>
                  <option value="PETROSKI">Petroski</option>
                  <option value="GUEDES">Guedes</option>
                </select>
              </div>
              <div>
                <Label>Método %G</Label>
                <select
                  className="w-full rounded-md border bg-background p-2"
                  value={metodoPercentual}
                  onChange={(e)=>setMetodoPercentual(e.target.value as any)}
                >
                  <option value="SIRI">Siri</option>
                  <option value="BROZEK">Brozek</option>
                </select>
              </div>
              <div>
                <Label>% Gordura (manual)</Label>
                <Input value={gorduraPercentualNovoInput} onChange={(e)=>setGorduraPercentualNovoInput(e.target.value)} placeholder="opcional" />
              </div>
              <div>
                <Label>Densidade (manual)</Label>
                <Input value={densidadeCorporalNovoInput} onChange={(e)=>setDensidadeCorporalNovoInput(e.target.value)} placeholder="opcional" />
              </div>
            </div>

            {/* Campos de dobras conforme protocolo */}
            {skinfoldFieldsForProtocol.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {skinfoldFieldsForProtocol.map((k) => (
                  <div key={k}>
                    <Label className="capitalize">{k}</Label>
                    <Input
                      value={skinfolds[k]}
                      onChange={(e)=>setSkinfolds(s => ({ ...s, [k]: e.target.value }))}
                      placeholder="mm"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Selecione um protocolo acima.</div>
            )}

            {/* Resultados do cálculo por dobras (se houver) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <Label>Densidade (calc.)</Label>
                <Input value={densidadeCorporalCalc} readOnly />
              </div>
              <div>
                <Label>% Gordura (calc.)</Label>
                <Input value={gorduraPercentualPorDobras} readOnly />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ==================== Card: Resultados ==================== */}
        <Card>
          <CardHeader>
            <CardTitle>Resultados</CardTitle>
            <CardDescription>Percentuais salvos e usados no gráfico.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <Label>Massa gorda (kg)</Label>
                <Input value={massaGorduraNovo} readOnly />
              </div>
              <div>
                <Label>Massa livre (kg)</Label>
                <Input value={massaLivreGorduraNovo} readOnly />
              </div>
              <div>
                <Label>Massa residual (kg)</Label>
                <Input value={massaResidualNovo} readOnly />
              </div>
              <div>
                <Label>% Massa gorda</Label>
                <Input value={massaGorduraPercentNovo} readOnly />
              </div>
              <div>
                <Label>% Massa livre</Label>
                <Input value={massaLivreGorduraPercentNovo} readOnly />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={salvarNovaMetrica}>Salvar medição</Button>
            </div>
          </CardContent>
        </Card>

        {/* ==================== Histórico (carrossel 5 colunas) ==================== */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Histórico de medições</CardTitle>
              <CardDescription>Ordem do mais antigo → mais novo. Use as setas para navegar.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" disabled={!canPrev} onClick={goPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" disabled={!canNext} onClick={goNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {janelaMetricas.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem medições ainda.</div>
            ) : (
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[160px_repeat(5,minmax(120px,1fr))] gap-2 border-b pb-2 text-xs font-medium">
                  <div className="text-muted-foreground">Métrica</div>
                  {janelaMetricas.map((m) => (
                    <div key={m.data} className="text-center">{new Date(m.data + "T12:00:00").toLocaleDateString("pt-BR")}</div>
                  ))}
                </div>

                {[
                  { k: "peso", label: "Peso (kg)", fmt: (v: any)=>v?.toFixed?.(1) ?? v },
                  { k: "imc", label: "IMC" },
                  { k: "classificacaoImc", label: "Class. IMC" },
                  { k: "rcq", label: "RCQ" },
                  { k: "riscoRcq", label: "Risco RCQ" },
                  { k: "cmb", label: "CMB" },
                  { k: "classificacaoCmb", label: "Class. CMB" },
                  { k: "gorduraPercentual", label: "% Gordura" },
                  { k: "classificacaoGordura", label: "Class. Gordura" },
                  { k: "massaGorduraPercent", label: "% Massa gorda" },
                  { k: "massaLivreGorduraPercent", label: "% Massa livre" },
                  { k: "densidadeCorporal", label: "Densidade" },
                  { k: "somatorioDobras", label: "Σ Dobras (mm)" },
                ].map(row => (
                  <div key={row.k} className="grid grid-cols-[160px_repeat(5,minmax(120px,1fr))] gap-2 py-2 text-sm">
                    <div className="text-muted-foreground">{row.label}</div>
                    {janelaMetricas.map((m) => {
                      const raw: any = (m as any)[row.k]
                      const val = typeof row.fmt === "function" ? row.fmt(raw) : raw
                      return (
                        <div key={m.data+"-"+row.k} className="text-center">
                          {val ?? "-"}
                        </div>
                      )
                    })}
                  </div>
                ))}

                {/* Ações por medição */}
                <div className="grid grid-cols-[160px_repeat(5,minmax(120px,1fr))] gap-2 py-2 text-sm">
                  <div className="text-muted-foreground">Ações</div>
                  {janelaMetricas.map((m) => (
                    <div key={m.data+"-actions"} className="flex items-center justify-center">
                      <Button variant="destructive" size="sm" onClick={()=>excluirMetrica(m.data)}>
                        <Trash className="mr-1 h-4 w-4" /> Excluir
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ==================== Gráfico empilhado (% massa) ==================== */}
        <Card>
          <CardHeader>
            <CardTitle>Composição corporal (%)</CardTitle>
            <CardDescription>Percentual de massa gorda e livre ao longo do tempo.</CardDescription>
          </CardHeader>
          <CardContent style={{ width: "100%", height: 360 }}>
            {chartData.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem dados suficientes para o gráfico.</div>
            ) : (
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Massa gorda (%)" stackId="a" />
                  <Bar dataKey="Massa livre (%)" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
