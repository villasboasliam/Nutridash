"use client"

import {
  getDocs,
  collection,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore"
import { useState, useEffect, useCallback } from "react"
import { usePathname, useRouter, useParams } from "next/navigation"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db, storage } from "@/lib/firebase"
import Link from "next/link"
import Image from "next/image"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Camera,
  FileText,
  Home,
  LineChart,
  Menu,
  Upload,
  Users,
  Trash,
  Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { useLanguage } from "@/contexts/language-context"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
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

// ===== Tipos (NOVOS: histórico dividido em 3 blocos) =====
type HistoricoBasico = {
  data: string
  peso?: number
  altura?: number
  imc?: number
  classificacaoImc?: string
  rcq?: number
  riscoRcq?: string
  cmb?: number
  classificacaoCmb?: string
  massaGordura?: number
  massaResidual?: number
  massaLivreGordura?: number
  massaGorduraPercent?: number
  massaLivreGorduraPercent?: number
}

type HistoricoBio = {
  gorduraPercentual?: number
  classificacaoGordura?: string
  percentualMassaMuscular?: number
  massaMuscular?: number
  massaGordura?: number
  massaLivreGordura?: number
  indiceGorduraVisceral?: number
}

type ProtocoloDobrasKey =
  | "pollock3"
  | "pollock7"
  | "petroski"
  | "guedes"
  | "durnin"
  | "faulkner"
  | "nenhuma"

type HistoricoAntrop = {
  // Circunferências / medidas antropométricas
  tricipital?: number
  coxa?: number
  supraIliaca?: number
  cintura?: number
  quadril?: number
  bracoRelaxado?: number
  bracoContraido?: number
  coxaMedial?: number
  panturrilha?: number
  // Dobras
  protocolo?: ProtocoloDobrasKey
  sexoParaCalculo?: "feminino" | "masculino"
  pontos?: Partial<{
    peitoral: number
    abdominal: number
    coxa: number
    tricipital: number
    supraIliaca: number
    axilarMedia: number
    subescapular: number
    bicipital: number
    toracica: number
    supraespinhal: number
    panturrilha: number
  }>
  somatorioDobras?: number
  densidadeCorporal?: number
  gorduraPercentualSiri?: number
}

type MetricaEntry = {
  data: string
  basico: HistoricoBasico
  bio?: HistoricoBio
  antrop?: HistoricoAntrop
}

// ===== Componente =====
export default function PatientDetailPage() {
  // Upload/diet/foto/material
  const [isDietUploaded, setIsDietUploaded] = useState(false)
  const [isPhotosUploaded, setIsPhotosUploaded] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null)
  const [nomeDieta, setNomeDieta] = useState("")
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [tipoFoto, setTipoFoto] = useState("Foto Frontal")
  const [dobras, setDobras] = useState<{ [key: string]: string }>({})

  const [selectedIndividualPDF, setSelectedIndividualPDF] = useState<File | null>(null)
  const [nomeMaterialIndividual, setNomeMaterialIndividual] = useState("")
  const [individualMaterials, setIndividualMaterials] = useState<any[]>([])
  const [isSubmittingIndividualMaterial, setIsSubmittingIndividualMaterial] = useState(false)
  const [submitIndividualMaterialText, setSubmitIndividualMaterialText] = useState("Enviar Material")
  const [submitIndividualMaterialColorClass, setSubmitIndividualMaterialColorClass] = useState(
    "bg-indigo-600 hover:bg-indigo-700"
  )

  // Estado geral
  const [metricas, setMetricas] = useState<MetricaEntry[]>([])
  const params = useParams()
  const rawId = (params?.id as string | undefined) ?? ""
  const id = rawId ? decodeURIComponent(rawId) : ""

  const pathname = usePathname()
  const router = useRouter()
  const [user, loading] = useAuthState(auth)
  const { t } = useLanguage()
  const { toast } = useToast()
  const [patient, setPatient] = useState<any | null>(null)
  const [isActive, setIsActive] = useState(true)

  // ===== Form: estados base (BÁSICAS) =====
  const [dataNovaMetrica, setDataNovaMetrica] = useState("")
  const [pesoNovo, setPesoNovo] = useState("")
  const [alturaNova, setAlturaNova] = useState("")
  const [cinturaNovo, setCinturaNovo] = useState("")
  const [quadrilNovo, setQuadrilNovo] = useState("")
  const [bracoNovo, setBracoNovo] = useState("")

  // ===== Switches para blocos =====
  const [includeAntrop, setIncludeAntrop] = useState(true)
  const [includeBio, setIncludeBio] = useState(false)

  // ===== Antropometria / Dobras – Protocolo e sexo dentro do card =====
  const [sexoAvaliacao, setSexoAvaliacao] = useState<string>(patient?.sexo ?? "feminino")
  const [protocoloDobras, setProtocoloDobras] = useState<ProtocoloDobrasKey>("pollock3")

  // Entradas de dobras (pontos possíveis)
  const [dobraPeitoral, setDobraPeitoral] = useState("")
  const [dobraAbdominal, setDobraAbdominal] = useState("")
  const [dobraCoxa, setDobraCoxa] = useState("")
  const [dobraTricipital, setDobraTricipital] = useState("")
  const [dobraSupraIliaca, setDobraSupraIliaca] = useState("")
  const [dobraAxilarMedia, setDobraAxilarMedia] = useState("")
  const [dobraSubescapular, setDobraSubescapular] = useState("")
  const [dobraBicipital, setDobraBicipital] = useState("")
  const [dobraToracica, setDobraToracica] = useState("")
  const [dobraSupraespinhal, setDobraSupraespinhal] = useState("")
  const [dobraPanturrilha, setDobraPanturrilha] = useState("")

  // Medidas antropométricas extras (como na sua tabela)
  const [tricipitalNovo, setTricipitalNovo] = useState("")
  const [coxaNovo, setCoxaNovo] = useState("")
  const [supraIliacaNovo, setSupraIliacaNovo] = useState("")
  const [bracoRelaxadoNovo, setBracoRelaxadoNovo] = useState("")
  const [bracoContraidoNovo, setBracoContraidoNovo] = useState("")
  const [coxaMedialNovo, setCoxaMedialNovo] = useState("")
  const [panturrilhaNovo, setPanturrilhaNovo] = useState("")

  // Bioimpedância
  const [bioPercentGordura, setBioPercentGordura] = useState("")
  const [bioPercentMassaMuscular, setBioPercentMassaMuscular] = useState("")
  const [bioMassaMuscular, setBioMassaMuscular] = useState("")
  const [bioMassaGordura, setBioMassaGordura] = useState("")
  const [bioMassaLivre, setBioMassaLivre] = useState("")
  const [bioIGV, setBioIGV] = useState("")

  // Edição simples (mantido)
  const [editInfoOpen, setEditInfoOpen] = useState(false)
  const [editMetricsOpen, setEditMetricsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [isSubmittingDiet, setIsSubmittingDiet] = useState(false)
  const [submitButtonText, setSubmitButtonText] = useState("Enviar Dieta")
  const [submitButtonColorClass, setSubmitButtonColorClass] = useState("bg-indigo-600 hover:bg-indigo-700")
  const [erroNomeDieta, setErroNomeDieta] = useState(false)
  const [metricaEditando, setMetricaEditando] = useState<any>(null)
  const [metricaParaExcluir, setMetricaParaExcluir] = useState<any | null>(null)

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

  // ===== Sincroniza dados básicos do paciente e sexo para cálculo =====
  useEffect(() => {
    if (!patient) return
    setEditData({
      name: patient.nome || "",
      email: patient.email || "",
      telefone: patient.telefone || "",
      birthdate: patient.birthdate || "",
      valorConsulta: patient.valorConsulta || "",
    })
    setIsActive((patient.status || "Ativo") === "Ativo")
    if (patient.sexo) setSexoAvaliacao(patient.sexo)
  }, [patient])

  // ===== Utils =====
  const parseNumber = (value: string) => {
    const cleanedValue = value.replace(",", ".")
    return isNaN(Number(cleanedValue)) || cleanedValue.trim() === "" ? 0 : Number(cleanedValue)
  }
  const toNum = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(",", ".")))
  const toStrPt = (n: number, d = 2) => (n ? n.toFixed(d).replace(".", ",") : "")

  const formatTelefone = (telefone: string) => {
    const cleaned = telefone.replace(/\D/g, "")
    if (cleaned.length === 11) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    if (cleaned.length === 10) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    return telefone
  }

  const calculateIMC = useCallback((peso: number, altura: number) => {
    if (peso <= 0 || altura <= 0) return 0
    const alturaMetros = altura / 100
    return peso / (alturaMetros * alturaMetros)
  }, [])

  const classifyIMC = useCallback((imc: number) => {
    if (imc === 0) return ""
    if (imc < 18.5) return "Baixo Peso"
    if (imc <= 24.9) return "Normal"
    if (imc <= 29.9) return "Sobrepeso"
    if (imc <= 34.9) return "Obesidade Grau I"
    if (imc <= 39.9) return "Obesidade Grau II"
    return "Obesidade Grau III"
  }, [])

  const calculateRCQ = useCallback((cintura: number, quadril: number) => {
    if (cintura <= 0 || quadril <= 0) return 0
    return cintura / quadril
  }, [])

  const classifyRCQ = useCallback((rcq: number, sexo: string = "feminino") => {
    if (rcq === 0) return ""
    if ((sexo || "").toLowerCase().startsWith("f")) {
      if (rcq < 0.8) return "Baixo"
      if (rcq <= 0.84) return "Moderado"
      return "Alto"
    } else {
      if (rcq < 0.9) return "Baixo"
      if (rcq <= 0.99) return "Moderado"
      return "Alto"
    }
  }, [])

  const calculateCMB = useCallback((braco: number) => braco, [])
  const classifyCMB = useCallback((cmb: number) => {
    if (cmb === 0) return ""
    if (cmb < 23) return "Baixo"
    if (cmb <= 29) return "Normal"
    return "Alto"
  }, [])
  const classifyGordura = useCallback((g: number) => {
    if (g === 0) return ""
    if (g < 10) return "Muito Baixo"
    if (g <= 20) return "Adequado"
    if (g <= 25) return "Moderado"
    return "Elevado"
  }, [])
  const calculateMassaGordura = useCallback((gPercent: number, peso: number) => {
    if (gPercent === 0 || peso === 0) return 0
    return (gPercent / 100) * peso
  }, [])
  const calculateMassaLivreGordura = useCallback((peso: number, massaGordura: number) => {
    if (peso === 0) return 0
    return peso - (massaGordura || 0)
  }, [])
  const calculateMassaResidual = useCallback((peso: number) => {
    if (peso === 0) return 0
    return peso * 0.207
  }, [])

  // Idade a partir do birthdate (YYYY-MM-DD)
  const getIdade = () => {
    if (!patient?.birthdate) return 30
    const hoje = new Date()
    const nasc = new Date(patient.birthdate + "T12:00:00")
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return Math.max(0, idade)
  }

  // Siri (%G = 495/D − 450)
  const siriPercent = (d: number) => (d ? 495 / d - 450 : 0)

  // ===== Densidades por modelo =====
  const densidadePollock3 = (sum: number, idade: number, sexo: string) => {
    const fem = (sexo || "").toLowerCase().startsWith("f")
    return fem
      ? 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * idade
      : 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * idade
  }
  const densidadePollock7 = (sum: number, idade: number, sexo: string) => {
    const fem = (sexo || "").toLowerCase().startsWith("f")
    return fem
      ? 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * idade
      : 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * idade
  }
  // Petroski (7 dobras – coeficientes usuais com log10 da soma)
  const densidadePetroski7 = (sum: number, idade: number, sexo: string) => {
    const fem = (sexo || "").toLowerCase().startsWith("f")
    return fem
      ? 1.1954713 - 0.07513507 * Math.log10(sum) - 0.00041072 * idade
      : 1.17136 - 0.06706 * Math.log10(sum) - 0.000221 * idade
  }
  // Guedes (3 dobras: tri + supra + coxa)
  const densidadeGuedes3 = (sum: number, idade: number, sexo: string) => {
    const fem = (sexo || "").toLowerCase().startsWith("f")
    return fem
      ? 1.1714 - 0.0779 * Math.log10(sum) - 0.00073 * idade
      : 1.17136 - 0.06706 * Math.log10(sum) - 0.000221 * idade
  }
  // Durnin & Womersley (4 dobras: bicipital + tricipital + subescapular + supra-ilíaca)
  const densidadeDurnin4 = (sum: number, idade: number, sexo: string) => {
    const fem = (sexo || "").toLowerCase().startsWith("f")
    const L = Math.log10(sum)
    const set = (a: number, b: number) => a - b * L
    if (fem) {
      if (idade < 17) return set(1.1533, 0.0643)
      if (idade < 20) return set(1.1369, 0.0598)
      if (idade < 30) return set(1.1423, 0.0632)
      if (idade < 40) return set(1.1333, 0.0612)
      if (idade < 50) return set(1.1339, 0.0645)
      return set(1.1109, 0.0621)
    } else {
      if (idade < 17) return set(1.1533, 0.0643)
      if (idade < 20) return set(1.162, 0.063)
      if (idade < 30) return set(1.1631, 0.0632)
      if (idade < 40) return set(1.1422, 0.0544)
      if (idade < 50) return set(1.162, 0.07)
      return set(1.1715, 0.0779)
    }
  }
  // Faulkner (4 dobras) – %G ≈ 0.153*somatório + 5.783 (convertemos para densidade equivalente)
  const densidadeFaulkner4 = (sum: number) => {
    const perc = 0.153 * sum + 5.783
    return 495 / (perc + 450)
  }

  // Monta soma/densidade conforme protocolo
  function calcSkinfold(
    protocolo: ProtocoloDobrasKey,
    sexo: string,
    idade: number,
    pts: Record<string, number>
  ) {
    let soma = 0
    let dens = 0
    switch (protocolo) {
      case "pollock3": {
        const fem = (sexo || "").toLowerCase().startsWith("f")
        soma = fem
          ? pts.tricipital + pts.supraIliaca + pts.coxa
          : pts.peitoral + pts.abdominal + pts.coxa
        dens = densidadePollock3(soma, idade, sexo)
        break
      }
      case "pollock7": {
        soma =
          pts.peitoral +
          pts.axilarMedia +
          pts.tricipital +
          pts.subescapular +
          pts.abdominal +
          pts.supraIliaca +
          pts.coxa
        dens = densidadePollock7(soma, idade, sexo)
        break
      }
      case "petroski": {
        soma =
          pts.peitoral +
          pts.axilarMedia +
          pts.tricipital +
          pts.subescapular +
          pts.abdominal +
          pts.supraIliaca +
          pts.coxa
        dens = densidadePetroski7(soma, idade, sexo)
        break
      }
      case "guedes": {
        soma = pts.tricipital + pts.supraIliaca + pts.coxa
        dens = densidadeGuedes3(soma, idade, sexo)
        break
      }
      case "durnin": {
        soma = pts.bicipital + pts.tricipital + pts.subescapular + pts.supraIliaca
        dens = densidadeDurnin4(soma, idade, sexo)
        break
      }
      case "faulkner": {
        soma = pts.tricipital + pts.subescapular + pts.supraIliaca + pts.abdominal
        dens = densidadeFaulkner4(soma)
        break
      }
      case "nenhuma":
      default:
        soma = 0
        dens = 0
    }
    const perc = siriPercent(dens)
    return { soma, densidade: dens, percentual: perc }
  }

  // Atualiza sexo quando carregar paciente
  useEffect(() => {
    if (patient?.sexo) setSexoAvaliacao(patient.sexo)
  }, [patient?.sexo])

  const isClient = typeof window !== "undefined"

  // ===== (FIM DA PARTE 1) =====
  // A PRÓXIMA PARTE COMEÇA AQUI:
  // ===== Handlers Dieta / Foto / Material (detalhes das tabs) =====
  // ===== Handlers Dieta / Foto / Material =====
  const handleDietUpload = async () => {
    if (!selectedPDF || !nomeDieta.trim()) {
      setErroNomeDieta(true)
      toast({ title: "Erro", description: "Preencha o nome e selecione um arquivo PDF." })
      return
    }
    try {
      setIsSubmittingDiet(true)
      setSubmitButtonText("Enviando...")
      setSubmitButtonColorClass("bg-gray-400")
      const storageRef = ref(storage, `dietas/${user?.email}/${id}/${nomeDieta}.pdf`)
      await uploadBytes(storageRef, selectedPDF)
      const url = await getDownloadURL(storageRef)
      await updateDoc(doc(db, "pacientes", id), {
        dietas: arrayUnion({ nome: nomeDieta, url }),
      })
      setIsDietUploaded(true)
      setNomeDieta("")
      setSelectedPDF(null)
      toast({ title: "Sucesso", description: "Dieta enviada com sucesso!" })
    } catch (error) {
      console.error("Erro ao enviar dieta:", error)
      toast({ title: "Erro", description: "Falha ao enviar dieta." })
    } finally {
      setIsSubmittingDiet(false)
      setSubmitButtonText("Enviar Dieta")
      setSubmitButtonColorClass("bg-indigo-600 hover:bg-indigo-700")
    }
  }

  const handlePhotoUpload = async () => {
    if (!selectedPhoto || !tipoFoto.trim()) {
      toast({ title: "Erro", description: "Selecione a foto e o tipo." })
      return
    }
    try {
      const storageRef = ref(storage, `fotos/${user?.email}/${id}/${tipoFoto}.jpg`)
      await uploadBytes(storageRef, selectedPhoto)
      const url = await getDownloadURL(storageRef)
      await updateDoc(doc(db, "pacientes", id), {
        fotos: arrayUnion({ tipo: tipoFoto, url }),
      })
      setIsPhotosUploaded(true)
      setSelectedPhoto(null)
      toast({ title: "Sucesso", description: "Foto enviada com sucesso!" })
    } catch (error) {
      console.error("Erro ao enviar foto:", error)
      toast({ title: "Erro", description: "Falha ao enviar foto." })
    }
  }

  const handleIndividualMaterialUpload = async () => {
    if (!selectedIndividualPDF || !nomeMaterialIndividual.trim()) {
      toast({ title: "Erro", description: "Preencha o nome e selecione um arquivo PDF." })
      return
    }
    try {
      setIsSubmittingIndividualMaterial(true)
      setSubmitIndividualMaterialText("Enviando...")
      setSubmitIndividualMaterialColorClass("bg-gray-400")
      const storageRef = ref(
        storage,
        `materiais/${user?.email}/${id}/${nomeMaterialIndividual}.pdf`
      )
      await uploadBytes(storageRef, selectedIndividualPDF)
      const url = await getDownloadURL(storageRef)
      await updateDoc(doc(db, "pacientes", id), {
        materiais: arrayUnion({ nome: nomeMaterialIndividual, url }),
      })
      setIndividualMaterials((prev) => [
        ...prev,
        { nome: nomeMaterialIndividual, url },
      ])
      setNomeMaterialIndividual("")
      setSelectedIndividualPDF(null)
      toast({ title: "Sucesso", description: "Material enviado com sucesso!" })
    } catch (error) {
      console.error("Erro ao enviar material:", error)
      toast({ title: "Erro", description: "Falha ao enviar material." })
    } finally {
      setIsSubmittingIndividualMaterial(false)
      setSubmitIndividualMaterialText("Enviar Material")
      setSubmitIndividualMaterialColorClass("bg-indigo-600 hover:bg-indigo-700")
    }
  }

  // ===== Carregamento inicial =====
  useEffect(() => {
    const fetchPatient = async () => {
      if (!id) return
      const docSnap = await getDoc(doc(db, "pacientes", id))
      if (docSnap.exists()) {
        const data = docSnap.data()
        setPatient(data)
        if (Array.isArray(data.metricas)) {
          setMetricas(data.metricas as MetricaEntry[])
        }
      }
    }
    fetchPatient()
  }, [id])

  // ===== Salvar nova métrica =====
  const salvarNovaMetrica = async () => {
    const peso = parseNumber(pesoNovo)
    const altura = parseNumber(alturaNova)
    const cintura = parseNumber(cinturaNovo)
    const quadril = parseNumber(quadrilNovo)
    const braco = parseNumber(bracoNovo)

    const imc = calculateIMC(peso, altura)
    const rcq = calculateRCQ(cintura, quadril)
    const cmb = calculateCMB(braco)
    const classificacaoImc = classifyIMC(imc)
    const riscoRcq = classifyRCQ(rcq, sexoAvaliacao)
    const classificacaoCmb = classifyCMB(cmb)

    // Massa gordura/magra
    const massaGordura = calculateMassaGordura(bioPercentGordura ? parseNumber(bioPercentGordura) : 0, peso)
    const massaLivre = calculateMassaLivreGordura(peso, massaGordura)
    const massaResidual = calculateMassaResidual(peso)

    // Dobras - cálculo apenas se incluído
    let antrop: HistoricoAntrop | undefined
    if (includeAntrop) {
      const pts: Record<string, number> = {
        peitoral: toNum(dobraPeitoral),
        abdominal: toNum(dobraAbdominal),
        coxa: toNum(dobraCoxa),
        tricipital: toNum(dobraTricipital),
        supraIliaca: toNum(dobraSupraIliaca),
        axilarMedia: toNum(dobraAxilarMedia),
        subescapular: toNum(dobraSubescapular),
        bicipital: toNum(dobraBicipital),
        toracica: toNum(dobraToracica),
        supraespinhal: toNum(dobraSupraespinhal),
        panturrilha: toNum(dobraPanturrilha),
      }
      const { soma, densidade, percentual } = calcSkinfold(
        protocoloDobras,
        sexoAvaliacao,
        getIdade(),
        pts
      )
      antrop = {
        protocolo: protocoloDobras,
        sexoParaCalculo: sexoAvaliacao,
        pontos: pts,
        somatorioDobras: soma,
        densidadeCorporal: densidade,
        gorduraPercentualSiri: percentual,
      }
    }

    // Bioimpedância
    let bio: HistoricoBio | undefined
    if (includeBio) {
      bio = {
        gorduraPercentual: parseNumber(bioPercentGordura),
        classificacaoGordura: classifyGordura(parseNumber(bioPercentGordura)),
        percentualMassaMuscular: parseNumber(bioPercentMassaMuscular),
        massaMuscular: parseNumber(bioMassaMuscular),
        massaGordura: parseNumber(bioMassaGordura),
        massaLivreGordura: parseNumber(bioMassaLivre),
        indiceGorduraVisceral: parseNumber(bioIGV),
      }
    }

    const novaMetrica: MetricaEntry = {
      data: dataNovaMetrica || new Date().toISOString().split("T")[0],
      basico: {
        data: dataNovaMetrica || new Date().toISOString().split("T")[0],
        peso,
        altura,
        imc,
        classificacaoImc,
        rcq,
        riscoRcq,
        cmb,
        classificacaoCmb,
        massaGordura,
        massaResidual,
        massaLivreGordura: massaLivre,
        massaGorduraPercent: bio?.gorduraPercentual,
        massaLivreGorduraPercent: bio ? 100 - (bio.gorduraPercentual || 0) : undefined,
      },
      bio,
      antrop,
    }

    try {
      const refDoc = doc(db, "pacientes", id)
      await updateDoc(refDoc, {
        metricas: arrayUnion(novaMetrica),
      })
      setMetricas((prev) => [...prev, novaMetrica])
      toast({ title: "Sucesso", description: "Medição salva com sucesso!" })
    } catch (err) {
      console.error("Erro ao salvar métrica:", err)
      toast({ title: "Erro", description: "Falha ao salvar métrica." })
    }
  }

  // ===== Excluir métrica =====
  const excluirMetrica = async (metrica: MetricaEntry) => {
    try {
      const refDoc = doc(db, "pacientes", id)
      await updateDoc(refDoc, {
        metricas: arrayRemove(metrica),
      })
      setMetricas((prev) => prev.filter((m) => m !== metrica))
      toast({ title: "Sucesso", description: "Medição excluída." })
    } catch (err) {
      console.error("Erro ao excluir métrica:", err)
      toast({ title: "Erro", description: "Falha ao excluir." })
    }
  }
  return (
    <div className="p-6 space-y-8">
      {/* -------- BLOCO 1: ANÁLISES BÁSICAS -------- */}
      <Card>
        <CardHeader>
          <CardTitle>Análises básicas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label>Data da Medição</Label>
            <Input
              type="date"
              value={dataNovaMetrica}
              onChange={(e) => setDataNovaMetrica(e.target.value)}
            />
          </div>
          <div>
            <Label>Peso (kg)</Label>
            <Input
              value={pesoNovo}
              onChange={(e) => setPesoNovo(e.target.value)}
              placeholder="Ex: 70,5"
            />
          </div>
          <div>
            <Label>Altura (cm)</Label>
            <Input
              value={alturaNova}
              onChange={(e) => setAlturaNova(e.target.value)}
              placeholder="Ex: 170"
            />
          </div>
          <div>
            <Label>Cintura (cm)</Label>
            <Input
              value={cinturaNovo}
              onChange={(e) => setCinturaNovo(e.target.value)}
              placeholder="Ex: 82"
            />
          </div>
          <div>
            <Label>Quadril (cm)</Label>
            <Input
              value={quadrilNovo}
              onChange={(e) => setQuadrilNovo(e.target.value)}
              placeholder="Ex: 95"
            />
          </div>
          <div>
            <Label>Braço (cm)</Label>
            <Input
              value={bracoNovo}
              onChange={(e) => setBracoNovo(e.target.value)}
              placeholder="Ex: 30"
            />
          </div>
        </CardContent>
      </Card>

      {/* -------- BLOCO 2: DOBRAS CUTÂNEAS -------- */}
      <Card>
        <CardHeader>
          <CardTitle>Dobras cutâneas (antropometria)</CardTitle>
          <div className="flex items-center gap-4">
            <Switch
              checked={includeAntrop}
              onCheckedChange={setIncludeAntrop}
            />
            <span>Incluir antropometria</span>
          </div>
        </CardHeader>
        {includeAntrop && (
          <CardContent className="space-y-4">
            {/* Botões de seleção de protocolo */}
            <div className="flex flex-wrap gap-2">
              {[
                "Pollock 3",
                "Pollock 7",
                "Petroski",
                "Guedes",
                "Durnin",
                "Faulkner",
                "Nenhum",
              ].map((prot) => (
                <Button
                  key={prot}
                  variant={
                    protocoloDobras === prot ? "default" : "outline"
                  }
                  onClick={() => setProtocoloDobras(prot)}
                >
                  {prot}
                </Button>
              ))}
            </div>

            {/* Sexo dentro do card */}
            <div>
              <Label>Sexo para cálculo</Label>
              <Select
                value={sexoAvaliacao}
                onValueChange={setSexoAvaliacao}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Inputs de dobras apenas do protocolo selecionado */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {getCamposDobras(protocoloDobras).map((campo) => (
                <div key={campo.id}>
                  <Label>{campo.label} (mm)</Label>
                  <Input
                    value={dobras[campo.id] || ""}
                    onChange={(e) =>
                      setDobras({
                        ...dobras,
                        [campo.id]: e.target.value,
                      })
                    }
                    placeholder={`ex: ${campo.exemplo}`}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* -------- BLOCO 3: BIOIMPEDÂNCIA -------- */}
      <Card>
        <CardHeader>
          <CardTitle>Análises por bioimpedância</CardTitle>
          <div className="flex items-center gap-4">
            <Switch
              checked={includeBio}
              onCheckedChange={setIncludeBio}
            />
            <span>Incluir bioimpedância</span>
          </div>
        </CardHeader>
        {includeBio && (
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>% Gordura</Label>
              <Input
                value={bioPercentGordura}
                onChange={(e) => setBioPercentGordura(e.target.value)}
                placeholder="Ex: 26.5"
              />
            </div>
            <div>
              <Label>% Massa Muscular</Label>
              <Input
                value={bioPercentMassaMuscular}
                onChange={(e) =>
                  setBioPercentMassaMuscular(e.target.value)
                }
                placeholder="Ex: 40.8"
              />
            </div>
            <div>
              <Label>Massa Muscular (kg)</Label>
              <Input
                value={bioMassaMuscular}
                onChange={(e) => setBioMassaMuscular(e.target.value)}
                placeholder="Ex: 27"
              />
            </div>
            <div>
              <Label>Massa de Gordura (kg)</Label>
              <Input
                value={bioMassaGordura}
                onChange={(e) => setBioMassaGordura(e.target.value)}
                placeholder="Ex: 18.6"
              />
            </div>
            <div>
              <Label>Massa Livre de Gordura (kg)</Label>
              <Input
                value={bioMassaLivre}
                onChange={(e) => setBioMassaLivre(e.target.value)}
                placeholder="Ex: 48.8"
              />
            </div>
            <div>
              <Label>Índice de Gordura Visceral</Label>
              <Input
                value={bioIGV}
                onChange={(e) => setBioIGV(e.target.value)}
                placeholder="Ex: 8"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Botão de salvar */}
      <div className="flex justify-end">
        <Button onClick={salvarNovaMetrica}>Salvar Medição</Button>
      </div>
      {/* --------- GRÁFICO DE COMPOSIÇÃO (%) --------- */}
      {isClient && metricas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Composição corporal (%)</CardTitle>
            <CardDescription>Percentual de massa gorda e massa livre ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto w-full max-w-4xl">
              <div className="w-full" style={{ minWidth: 520, height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metricas.map((m: any) => {
                      const mgp =
                        typeof m.massaGorduraPercent === "number"
                          ? m.massaGorduraPercent
                          : typeof m.gorduraPercentual === "number"
                          ? m.gorduraPercentual
                          : 0
                      const mlgp = Math.max(0, 100 - (Number(mgp) || 0))
                      return {
                        data:
                          m.data && !isNaN(new Date(m.data).getTime())
                            ? new Date(m.data).toLocaleDateString("pt-BR").slice(0, 5)
                            : m.data || "",
                        massaGorda: Number(Number(mgp).toFixed(1)),
                        massaLivre: Number(Number(mlgp).toFixed(1)),
                      }
                    })}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="massaGorda" name="Massa gorda (%)" stackId="a" fill="#6366F1" />
                    <Bar dataKey="massaLivre" name="Massa livre (%)" stackId="a" fill="#C7D2FE" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* --------- HISTÓRICO (3 BLOCOS) --------- */}
      <div className="space-y-8">
        {/* Bloco A: Análises básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico — Análises básicas</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {metricas.length > 0 ? (
              <table className="w-full text-sm text-left border">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Métrica</th>
                    {metricas.map((m: any, i: number) => (
                      <th key={i} className="p-2 text-center">
                        {m.data && !isNaN(new Date(m.data).getTime())
                          ? new Date(m.data).toLocaleDateString("pt-BR")
                          : "Sem data"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { k: "peso", label: "Peso (kg)" },
                    { k: "altura", label: "Altura (cm)" },
                    { k: "cintura", label: "Cintura (cm)" },
                    { k: "quadril", label: "Quadril (cm)" },
                    { k: "braco", label: "Braço (cm)" },
                    { k: "imc", label: "IMC (kg/m²)" },
                    { k: "rcq", label: "RCQ" },
                    { k: "cmb", label: "CMB (cm)" },
                  ].map((row) => (
                    <tr key={row.k} className="border-b hover:bg-muted/40">
                      <td className="p-2 font-medium">{row.label}</td>
                      {metricas.map((m: any, i: number) => (
                        <td key={i} className="p-2 text-center">
                          {m[row.k] === 0 || m[row.k] == null || m[row.k] === "" ? "-" : m[row.k]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">Sem registros.</p>
            )}
          </CardContent>
        </Card>

        {/* Bloco B: Bioimpedância */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Histórico — Bioimpedância</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {metricas.some((m: any) => !!m.bio) ? (
              <table className="w-full text-sm text-left border">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Indicador</th>
                    {metricas.map((m: any, i: number) => (
                      <th key={i} className="p-2 text-center">
                        {m.data && !isNaN(new Date(m.data).getTime())
                          ? new Date(m.data).toLocaleDateString("pt-BR")
                          : "Sem data"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { k: "percentGordura", label: "% Gordura" },
                    { k: "percentMassaMuscular", label: "% Massa Muscular" },
                    { k: "massaMuscular", label: "Massa Muscular (kg)" },
                    { k: "massaGordura", label: "Massa de Gordura (kg)" },
                    { k: "massaLivre", label: "Massa Livre (kg)" },
                    { k: "igv", label: "Índice de Gordura Visceral" },
                  ].map((row) => (
                    <tr key={row.k} className="border-b hover:bg-muted/40">
                      <td className="p-2 font-medium">{row.label}</td>
                      {metricas.map((m: any, i: number) => (
                        <td key={i} className="p-2 text-center">
                          {m?.bio?.[row.k] === 0 || m?.bio?.[row.k] == null || m?.bio?.[row.k] === ""
                            ? "-"
                            : m.bio[row.k]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-muted-foreground">Sem registros de bioimpedância.</p>
            )}
          </CardContent>
        </Card>

        {/* Bloco C: Antropometria (Dobras) */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico — Medidas antropométricas</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {metricas.some((m: any) => !!m.antrop) ? (
              <>
                {/* Tabela 1: protocolo/sexo/somatório/densidade/%gordura */}
                <table className="w-full text-sm text-left border mb-6">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Indicador</th>
                      {metricas.map((m: any, i: number) => (
                        <th key={i} className="p-2 text-center">
                          {m.data && !isNaN(new Date(m.data).getTime())
                            ? new Date(m.data).toLocaleDateString("pt-BR")
                            : "Sem data"}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { k: "protocolo", label: "Protocolo" },
                      { k: "sexo", label: "Sexo (cálculo)" },
                      { k: "somatorioDobras", label: "Somatório de Dobras (mm)" },
                      { k: "densidadeCorporal", label: "Densidade Corporal (g/mL)" },
                      { k: "gorduraPercentual", label: "% Gordura (Siri)" },
                      { k: "massaGorduraPercent", label: "% Massa gorda" },
                      { k: "massaLivreGorduraPercent", label: "% Massa livre" },
                      { k: "massaGordura", label: "Massa de Gordura (kg)" },
                      { k: "massaLivreGordura", label: "Massa Livre (kg)" },
                      { k: "massaResidual", label: "Massa Residual (kg)" },
                    ].map((row) => (
                      <tr key={row.k} className="border-b hover:bg-muted/40">
                        <td className="p-2 font-medium">{row.label}</td>
                        {metricas.map((m: any, i: number) => (
                          <td key={i} className="p-2 text-center">
                            {m?.antrop?.[row.k] === 0 || m?.antrop?.[row.k] == null || m?.antrop?.[row.k] === ""
                              ? "-"
                              : m.antrop[row.k]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tabela 2: dobras por ponto (mostra só os que existem na medição) */}
                <table className="w-full text-sm text-left border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Ponto de dobra (mm)</th>
                      {metricas.map((m: any, i: number) => (
                        <th key={i} className="p-2 text-center">
                          {m.data && !isNaN(new Date(m.data).getTime())
                            ? new Date(m.data).toLocaleDateString("pt-BR")
                            : "Sem data"}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["peitoral", "Peitoral"],
                      ["abdominal", "Abdominal"],
                      ["coxa", "Coxa"],
                      ["tricipital", "Tricipital"],
                      ["suprailiaca", "Supra-ilíaca"],
                      ["axilarMedia", "Axilar média"],
                      ["subescapular", "Subescapular"],
                    ].map(([k, label]) => (
                      <tr key={k} className="border-b hover:bg-muted/40">
                        <td className="p-2 font-medium">{label}</td>
                        {metricas.map((m: any, i: number) => (
                          <td key={i} className="p-2 text-center">
                            {m?.antrop?.dobras?.[k] === 0 ||
                            m?.antrop?.dobras?.[k] == null ||
                            m?.antrop?.dobras?.[k] === ""
                              ? "-"
                              : m.antrop.dobras[k]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sem registros de antropometria.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* =========================== HELPERS (PARTE 4) =========================== */

/** Retorna os campos de dobras por protocolo */
function getCamposDobras(protocolo: string) {
  switch (protocolo) {
    case "Pollock 3":
      return [
        { id: "coxa", label: "Coxa", exemplo: "18" },
        { id: "peitoral", label: "Peitoral (♂)", exemplo: "10", only: "M" },
        { id: "abdominal", label: "Abdominal (♂)", exemplo: "20", only: "M" },
        { id: "tricipital", label: "Tricipital (♀)", exemplo: "18", only: "F" },
        { id: "suprailiaca", label: "Supra-ilíaca (♀)", exemplo: "16", only: "F" },
      ]
    case "Pollock 7":
      return [
        { id: "peitoral", label: "Peitoral", exemplo: "10" },
        { id: "axilarMedia", label: "Axilar média", exemplo: "12" },
        { id: "tricipital", label: "Tricipital", exemplo: "18" },
        { id: "subescapular", label: "Subescapular", exemplo: "14" },
        { id: "abdominal", label: "Abdominal", exemplo: "20" },
        { id: "suprailiaca", label: "Supra-ilíaca", exemplo: "16" },
        { id: "coxa", label: "Coxa", exemplo: "18" },
      ]
    case "Petroski":
      // Ex.: tricipital + subescapular + suprailíaca + panturrilha medial (adaptado sem panturrilha)
      return [
        { id: "tricipital", label: "Tricipital", exemplo: "18" },
        { id: "subescapular", label: "Subescapular", exemplo: "14" },
        { id: "suprailiaca", label: "Supra-ilíaca", exemplo: "16" },
        { id: "coxa", label: "Coxa", exemplo: "18" },
      ]
    case "Guedes":
      // Ex.: tricipital + subescapular + suprailíaca + coxa
      return [
        { id: "tricipital", label: "Tricipital", exemplo: "18" },
        { id: "subescapular", label: "Subescapular", exemplo: "14" },
        { id: "suprailiaca", label: "Supra-ilíaca", exemplo: "16" },
        { id: "coxa", label: "Coxa", exemplo: "18" },
      ]
    case "Durnin":
      // Ex.: bíceps + tríceps + subescapular + suprailíaca (usando tricipital no lugar de bíceps para simplificar UI)
      return [
        { id: "tricipital", label: "Tricipital", exemplo: "18" },
        { id: "subescapular", label: "Subescapular", exemplo: "14" },
        { id: "suprailiaca", label: "Supra-ilíaca", exemplo: "16" },
        { id: "peitoral", label: "Peitoral", exemplo: "10" },
      ]
    case "Faulkner":
      // Ex.: tríceps + subescapular + supra-ilíaca + abdome (variação)
      return [
        { id: "tricipital", label: "Tricipital", exemplo: "18" },
        { id: "subescapular", label: "Subescapular", exemplo: "14" },
        { id: "suprailiaca", label: "Supra-ilíaca", exemplo: "16" },
        { id: "abdominal", label: "Abdominal", exemplo: "20" },
      ]
    default:
      return []
  }
}

/** Normaliza as dobras para salvar/mostrar */
function buildAntropometriaPayload({
  protocolo,
  sexo,
  dobras,
  peso,
  idade,
}: {
  protocolo: string
  sexo: string
  dobras: Record<string, string>
  peso: number
  idade: number
}) {
  // soma conforme protocolos mais usados (quando aplicável)
  const n = (v?: string) => (v && v.trim() !== "" ? Number(v.replace(",", ".")) : 0)
  const fem = (sexo || "").toLowerCase().startsWith("f")

  let soma = 0
  if (protocolo === "Pollock 3") {
    soma = fem
      ? n(dobras.tricipital) + n(dobras.suprailiaca) + n(dobras.coxa)
      : n(dobras.peitoral) + n(dobras.abdominal) + n(dobras.coxa)
  } else if (protocolo === "Pollock 7") {
    soma =
      n(dobras.peitoral) +
      n(dobras.axilarMedia) +
      n(dobras.tricipital) +
      n(dobras.subescapular) +
      n(dobras.abdominal) +
      n(dobras.suprailiaca) +
      n(dobras.coxa)
  } else {
    // Outros protocolos: somatório simples dos campos presentes
    soma = Object.values(dobras).reduce((acc, v) => acc + n(v), 0)
  }

  // densidade (reaproveitando suas funções da PARTE 1)
  let dens = 0
  if (protocolo === "Pollock 3") dens = densidadePollock3(soma, idade, sexo)
  else if (protocolo === "Pollock 7") dens = densidadePollock7(soma, idade, sexo)
  else dens = soma > 0 ? 1.1 - soma * 0.0005 - idade * 0.0002 : 0 // aproximação genérica p/ outros

  const perc = dens ? siriPercentFat(dens) : 0
  const massaGordura = peso && perc ? (perc / 100) * peso : 0
  const massaLivreGordura = peso ? peso - massaGordura : 0
  const massaResidual = peso ? peso * 0.207 : 0
  const mgPercent = peso > 0 ? (massaGordura / peso) * 100 : 0
  const mlgPercent = peso > 0 ? 100 - mgPercent : 0

  return {
    protocolo,
    sexo,
    dobras: Object.fromEntries(
      Object.entries(dobras).map(([k, v]) => [k, v && v !== "" ? Number(v.replace(",", ".")) : undefined])
    ),
    somatorioDobras: soma || undefined,
    densidadeCorporal: dens || undefined,
    gorduraPercentual: perc || undefined,
    massaGordura: massaGordura || undefined,
    massaLivreGordura: massaLivreGordura || undefined,
    massaResidual: massaResidual || undefined,
    massaGorduraPercent: mgPercent || undefined,
    massaLivreGorduraPercent: mlgPercent || undefined,
  }
}

/** Salva nova medição (substitui por data) */
async function salvarNovaMetrica() {
  if (!user?.email || !patient) return

  const peso = parseNumber(pesoNovo)
  const altura = parseNumber(alturaNova)
  const cintura = parseNumber(cinturaNovo)
  const quadril = parseNumber(quadrilNovo)
  const braco = parseNumber(bracoNovo)

  const imc = calculateIMC(peso, altura)
  const rcq = calculateRCQ(cintura, quadril)
  const cmb = calculateCMB(braco)

  // payload base
  const nova: any = {
    data: dataNovaMetrica,
    peso,
    altura,
    cintura,
    quadril,
    braco,
    imc: imc || undefined,
    rcq: rcq || undefined,
    cmb: cmb || undefined,
  }

  // bioimpedância (opcional)
  if (includeBio) {
    nova.bio = {
      percentGordura: parseNumber(bioPercentGordura),
      percentMassaMuscular: parseNumber(bioPercentMassaMuscular),
      massaMuscular: parseNumber(bioMassaMuscular),
      massaGordura: parseNumber(bioMassaGordura),
      massaLivre: parseNumber(bioMassaLivre),
      igv: parseNumber(bioIGV),
    }
  }

  // antropometria (opcional)
  if (includeAntrop && protocoloDobras !== "Nenhum") {
    const idade = getIdade()
    nova.antrop = buildAntropometriaPayload({
      protocolo: protocoloDobras,
      sexo: sexoAvaliacao,
      dobras,
      peso,
      idade,
    })
  }

  try {
    const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
    const snap = await getDoc(refp)
    const hist: any[] = snap.exists() ? (snap.data().historicoMetricas || []) : []

    // substitui se mesma data
    const filtrado = hist.filter((m) => m.data !== nova.data)
    const atualizado = [...filtrado, nova].sort(
      (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
    )

    await updateDoc(refp, { historicoMetricas: atualizado })
    setPatient((prev: any) => (prev ? { ...prev, historicoMetricas: atualizado } : prev))
    setMetricas(atualizado)
    toast({ title: "Nova métrica salva com sucesso!" })

    // limpar campos (somente inputs editáveis)
    setDataNovaMetrica("")
    setPesoNovo("")
    setAlturaNova("")
    setCinturaNovo("")
    setQuadrilNovo("")
    setBracoNovo("")
    setDobras({})
    setIncludeAntrop(false)
    setIncludeBio(false)
    setBioPercentGordura("")
    setBioPercentMassaMuscular("")
    setBioMassaMuscular("")
    setBioMassaGordura("")
    setBioMassaLivre("")
    setBioIGV("")
  } catch (error) {
    console.error(error)
    toast({
      title: "Erro ao salvar métrica",
      description: "Verifique os campos e tente novamente.",
      variant: "destructive",
    })
  }
}
