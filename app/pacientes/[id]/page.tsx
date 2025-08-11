"use client"

import {
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
  DollarSign,   
  User,         
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

/* =========================================================
   Tipos originais + ajustes mínimos (mantidos)
========================================================= */
type MetricaEntry = {
  data: string
  peso?: number
  altura?: number
  cintura?: number
  quadril?: number
  braco?: number
  somatorioDobras?: number
  densidadeCorporal?: number
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
}

/* =========================================================
   NOVO: chaves de protocolos + rótulos (mantidos/expandidos)
========================================================= */
type ProtocoloKey =
  | "pollock3"
  | "pollock7"
  | "petroski"
  | "guedes"
  | "durnin"
  | "faulkner"
  | "nenhum"

const PROTO_LABEL: Record<Exclude<ProtocoloKey, "nenhum">, string> = {
  pollock3: "Jackson & Pollock (3)",
  pollock7: "Jackson & Pollock (7)",
  petroski: "Petroski",
  guedes: "Guedes",
  durnin: "Durnin & Womersley",
  faulkner: "Faulkner",
}

/* =========================================================
   Componente
========================================================= */
export default function PatientDetailPage() {
  // Upload/diet/foto/material (mantidos)
  const [isDietUploaded, setIsDietUploaded] = useState(false)
  const [isPhotosUploaded, setIsPhotosUploaded] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null)
  const [nomeDieta, setNomeDieta] = useState("")
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [tipoFoto, setTipoFoto] = useState("Foto Frontal")

  const [selectedIndividualPDF, setSelectedIndividualPDF] = useState<File | null>(null)
  const [nomeMaterialIndividual, setNomeMaterialIndividual] = useState("")
  const [individualMaterials, setIndividualMaterials] = useState<any[]>([])
  const [isSubmittingIndividualMaterial, setIsSubmittingIndividualMaterial] = useState(false)
  const [submitIndividualMaterialText, setSubmitIndividualMaterialText] = useState("Enviar Material")
  const [submitIndividualMaterialColorClass, setSubmitIndividualMaterialColorClass] = useState(
    "bg-indigo-600 hover:bg-indigo-700"
  )

  // Estado geral (mantido)
  const [metricas, setMetricas] = useState<MetricaEntry[]>([])
  const params = useParams()
  const rawId = (params?.id as string | undefined) ?? ""
  const id = rawId ? decodeURIComponent(rawId) : ""

  const pathname = usePathname()
  const router = useRouter()
  const [user] = useAuthState(auth)
  const { t } = useLanguage()
  const { toast } = useToast()
  const [patient, setPatient] = useState<any | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [dataNovaMetrica, setDataNovaMetrica] = useState("")
  const [metricaEditando, setMetricaEditando] = useState<any>(null)
  const [metricaParaExcluir, setMetricaParaExcluir] = useState<any | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [editInfoOpen, setEditInfoOpen] = useState(false)
  const [editMetricsOpen, setEditMetricsOpen] = useState(false)
  const [isSubmittingDiet, setIsSubmittingDiet] = useState(false)
  const [submitButtonText, setSubmitButtonText] = useState("Enviar Dieta")
  const [submitButtonColorClass, setSubmitButtonColorClass] = useState("bg-indigo-600 hover:bg-indigo-700")
  const [erroNomeDieta, setErroNomeDieta] = useState(false)

  // Entradas base (mantidas)
  const [pesoNovo, setPesoNovo] = useState("")
  const [alturaNova, setAlturaNova] = useState("")
  const [cinturaNovo, setCinturaNovo] = useState("")
  const [quadrilNovo, setQuadrilNovo] = useState("")
  const [bracoNovo, setBracoNovo] = useState("")
  const [gorduraPercentualNovoInput, setGorduraPercentualNovoInput] = useState("")
  const [somatorioDobrasNovo, setSomatorioDobrasNovo] = useState("")
  const [densidadeCorporalNovoInput, setDensidadeCorporalNovoInput] = useState("")

  // ====== NOVO: protocolos extras e sexo normalizado ======
  const [protocoloDobras, setProtocoloDobras] = useState<ProtocoloKey>("pollock3")
  const [sexoAvaliacao, setSexoAvaliacao] = useState<string>((patient?.sexo ?? "feminino").toLowerCase())

  // Entradas de dobras (mantidas + ampliadas p/ novos protocolos)
  const [dobraPeitoral, setDobraPeitoral] = useState("")
  const [dobraAbdominal, setDobraAbdominal] = useState("")
  const [dobraCoxa, setDobraCoxa] = useState("")
  const [dobraTricipital, setDobraTricipital] = useState("")
  const [dobraSupraIliaca, setDobraSupraIliaca] = useState("")
  const [dobraAxilarMedia, setDobraAxilarMedia] = useState("")
  const [dobraSubescapular, setDobraSubescapular] = useState("")
  // NOVOS campos para protocolos alternativos
  const [dobraBicipital, setDobraBicipital] = useState("")       // Durnin & Womersley
  const [dobraToracica, setDobraToracica] = useState("")         // reserva (se precisar)
  const [dobraSupraespinhal, setDobraSupraespinhal] = useState("") // reserva (se precisar)
  const [dobraPanturrilha, setDobraPanturrilha] = useState("")   // Petroski (variações)

  // Calculados (mantidos)
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

  // Edição simples (mantido)
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
    if (patient.sexo) setSexoAvaliacao(String(patient.sexo).toLowerCase())
  }, [patient])

  /* ======================= Utils (mantidos) ======================= */
  const parseNumber = (value: string) => {
    const cleanedValue = value.replace(",", ".")
    return isNaN(Number(cleanedValue)) || cleanedValue.trim() === "" ? 0 : Number(cleanedValue)
  }

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

  /** Siri: %G = 495/D − 450 */
  const siriPercent = (d: number) => (d ? 495 / d - 450 : 0)

  /* ======================= Densidades por modelo ======================= */
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
  // Petroski (7 dobras – log10 da soma)
  const densidadePetroski7 = (sum: number, idade: number, sexo: string) => {
    const fem = (sexo || "").toLowerCase().startsWith("f")
    return fem
      ? 1.1954713 - 0.07513507 * Math.log10(sum || 1) - 0.00041072 * idade
      : 1.17136 - 0.06706 * Math.log10(sum || 1) - 0.000221 * idade
  }
  // Guedes (3 dobras: tri + supra + coxa) com log10
  const densidadeGuedes3 = (sum: number, idade: number, sexo: string) => {
    const fem = (sexo || "").toLowerCase().startsWith("f")
    return fem
      ? 1.1714 - 0.0779 * Math.log10(sum || 1) - 0.00073 * idade
      : 1.17136 - 0.06706 * Math.log10(sum || 1) - 0.000221 * idade
  }
  // Durnin & Womersley (bicipital + tricipital + subescapular + supra-ilíaca)
  const densidadeDurnin4 = (sum: number, idade: number, sexo: string) => {
    const fem = (sexo || "").toLowerCase().startsWith("f")
    const L = Math.log10(sum || 1)
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
  // Faulkner (4 dobras) – %G ≈ 0.153*somatório + 5.783  → densidade equivalente
  const densidadeFaulkner4 = (sum: number) => {
    const perc = 0.153 * sum + 5.783
    return 495 / (perc + 450)
  }

  /* ======================= Recalcular da UI de dobras ======================= */
  const recalcFromSkinfolds = useCallback(() => {
    const n = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(",", ".")))
    const idade = getIdade()
    const sexo = (sexoAvaliacao || "").toLowerCase()

    let soma = 0
    let dens = 0

    switch (protocoloDobras) {
      case "pollock3": {
        const fem = sexo.startsWith("f")
        soma = fem
          ? n(dobraTricipital) + n(dobraSupraIliaca) + n(dobraCoxa)
          : n(dobraPeitoral) + n(dobraAbdominal) + n(dobraCoxa)
        dens = densidadePollock3(soma, idade, sexo)
        break
      }
      case "pollock7": {
        soma =
          n(dobraPeitoral) +
          n(dobraAxilarMedia) +
          n(dobraTricipital) +
          n(dobraSubescapular) +
          n(dobraAbdominal) +
          n(dobraSupraIliaca) +
          n(dobraCoxa)
        dens = densidadePollock7(soma, idade, sexo)
        break
      }
      case "petroski": {
        soma =
          n(dobraTricipital) + n(dobraSubescapular) + n(dobraSupraIliaca) + n(dobraCoxa) +
          n(dobraPeitoral) + n(dobraAxilarMedia) // se não preencher, somará 0
        dens = soma > 0 ? densidadePetroski7(soma, idade, sexo) : 0
        break
      }
      case "guedes": {
        soma = n(dobraTricipital) + n(dobraSupraIliaca) + n(dobraCoxa)
        dens = soma > 0 ? densidadeGuedes3(soma, idade, sexo) : 0
        break
      }
      case "durnin": {
        soma = n(dobraBicipital) + n(dobraTricipital) + n(dobraSubescapular) + n(dobraSupraIliaca)
        dens = soma > 0 ? densidadeDurnin4(soma, idade, sexo) : 0
        break
      }
      case "faulkner": {
        soma = n(dobraTricipital) + n(dobraSubescapular) + n(dobraSupraIliaca) + n(dobraAbdominal)
        dens = soma > 0 ? densidadeFaulkner4(soma) : 0
        break
      }
      default:
        soma = 0
        dens = 0
    }

    const perc = siriPercent(dens)

    setSomatorioDobrasNovo(soma ? String(Math.round(soma)) : "")
    setDensidadeCorporalNovoInput(dens ? dens.toFixed(3).replace(".", ",") : "")
    setGorduraPercentualNovoInput(perc ? perc.toFixed(1).replace(".", ",") : "")

    const peso = parseNumber(pesoNovo)
    const mg = (perc / 100) * (peso || 0)
    setMassaGorduraNovo(mg ? mg.toFixed(2).replace(".", ",") : "")
    const mlg = peso ? peso - mg : 0
    setMassaLivreGorduraNovo(mlg ? mlg.toFixed(2).replace(".", ",") : "")
    const mr = calculateMassaResidual(peso)
    setMassaResidualNovo(mr ? mr.toFixed(2).replace(".", ",") : "")
    const mgPerc = peso > 0 ? (mg / peso) * 100 : 0
    setMassaGorduraPercentNovo(mgPerc ? mgPerc.toFixed(1).replace(".", ",") : "")
    setMassaLivreGorduraPercentNovo(mgPerc ? (100 - mgPerc).toFixed(1).replace(".", ",") : "")
  }, [
    protocoloDobras,
    sexoAvaliacao,
    // dobras
    dobraPeitoral,
    dobraAbdominal,
    dobraCoxa,
    dobraTricipital,
    dobraSupraIliaca,
    dobraAxilarMedia,
    dobraSubescapular,
    dobraBicipital,
    // peso
    pesoNovo,
    calculateMassaResidual,
    parseNumber,
  ])

  useEffect(() => {
    recalcFromSkinfolds()
  }, [recalcFromSkinfolds])

  /* ======================= Upload helpers (mantidos) ======================= */
  const uploadPhoto = async (file: File, patientId: string, imageName: string) => {
    if (!file) return null
    const storageRefObj = ref(storage, `pacientes/${patientId}/fotos/${imageName}`)
    const snapshot = await uploadBytes(storageRefObj, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    return downloadURL
  }
  const uploadPDF = async (file: File, patientId: string) => {
    if (!file) return null
    const storageRefObj = ref(storage, `pacientes/${patientId}/dietas/${file.name}`)
    const snapshot = await uploadBytes(storageRefObj, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    return downloadURL
  }
  const uploadIndividualPDF = async (file: File, patientId: string) => {
    if (!file) return null
    const storageRefObj = ref(storage, `pacientes/${patientId}/materiais_individuais/${file.name}`)
    const snapshot = await uploadBytes(storageRefObj, file)
    const downloadURL = await getDownloadURL(snapshot.ref)
    return downloadURL
  }

  /* ======================= Handlers Dieta / Foto / Material ======================= */
  const handleReplaceDiet = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.email) {
      toast({ title: "Erro de autenticação", description: "Usuário não autenticado. Tente novamente." })
      return
    }
    const file = selectedPDF
    if (!file) {
      toast({ title: "Nenhum arquivo selecionado", description: "Selecione um PDF." })
      return
    }
    if (!nomeDieta.trim()) {
      setErroNomeDieta(true)
      return
    } else {
      setErroNomeDieta(false)
    }

    setIsSubmittingDiet(true)
    try {
      const downloadURL = await uploadPDF(file, id)
      const novaDieta = {
        nome: file.name,
        url: downloadURL,
        dataEnvio: new Date().toLocaleDateString("pt-BR"),
        nomeDieta: nomeDieta,
      }
      const refPac = doc(db, "nutricionistas", user.email, "pacientes", id)
      await updateDoc(refPac, { dietas: arrayUnion(novaDieta) })

      setPatient((prev: any) =>
        prev
          ? { ...prev, dietas: prev.dietas ? [...prev.dietas, novaDieta] : [novaDieta] }
          : prev
      )

      // estatística opcional
      const statRef = doc(db, "nutricionistas", user.email, "estatisticas", "dietas")
      try {
        const statSnap = await getDoc(statRef)
        if (statSnap.exists()) {
          const atual = statSnap.data().totalDietasEnviadas || 0
          await updateDoc(statRef, { totalDietasEnviadas: atual + 1, ultimaAtualizacao: new Date().toISOString() })
        } else {
          await setDoc(statRef, { totalDietasEnviadas: 1, ultimaAtualizacao: new Date().toISOString() })
        }
      } catch {}

      setIsDietUploaded(true)
      toast({ title: "Dieta Enviada", description: "A dieta foi enviada com sucesso." })
      setSubmitButtonText("Enviado!")
      setSubmitButtonColorClass("bg-green-500 hover:bg-green-600")
      setTimeout(() => {
        setSubmitButtonText("Enviar Dieta")
        setSubmitButtonColorClass("bg-indigo-600 hover:bg-indigo-700")
        setIsSubmittingDiet(false)
      }, 3000)
      setSelectedPDF(null)
      setNomeDieta("")
    } catch (error) {
      console.error(error)
      toast({ title: "Erro ao enviar dieta", description: "Não foi possível enviar o arquivo." })
      setIsSubmittingDiet(false)
    }
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setSelectedPhoto(file)
  }

  const handleUploadPhotos = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.email) {
      toast({ title: "Erro", description: "Usuário não autenticado." })
      return
    }
    if (!selectedPhoto) {
      toast({ title: "Nenhuma foto selecionada", description: "Selecione uma foto." })
      return
    }

    try {
      const downloadURL = await uploadPhoto(selectedPhoto, id, `${tipoFoto.replace(/\s+/g, "_")}_${Date.now()}`)
      const novaFoto = {
        dataEnvio: new Date().toLocaleDateString("pt-BR"),
        tipo: tipoFoto,
        url: downloadURL,
        nomeArquivo: selectedPhoto.name,
      }
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id)
      await updateDoc(refPaciente, { fotos: arrayUnion(novaFoto) })
      setPatient((prev: any) =>
        prev ? { ...prev, fotos: prev?.fotos ? [...prev.fotos, novaFoto] : [novaFoto] } : prev
      )
      toast({ title: "Foto enviada", description: "A foto foi enviada com sucesso." })
      setSelectedPhoto(null)
    } catch (error) {
      console.error(error)
      toast({ title: "Erro ao enviar foto", description: "Não foi possível enviar a foto." })
    }
  }

  const handleDeletePhoto = async (fotoToDelete: any) => {
    if (!user?.email || !patient) return
    try {
      const novasFotos = (patient.fotos || []).filter((f: any) => f.url !== fotoToDelete.url)
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id)
      await updateDoc(refPaciente, { fotos: novasFotos })
      if (fotoToDelete.nomeArquivo) {
        try {
          await deleteObject(ref(storage, `pacientes/${id}/fotos/${fotoToDelete.nomeArquivo}`))
        } catch {}
      }
      setPatient((prev: any) => ({ ...prev, fotos: novasFotos }))
      toast({ title: "Foto excluída com sucesso" })
    } catch (error) {
      console.error(error)
      toast({ title: "Erro ao excluir foto", description: "Não foi possível remover a foto." })
    }
  }

  const handleUploadIndividualMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.email) {
      toast({ title: "Erro de autenticação", description: "Usuário não autenticado." })
      return
    }
    const file = selectedIndividualPDF
    if (!file) {
      toast({ title: "Nenhum arquivo selecionado", description: "Selecione um PDF." })
      return
    }
    if (!nomeMaterialIndividual.trim()) {
      toast({ title: "Erro", description: "Informe o nome do material." })
      return
    }

    setIsSubmittingIndividualMaterial(true)
    try {
      const storageRefPath = `pacientes/${id}/materiais_individuais/${file.name}`
      const storageRefUpload = ref(storage, storageRefPath)
      const snapshot = await uploadBytes(storageRefUpload, file)
      const downloadURL = await getDownloadURL(snapshot.ref)
      const novoMaterial = {
        nome: file.name,
        nomeMaterial: nomeMaterialIndividual,
        url: downloadURL,
        dataEnvio: new Date().toLocaleDateString("pt-BR"),
      }
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id)
      await updateDoc(refPaciente, { materiaisIndividuais: arrayUnion(novoMaterial) })
      setPatient((prev: any) =>
        prev
          ? {
              ...prev,
              materiaisIndividuais: prev?.materiaisIndividuais
                ? [...prev.materiaisIndividuais, novoMaterial]
                : [novoMaterial],
            }
          : prev
      )
      toast({ title: "Material Individual Enviado", description: "Arquivo enviado com sucesso." })
      setSubmitIndividualMaterialText("Enviado!")
      setSubmitIndividualMaterialColorClass("bg-green-500 hover:bg-green-600")
      setTimeout(() => {
        setSubmitIndividualMaterialText("Enviar Material")
        setSubmitIndividualMaterialColorClass("bg-indigo-600 hover:bg-indigo-700")
        setIsSubmittingIndividualMaterial(false)
      }, 2000)
      setSelectedIndividualPDF(null)
      setNomeMaterialIndividual("")
    } catch (error) {
      console.error(error)
      toast({ title: "Erro ao enviar material", description: "Não foi possível enviar o arquivo." })
      setIsSubmittingIndividualMaterial(false)
    }
  }

  const handleDeleteIndividualMaterial = async (materialToDelete: any) => {
    if (!user?.email || !patient) return
    try {
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id)
      await updateDoc(refPaciente, { materiaisIndividuais: arrayRemove(materialToDelete) })
      try {
        await deleteObject(ref(storage, `pacientes/${id}/materiais_individuais/${materialToDelete.nome}`))
      } catch {}
      setPatient((prev: any) =>
        prev
          ? {
              ...prev,
              materiaisIndividuais: (prev?.materiaisIndividuais || []).filter((m: any) => m.url !== materialToDelete.url),
            }
          : prev
      )
      toast({ title: "Material individual excluído", description: "O material foi removido com sucesso." })
    } catch (error) {
      console.error(error)
      toast({ title: "Erro ao excluir material individual", description: "Não foi possível remover o material." })
    }
  }

  const handleDeleteDiet = async (dietaToDelete: any) => {
    if (!user?.email || !patient) return
    try {
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id)
      await updateDoc(refPaciente, { dietas: arrayRemove(dietaToDelete) })
      try {
        const storageRefPath = ref(storage, `pacientes/${id}/dietas/${dietaToDelete.nome}`)
        await deleteObject(storageRefPath)
      } catch {}
      setPatient((prev: any) =>
        prev ? { ...prev, dietas: (prev.dietas || []).filter((d: any) => d.url !== dietaToDelete.url) } : prev
      )
      toast({ title: "Dieta excluída com sucesso" })
    } catch (error) {
      console.error(error)
      toast({ title: "Erro ao excluir dieta", description: "Não foi possível remover o arquivo." })
    }
  }

  /* ======================= Firestore: buscar/atualizar/excluir paciente ======================= */
  const fetchPatient = async () => {
    if (!user?.email || !id) return
    try {
      const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
      const snap = await getDoc(refp)
      if (snap.exists()) {
        const data = snap.data()
        setPatient({ ...data })
        const historico = (data.historicoMetricas || []) as MetricaEntry[]
        historico.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        setMetricas(historico)
        setIsActive((data.status || "Ativo") === "Ativo")
      }
    } catch (error) {
      console.error("Erro ao buscar paciente ou métricas:", error)
    }
  }

  useEffect(() => {
    fetchPatient()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.email])

  const handleSaveInfo = async () => {
    if (!user?.email) return
    const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
    await updateDoc(refp, {
      nome: editData.name,
      telefone: editData.telefone,
      birthdate: editData.birthdate,
      valorConsulta: editData.valorConsulta,
    })
    setPatient((prev: any) => (prev ? { ...prev, ...editData } : prev))
    toast({ title: "Informações atualizadas com sucesso" })
    setEditInfoOpen(false)
  }

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
    setPatient((prev: any) => (prev ? { ...prev, ...editMetrics } : prev))
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

  const togglePatientStatus = async () => {
    if (!user?.email) return
    const novoStatus = isActive ? "Inativo" : "Ativo"
    const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
    await updateDoc(refp, { status: novoStatus })
    setIsActive(!isActive)
    toast({ title: `Paciente ${novoStatus === "Ativo" ? "ativado" : "inativado"}` })
  }

  const isClient = typeof window !== "undefined"
  /* ======================= Layout / UI principal ======================= */
  return (
    <div className="flex min-h-screen">
      {/* Sidebar fixa */}
      <aside className="hidden w-64 flex-col bg-card border-r border-border lg:flex fixed h-full">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-indigo-600">
            <LineChart className="h-5 w-5" />
            <span>NutriDash</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          <SidebarLinks pathname={pathname} />
        </nav>
      </aside>

      {/* Conteúdo */}
      <div className="flex flex-col flex-1 lg:ml-64">
        {/* Header */}
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
                <SidebarLinks pathname={pathname} />
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

        {/* Main */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto w-full">
            {/* Top actions */}
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
                  <Label htmlFor="patient-status">{isActive ? "Paciente Ativo" : "Paciente Inativo"}</Label>
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
                        Esta ação não pode ser desfeita. Isso removerá permanentemente o paciente e todos os seus dados
                        do Firestore.
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

            {/* Cartão: Informações Pessoais */}
            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Informações Pessoais</CardTitle>
                </div>
                <Button onClick={() => setEditInfoOpen(true)} className="bg-indigo-600 text-white hover:bg-indigo-700">
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nome</p>
                  <p>{patient?.nome || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{patient?.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Telefone</p>
                  <p>{patient?.telefone ? formatTelefone(patient.telefone) : "-"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Nascimento</p>
                  <p>
                    {patient?.birthdate
                      ? new Date(patient.birthdate + "T12:00:00").toLocaleDateString("pt-BR")
                      : "-"}
                  </p>
                </div>
                {patient?.senhaProvisoria && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                      Senha Provisória
                      <button
                        type="button"
                        onClick={() => setMostrarSenha((prev) => !prev)}
                        className="text-indigo-600 text-xs"
                      >
                        {mostrarSenha ? "Ocultar" : "Mostrar"}
                      </button>
                    </p>
                    <p className="font-mono text-sm">{mostrarSenha ? patient.senhaProvisoria : "••••••••"}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modal Editar Informações */}
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
                    <Input value={patient?.email || ""} disabled className="opacity-60 cursor-not-allowed" />
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
                <DialogFooter className="mt-4">
                  <Button
                    type="button"
                    onClick={async () => {
                      setIsSaving(true)
                      await handleSaveInfo()
                      setIsSaving(false)
                    }}
                    disabled={isSaving}
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ===== Tabs: Métricas / Dietas / Fotos / Material Individual ===== */}
            <Tabs defaultValue="metricas" className="w-full mt-6">
              <TabsList className="grid w-full grid-cols-4 md:w-[600px]">
                <TabsTrigger value="metricas">Métricas</TabsTrigger>
                <TabsTrigger value="dietas">Dietas</TabsTrigger>
                <TabsTrigger value="fotos">Fotos</TabsTrigger>
                <TabsTrigger value="material-individual">Material Individual</TabsTrigger>
              </TabsList>

              {/* ====================== ABA: DIETAS ====================== */}
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
                            placeholder="Ex: Dieta de Emagrecimento - Agosto 2025"
                            value={nomeDieta}
                            onChange={(e) => setNomeDieta(e.target.value)}
                          />
                          {erroNomeDieta && (
                            <p className="text-sm text-red-600 mt-1">
                              Por favor, insira o nome da dieta antes de enviar.
                            </p>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <Label>Arquivo PDF</Label>
                          <div className="flex items-center justify-center w-full">
                            <label
                              htmlFor="pdf-upload"
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
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
                                  const file = e.target.files?.[0]
                                  if (file) setSelectedPDF(file)
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        {selectedPDF && <p className="text-sm text-green-600">{selectedPDF.name}</p>}

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
                        {patient.dietas.map((dieta: any, index: number) => {
                          const isUltima = index === patient.dietas.length - 1
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between p-4 rounded-lg border"
                            >
                              <div className="flex items-center gap-4">
                                <FileText className="h-5 w-5 text-indigo-600" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{dieta.nomeDieta || dieta.nome}</p>
                                    {isUltima && (
                                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 border border-green-200">
                                        visível para o paciente
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Enviado em: {dieta.dataEnvio}
                                  </p>
                                </div>
                              </div>

                              <div className="flex gap-2 items-center">
                                <Link href={dieta.url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="outline" size="sm">
                                    Visualizar
                                  </Button>
                                </Link>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-muted-foreground hover:text-red-600"
                                      title="Excluir dieta"
                                    >
                                      <Trash className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir Dieta</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir a dieta{" "}
                                        <strong>{dieta.nomeDieta || dieta.nome}</strong>?
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteDiet(dieta)}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ====================== ABA: FOTOS ====================== */}
              <TabsContent value="fotos" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Enviar Foto</CardTitle>
                    <CardDescription>Envie 1 foto por vez, selecionando o tipo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUploadPhotos}>
                      <div className="flex flex-col gap-4 max-w-xl mx-auto">
                        <div className="grid gap-2">
                          <Label>Tipo da Foto</Label>
                          <select
                            value={tipoFoto}
                            onChange={(e) => setTipoFoto(e.target.value)}
                            className="border rounded p-2 bg-background"
                          >
                            <option value="Foto Frontal">Frontal</option>
                            <option value="Lateral Direita">Lateral Direita</option>
                            <option value="Lateral Esquerda">Lateral Esquerda</option>
                            <option value="Costas">Costas</option>
                          </select>
                        </div>

                        <div className="grid gap-2">
                          <Label>Foto</Label>
                          <div className="flex items-center justify-center w-full">
                            <label
                              htmlFor="photo-upload"
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
                            >
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Camera className="w-8 h-8 mb-2 text-muted-foreground" />
                                <p className="mb-2 text-sm text-muted-foreground">Clique para selecionar a foto</p>
                                <p className="text-xs text-muted-foreground">JPG, PNG (Máx 5MB)</p>
                              </div>
                              <input
                                id="photo-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoChange}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="flex justify-center mt-2">
                          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                            Enviar Foto
                          </Button>
                        </div>

                        {selectedPhoto && (
                          <p className="text-sm text-green-600">{selectedPhoto.name}</p>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {patient?.fotos?.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Histórico de Fotos</CardTitle>
                      <CardDescription>Visualize e gerencie as fotos do paciente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {patient.fotos.map((foto: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4 relative">
                            <div className="flex justify-between items-center mb-2">
                              <p className="text-sm font-medium">{foto.tipo}</p>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    className="text-muted-foreground hover:text-red-600"
                                    title="Excluir foto"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir Foto</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir esta foto?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeletePhoto(foto)}
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              Enviado em: {foto.dataEnvio}
                            </p>
                            {foto.url ? (
                              <Image
                                src={foto.url}
                                alt={foto.tipo}
                                width={600}
                                height={600}
                                className="rounded-md object-cover w-full h-auto"
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              {/* ====================== ABA: MATERIAL INDIVIDUAL ====================== */}
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
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80"
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
                                  const file = e.target.files?.[0]
                                  if (file) setSelectedIndividualPDF(file)
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        {selectedIndividualPDF && (
                          <p className="text-sm text-green-600">{selectedIndividualPDF.name}</p>
                        )}

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

                {patient?.materiaisIndividuais?.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Materiais Individuais Enviados</CardTitle>
                      <CardDescription>Visualize e gerencie os materiais enviados para este paciente.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {patient.materiaisIndividuais.map((material: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                            <div className="flex items-center gap-4">
                              <FileText className="h-5 w-5 text-indigo-600" />
                              <div>
                                <p className="font-medium">{material.nomeMaterial || material.nome}</p>
                                <p className="text-sm text-muted-foreground">Enviado em: {material.dataEnvio}</p>
                              </div>
                            </div>

                            <div className="flex gap-2 items-center">
                              <Link href={material.url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm">Visualizar</Button>
                              </Link>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-red-600"
                                    title="Excluir material"
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir Material</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o material{" "}
                                      <strong>{material.nomeMaterial || material.nome}</strong>?
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

              {/* ====================== ABA: MÉTRICAS ====================== */}
              <TabsContent value="metricas" className="mt-4">
                {/* --------- Histórico (3 blocos) --------- */}
                <div className="space-y-8 mb-8">
                  {/* Bloco A — Análises básicas */}
                  <Card>
                    <CardHeader><CardTitle>Histórico — Análises básicas</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto">
                      {metricas.length > 0 ? (
                        <table className="w-full text-sm text-left border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-2 text-left">Métrica</th>
                              {metricas.map((m, i) => (
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
                                    {m?.[row.k] === 0 || m?.[row.k] == null || m?.[row.k] === "" ? "-" : m[row.k]}
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

                  {/* Bloco B — Bioimpedância */}
                  <Card>
                    <CardHeader><CardTitle>Histórico — Análises por bioimpedância</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto">
                      {metricas.some((m) =>
                        m.gorduraPercentual != null || m.massaGordura != null || m.massaLivreGordura != null
                      ) ? (
                        <table className="w-full text-sm text-left border">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-2 text-left">Indicador</th>
                              {metricas.map((m, i) => (
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
                              { k: "gorduraPercentual", label: "% Gordura" },
                              { k: "massaGordura", label: "Massa de Gordura (kg)" },
                              { k: "massaLivreGordura", label: "Massa Livre (kg)" },
                              { k: "massaGorduraPercent", label: "% Massa gorda" },
                              { k: "massaLivreGorduraPercent", label: "% Massa livre" },
                            ].map((row) => (
                              <tr key={row.k} className="border-b hover:bg-muted/40">
                                <td className="p-2 font-medium">{row.label}</td>
                                {metricas.map((m: any, i: number) => (
                                  <td key={i} className="p-2 text-center">
                                    {m?.[row.k] === 0 || m?.[row.k] == null || m?.[row.k] === "" ? "-" : m[row.k]}
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

                  {/* Bloco C — Medidas antropométricas */}
                  <Card>
                    <CardHeader><CardTitle>Histórico — Medidas antropométricas</CardTitle></CardHeader>
                    <CardContent className="overflow-x-auto">
                      {metricas.some((m) => m.somatorioDobras != null || m.densidadeCorporal != null) ? (
                        <table className="w-full text-sm text-left border mb-6">
                          <thead className="bg-muted">
                            <tr>
                              <th className="p-2 text-left">Indicador</th>
                              {metricas.map((m, i) => (
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
                              { k: "somatorioDobras", label: "Somatório de Dobras (mm)" },
                              { k: "densidadeCorporal", label: "Densidade Corporal (g/mL)" },
                            ].map((row) => (
                              <tr key={row.k} className="border-b hover:bg-muted/40">
                                <td className="p-2 font-medium">{row.label}</td>
                                {metricas.map((m: any, i: number) => (
                                  <td key={i} className="p-2 text-center">
                                    {m?.[row.k] === 0 || m?.[row.k] == null || m?.[row.k] === "" ? "-" : m[row.k]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sem registros de antropometria.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* --------- Gráfico empilhado --------- */}
                {isClient && metricas.length > 0 && (
                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle>Composição corporal (%)</CardTitle>
                      <CardDescription>Percentual de massa gorda e massa livre ao longo do tempo</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mx-auto w-full max-w-[720px]">
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
                              barCategoryGap={metricas.length === 1 ? "40%" : "20%"}
                              barGap={metricas.length === 1 ? 8 : 2}
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

                {/* --------- Nova Medição --------- */}
                <Card>
                  <CardHeader>
                    <CardTitle>Nova Medição</CardTitle>
                    <CardDescription>Separe por blocos e ative apenas o que deseja incluir.</CardDescription>
                  </CardHeader>

                  <CardContent>
                    {/* Switches (visuais) */}
                    <div className="flex flex-wrap items-center gap-6 mb-6">
                      <div className="flex items-center gap-2">
                        <Switch id="sw-antrop" checked={true} onCheckedChange={() => {}} disabled />
                        <Label htmlFor="sw-antrop">Análises básicas</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="sw-bio"
                          checked={gorduraPercentualNovoInput !== ""}
                          onCheckedChange={(v) => { if (!v) setGorduraPercentualNovoInput("") }}
                        />
                        <Label htmlFor="sw-bio">Bioimpedância</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="sw-dobras"
                          checked={protocoloDobras !== "nenhum"}
                          onCheckedChange={(v) => {
                            if (!v) setProtocoloDobras("nenhum")
                            if (v && protocoloDobras === "nenhum") setProtocoloDobras("pollock3")
                          }}
                        />
                        <Label htmlFor="sw-dobras">Antropometria (dobras)</Label>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                      {/* Bloco 1: Análises básicas */}
                      <section className="space-y-4">
                        <div className="rounded-lg border p-3 space-y-3">
                          <div className="grid gap-2">
                            <Label>Data da Medição</Label>
                            <Input
                              type="date"
                              value={dataNovaMetrica}
                              onChange={(e) => setDataNovaMetrica(e.target.value)}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                              <Label>Peso (kg)</Label>
                              <Input value={pesoNovo} onChange={(e) => setPesoNovo(e.target.value)} placeholder="70,5" />
                            </div>
                            <div className="grid gap-2">
                              <Label>Altura (cm)</Label>
                              <Input value={alturaNova} onChange={(e) => setAlturaNova(e.target.value)} placeholder="170" />
                            </div>
                            <div className="grid gap-2">
                              <Label>Cintura (cm)</Label>
                              <Input value={cinturaNovo} onChange={(e) => setCinturaNovo(e.target.value)} placeholder="82" />
                            </div>
                            <div className="grid gap-2">
                              <Label>Quadril (cm)</Label>
                              <Input value={quadrilNovo} onChange={(e) => setQuadrilNovo(e.target.value)} placeholder="95" />
                            </div>
                            <div className="grid gap-2">
                              <Label>Braço (cm)</Label>
                              <Input value={bracoNovo} onChange={(e) => setBracoNovo(e.target.value)} placeholder="30" />
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Bloco 2: Dobras */}
                      <section className="space-y-4">
                        <div className="rounded-lg border p-3 space-y-4">
                          {/* Botões de protocolo */}
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: "pollock3", label: "Pollock 3" },
                              { id: "pollock7", label: "Pollock 7" },
                              { id: "petroski", label: "Petroski" },
                              { id: "guedes", label: "Guedes" },
                              { id: "durnin", label: "Durnin" },
                              { id: "faulkner", label: "Faulkner" },
                              { id: "nenhum", label: "Nenhum" },
                            ].map((p) => (
                              <Button
                                key={p.id}
                                variant={protocoloDobras === p.id ? "default" : "outline"}
                                onClick={() => setProtocoloDobras(p.id as any)}
                                size="sm"
                              >
                                {p.label}
                              </Button>
                            ))}
                          </div>

                          {/* Sexo */}
                          {protocoloDobras !== "nenhum" && (
                            <div className="grid gap-1">
                              <Label>Sexo para cálculo</Label>
                              <select
                                className="border rounded p-2 bg-background"
                                value={sexoAvaliacao}
                                onChange={(e) => setSexoAvaliacao(e.target.value)}
                              >
                                <option value="feminino">Feminino</option>
                                <option value="masculino">Masculino</option>
                              </select>
                            </div>
                          )}

                          {/* Campos por protocolo */}
                          {(() => {
                            if (protocoloDobras === "nenhum") return null

                            const campos =
                              protocoloDobras === "pollock3"
                                ? (sexoAvaliacao || "").toLowerCase().startsWith("m")
                                  ? [
                                      { id: "peitoral", label: "Peitoral (mm)", state: [dobraPeitoral, setDobraPeitoral] },
                                      { id: "abdominal", label: "Abdominal (mm)", state: [dobraAbdominal, setDobraAbdominal] },
                                      { id: "coxa", label: "Coxa (mm)", state: [dobraCoxa, setDobraCoxa] },
                                    ]
                                  : [
                                      { id: "tricipital", label: "Tricipital (mm)", state: [dobraTricipital, setDobraTricipital] },
                                      { id: "suprailiaca", label: "Supra-ilíaca (mm)", state: [dobraSupraIliaca, setDobraSupraIliaca] },
                                      { id: "coxa", label: "Coxa (mm)", state: [dobraCoxa, setDobraCoxa] },
                                    ]
                                : protocoloDobras === "pollock7"
                                ? [
                                    { id: "peitoral", label: "Peitoral (mm)", state: [dobraPeitoral, setDobraPeitoral] },
                                    { id: "axilarMedia", label: "Axilar média (mm)", state: [dobraAxilarMedia, setDobraAxilarMedia] },
                                    { id: "tricipital", label: "Tricipital (mm)", state: [dobraTricipital, setDobraTricipital] },
                                    { id: "subescapular", label: "Subescapular (mm)", state: [dobraSubescapular, setDobraSubescapular] },
                                    { id: "abdominal", label: "Abdominal (mm)", state: [dobraAbdominal, setDobraAbdominal] },
                                    { id: "suprailiaca", label: "Supra-ilíaca (mm)", state: [dobraSupraIliaca, setDobraSupraIliaca] },
                                    { id: "coxa", label: "Coxa (mm)", state: [dobraCoxa, setDobraCoxa] },
                                  ]
                                : protocoloDobras === "petroski"
                                ? [
                                    { id: "tricipital", label: "Tricipital (mm)", state: [dobraTricipital, setDobraTricipital] },
                                    { id: "subescapular", label: "Subescapular (mm)", state: [dobraSubescapular, setDobraSubescapular] },
                                    { id: "suprailiaca", label: "Supra-ilíaca (mm)", state: [dobraSupraIliaca, setDobraSupraIliaca] },
                                    { id: "coxa", label: "Coxa (mm)", state: [dobraCoxa, setDobraCoxa] },
                                  ]
                                : protocoloDobras === "guedes"
                                ? [
                                    { id: "tricipital", label: "Tricipital (mm)", state: [dobraTricipital, setDobraTricipital] },
                                    { id: "subescapular", label: "Subescapular (mm)", state: [dobraSubescapular, setDobraSubescapular] },
                                    { id: "suprailiaca", label: "Supra-ilíaca (mm)", state: [dobraSupraIliaca, setDobraSupraIliaca] },
                                    { id: "coxa", label: "Coxa (mm)", state: [dobraCoxa, setDobraCoxa] },
                                  ]
                                : protocoloDobras === "durnin"
                                ? [
                                    { id: "bicipital", label: "Bicipital (mm)", state: [dobraBicipital, setDobraBicipital] },
                                    { id: "tricipital", label: "Tricipital (mm)", state: [dobraTricipital, setDobraTricipital] },
                                    { id: "subescapular", label: "Subescapular (mm)", state: [dobraSubescapular, setDobraSubescapular] },
                                    { id: "suprailiaca", label: "Supra-ilíaca (mm)", state: [dobraSupraIliaca, setDobraSupraIliaca] },
                                  ]
                                : /* faulkner */
                                  [
                                    { id: "tricipital", label: "Tricipital (mm)", state: [dobraTricipital, setDobraTricipital] },
                                    { id: "subescapular", label: "Subescapular (mm)", state: [dobraSubescapular, setDobraSubescapular] },
                                    { id: "suprailiaca", label: "Supra-ilíaca (mm)", state: [dobraSupraIliaca, setDobraSupraIliaca] },
                                    { id: "abdominal", label: "Abdominal (mm)", state: [dobraAbdominal, setDobraAbdominal] },
                                  ]

                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {campos.map((c) => (
                                  <div key={c.id} className="grid gap-1">
                                    <Label>{c.label}</Label>
                                    <Input
                                      value={c.state[0] as string}
                                      onChange={(e) => (c.state[1] as any)(e.target.value)}
                                      placeholder="ex: 18"
                                    />
                                  </div>
                                ))}
                              </div>
                            )
                          })()}
                        </div>
                      </section>

                      {/* Bloco 3: Bioimpedância */}
                      <section className="space-y-4">
                        <div className="rounded-lg border p-3 grid gap-3">
                          <div className="grid gap-1">
                            <Label>% Gordura</Label>
                            <Input
                              value={gorduraPercentualNovoInput}
                              onChange={(e) => setGorduraPercentualNovoInput(e.target.value)}
                              placeholder="Ex: 26.5"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label>Massa de Gordura (kg)</Label>
                            <Input
                              value={massaGorduraNovo}
                              onChange={(e) => setMassaGorduraNovo(e.target.value)}
                              placeholder="Ex: 18.6"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label>Massa Livre (kg)</Label>
                            <Input
                              value={massaLivreGorduraNovo}
                              onChange={(e) => setMassaLivreGorduraNovo(e.target.value)}
                              placeholder="Ex: 48.8"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label>% Massa gorda</Label>
                            <Input
                              value={massaGorduraPercentNovo}
                              onChange={(e) => setMassaGorduraPercentNovo(e.target.value)}
                              placeholder="Ex: 28,0"
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label>% Massa livre</Label>
                            <Input
                              value={massaLivreGorduraPercentNovo}
                              onChange={(e) => setMassaLivreGorduraPercentNovo(e.target.value)}
                              placeholder="Ex: 72,0"
                            />
                          </div>
                        </div>
                      </section>

                      {/* Botão Salvar */}
                      <div className="lg:col-span-3 flex justify-center">
                        <div className="w-full md:w-3/5 lg:w-1/2 xl:w-2/5">
                          <Button
                            onClick={async () => {
                              if (!user?.email) return
                              const refp = doc(db, "nutricionistas", user.email, "pacientes", id)

                              // cálculos
                              const peso = parseNumber(pesoNovo)
                              const altura = parseNumber(alturaNova)
                              const cintura = parseNumber(cinturaNovo)
                              const quadril = parseNumber(quadrilNovo)
                              const braco = parseNumber(bracoNovo)

                              const imc = calculateIMC(peso, altura)
                              const rcq = calculateRCQ(cintura, quadril)
                              const cmb = calculateCMB(braco)

                              // antropometria
                              const n = (s: string) => (s && s.trim() !== "" ? Number(s.replace(",", ".")) : 0)
                              let somatorioDobrasCalc = 0
                              let densidadeCalc = 0
                              const idade = getIdade()

                              if (protocoloDobras !== "nenhum") {
                                if (protocoloDobras === "pollock3") {
                                  const fem = (sexoAvaliacao || "").toLowerCase().startsWith("f")
                                  somatorioDobrasCalc = fem
                                    ? n(dobraTricipital) + n(dobraSupraIliaca) + n(dobraCoxa)
                                    : n(dobraPeitoral) + n(dobraAbdominal) + n(dobraCoxa)
                                  densidadeCalc = densidadePollock3(somatorioDobrasCalc, idade, sexoAvaliacao)
                                } else if (protocoloDobras === "pollock7") {
                                  somatorioDobrasCalc =
                                    n(dobraPeitoral) +
                                    n(dobraAxilarMedia) +
                                    n(dobraTricipital) +
                                    n(dobraSubescapular) +
                                    n(dobraAbdominal) +
                                    n(dobraSupraIliaca) +
                                    n(dobraCoxa)
                                  densidadeCalc = densidadePollock7(somatorioDobrasCalc, idade, sexoAvaliacao)
                                } else if (protocoloDobras === "petroski") {
                                  const sum =
                                    n(dobraTricipital) + n(dobraSubescapular) + n(dobraSupraIliaca) + n(dobraCoxa) +
                                    n(dobraPeitoral) + n(dobraAxilarMedia)
                                  somatorioDobrasCalc = sum
                                  densidadeCalc = sum > 0 ? densidadePetroski7(sum, idade, sexoAvaliacao) : 0
                                } else if (protocoloDobras === "guedes") {
                                  const sum = n(dobraTricipital) + n(dobraSupraIliaca) + n(dobraCoxa)
                                  somatorioDobrasCalc = sum
                                  densidadeCalc = sum > 0 ? densidadeGuedes3(sum, idade, sexoAvaliacao) : 0
                                } else if (protocoloDobras === "durnin") {
                                  const sum = n(dobraBicipital) + n(dobraTricipital) + n(dobraSubescapular) + n(dobraSupraIliaca)
                                  somatorioDobrasCalc = sum
                                  densidadeCalc = sum > 0 ? densidadeDurnin4(sum, idade, sexoAvaliacao) : 0
                                } else if (protocoloDobras === "faulkner") {
                                  const sum = n(dobraTricipital) + n(dobraSubescapular) + n(dobraSupraIliaca) + n(dobraAbdominal)
                                  somatorioDobrasCalc = sum
                                  const perc = 0.153 * sum + 5.783
                                  densidadeCalc = perc ? 495 / (perc + 450) : 0
                                }
                              }

                              // bioimpedância/manuais
                              const gPctManual = parseNumber(gorduraPercentualNovoInput)
                              const mgManual = massaGorduraNovo ? Number(massaGorduraNovo.replace(",", ".")) : undefined
                              const mlgManual = massaLivreGorduraNovo ? Number(massaLivreGorduraNovo.replace(",", ".")) : undefined
                              const mgPercManual = massaGorduraPercentNovo ? Number(massaGorduraPercentNovo.replace(",", ".")) : undefined
                              const mlgPercManual = massaLivreGorduraPercentNovo ? Number(massaLivreGorduraPercentNovo.replace(",", ".")) : undefined

                              const nova: any = {
                                data: dataNovaMetrica,
                                peso,
                                altura,
                                cintura,
                                quadril,
                                braco,
                                imc: imc || undefined,
                                classificacaoImc: classifyIMC(imc) || undefined,
                                rcq: rcq || undefined,
                                riscoRcq: classifyRCQ(rcq, sexoAvaliacao) || undefined,
                                cmb: cmb || undefined,
                                classificacaoCmb: classifyCMB(cmb) || undefined,
                                somatorioDobras: somatorioDobrasCalc || undefined,
                                densidadeCorporal: densidadeCalc || undefined,
                                gorduraPercentual: gPctManual || undefined,
                                massaGordura: mgManual || undefined,
                                massaLivreGordura: mlgManual || undefined,
                                massaGorduraPercent: mgPercManual || (gPctManual ? gPctManual : undefined),
                                massaLivreGorduraPercent: mlgPercManual || (gPctManual ? Math.max(0, 100 - gPctManual) : undefined),
                              }

                              try {
                                const snap = await getDoc(refp)
                                const hist: any[] = snap.exists() ? (snap.data().historicoMetricas || []) : []
                                const filtrado = hist.filter((m) => m.data !== nova.data)
                                const atualizado = [...filtrado, nova].sort(
                                  (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()
                                )
                                await updateDoc(refp, { historicoMetricas: atualizado })
                                setPatient((prev: any) => (prev ? { ...prev, historicoMetricas: atualizado } : prev))
                                setMetricas(atualizado)
                                toast({ title: "Nova métrica salva com sucesso!" })

                                // limpa inputs
                                setDataNovaMetrica("")
                                setPesoNovo("")
                                setAlturaNova("")
                                setCinturaNovo("")
                                setQuadrilNovo("")
                                setBracoNovo("")
                                setGorduraPercentualNovoInput("")
                                setMassaGorduraNovo("")
                                setMassaLivreGorduraNovo("")
                                setMassaGorduraPercentNovo("")
                                setMassaLivreGorduraPercentNovo("")
                                setDobraPeitoral("")
                                setDobraAbdominal("")
                                setDobraCoxa("")
                                setDobraTricipital("")
                                setDobraSupraIliaca("")
                                setDobraAxilarMedia("")
                                setDobraSubescapular("")
                                setDobraBicipital("")
                              } catch (error) {
                                console.error(error)
                                toast({
                                  title: "Erro ao salvar métrica",
                                  description: "Verifique os campos e tente novamente.",
                                  variant: "destructive",
                                })
                              }
                            }}
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
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ====================== Componente auxiliar local ====================== */
function SidebarLinks({ pathname }: { pathname: string }) {
  const Item = ({ href, label, icon: Icon }: { href: string; label: string; icon: any }) => (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted ${
        pathname === href ? "bg-muted font-medium" : ""
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  )

  return (
    <div className="flex flex-col gap-1">
      <Item href="/" label="Início" icon={Home} />
      <Item href="/pacientes" label="Pacientes" icon={Users} />
      <Item href="/materiais" label="Materiais" icon={FileText} />
      <Item href="/financeiro" label="Financeiro" icon={LineChart} />
      <Item href="/perfil" label="Perfil" icon={User} />
    </div>
  )
}
