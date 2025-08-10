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

// ===== Tipos =====
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

  // Entradas base (Métricas — preenchidas nas Partes 2/3)
  const [pesoNovo, setPesoNovo] = useState("")
  const [alturaNova, setAlturaNova] = useState("")
  const [cinturaNovo, setCinturaNovo] = useState("")
  const [quadrilNovo, setQuadrilNovo] = useState("")
  const [bracoNovo, setBracoNovo] = useState("")
  const [gorduraPercentualNovoInput, setGorduraPercentualNovoInput] = useState("")
  const [somatorioDobrasNovo, setSomatorioDobrasNovo] = useState("")
  const [densidadeCorporalNovoInput, setDensidadeCorporalNovoInput] = useState("")
  // ---- Dobras cutâneas (protocolo + pontos) ----
const [protocoloDobras, setProtocoloDobras] = useState<"pollock3" | "pollock7">("pollock3")
const [sexoAvaliacao, setSexoAvaliacao] = useState<string>(patient?.sexo ?? "feminino")

// Entradas de dobras (mm)
const [dobraPeitoral, setDobraPeitoral] = useState("")
const [dobraAbdominal, setDobraAbdominal] = useState("")
const [dobraCoxa, setDobraCoxa] = useState("")
const [dobraTricipital, setDobraTricipital] = useState("")
const [dobraSupraIliaca, setDobraSupraIliaca] = useState("")
const [dobraAxilarMedia, setDobraAxilarMedia] = useState("")
const [dobraSubescapular, setDobraSubescapular] = useState("")

  // Calculados
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

  // Edição “simples” (mantido)
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
  if (patient.sexo) setSexoAvaliacao(patient.sexo)  // <- seta o sexo para cálculos
}, [patient])


  // ===== Utils (corrigidos) =====
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
  if (!patient?.birthdate) return 30 // fallback se não tiver data
  const hoje = new Date()
  const nasc = new Date(patient.birthdate + "T12:00:00")
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return Math.max(0, idade)
}

// Siri: %G = 495/D - 450
const siriPercentFat = (densidade: number) => (densidade ? 495 / densidade - 450 : 0)

// Jackson & Pollock – 3 dobras (homem: peitoral+abdominal+coxa / mulher: tricipital+supra-ilíaca+coxa)
const densidadePollock3 = (sum: number, idade: number, sexo: string) => {
  const fem = (sexo || "").toLowerCase().startsWith("f")
  if (fem) {
    return 1.0994921 - 0.0009929 * sum + 0.0000023 * sum * sum - 0.0001392 * idade
  }
  return 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * idade
}

// Jackson & Pollock – 7 dobras (peitoral + axilar média + tricipital + subescapular + abdominal + supra-ilíaca + coxa)
const densidadePollock7 = (sum: number, idade: number, sexo: string) => {
  const fem = (sexo || "").toLowerCase().startsWith("f")
  if (fem) {
    return 1.097 - 0.00046971 * sum + 0.00000056 * sum * sum - 0.00012828 * idade
  }
  return 1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * idade
}

// Recalcular a partir das dobras selecionadas
const recalcFromSkinfolds = useCallback(() => {
  const n = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(",", ".")))

  let soma = 0
  if (protocoloDobras === "pollock3") {
    const fem = (sexoAvaliacao || "").toLowerCase().startsWith("f")
    // homem: peitoral + abdominal + coxa
    // mulher: tricipital + supra-ilíaca + coxa
    soma = fem
      ? n(dobraTricipital) + n(dobraSupraIliaca) + n(dobraCoxa)
      : n(dobraPeitoral) + n(dobraAbdominal) + n(dobraCoxa)
  } else {
    // pollock7 (peitoral + axilar média + tricipital + subescapular + abdominal + supra-ilíaca + coxa)
    soma =
      n(dobraPeitoral) +
      n(dobraAxilarMedia) +
      n(dobraTricipital) +
      n(dobraSubescapular) +
      n(dobraAbdominal) +
      n(dobraSupraIliaca) +
      n(dobraCoxa)
  }

  const idade = getIdade()
  const dens =
    protocoloDobras === "pollock3"
      ? densidadePollock3(soma, idade, sexoAvaliacao)
      : densidadePollock7(soma, idade, sexoAvaliacao)

  const perc = siriPercentFat(dens)

  // atualiza campos visuais (com vírgula para pt-BR)
  setSomatorioDobrasNovo(soma ? soma.toFixed(0) : "")
  setDensidadeCorporalNovoInput(dens ? dens.toFixed(3).replace(".", ",") : "")
  setGorduraPercentualNovoInput(perc ? perc.toFixed(1).replace(".", ",") : "")

  // propaga massas
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
  dobraPeitoral,
  dobraAbdominal,
  dobraCoxa,
  dobraTricipital,
  dobraSupraIliaca,
  dobraAxilarMedia,
  dobraSubescapular,
  pesoNovo,
  parseNumber,
  calculateMassaResidual,
])

// Quando qualquer dobra/protocolo/sexo mudar, recalcula
useEffect(() => {
  recalcFromSkinfolds()
}, [recalcFromSkinfolds])

  // ===== Upload helpers (paths corrigidos com template string) =====
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

  // ===== Handlers Dieta / Foto / Material (detalhes das tabs na Parte 2) =====
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
    if (!nomeDieta.trim()) { setErroNomeDieta(true); return } else { setErroNomeDieta(false) }

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

      setPatient((prev: any) => prev ? { ...prev, dietas: prev.dietas ? [...prev.dietas, novaDieta] : [novaDieta] } : prev)

      // estatísticas (opcional)
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
      setSelectedPDF(null); setNomeDieta("")
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
    if (!user?.email) { toast({ title: "Erro", description: "Usuário não autenticado." }); return }
    if (!selectedPhoto) { toast({ title: "Nenhuma foto selecionada", description: "Selecione uma foto." }); return }

    try {
      const downloadURL = await uploadPhoto(selectedPhoto, id, `${tipoFoto.replace(/\s+/g, "_")}_${Date.now()}`)
      const novaFoto = { dataEnvio: new Date().toLocaleDateString("pt-BR"), tipo: tipoFoto, url: downloadURL, nomeArquivo: selectedPhoto.name }
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id)
      await updateDoc(refPaciente, { fotos: arrayUnion(novaFoto) })
      setPatient((prev: any) => prev ? { ...prev, fotos: prev?.fotos ? [...prev.fotos, novaFoto] : [novaFoto] } : prev)
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
        try { await deleteObject(ref(storage, `pacientes/${id}/fotos/${fotoToDelete.nomeArquivo}`)) } catch {}
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
    if (!user?.email) { toast({ title: "Erro de autenticação", description: "Usuário não autenticado." }); return }
    const file = selectedIndividualPDF
    if (!file) { toast({ title: "Nenhum arquivo selecionado", description: "Selecione um PDF." }); return }
    if (!nomeMaterialIndividual.trim()) { toast({ title: "Erro", description: "Informe o nome do material." }); return }

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
      setPatient((prev: any) => prev ? {
        ...prev,
        materiaisIndividuais: prev?.materiaisIndividuais ? [...prev.materiaisIndividuais, novoMaterial] : [novoMaterial],
      } : prev)
      toast({ title: "Material Individual Enviado", description: "Arquivo enviado com sucesso." })
      setSubmitIndividualMaterialText("Enviado!")
      setSubmitIndividualMaterialColorClass("bg-green-500 hover:bg-green-600")
      setTimeout(() => {
        setSubmitIndividualMaterialText("Enviar Material")
        setSubmitIndividualMaterialColorClass("bg-indigo-600 hover:bg-indigo-700")
        setIsSubmittingIndividualMaterial(false)
      }, 2000)
      setSelectedIndividualPDF(null); setNomeMaterialIndividual("")
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
      try { await deleteObject(ref(storage, `pacientes/${id}/materiais_individuais/${materialToDelete.nome}`)) } catch {}
      setPatient((prev:any)=> prev ? {
        ...prev,
        materiaisIndividuais: (prev?.materiaisIndividuais || []).filter((m:any)=>m.url!==materialToDelete.url)
      } : prev)
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

    // Tenta limpar no Storage (ignora erro se não encontrar o arquivo)
    try {
      const storageRefPath = ref(storage, `pacientes/${id}/dietas/${dietaToDelete.nome}`)
      await deleteObject(storageRefPath)
    } catch {}

    // Atualiza estado local
    setPatient((prev: any) =>
      prev ? { ...prev, dietas: (prev.dietas || []).filter((d: any) => d.url !== dietaToDelete.url) } : prev
    )

    toast({ title: "Dieta excluída com sucesso" })
  } catch (error) {
    console.error(error)
    toast({ title: "Erro ao excluir dieta", description: "Não foi possível remover o arquivo." })
  }
}

  // ===== Firestore: buscar/atualizar/excluir paciente =====
  const fetchPatient = async () => {
    if (!user?.email) return
    try {
      const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
      const snap = await getDoc(refp)
      if (snap.exists()) {
        const data = snap.data()
        setPatient({ ...data })
        const historico = (data.historicoMetricas || []) as MetricaEntry[]
        // manter do mais antigo → mais novo para tabela por data (ajustaremos parte 3)
        historico.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
        setMetricas(historico)
        setIsActive((data.status || "Ativo") === "Ativo")
      }
    } catch (error) {
      console.error("Erro ao buscar paciente ou métricas:", error)
    }
  }
  useEffect(() => {
  if (!id || !user?.email) return
  fetchPatient()
}, [id, user])

  const handleSaveInfo = async () => {
    if (!user?.email) return
    const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
    await updateDoc(refp, {
      nome: editData.name,
      telefone: editData.telefone,
      birthdate: editData.birthdate,
      valorConsulta: editData.valorConsulta,
    })
    setPatient((prev: any) => prev ? ({ ...prev, ...editData }) : prev)
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
    setPatient((prev: any) => prev ? ({ ...prev, ...editMetrics }) : prev)
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

  // ===== Layout (menu lateral original + header) =====
  return (
    <div className="flex min-h-screen">
      {/* Sidebar fixa (idêntica ao original) */}
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

        {/* Main */}
        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto w-full">
            {/* Top actions: voltar / ativo-inativo / excluir */}
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

              {/* >>> O conteúdo das abas vem na PARTE 2/3 <<< */}
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
                        {/* Seletor de Tipo */}
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

                        {/* Upload de 1 Foto */}
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
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) setSelectedPhoto(file)
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Botão Enviar */}
                        <div className="flex justify-center mt-2">
                          <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                            Enviar Foto
                          </Button>
                        </div>

                        {/* Nome do arquivo selecionado */}
                        {selectedPhoto && (
                          <p className="text-sm text-green-600">{selectedPhoto.name}</p>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Histórico de Fotos */}
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

              {/* ============ ABA: MATERIAL INDIVIDUAL ============ */}
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

                {/* Lista de Materiais Enviados */}
                {patient?.materiaisIndividuais?.length > 0 && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Materiais Individuais Enviados</CardTitle>
                      <CardDescription>
                        Visualize e gerencie os materiais enviados para este paciente.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        {patient.materiaisIndividuais.map((material: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 rounded-lg border"
                          >
                            <div className="flex items-center gap-4">
                              <FileText className="h-5 w-5 text-indigo-600" />
                              <div>
                                <p className="font-medium">{material.nomeMaterial || material.nome}</p>
                                <p className="text-sm text-muted-foreground">
                                  Enviado em: {material.dataEnvio}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2 items-center">
                              <Link href={material.url} target="_blank" rel="noopener noreferrer">
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
              {/* (Conteúdo completo da aba Métricas entra na PARTE 3/3) */}
              {/* ====================== ABA: MÉTRICAS ====================== */}
              <TabsContent value="metricas" className="mt-4">
                {/* --------- Histórico (tabela por colunas de data) --------- */}
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
                              {metricas.map((item: any, index: number) => (
                                <th key={index} className="text-center p-2 font-semibold">
                                  <div className="flex items-center justify-center gap-2">
                                    <span>
                                      {item.data && !isNaN(new Date(item.data).getTime())
                                        ? new Date(item.data).toLocaleDateString("pt-BR")
                                        : "Sem data"}
                                    </span>

                                    {/* Editar medição (ícone lápis) */}
                                    <Dialog
                                      open={!!metricaEditando && metricaEditando?.data === item.data}
                                      onOpenChange={(open) => { if (!open) setMetricaEditando(null) }}
                                    >
                                      <DialogTrigger asChild>
                                        <button
                                          onClick={() => setMetricaEditando({ ...item })}
                                          className="text-indigo-600 hover:text-indigo-700"
                                          title="Editar esta medição"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                      </DialogTrigger>

                                      {metricaEditando && metricaEditando?.data === item.data && (
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Editar Métrica</DialogTitle>
                                            <DialogDescription>
                                              Atualize os valores da medição de{" "}
                                              <strong>
                                                {metricaEditando.data
                                                  ? new Date(metricaEditando.data).toLocaleDateString("pt-BR")
                                                  : "Data inválida"}
                                              </strong>.
                                            </DialogDescription>
                                          </DialogHeader>

                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto py-2 pr-2">
                                            {[
                                              { k: "peso", label: "Peso (kg)", type: "number" },
                                              { k: "altura", label: "Altura (cm)", type: "number" },
                                              { k: "cintura", label: "Cintura (cm)", type: "number" },
                                              { k: "quadril", label: "Quadril (cm)", type: "number" },
                                              { k: "braco", label: "Braço (cm)", type: "number" },
                                              { k: "gorduraPercentual", label: "% Gordura", type: "number" },
                                              { k: "somatorioDobras", label: "Somatório de Dobras (mm)", type: "number" },
                                              { k: "densidadeCorporal", label: "Densidade Corporal", type: "number", step: "0.001" },
                                            ].map((f) => (
                                              <div key={f.k}>
                                                <Label>{f.label}</Label>
                                                <Input
                                                  type={f.type as any}
                                                  step={(f as any).step || "any"}
                                                  defaultValue={metricaEditando[f.k] ?? ""}
                                                  onChange={(e) =>
                                                    setMetricaEditando((prev: any) => ({
                                                      ...prev,
                                                      [f.k]: e.target.value === "" ? undefined : Number(e.target.value),
                                                    }))
                                                  }
                                                />
                                              </div>
                                            ))}
                                          </div>

                                          <DialogFooter className="mt-4">
                                            <Button
                                              disabled={isSaving}
                                              onClick={async () => {
                                                if (!user?.email) return
                                                setIsSaving(true)
                                                try {
                                                  const ref = doc(db, "nutricionistas", user.email, "pacientes", id)
                                                  const historicoAtualizado = patient.historicoMetricas.map((m: any) =>
                                                    m.data === metricaEditando.data ? metricaEditando : m
                                                  )
                                                  await updateDoc(ref, { historicoMetricas: historicoAtualizado })
                                                  setPatient((prev: any) => ({ ...prev, historicoMetricas: historicoAtualizado }))
                                                  setMetricas(historicoAtualizado)
                                                  toast({ title: "Métrica atualizada com sucesso" })
                                                  setMetricaEditando(null)
                                                } catch (e) {
                                                  console.error(e)
                                                  toast({ title: "Erro ao atualizar métrica", variant: "destructive" })
                                                } finally {
                                                  setIsSaving(false)
                                                }
                                              }}
                                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                            >
                                              {isSaving ? "Salvando..." : "Salvar Alterações"}
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      )}
                                    </Dialog>

                                    {/* Excluir medição (ícone lixeira minimalista) */}
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <button
                                          onClick={() => setMetricaParaExcluir(item)}
                                          className="text-muted-foreground hover:text-red-600"
                                          title="Excluir esta medição"
                                        >
                                          <Trash className="w-4 h-4" />
                                        </button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Excluir Métrica</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Tem certeza que deseja excluir a métrica do dia{" "}
                                            <strong>{item.data}</strong>?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={async () => {
                                              if (!user?.email) return
                                              try {
                                                const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id)
                                                const historicoAtualizado = (patient.historicoMetricas || []).filter(
                                                  (m: any) => m.data !== item.data
                                                )
                                                await updateDoc(refPaciente, { historicoMetricas: historicoAtualizado })
                                                setPatient((prev: any) =>
                                                  prev ? { ...prev, historicoMetricas: historicoAtualizado } : prev
                                                )
                                                setMetricas(historicoAtualizado)
                                                toast({ title: "Métrica excluída com sucesso" })
                                              } catch (e) {
                                                console.error(e)
                                                toast({ title: "Erro ao excluir métrica", variant: "destructive" })
                                              } finally {
                                                setMetricaParaExcluir(null)
                                              }
                                            }}
                                            className="bg-red-600 hover:bg-red-700 text-white"
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
                              { label: "Peso (kg)", key: "peso" },
                              { label: "Altura (cm)", key: "altura" },
                              { label: "Cintura (cm)", key: "cintura" },
                              { label: "Quadril (cm)", key: "quadril" },
                              { label: "Braço (cm)", key: "braco" },
                              { label: "IMC (kg/m²)", key: "imc" },
                              { label: "Classificação IMC", key: "classificacaoImc" },
                              { label: "RCQ", key: "rcq" },
                              { label: "Risco por RCQ", key: "riscoRcq" },
                              { label: "CMB (cm)", key: "cmb" },
                              { label: "Classificação CMB", key: "classificacaoCmb" },
                              { label: "% Gordura", key: "gorduraPercentual" },
                              { label: "% Massa gorda", key: "massaGorduraPercent" },
                              { label: "% Massa livre", key: "massaLivreGorduraPercent" },
                              { label: "Massa de Gordura (kg)", key: "massaGordura" },
                              { label: "Massa Livre (kg)", key: "massaLivreGordura" },
                              { label: "Massa Residual (kg)", key: "massaResidual" },
                              { label: "Somatório de dobras (mm)", key: "somatorioDobras" },
                              { label: "Densidade Corporal (g/mL)", key: "densidadeCorporal" },
                            ].map(({ label, key }) => (
                              <tr key={key} className="border-b hover:bg-muted/40">
                                <td className="p-2 font-medium">{label}</td>
                                {metricas.map((m: any, i: number) => (
                                  <td key={i} className="p-2 text-center">
                                    {m[key] === 0 || m[key] === "" || m[key] == null ? "-" : m[key]}
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

                {/* --------- Gráfico empilhado (cores roxo padrão) --------- */}
                {isClient && metricas.length > 0 && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Composição corporal (%)</CardTitle>
                      <CardDescription>Percentual de massa gorda e massa livre ao longo do tempo</CardDescription>
                    </CardHeader>
                    <CardContent style={{ width: "100%", height: 360 }}>
                      <ResponsiveContainer>
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
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="data" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Legend />
                          {/* Indigo-500 / Indigo-200 */}
                          <Bar dataKey="massaGorda" name="Massa gorda (%)" stackId="a" fill="#6366F1" />
                          <Bar dataKey="massaLivre" name="Massa livre (%)" stackId="a" fill="#C7D2FE" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* --------- Nova Medição (com cálculos automáticos nos onChange) --------- */}
                <Card>
                  <CardHeader>
                    <CardTitle>Nova Medição</CardTitle>
                    <CardDescription>Preencha os campos. Os cálculos aparecem automaticamente.</CardDescription>
                  </CardHeader>
                  
                 <CardContent>
  <div className="grid gap-6 lg:grid-cols-3">
    {/* ======= Coluna 1: MÉTRICAS ======= */}
    <section className="space-y-4">
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
          <Input
            value={pesoNovo}
            onChange={(e) => {
              const v = e.target.value
              setPesoNovo(v)
              const peso = parseNumber(v)
              const altura = parseNumber(alturaNova)
              const imc = calculateIMC(peso, altura)
              setImcNovo(imc ? imc.toFixed(2).replace(".", ",") : "")
              setClassificacaoImcNovo(classifyIMC(imc))
              const gPct = parseNumber(gorduraPercentualNovoInput)
              const mg = calculateMassaGordura(gPct, peso)
              setMassaGorduraNovo(mg ? mg.toFixed(2).replace(".", ",") : "")
              const mlg = calculateMassaLivreGordura(peso, mg)
              setMassaLivreGorduraNovo(mlg ? mlg.toFixed(2).replace(".", ",") : "")
              const mr = calculateMassaResidual(peso)
              setMassaResidualNovo(mr ? mr.toFixed(2).replace(".", ",") : "")
              const mgPerc = peso > 0 ? (mg / peso) * 100 : 0
              setMassaGorduraPercentNovo(mgPerc ? mgPerc.toFixed(1).replace(".", ",") : "")
              setMassaLivreGorduraPercentNovo(mgPerc ? (100 - mgPerc).toFixed(1).replace(".", ",") : "")
            }}
            placeholder="70,5"
          />
        </div>

        <div className="grid gap-2">
          <Label>Altura (cm)</Label>
          <Input
            value={alturaNova}
            onChange={(e) => {
              const v = e.target.value
              setAlturaNova(v)
              const peso = parseNumber(pesoNovo)
              const altura = parseNumber(v)
              const imc = calculateIMC(peso, altura)
              setImcNovo(imc ? imc.toFixed(2).replace(".", ",") : "")
              setClassificacaoImcNovo(classifyIMC(imc))
            }}
            placeholder="170"
          />
        </div>

        <div className="grid gap-2">
          <Label>Cintura (cm)</Label>
          <Input
            value={cinturaNovo}
            onChange={(e) => {
              const v = e.target.value
              setCinturaNovo(v)
              const rcq = calculateRCQ(parseNumber(v), parseNumber(quadrilNovo))
              setRcqNovo(rcq ? rcq.toFixed(2).replace(".", ",") : "")
              setRiscoRcqNovo(classifyRCQ(rcq, sexoAvaliacao))
            }}
            placeholder="82"
          />
        </div>

        <div className="grid gap-2">
          <Label>Quadril (cm)</Label>
          <Input
            value={quadrilNovo}
            onChange={(e) => {
              const v = e.target.value
              setQuadrilNovo(v)
              const rcq = calculateRCQ(parseNumber(cinturaNovo), parseNumber(v))
              setRcqNovo(rcq ? rcq.toFixed(2).replace(".", ",") : "")
              setRiscoRcqNovo(classifyRCQ(rcq, sexoAvaliacao))
            }}
            placeholder="95"
          />
        </div>

        <div className="grid gap-2">
          <Label>Braço (cm)</Label>
          <Input
            value={bracoNovo}
            onChange={(e) => {
              const v = e.target.value
              setBracoNovo(v)
              const cmb = calculateCMB(parseNumber(v))
              setCmbNovo(cmb ? cmb.toFixed(2).replace(".", ",") : "")
              setClassificacaoCmbNovo(classifyCMB(cmb))
            }}
            placeholder="30"
          />
        </div>

        <div className="grid gap-2">
          <Label>% Gordura (manual)</Label>
          <Input
            value={gorduraPercentualNovoInput}
            onChange={(e) => {
              const v = e.target.value
              setGorduraPercentualNovoInput(v)
              const g = parseNumber(v)
              setClassificacaoGorduraNovo(classifyGordura(g))
              const peso = parseNumber(pesoNovo)
              const mg = calculateMassaGordura(g, peso)
              setMassaGorduraNovo(mg ? mg.toFixed(2).replace(".", ",") : "")
              const mlg = calculateMassaLivreGordura(peso, mg)
              setMassaLivreGorduraNovo(mlg ? mlg.toFixed(2).replace(".", ",") : "")
              const mgPerc = peso > 0 ? (mg / peso) * 100 : 0
              setMassaGorduraPercentNovo(mgPerc ? mgPerc.toFixed(1).replace(".", ",") : "")
              setMassaLivreGorduraPercentNovo(mgPerc ? (100 - mgPerc).toFixed(1).replace(".", ",") : "")
            }}
            placeholder="22,5"
          />
        </div>
      </div>
    </section>

    {/* ======= Coluna 2: DOBRAS ======= */}
    <section className="space-y-4">
      <div className="rounded-lg border p-3 space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="grid gap-1 md:col-span-2">
            <Label>Protocolo</Label>
            <select
              className="border rounded p-2 bg-background"
              value={protocoloDobras}
              onChange={(e) => setProtocoloDobras(e.target.value as "pollock3" | "pollock7")}
            >
              <option value="pollock3">Jackson & Pollock (3 dobras)</option>
              <option value="pollock7">Jackson & Pollock (7 dobras)</option>
            </select>
          </div>

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
        </div>

        <div className="grid gap-1">
          <Label>Somatório de Dobras (mm)</Label>
          <Input value={somatorioDobrasNovo} disabled placeholder="Calculado" />
        </div>

        {/* Campos por dobra */}
        <div className="grid gap-3 mt-3 md:grid-cols-2">
          {/* Coxa sempre aparece */}
          <div className="grid gap-1">
            <Label>Coxa (mm)</Label>
            <Input value={dobraCoxa} onChange={(e) => setDobraCoxa(e.target.value)} placeholder="ex: 18" />
          </div>

          {/* Pollock 3 – masculino */}
          {protocoloDobras === "pollock3" && (sexoAvaliacao || "").toLowerCase().startsWith("m") && (
            <>
              <div className="grid gap-1">
                <Label>Peitoral (mm)</Label>
                <Input value={dobraPeitoral} onChange={(e) => setDobraPeitoral(e.target.value)} placeholder="ex: 10" />
              </div>
              <div className="grid gap-1">
                <Label>Abdominal (mm)</Label>
                <Input value={dobraAbdominal} onChange={(e) => setDobraAbdominal(e.target.value)} placeholder="ex: 20" />
              </div>
            </>
          )}

          {/* Pollock 3 – feminino */}
          {protocoloDobras === "pollock3" && (sexoAvaliacao || "").toLowerCase().startsWith("f") && (
            <>
              <div className="grid gap-1">
                <Label>Tricipital (mm)</Label>
                <Input value={dobraTricipital} onChange={(e) => setDobraTricipital(e.target.value)} placeholder="ex: 18" />
              </div>
              <div className="grid gap-1">
                <Label>Supra-ilíaca (mm)</Label>
                <Input value={dobraSupraIliaca} onChange={(e) => setDobraSupraIliaca(e.target.value)} placeholder="ex: 16" />
              </div>
            </>
          )}

          {/* Pollock 7 – todos os 7 pontos */}
          {protocoloDobras === "pollock7" && (
            <>
              <div className="grid gap-1">
                <Label>Peitoral (mm)</Label>
                <Input value={dobraPeitoral} onChange={(e) => setDobraPeitoral(e.target.value)} placeholder="ex: 10" />
              </div>
              <div className="grid gap-1">
                <Label>Axilar média (mm)</Label>
                <Input value={dobraAxilarMedia} onChange={(e) => setDobraAxilarMedia(e.target.value)} placeholder="ex: 12" />
              </div>
              <div className="grid gap-1">
                <Label>Tricipital (mm)</Label>
                <Input value={dobraTricipital} onChange={(e) => setDobraTricipital(e.target.value)} placeholder="ex: 18" />
              </div>
              <div className="grid gap-1">
                <Label>Subescapular (mm)</Label>
                <Input value={dobraSubescapular} onChange={(e) => setDobraSubescapular(e.target.value)} placeholder="ex: 14" />
              </div>
              <div className="grid gap-1">
                <Label>Abdominal (mm)</Label>
                <Input value={dobraAbdominal} onChange={(e) => setDobraAbdominal(e.target.value)} placeholder="ex: 20" />
              </div>
              <div className="grid gap-1">
                <Label>Supra-ilíaca (mm)</Label>
                <Input value={dobraSupraIliaca} onChange={(e) => setDobraSupraIliaca(e.target.value)} placeholder="ex: 16" />
              </div>
            </>
          )}
        </div>

        {/* Saídas de dobras */}
        <div className="grid gap-3 mt-3 md:grid-cols-2">
          <div className="grid gap-1">
            <Label>Densidade Corporal (g/mL)</Label>
            <Input value={densidadeCorporalNovoInput} disabled placeholder="Calculado" />
          </div>
          <div className="grid gap-1">
            <Label>% Gordura (Siri)</Label>
            <Input value={gorduraPercentualNovoInput} disabled placeholder="Calculado" />
          </div>
        </div>
      </div>
    </section>

    {/* ======= Coluna 3: RESULTADOS ======= */}
    <section className="space-y-4">
      <div className="rounded-lg border p-3 grid gap-3">
        <div className="grid gap-1">
          <Label>IMC</Label>
          <Input value={imcNovo} disabled placeholder="Calculado" />
        </div>
        <div className="grid gap-1">
          <Label>Classificação IMC</Label>
          <Input value={classificacaoImcNovo} disabled placeholder="Calculado" />
        </div>
        <div className="grid gap-1">
          <Label>RCQ</Label>
          <Input value={rcqNovo} disabled placeholder="Calculado" />
        </div>
        <div className="grid gap-1">
          <Label>Risco por RCQ</Label>
          <Input value={riscoRcqNovo} disabled placeholder="Calculado" />
        </div>
        <div className="grid gap-1">
          <Label>CMB</Label>
          <Input value={cmbNovo} disabled placeholder="Calculado" />
        </div>
        <div className="grid gap-1">
          <Label>Classificação CMB</Label>
          <Input value={classificacaoCmbNovo} disabled placeholder="Calculado" />
        </div>
        <div className="grid gap-1">
          <Label>Classificação Gordura</Label>
          <Input value={classificacaoGorduraNovo} disabled placeholder="Calculado" />
        </div>
        <div className="grid gap-1">
          <Label>Massa de Gordura (kg)</Label>
          <Input value={massaGorduraNovo} disabled placeholder="Calculado" />
        </div>
        <div className="grid gap-1">
          <Label>Massa Residual (kg)</Label>
          <Input value={massaResidualNovo} disabled placeholder="Calculado" />
        </div>
        <div className="grid gap-1">
          <Label>Massa Livre (kg)</Label>
          <Input value={massaLivreGorduraNovo} disabled placeholder="Calculado" />
        </div>
        <div className="grid gap-1">
          <Label>% Massa gorda</Label>
          <Input value={massaGorduraPercentNovo} disabled placeholder="Calculado" />
        </div>
        <div className="grid gap-1">
          <Label>% Massa livre</Label>
          <Input value={massaLivreGorduraPercentNovo} disabled placeholder="Calculado" />
        </div>
      </div>
    </section>

    {/* Botão Salvar (linha inteira) */}
    <div className="lg:col-span-3 flex justify-center">
      <div className="w-full md:w-3/5 lg:w-1/2 xl:w-2/5">
        <Button
          onClick={async () => {
            if (!user?.email || !patient) return
            const nova: any = {
              data: dataNovaMetrica,
              peso: parseNumber(pesoNovo),
              altura: parseNumber(alturaNova),
              cintura: parseNumber(cinturaNovo),
              quadril: parseNumber(quadrilNovo),
              braco: parseNumber(bracoNovo),
              somatorioDobras: parseNumber(somatorioDobrasNovo),
              densidadeCorporal: parseNumber(densidadeCorporalNovoInput),
              imc: imcNovo ? Number(imcNovo.replace(",", ".")) : undefined,
              classificacaoImc: classificacaoImcNovo || undefined,
              rcq: rcqNovo ? Number(rcqNovo.replace(",", ".")) : undefined,
              riscoRcq: riscoRcqNovo || undefined,
              cmb: cmbNovo ? Number(cmbNovo.replace(",", ".")) : undefined,
              classificacaoCmb: classificacaoCmbNovo || undefined,
              gorduraPercentual: parseNumber(gorduraPercentualNovoInput),
              classificacaoGordura: classificacaoGorduraNovo || undefined,
              massaGordura: massaGorduraNovo ? Number(massaGorduraNovo.replace(",", ".")) : undefined,
              massaResidual: massaResidualNovo ? Number(massaResidualNovo.replace(",", ".")) : undefined,
              massaLivreGordura: massaLivreGorduraNovo ? Number(massaLivreGorduraNovo.replace(",", ".")) : undefined,
              massaGorduraPercent: massaGorduraPercentNovo ? Number(massaGorduraPercentNovo.replace(",", ".")) : undefined,
              massaLivreGorduraPercent: massaLivreGorduraPercentNovo ? Number(massaLivreGorduraPercentNovo.replace(",", ".")) : undefined,
            }

            try {
              const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
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

            {/* ===== Fim do container principal ===== */}
          </div>
        </main>
      </div>
    </div>
  )
}
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


