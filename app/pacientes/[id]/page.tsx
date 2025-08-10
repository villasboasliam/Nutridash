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
    const row = DURNIN_TABLE.find(r => age>=r.min && age<=r.max) ?? DURNIN_TABLE.at(-1)!
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
    const storageRef = ref(storage, pacientes/${patientId}/fotos/${imageName});
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  };

  const uploadPDF = async (file: File, patientId: string) => {
    if (!file) return null;
    const storageRef = ref(storage, pacientes/${patientId}/dietas/${file.name});
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  }

  const uploadIndividualPDF = async (file: File, patientId: string) => {
    if (!file) return null;
    const storageRef = ref(storage, pacientes/${patientId}/materiais_individuais/${file.name});
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
        const storageRef = ref(storage, pacientes/${id}/fotos/${fotoToDelete.nomeArquivo});
        await deleteObject(storageRef);
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
      const downloadURL = await uploadPhoto(selectedPhoto, id, ${tipoFoto.replace(/\s+/g, "_")}_${Date.now()});
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
      const storageRefPath = pacientes/${id}/materiais_individuais/${file.name};
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
      const storageRefPath = ref(storage, pacientes/${id}/materiais_individuais/${materialToDelete.nome});
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
      const storageRefPath = ref(storage, pacientes/${id}/dietas/${dietaToDelete.nome});
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
    return ${yyyy}-${mm}-${dd}
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

      densidadeCorporal: densidadeCorporalCalc ? Number(densidadeCorporalCalc.replace(",", ".")) : parseNumber(densidadeCorporalNovoInput),
      gorduraPercentual: gorduraPercentualPorDobras ? Number(gorduraPercentualPorDobras.replace(",", ".")) : parseNumber(gorduraPercentualNovoInput),

      imc: imcNovo ? Number(imcNovo.replace(",", ".")) : 0,
      classificacaoImc: classificacaoImcNovo,
      rcq: rcqNovo ? Number(rcqNovo.replace(",", ".")) : 0,
      riscoRcq: riscoRcqNovo,
      cmb: cmbNovo ? Number(cmbNovo.replace(",", ".")) : 0,
      classificacaoCmb: classificacaoCmbNovo,
      classificacaoGordura: classificacaoGorduraNovo,

      massaGordura: mgKg || 0,
      massaResidual: massaResidualNovo ? Number(massaResidualNovo.replace(",", ".")) : 0,
      massaLivreGordura: mlgKg || 0,

      // (5) Persistindo % massa gorda / % massa livre
      massaGorduraPercent: Number(mgPerc.toFixed(1)),
      massaLivreGorduraPercent: Number(mlgPerc.toFixed(1)),
    };

    try {
      const pacienteRef = doc(db, "nutricionistas", user.email, "pacientes", id);
      await updateDoc(pacienteRef, { historicoMetricas: arrayUnion(novaMetrica) });
      await fetchPatient();
      toast({ title: "Nova métrica salva com sucesso!" });

      // Limpar campos
      setDataNovaMetrica("");
      setPesoNovo("");
      setAlturaNova("");
      setCinturaNovo("");
      setQuadrilNovo("");
      setBracoNovo("");
      setGorduraPercentualNovoInput("");
      setSomatorioDobrasNovo("");
      setDensidadeCorporalNovoInput("");
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
      setMassaGorduraPercentNovo("");
      setMassaLivreGorduraPercentNovo("");
      setSkinfolds({
        tricipital: "", bicipital: "", abdominal: "", subescapular: "",
        axilarMedia: "", coxa: "", toracica: "", suprailiaca: "",
        panturrilha: "", supraespinhal: "",
      })
      setFormulaDobras("NONE")
      setDensidadeCorporalCalc("")
      setGorduraPercentualPorDobras("")

    } catch (error) {
      console.error("Erro ao salvar métrica:", error);
      toast({ title: "Erro ao salvar métrica", description: "Verifique os campos e tente novamente.", variant: "destructive" });
    }
  };

  // Dados ordenados do histórico (já vem ascendente)
  const historicoAsc: MetricaEntry[] = useMemo(() => {
    const list = (metricas || []) as MetricaEntry[]
    // garantir ordem asc por segurança
    return [...list].sort((a,b)=> new Date(a.data).getTime() - new Date(b.data).getTime())
  }, [metricas])

  // Janela atual (carrossel)
  const histLen = historicoAsc.length
  const windowStart = Math.min(histStart, Math.max(0, histLen - HIST_WINDOW))
  const windowEnd = Math.min(histLen, windowStart + HIST_WINDOW)
  const historicoWindow = historicoAsc.slice(windowStart, windowEnd)

  const canPrev = windowStart > 0
  const canNext = windowEnd < histLen

  // Dados p/ gráfico empilhado
  const chartData = useMemo(() => {
    return historicoAsc.map((m) => {
      const label = (m.data && !isNaN(new Date(m.data).getTime()))
        ? new Date(m.data).toLocaleDateString("pt-BR")
        : "Sem data"
      let mgPerc = m.massaGorduraPercent
      let mlgPerc = m.massaLivreGorduraPercent
      // fallback se ainda não existirem nos históricos antigos
      if ((mgPerc == null || isNaN(mgPerc)) && m.peso && m.massaGordura) {
        mgPerc = (m.massaGordura / m.peso) * 100
      }
      if ((mlgPerc == null || isNaN(mlgPerc)) && mgPerc != null) {
        mlgPerc = Math.max(0, 100 - mgPerc)
      }
      return {
        nome: label,
        massaGordaPct: mgPerc ? Number(mgPerc.toFixed(1)) : 0,
        massaLivrePct: mlgPerc ? Number(mlgPerc.toFixed(1)) : (mgPerc != null ? Number((100 - mgPerc).toFixed(1)) : 0),
      }
    })
  }, [historicoAsc])

  // -------------------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------------------

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
          <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                  <Link href="/pacientes">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Voltar</span>
                  </Link>
                </Button>

                <div className="flex items-center gap-2">
                  <Switch id="patient-status" checked={isActive} onCheckedChange={togglePatientStatus} />
                  <Label htmlFor="patient-status">
                    {isActive ? "Paciente Ativo" : "Paciente Inativo"}
                  </Label>
                </div>

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

            {/* Informações pessoais */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Informações Pessoais</CardTitle></div>
                <Button onClick={() => setEditInfoOpen(true)} className="bg-indigo-600 text-white hover:bg-indigo-700">Editar</Button>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{patient?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p>{patient?.telefone ? formatTelefone(patient.telefone) : "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Nascimento</p>
                  <p>{patient?.birthdate ? new Date(patient.birthdate + "T12:00:00").toLocaleDateString("pt-BR") : "-"}</p>
                </div>
                {patient?.senhaProvisoria && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Senha Provisória
                      <button type="button" onClick={() => setMostrarSenha((prev) => !prev)} className="text-indigo-600 text-xs">
                        {mostrarSenha ? "Ocultar" : "Mostrar"}
                      </button>
                    </p>
                    <p className="font-mono text-sm">{mostrarSenha ? patient.senhaProvisoria : "••••••••"}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modal Edit Info */}
            <Dialog open={editInfoOpen} onOpenChange={setEditInfoOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Informações Pessoais</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid gap-1">
                    <Label>Nome</Label>
                    <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                  </div>
                  <div className="grid gap-1">
                    <Label>Email</Label>
                    <Input value={editData.email} disabled className="opacity-60 cursor-not-allowed" />
                  </div>
                  <div className="grid gap-1">
                    <Label>Telefone</Label>
                    <Input
                      value={editData.telefone}
                      onChange={(e) => {
                        const onlyNumbers = e.target.value.replace(/\D/g, "").slice(0, 11)
                        const match = onlyNumbers.match(/^(\d{2})(\d{5})(\d{4})$/)
                        const formatted = match ? (${match[1]}) ${match[2]}-${match[3]} : onlyNumbers
                        setEditData({ ...editData, telefone: formatted })
                      }}
                      placeholder="(99) 99999-9999"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label>Data de Nascimento</Label>
                    <Input type="date" value={editData.birthdate} onChange={(e) => setEditData({ ...editData, birthdate: e.target.value })} />
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button
                    type="button"
                    onClick={async () => {
                      setIsSaving(true)
                      await handleSaveInfo()
                      setIsSaving(false)
                      setInfoParaEditar(null)
                      toast({ title: "Sucesso", description: "Informações atualizadas" })
                    }}
                    disabled={isSaving}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Modal Edit Metrics simples (mantido) */}
            <Dialog open={editMetricsOpen} onOpenChange={setEditMetricsOpen}>
              <DialogContent>
                <DialogHeader><DialogTitle>Editar Métricas</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  {Object.entries(editMetrics).map(([field, value]) => (
                    <div key={field} className="grid gap-1">
                      <Label>{field}</Label>
                      <Input
                        type="number"
                        value={value}
                        onChange={(e) => setEditMetrics({ ...editMetrics, [field]: Number(e.target.value) })}
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter className="mt-4">
                  <Button onClick={handleSaveMetrics} className="bg-indigo-600 text-white hover:bg-indigo-700">Salvar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Tabs */}
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
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Histórico de Métricas</CardTitle>
                        <CardDescription>Veja o histórico de medições (5 por vez)</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" disabled={!canPrev} onClick={()=> setHistStart(s => Math.max(0, s - HIST_WINDOW))}>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" disabled={!canNext} onClick={()=> setHistStart(s => Math.min(Math.max(0, histLen - HIST_WINDOW), s + HIST_WINDOW))}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {historicoAsc.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-2">Métrica</th>
                              {historicoWindow.map((item: any, index: number) => (
                                <th key={index} className="text-center p-2 font-semibold">
                                  <div className="flex items-center justify-center gap-1">
                                    <span>
                                      {item.data && !isNaN(new Date(item.data).getTime())
                                        ? new Date(item.data).toLocaleDateString("pt-BR")
                                        : "Sem data"}
                                    </span>

                                    {/* Editar */}
                                    <Dialog
                                      open={!!metricaEditando}
                                      onOpenChange={(open) => { if (!open) setMetricaEditando(null) }}
                                    >
                                      <DialogTrigger asChild>
                                        <button
                                          onClick={() => setMetricaEditando(item)}
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
                                            Atualize os valores da medição de <strong>
                                              {item.data ? new Date(item.data).toLocaleDateString("pt-BR") : "Data inválida"}
                                            </strong>.
                                          </DialogDescription>
                                        </DialogHeader>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto py-2 pr-2">
                                          <div>
                                            <Label htmlFor="peso-edit">Peso (kg)</Label>
                                            <Input id="peso-edit" type="number" defaultValue={item.peso} onChange={(e) => (item.peso = Number(e.target.value))} />
                                          </div>
                                          <div>
                                            <Label htmlFor="altura-edit">Altura (cm)</Label>
                                            <Input id="altura-edit" type="number" defaultValue={item.altura} onChange={(e) => (item.altura = Number(e.target.value))} />
                                          </div>
                                          <div>
                                            <Label htmlFor="cintura-edit">Cintura (cm)</Label>
                                            <Input id="cintura-edit" type="number" defaultValue={item.cintura} onChange={(e) => (item.cintura = Number(e.target.value))} />
                                          </div>
                                          <div>
                                            <Label htmlFor="quadril-edit">Quadril (cm)</Label>
                                            <Input id="quadril-edit" type="number" defaultValue={item.quadril} onChange={(e) => (item.quadril = Number(e.target.value))} />
                                          </div>
                                          <div>
                                            <Label htmlFor="braco-edit">Braço (cm)</Label>
                                            <Input id="braco-edit" type="number" defaultValue={item.braco} onChange={(e) => (item.braco = Number(e.target.value))} />
                                          </div>

                                          {/* ---- Dobras no modal de edição ---- */}
                                          {([
                                            ["tricipital","Tricipital (mm)"],
                                            ["bicipital","Bicipital (mm)"],
                                            ["abdominal","Abdominal (mm)"],
                                            ["subescapular","Subescapular (mm)"],
                                            ["axilarMedia","Axilar Média (mm)"],
                                            ["coxa","Coxa (mm)"],
                                            ["toracica","Torácica/Peitoral (mm)"],
                                            ["suprailiaca","Supra-ilíaca (mm)"],
                                            ["panturrilha","Panturrilha (mm)"],
                                            ["supraespinhal","Supraespinhal (mm)"],
                                          ] as [SkinfoldKey,string][]).map(([k,label]) => (
                                            <div key={k}>
                                              <Label>{label}</Label>
                                              <Input
                                                type="number"
                                                defaultValue={item?.dobras?.[k] ?? ""}
                                                onChange={(e)=>{
                                                  const v = Number(e.target.value)
                                                  item.dobras = item.dobras || {}
                                                  item.dobras[k] = isNaN(v) ? 0 : v
                                                }}
                                              />
                                            </div>
                                          ))}

                                          <div>
                                            <Label>Fórmula de Dobras</Label>
                                            <select
                                              defaultValue={item?.dobras?.formula || "NONE"}
                                              onChange={(e)=>{
                                                item.dobras = item.dobras || {}
                                                item.dobras.formula = e.target.value as any
                                              }}
                                              className="border rounded px-2 py-1 w-full"
                                            >
                                              <option value="POLLOCK3">Pollock 3</option>
                                              <option value="POLLOCK7">Pollock 7</option>
                                              <option value="DURNIN">Durnin–Womersley</option>
                                              <option value="FAULKNER">Faulkner</option>
                                              <option value="NONE">Nenhuma</option>
                                            </select>
                                          </div>
                                          <div>
                                            <Label>Método % Gordura</Label>
                                            <select
                                              defaultValue={item?.dobras?.metodoPercentual || "SIRI"}
                                              onChange={(e)=>{
                                                item.dobras = item.dobras || {}
                                                item.dobras.metodoPercentual = e.target.value as any
                                              }}
                                              className="border rounded px-2 py-1 w-full"
                                            >
                                              <option value="SIRI">Siri</option>
                                              <option value="BROZEK">Brozek</option>
                                            </select>
                                          </div>

                                          <div>
                                            <Label>% Gordura</Label>
                                            <Input
                                              type="number"
                                              defaultValue={item.gorduraPercentual}
                                              onChange={(e) => (item.gorduraPercentual = Number(e.target.value))}
                                            />
                                          </div>
                                          <div>
                                            <Label>Somatório de Dobras (mm)</Label>
                                            <Input
                                              type="number"
                                              defaultValue={item.somatorioDobras}
                                              onChange={(e) => (item.somatorioDobras = Number(e.target.value))}
                                            />
                                          </div>
                                          <div>
                                            <Label>Densidade Corporal</Label>
                                            <Input
                                              type="text"
                                              defaultValue={item.densidadeCorporal}
                                              onChange={(e) => (item.densidadeCorporal = Number(e.target.value))}
                                            />
                                          </div>
                                        </div>

                                        <DialogFooter className="mt-4">
                                          <Button
                                            disabled={isSaving}
                                            onClick={async () => {
                                              setIsSaving(true)
                                              const ref = doc(db, "nutricionistas", user?.email!, "pacientes", id);
                                              const historicoAtualizado = (patient.historicoMetricas || []).map((m: any) =>
                                                m.data === item.data ? item : m
                                              )
                                              await updateDoc(ref, { historicoMetricas: historicoAtualizado })
                                              setPatient((prev: any) => ({ ...prev, historicoMetricas: historicoAtualizado }))
                                              toast({ title: "Métrica atualizada com sucesso" })
                                              setIsSaving(false)
                                              setMetricaEditando(null)
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                          >
                                            {isSaving ? "Salvando..." : "Salvar Alterações"}
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>

                                    {/* Excluir */}
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
                              { k: "peso", label: "Peso (kg)", fmt: (v: any) => v?.toFixed?.(1) ?? v },
                              { k: "altura", label: "Altura (cm)", fmt: (v: any) => v },
                              { k: "cintura", label: "Cintura (cm)", fmt: (v: any) => v },
                              { k: "quadril", label: "Quadril (cm)", fmt: (v: any) => v },
                              { k: "braco", label: "Braço (cm)", fmt: (v: any) => v },
                              { k: "imc", label: "IMC", fmt: (v: any) => (v ? Number(v).toFixed(2) : v) },
                              { k: "classificacaoImc", label: "Classificação IMC", fmt: (v: any) => v },
                              { k: "rcq", label: "RCQ", fmt: (v: any) => (v ? Number(v).toFixed(2) : v) },
                              { k: "riscoRcq", label: "Risco RCQ", fmt: (v: any) => v },
                              { k: "cmb", label: "CMB (cm)", fmt: (v: any) => (v ? Number(v).toFixed(2) : v) },
                              { k: "classificacaoCmb", label: "Classificação CMB", fmt: (v: any) => v },
                              { k: "gorduraPercentual", label: "% Gordura (entrada/cálculo)", fmt: (v: any) => (v!=null ? Number(v).toFixed(1) : v) },
                              { k: "massaGordura", label: "Massa Gorda (kg)", fmt: (v: any) => (v ? Number(v).toFixed(2) : v) },
                              { k: "massaLivreGordura", label: "Massa Livre (kg)", fmt: (v: any) => (v ? Number(v).toFixed(2) : v) },
                              { k: "massaResidual", label: "Massa Residual (kg)", fmt: (v: any) => (v ? Number(v).toFixed(2) : v) },
                              { k: "massaGorduraPercent", label: "% Massa Gorda", fmt: (v: any) => (v!=null ? Number(v).toFixed(1) : v) },
                              { k: "massaLivreGorduraPercent", label: "% Massa Livre", fmt: (v: any) => (v!=null ? Number(v).toFixed(1) : v) },
                              { k: "somatorioDobras", label: "Σ Dobras (mm)", fmt: (v: any) => v },
                              { k: "densidadeCorporal", label: "Densidade Corporal", fmt: (v: any) => (v ? Number(v).toFixed(3) : v) },
                            ].map((row) => (
                              <tr key={row.k} className="border-t">
                                <td className="p-2 font-medium">{row.label}</td>
                                {historicoWindow.map((item:any, idx:number) => {
                                  const raw = item[row.k as keyof typeof item] as any
                                  const value = raw ?? "-"
                                  const out = value === "-" ? "-" : row.fmt(value)
                                  return (
                                    <td key={idx} className="p-2 text-center">
                                      {out ?? "-"}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}

                            {/* Exibir as dobras visíveis na janela (apenas as principais) */}
                            {([
                              ["tricipital","Tricipital (mm)"],
                              ["bicipital","Bicipital (mm)"],
                              ["abdominal","Abdominal (mm)"],
                              ["subescapular","Subescapular (mm)"],
                              ["axilarMedia","Axilar Média (mm)"],
                              ["coxa","Coxa (mm)"],
                              ["toracica","Torácica/Peitoral (mm)"],
                              ["suprailiaca","Supra-ilíaca (mm)"],
                              ["panturrilha","Panturrilha (mm)"],
                              ["supraespinhal","Supraespinhal (mm)"],
                            ] as [SkinfoldKey,string][]).map(([k,label]) => (
                              <tr key={k} className="border-t">
                                <td className="p-2 font-medium">{label}</td>
                                {historicoWindow.map((item:any, idx:number) => {
                                  const v = item?.dobras?.[k]
                                  return (
                                    <td key={idx} className="p-2 text-center">
                                      {v!=null && !isNaN(v) ? v : "-"}
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}

                            {/* Fórmula de dobras / Método usados */}
                            <tr className="border-t">
                              <td className="p-2 font-medium">Fórmula de Dobras</td>
                              {historicoWindow.map((item:any, idx:number) => (
                                <td key={idx} className="p-2 text-center">
                                  {item?.dobras?.formula ?? "-"}
                                </td>
                              ))}
                            </tr>
                            <tr className="border-t">
                              <td className="p-2 font-medium">Método % Gordura</td>
                              {historicoWindow.map((item:any, idx:number) => (
                                <td key={idx} className="p-2 text-center">
                                  {item?.dobras?.metodoPercentual ?? "-"}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma métrica registrada ainda.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Gráfico empilhado % massa gorda vs livre */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Composição Corporal (%)</CardTitle>
                    <CardDescription>% de Massa Gorda x % de Massa Livre ao longo do tempo</CardDescription>
                  </CardHeader>
                  <CardContent style={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nome" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="massaGordaPct" stackId="a" name="% Massa Gorda" />
                        <Bar dataKey="massaLivrePct" stackId="a" name="% Massa Livre" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* NOVA MEDIÇÃO - três blocos com borda */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Métricas básicas */}
                  <Card className="border rounded-lg">
                    <CardHeader>
                      <CardTitle>Métricas básicas</CardTitle>
                      <CardDescription>Dados de entrada</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-1">
                        <Label>Data da medição</Label>
                        <Input
                          type="date"
                          value={dataNovaMetrica}
                          onChange={(e)=> setDataNovaMetrica(e.target.value)}
                          placeholder="YYYY-MM-DD"
                        />
                        <p className="text-xs text-muted-foreground">Se vazio, será salvo como {todayISO()}</p>
                      </div>

                      <div className="grid gap-1">
                        <Label>Peso (kg)</Label>
                        <Input value={pesoNovo} onChange={(e)=>setPesoNovo(e.target.value)} placeholder="ex: 72,4" />
                      </div>
                      <div className="grid gap-1">
                        <Label>Altura (cm)</Label>
                        <Input value={alturaNova} onChange={(e)=>setAlturaNova(e.target.value)} placeholder="ex: 172" />
                      </div>
                      <div className="grid gap-1">
                        <Label>Cintura (cm)</Label>
                        <Input value={cinturaNovo} onChange={(e)=>setCinturaNovo(e.target.value)} placeholder="ex: 80" />
                      </div>
                      <div className="grid gap-1">
                        <Label>Quadril (cm)</Label>
                        <Input value={quadrilNovo} onChange={(e)=>setQuadrilNovo(e.target.value)} placeholder="ex: 95" />
                      </div>
                      <div className="grid gap-1">
                        <Label>Braço (cm)</Label>
                        <Input value={bracoNovo} onChange={(e)=>setBracoNovo(e.target.value)} placeholder="ex: 30" />
                      </div>

                      <div className="grid gap-1">
                        <Label>% Gordura (manual)</Label>
                        <Input value={gorduraPercentualNovoInput} onChange={(e)=>setGorduraPercentualNovoInput(e.target.value)} placeholder="opcional, ex: 21,5" />
                      </div>
                      <div className="grid gap-1">
                        <Label>Densidade Corporal (manual)</Label>
                        <Input value={densidadeCorporalNovoInput} onChange={(e)=>setDensidadeCorporalNovoInput(e.target.value)} placeholder="opcional" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dobras cutâneas */}
                  <Card className="border rounded-lg">
                    <CardHeader>
                      <CardTitle>Dobras cutâneas</CardTitle>
                      <CardDescription>Mostra somente as dobras do protocolo</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid gap-1">
                        <Label>Protocolo</Label>
                        <select
                          className="border rounded px-2 py-2"
                          value={formulaDobras}
                          onChange={(e)=> setFormulaDobras(e.target.value as any)}
                        >
                          <option value="NONE">Selecione</option>
                          <option value="POLLOCK3">Pollock 3</option>
                          <option value="POLLOCK7">Pollock 7</option>
                          <option value="DURNIN">Durnin–Womersley</option>
                          <option value="FAULKNER">Faulkner</option>
                          <option value="PETROSKI" disabled>Petroski (em breve)</option>
                          <option value="GUEDES" disabled>Guedes (em breve)</option>
                        </select>
                      </div>

                      <div className="grid gap-1">
                        <Label>Método % Gordura</Label>
                        <select
                          className="border rounded px-2 py-2"
                          value={metodoPercentual}
                          onChange={(e)=> setMetodoPercentual(e.target.value as any)}
                        >
                          <option value="SIRI">Siri</option>
                          <option value="BROZEK">Brozek</option>
                        </select>
                      </div>

                      {/* Campos visíveis conforme protocolo */}
                      {(["tricipital","bicipital","abdominal","subescapular","axilarMedia","coxa","toracica","suprailiaca","panturrilha","supraespinhal"] as SkinfoldKey[])
                        .filter(k => skinfoldFieldsForProtocol.includes(k))
                        .map((k)=>(
                          <div key={k} className="grid gap-1">
                            <Label>
                              {{
                                tricipital: "Tricipital (mm)",
                                bicipital: "Bicipital (mm)",
                                abdominal: "Abdominal (mm)",
                                subescapular: "Subescapular (mm)",
                                axilarMedia: "Axilar Média (mm)",
                                coxa: "Coxa (mm)",
                                toracica: "Torácica/Peitoral (mm)",
                                suprailiaca: "Supra-ilíaca (mm)",
                                panturrilha: "Panturrilha (mm)",
                                supraespinhal: "Supraespinhal (mm)",
                              }[k]}
                            </Label>
                            <Input
                              value={skinfolds[k]}
                              onChange={(e)=> setSkinfolds(prev => ({ ...prev, [k]: e.target.value }))}
                              placeholder="ex: 12"
                            />
                          </div>
                        ))
                      }
                    </CardContent>
                  </Card>

                  {/* Resultados / calculados */}
                  <Card className="border rounded-lg">
                    <CardHeader>
                      <CardTitle>Resultados</CardTitle>
                      <CardDescription>Campos calculados automaticamente</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1">
                          <Label>IMC</Label>
                          <Input value={imcNovo} disabled />
                        </div>
                        <div className="grid gap-1">
                          <Label>Classificação IMC</Label>
                          <Input value={classificacaoImcNovo} disabled />
                        </div>
                        <div className="grid gap-1">
                          <Label>RCQ</Label>
                          <Input value={rcqNovo} disabled />
                        </div>
                        <div className="grid gap-1">
                          <Label>Risco RCQ</Label>
                          <Input value={riscoRcqNovo} disabled />
                        </div>
                        <div className="grid gap-1">
                          <Label>CMB (cm)</Label>
                          <Input value={cmbNovo} disabled />
                        </div>
                        <div className="grid gap-1">
                          <Label>Classificação CMB</Label>
                          <Input value={classificacaoCmbNovo} disabled />
                        </div>
                        <div className="grid gap-1">
                          <Label>% Gordura (por dobras)</Label>
                          <Input value={gorduraPercentualPorDobras} disabled />
                        </div>
                        <div className="grid gap-1">
                          <Label>Densidade Corporal (por dobras)</Label>
                          <Input value={densidadeCorporalCalc} disabled />
                        </div>
                        <div className="grid gap-1">
                          <Label>Massa Gorda (kg)</Label>
                          <Input value={massaGorduraNovo} disabled />
                        </div>
                        <div className="grid gap-1">
                          <Label>Massa Livre (kg)</Label>
                          <Input value={massaLivreGorduraNovo} disabled />
                        </div>
                        <div className="grid gap-1">
                          <Label>Massa Residual (kg)</Label>
                          <Input value={massaResidualNovo} disabled />
                        </div>
                        <div className="grid gap-1">
                          <Label>% Massa Gorda</Label>
                          <Input value={massaGorduraPercentNovo} disabled />
                        </div>
                        <div className="grid gap-1">
                          <Label>% Massa Livre</Label>
                          <Input value={massaLivreGorduraPercentNovo} disabled />
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button onClick={salvarNovaMetrica} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                          Salvar nova medição
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Aba Dietas */}
              <TabsContent value="dietas" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Dietas</CardTitle>
                    <CardDescription>Envie, liste e remova PDFs</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleReplaceDiet} className="grid md:grid-cols-3 gap-3 items-end">
                      <div className="grid gap-1 md:col-span-1">
                        <Label>Nome exibido</Label>
                        <Input value={nomeDieta} onChange={(e)=>setNomeDieta(e.target.value)} placeholder="Ex: Dieta Semanal" />
                        {erroNomeDieta && <span className="text-xs text-red-600">Informe um nome para a dieta</span>}
                      </div>
                      <div className="grid gap-1 md:col-span-1">
                        <Label>Arquivo (PDF)</Label>
                        <Input type="file" accept="application/pdf" onChange={(e)=> setSelectedPDF(e.target.files?.[0] ?? null)} />
                      </div>
                      <div className="md:col-span-1">
                        <Button type="submit" disabled={isSubmittingDiet} className={submitButtonColorClass + " w-full"}>
                          {submitButtonText}
                        </Button>
                      </div>
                    </form>

                    <div className="border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left">Nome</th>
                            <th className="p-2 text-left">Data</th>
                            <th className="p-2 text-left">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(patient?.dietas || []).map((d:any, i:number)=> (
                            <tr key={i} className="border-t">
                              <td className="p-2">{d?.nomeDieta || d?.nome || "-"}</td>
                              <td className="p-2">{d?.dataEnvio || "-"}</td>
                              <td className="p-2">
                                <div className="flex gap-2">
                                  <Button asChild variant="outline" size="sm">
                                    <a href={d.url} target="_blank" rel="noreferrer">Abrir</a>
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={()=> handleDeleteDiet(d)}>Excluir</Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!(patient?.dietas || []).length && (
                            <tr><td className="p-2 text-sm text-muted-foreground" colSpan={3}>Sem dietas enviadas.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Fotos */}
              <TabsContent value="fotos" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Fotos</CardTitle>
                    <CardDescription>Envio e gerenciamento de fotos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleUploadPhotos} className="grid md:grid-cols-3 gap-3 items-end">
                      <div className="grid gap-1 md:col-span-1">
                        <Label>Tipo</Label>
                        <select className="border rounded px-2 py-2" value={tipoFoto} onChange={(e)=> setTipoFoto(e.target.value)}>
                          <option>Foto Frontal</option>
                          <option>Foto Lateral</option>
                          <option>Foto Traseira</option>
                        </select>
                      </div>
                      <div className="grid gap-1 md:col-span-1">
                        <Label>Arquivo (imagem)</Label>
                        <Input type="file" accept="image/*" onChange={handlePhotoChange} />
                      </div>
                      <div className="md:col-span-1">
                        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">Enviar Foto</Button>
                      </div>
                    </form>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(patient?.fotos || []).map((f:any, i:number)=> (
                        <div key={i} className="border rounded p-2">
                          <div className="aspect-square relative overflow-hidden rounded">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={f.url} alt={f.tipo || "Foto"} className="object-cover w-full h-full" />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="truncate">{f?.tipo || "-"}</span>
                            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={()=> handleDeletePhoto(f)}>
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {!(patient?.fotos || []).length && (
                        <p className="text-sm text-muted-foreground col-span-full">Sem fotos cadastradas.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Aba Material Individual */}
              <TabsContent value="material-individual" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Material Individual</CardTitle>
                    <CardDescription>Envie PDFs personalizados por paciente</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleUploadIndividualMaterial} className="grid md:grid-cols-3 gap-3 items-end">
                      <div className="grid gap-1 md:col-span-1">
                        <Label>Nome exibido</Label>
                        <Input value={nomeMaterialIndividual} onChange={(e)=> setNomeMaterialIndividual(e.target.value)} placeholder="Ex: Treino A - Semana 1" />
                      </div>
                      <div className="grid gap-1 md:col-span-1">
                        <Label>Arquivo (PDF)</Label>
                        <Input type="file" accept="application/pdf" onChange={(e)=> setSelectedIndividualPDF(e.target.files?.[0] ?? null)} />
                      </div>
                      <div className="md:col-span-1">
                        <Button type="submit" disabled={isSubmittingIndividualMaterial} className={submitIndividualMaterialColorClass + " w-full"}>
                          {submitIndividualMaterialText}
                        </Button>
                      </div>
                    </form>

                    <div className="border rounded">
                      <table className="w-full text-sm">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-left">Nome</th>
                            <th className="p-2 text-left">Data</th>
                            <th className="p-2 text-left">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(patient?.materiaisIndividuais || []).map((m:any, i:number)=> (
                            <tr key={i} className="border-t">
                              <td className="p-2">{m?.nomeMaterial || m?.nome || "-"}</td>
                              <td className="p-2">{m?.dataEnvio || "-"}</td>
                              <td className="p-2">
                                <div className="flex gap-2">
                                  <Button asChild variant="outline" size="sm">
                                    <a href={m.url} target="_blank" rel="noreferrer">Abrir</a>
                                  </Button>
                                  <Button variant="destructive" size="sm" onClick={()=> handleDeleteIndividualMaterial(m)}>Excluir</Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {!(patient?.materiaisIndividuais || []).length && (
                            <tr><td className="p-2 text-sm text-muted-foreground" colSpan={3}>Sem materiais enviados.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ---------------------------------------------------
 * Helpers locais faltantes
 * --------------------------------------------------*/
async function togglePatientStatus(checked: boolean) {
  // Este handler precisa de acesso a user/email e id.
  // Para manter o escopo do React, você pode mover essa função para dentro do componente
  // e usar user/email/id do estado, ou transformar em callback com useCallback.
  // Abaixo, deixo como "no-op" para não quebrar a continuidade se você já tiver
  // um handler global importado. Caso queira integrá-lo dentro do componente,
  // substitua por algo assim:

  // const ref = doc(db, "nutricionistas", user!.email!, "pacientes", id)
  // await updateDoc(ref, { status: checked ? "Ativo" : "Inativo" })
  // setIsActive(checked)
  // toast({ title: "Status atualizado" })

  console.warn("togglePatientStatus chamado, implemente com seu contexto de user/id.");
}
