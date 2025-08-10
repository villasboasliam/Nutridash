"use client"

/* ---------------------------------------------------------------------------------------
 * PatientDetailPage_full.tsx
 * Estrutura completa com:
 * - Menu lateral fixo + Topbar
 * - Dados pessoais do paciente (editar, status, excluir)
 * - Abas: Dietas / Fotos / Materiais Individuais (upload, listar, excluir)
 * - (As métricas ficam nas Partes 2/3)
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
import {
  ArrowLeft, Camera, FileText, Home, LineChart, Menu, Upload,
  Users, Trash, Pencil, ChevronLeft, ChevronRight, LogOut, KeyRound
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

// 📊 Recharts (usaremos nas Partes 2/3)
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
// Tipos auxiliares (métricas completas — serão usados nas Partes 2/3 também)
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
  // Upload states
  const [isDietUploaded, setIsDietUploaded] = useState(false)
  const [isPhotosUploaded, setIsPhotosUploaded] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [selectedPDF, setSelectedPDF] = useState<File | null>(null)
  const [nomeDieta, setNomeDieta] = useState("")
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [tipoFoto, setTipoFoto] = useState("Foto Frontal")

  // Material Individual
  const [selectedIndividualPDF, setSelectedIndividualPDF] = useState<File | null>(null)
  const [nomeMaterialIndividual, setNomeMaterialIndividual] = useState("")
  const [individualMaterials, setIndividualMaterials] = useState<any[]>([])
  const [isSubmittingIndividualMaterial, setIsSubmittingIndividualMaterial] = useState(false)
  const [submitIndividualMaterialText, setSubmitIndividualMaterialText] = useState("Enviar Material")
  const [submitIndividualMaterialColorClass, setSubmitIndividualMaterialColorClass] = useState("bg-indigo-600 hover:bg-indigo-700")

  const [metricas, setMetricas] = useState<any[]>([])
  const params = useParams()
  const id = decodeURIComponent(params?.id as string)
  const pathname = usePathname()
  const router = useRouter()
  const [user, loading] = useAuthState(auth)
  const { t } = useLanguage()
  const { toast } = useToast()
  const [showReplaceDietButton, setShowReplaceDietButton] = useState(false)
  const [patient, setPatient] = useState<any | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [dataNovaMetrica, setDataNovaMetrica] = useState("")
  const [infoParaEditar, setInfoParaEditar] = useState<any>(null)
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

  // Estados de informações pessoais
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
      })
    }
  }, [patient])

  // Estados de métricas simples (mantidos; usados nas Partes 2/3)
  const [editMetrics, setEditMetrics] = useState({
    peso: 0,
    altura: 0,
    gordura: 0,
    massaMagra: 0,
    cintura: 0,
  })

  // === Entradas base para nova medição (Partes 2/3) ===
  const [pesoNovo, setPesoNovo] = useState("")
  const [alturaNova, setAlturaNova] = useState("")
  const [cinturaNovo, setCinturaNovo] = useState("")
  const [quadrilNovo, setQuadrilNovo] = useState("")
  const [bracoNovo, setBracoNovo] = useState("")
  const [gorduraPercentualNovoInput, setGorduraPercentualNovoInput] = useState("")
  const [somatorioDobrasNovo, setSomatorioDobrasNovo] = useState("")
  const [densidadeCorporalNovoInput, setDensidadeCorporalNovoInput] = useState("")

  // Campos calculados (Partes 2/3)
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

  // === Dobras & Fórmulas (Partes 2/3) ===
  const [skinfolds, setSkinfolds] = useState<Record<SkinfoldKey, string>>({
    tricipital: "", bicipital: "", abdominal: "", subescapular: "",
    axilarMedia: "", coxa: "", toracica: "", suprailiaca: "",
    panturrilha: "", supraespinhal: "",
  })
  const [formulaDobras, setFormulaDobras] = useState<"POLLOCK3"|"POLLOCK7"|"DURNIN"|"FAULKNER"|"PETROSKI"|"GUEDES"|"NONE">("NONE")
  const [densidadeCorporalCalc, setDensidadeCorporalCalc] = useState("")
  const [gorduraPercentualPorDobras, setGorduraPercentualPorDobras] = useState("")
  const [metodoPercentual, setMetodoPercentual] = useState<"SIRI"|"BROZEK">("SIRI")

  // Carrossel do histórico (5 colunas) — Partes 2/3
  const [histStart, setHistStart] = useState(0)
  const HIST_WINDOW = 5

  // -------------------------------------------------------------------------------------
  // Utils
  // -------------------------------------------------------------------------------------
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
      if (rcq < 0.80) return "Baixo"
      if (rcq <= 0.84) return "Moderado"
      return "Alto"
    } else {
      if (rcq < 0.90) return "Baixo"
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

  // Helpers dobras (Partes 2/3)
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

  // Quais dobras mostrar por protocolo (Partes 2/3)
  const skinfoldFieldsForProtocol = useMemo(() => {
    const sexo = (patient?.sexo || "feminino").toLowerCase()
    const male = sexo.startsWith("m")
    switch (formulaDobras) {
      case "POLLOCK3":
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
  // Efeitos: recalcular métricas (implementados nas Partes 2/3)
  // -------------------------------------------------------------------------------------

  useEffect(() => {
    // (Cálculos completos entram nas Partes 2/3 — mantemos aqui só placeholder para não quebrar)
  }, [
    pesoNovo, alturaNova, cinturaNovo, quadrilNovo, bracoNovo, gorduraPercentualNovoInput,
    patient?.sexo, patient?.birthdate, skinfolds, formulaDobras, metodoPercentual
  ])

  // -------------------------------------------------------------------------------------
  // Uploads e operações
  // -------------------------------------------------------------------------------------

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

  const handleReplaceDiet = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.email) { toast({ title: "Erro de autenticação", description: "Usuário não autenticado. Tente novamente." }); return }
    const file = selectedPDF
    if (!file) { toast({ title: "Nenhum arquivo selecionado", description: "Selecione um PDF." }); return }
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

      setPatient((prev: any) => {
        if (!prev) return prev
        return { ...prev, dietas: prev.dietas ? [...prev.dietas, novaDieta] : [novaDieta] }
      })

      const statRef = doc(db, "nutricionistas", user.email, "estatisticas", "dietas")
      try {
        const statSnap = await getDoc(statRef)
        if (statSnap.exists()) {
          const atual = statSnap.data().totalDietasEnviadas || 0
          await updateDoc(statRef, {
            totalDietasEnviadas: atual + 1,
            ultimaAtualizacao: new Date().toISOString(),
          })
        } else {
          await setDoc(statRef, {
            totalDietasEnviadas: 1,
            ultimaAtualizacao: new Date().toISOString(),
          })
        }
      } catch (error) {}

      setIsDietUploaded(true)
      toast({ title: "Dieta enviada", description: "A dieta foi enviada com sucesso." })
      setSubmitButtonText("Enviado!")
      setSubmitButtonColorClass("bg-green-500 hover:bg-green-600")
      setTimeout(() => {
        setSubmitButtonText("Enviar Dieta")
        setSubmitButtonColorClass("bg-indigo-600 hover:bg-indigo-700")
        setIsSubmittingDiet(false)
      }, 3000)
      setSelectedPDF(null); setNomeDieta("")
    } catch (error) {
      console.error("Erro ao substituir a dieta:", error)
      toast({ title: "Erro ao enviar dieta", description: "Não foi possível enviar o arquivo." })
      setIsSubmittingDiet(false)
    }
  }

  const handleDeleteDiet = async (dietaToDelete: any) => {
    if (!user?.email || !patient) return
    try {
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id)
      await updateDoc(refPaciente, { dietas: arrayRemove(dietaToDelete) })
      const storageRefPath = ref(storage, `pacientes/${id}/dietas/${dietaToDelete.nome}`)
      try { await deleteObject(storageRefPath) } catch (e) {}
      setPatient((prev: any) => ({ ...prev, dietas: (prev?.dietas || []).filter((d: any) => d.url !== dietaToDelete.url) }))
      toast({ title: "Dieta excluída com sucesso" })
    } catch (error) {
      console.error("Erro ao excluir dieta:", error)
      toast({ title: "Erro ao excluir dieta", description: "Não foi possível remover o arquivo." })
    }
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) setSelectedPhoto(file)
  }

  const handleUploadPhotos = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.email) { toast({ title: "Erro de autenticação", description: "Usuário não autenticado. Tente novamente." }); return }
    if (!selectedPhoto) { toast({ title: "Nenhuma foto selecionada", description: "Selecione uma imagem." }); return }
    try {
      const downloadURL = await uploadPhoto(
        selectedPhoto,
        id,
        `${tipoFoto.replace(/\s+/g, "_")}_${Date.now()}`
      )
      const novaFoto = { dataEnvio: new Date().toLocaleDateString("pt-BR"), tipo: tipoFoto, url: downloadURL }
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id)
      await updateDoc(refPaciente, { fotos: arrayUnion(novaFoto) })
      setPatient((prev: any) => ({ ...prev, fotos: prev?.fotos ? [...prev.fotos, novaFoto] : [novaFoto] }))
      toast({ title: "Foto enviada", description: "A foto foi enviada com sucesso." })
      setSelectedPhoto(null)
    } catch (error) {
      console.error("Erro ao enviar foto:", error)
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
        const storageRefObj = ref(storage, `pacientes/${id}/fotos/${fotoToDelete.nomeArquivo}`)
        try { await deleteObject(storageRefObj) } catch (e) {}
      }
      setPatient((prev: any) => ({ ...prev, fotos: novasFotos }))
      toast({ title: "Foto excluída com sucesso" })
    } catch (error) {
      console.error("Erro ao excluir foto:", error)
      toast({ title: "Erro ao excluir foto", description: "Não foi possível remover a foto." })
    }
  }

  const handleUploadIndividualMaterial = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.email) { toast({ title: "Erro de autenticação", description: "Usuário não autenticado. Tente novamente." }); return }
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
      setPatient((prev: any) => ({
        ...prev,
        materiaisIndividuais: prev?.materiaisIndividuais ? [...prev.materiaisIndividuais, novoMaterial] : [novoMaterial],
      }))
      toast({ title: "Material individual enviado", description: "Arquivo enviado com sucesso." })
      setSubmitIndividualMaterialText("Enviado!")
      setSubmitIndividualMaterialColorClass("bg-green-500 hover:bg-green-600")
      setTimeout(() => {
        setSubmitIndividualMaterialText("Enviar Material")
        setSubmitIndividualMaterialColorClass("bg-indigo-600 hover:bg-indigo-700")
        setIsSubmittingIndividualMaterial(false)
      }, 2000)
      setSelectedIndividualPDF(null); setNomeMaterialIndividual("")
    } catch (error) {
      console.error("Erro ao enviar material individual:", error)
      toast({ title: "Erro ao enviar material", description: "Não foi possível enviar o arquivo." })
      setIsSubmittingIndividualMaterial(false)
    }
  }

  const handleDeleteIndividualMaterial = async (materialToDelete: any) => {
    if (!user?.email || !patient) return
    try {
      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id)
      await updateDoc(refPaciente, { materiaisIndividuais: arrayRemove(materialToDelete) })
      const storageRefPath = ref(storage, `pacientes/${id}/materiais_individuais/${materialToDelete.nome}`)
      try { await deleteObject(storageRefPath) } catch (e) {}
      setPatient((prev:any)=> ({
        ...prev,
        materiaisIndividuais: (prev?.materiaisIndividuais || []).filter((m:any)=>m.url!==materialToDelete.url)
      }))
      toast({ title: "Material excluído", description: "O material foi removido com sucesso." })
    } catch (error) {
      console.error("Erro ao excluir material individual:", error)
      toast({ title: "Erro ao excluir material", description: "Não foi possível remover o material." })
    }
  }

  // -------------------------------------------------------------------------------------
  // Firestore: buscar, atualizar, excluir paciente
  // -------------------------------------------------------------------------------------
  const fetchPatient = async () => {
    if (!user?.email) return
    try {
      const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
      const snap = await getDoc(refp)
      if (snap.exists()) {
        const data = snap.data()
        setPatient({ ...data })
        const historico = data.historicoMetricas || []
        historico.sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime())
        setMetricas(historico)
        const len = historico.length
        setHistStart(Math.max(0, len - HIST_WINDOW))
        setIsActive((data.status || "Ativo") === "Ativo")
      }
    } catch (error) {
      console.error("Erro ao buscar paciente:", error)
    }
  }
  useEffect(() => { fetchPatient(); /* eslint-disable-next-line */ }, [id, user])

  const handleSaveInfo = async () => {
    if (!user?.email) return
    const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
    await updateDoc(refp, {
      nome: editData.name,
      telefone: editData.telefone,
      birthdate: editData.birthdate,
      valorConsulta: editData.valorConsulta,
    })
    setPatient((prev: any) => ({ ...prev, ...editData }))
    toast({ title: "Informações atualizadas com sucesso" })
    setEditInfoOpen(false)
  }

  const handleDeletePatient = async () => {
    if (!user?.email) return
    const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
    await deleteDoc(refp)
    toast({ title: "Paciente excluído", description: "O paciente foi permanentemente deletado." })
    router.push("/pacientes")
  }

  // Data hoje em YYYY-MM-DD (usado nas Partes 2/3)
  function todayISO() {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth()+1).padStart(2,"0")
    const dd = String(d.getDate()).padStart(2,"0")
    return `${yyyy}-${mm}-${dd}`
  }

  // -------------------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------------------
  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <div className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 p-3">
          <Button variant="ghost" onClick={() => router.push("/pacientes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="font-medium truncate">{patient?.nome || "Paciente"}</div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 md:grid-cols-[260px_1fr] gap-4 p-4">
        {/* ==================== Sidebar ==================== */}
        <aside className="hidden md:block">
          <div className="sticky top-[64px] space-y-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Menu</CardTitle>
                <CardDescription>Atalhos rápidos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <Link href="/dashboard" className="flex items-center gap-2 rounded-md p-2 hover:bg-muted">
                  <Home className="h-4 w-4" /> Início
                </Link>
                <Link href="/pacientes" className="flex items-center gap-2 rounded-md p-2 hover:bg-muted">
                  <Users className="h-4 w-4" /> Pacientes
                </Link>
                <a href="#arquivos" className="flex items-center gap-2 rounded-md p-2 hover:bg-muted">
                  <FileText className="h-4 w-4" /> Arquivos
                </a>
                <a href="#metricas" className="flex items-center gap-2 rounded-md p-2 hover:bg-muted">
                  <LineChart className="h-4 w-4" /> Métricas
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status do paciente</CardTitle>
                <CardDescription>Ativo / Inativo</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm">{isActive ? "Ativo" : "Inativo"}</span>
                <Switch
                  checked={isActive}
                  onCheckedChange={async (checked) => {
                    setIsActive(checked)
                    if (user?.email) {
                      const refp = doc(db, "nutricionistas", user.email, "pacientes", id)
                      await updateDoc(refp, { status: checked ? "Ativo" : "Inativo" })
                      toast({ title: "Status atualizado" })
                    }
                  }}
                />
              </CardContent>
            </Card>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash className="mr-2 h-4 w-4" /> Excluir paciente
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é permanente e removerá todos os dados do paciente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeletePatient} className="bg-red-600 hover:bg-red-700">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </aside>

        {/* ==================== Conteúdo ==================== */}
        <section className="space-y-6">
          {/* -------- Dados pessoais -------- */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Dados pessoais</CardTitle>
                <CardDescription>Informações básicas do paciente</CardDescription>
              </div>
              <Dialog open={editInfoOpen} onOpenChange={setEditInfoOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Pencil className="mr-2 h-4 w-4" /> Editar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar informações</DialogTitle>
                    <DialogDescription>Atualize os dados abaixo e salve.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label>Nome</Label>
                        <Input value={editData.name} onChange={(e)=>setEditData(s=>({...s, name:e.target.value}))} />
                      </div>
                      <div>
                        <Label>E-mail (não editável)</Label>
                        <Input value={patient?.email || ""} readOnly className="bg-muted/50" />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input
                          value={editData.telefone}
                          onChange={(e)=>setEditData(s=>({...s, telefone: e.target.value}))}
                          onBlur={(e)=>setEditData(s=>({...s, telefone: formatTelefone(s.telefone)}))}
                        />
                      </div>
                      <div>
                        <Label>Data de nascimento</Label>
                        <Input
                          type="date"
                          value={editData.birthdate}
                          onChange={(e)=>setEditData(s=>({...s, birthdate: e.target.value}))}
                        />
                      </div>
                      <div>
                        <Label>Valor consulta padrão (R$)</Label>
                        <Input
                          inputMode="decimal"
                          value={editData.valorConsulta}
                          onChange={(e)=>setEditData(s=>({...s, valorConsulta: e.target.value}))}
                          placeholder="Ex: 150,00"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={()=>setEditInfoOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveInfo}>Salvar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Nome</Label>
                <div className="mt-1 text-sm">{patient?.nome || "-"}</div>
              </div>
              <div>
                <Label>E-mail</Label>
                <div className="mt-1 text-sm">{patient?.email || "-"}</div>
              </div>
              <div>
                <Label>Telefone</Label>
                <div className="mt-1 text-sm">{patient?.telefone || "-"}</div>
              </div>
              <div>
                <Label>Nascimento</Label>
                <div className="mt-1 text-sm">{patient?.birthdate ? new Date(patient.birthdate + "T12:00:00").toLocaleDateString("pt-BR") : "-"}</div>
              </div>
              <div>
                <Label>Valor consulta padrão</Label>
                <div className="mt-1 text-sm">{patient?.valorConsulta || "-"}</div>
              </div>
              <div>
                <Label>Status</Label>
                <div className="mt-1 text-sm">{isActive ? "Ativo" : "Inativo"}</div>
              </div>
            </CardContent>
          </Card>

          {/* -------- Abas: Arquivos do Paciente -------- */}
          <div id="arquivos" />
          <Card>
            <CardHeader>
              <CardTitle>Arquivos do paciente</CardTitle>
              <CardDescription>Envie dietas, fotos e materiais individuais.</CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="dietas" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="dietas">Dietas</TabsTrigger>
                  <TabsTrigger value="fotos">Fotos</TabsTrigger>
                  <TabsTrigger value="materiais">Materiais Individuais</TabsTrigger>
                </TabsList>

                {/* ======== Dietas ======== */}
                <TabsContent value="dietas" className="space-y-6">
                  <form onSubmit={handleReplaceDiet} className="grid gap-3 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <Label>Selecionar PDF da dieta</Label>
                      <Input type="file" accept="application/pdf" onChange={(e)=> setSelectedPDF(e.target.files?.[0] ?? null)} />
                    </div>
                    <div>
                      <Label>Nome da dieta</Label>
                      <Input value={nomeDieta} onChange={(e)=> setNomeDieta(e.target.value)} placeholder="Ex: Dieta Semana 32" />
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                      <Button type="submit" disabled={isSubmittingDiet} className={submitButtonColorClass}>
                        {isSubmittingDiet ? "Enviando..." : submitButtonText}
                      </Button>
                    </div>
                  </form>

                  <div>
                    <h4 className="mb-2 font-medium">Dietas enviadas</h4>
                    {!(patient?.dietas?.length) ? (
                      <div className="text-sm text-muted-foreground">Nenhuma dieta enviada.</div>
                    ) : (
                      <div className="grid gap-3">
                        {(patient.dietas || []).map((d:any, idx:number)=>(
                          <div key={d.url ?? idx} className="flex items-center justify-between rounded-lg border p-3">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{d.nomeDieta || d.nome}</div>
                              <div className="text-xs text-muted-foreground">Enviado em {d.dataEnvio}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link href={d.url} target="_blank" className="underline text-sm">Abrir</Link>
                              <Button variant="destructive" size="sm" onClick={()=>handleDeleteDiet(d)}>
                                <Trash className="mr-1 h-4 w-4" /> Excluir
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ======== Fotos ======== */}
                <TabsContent value="fotos" className="space-y-6">
                  <form onSubmit={handleUploadPhotos} className="grid gap-3 md:grid-cols-3">
                    <div>
                      <Label>Tipo de foto</Label>
                      <select
                        className="w-full rounded-md border bg-background p-2"
                        value={tipoFoto}
                        onChange={(e)=> setTipoFoto(e.target.value)}
                      >
                        <option>Foto Frontal</option>
                        <option>Foto Lateral</option>
                        <option>Foto Costas</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Selecionar imagem</Label>
                      <Input type="file" accept="image/*" onChange={handlePhotoChange} />
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                      <Button type="submit">Enviar foto</Button>
                    </div>
                  </form>

                  <div>
                    <h4 className="mb-2 font-medium">Galeria</h4>
                    {!(patient?.fotos?.length) ? (
                      <div className="text-sm text-muted-foreground">Nenhuma foto enviada.</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(patient.fotos || []).map((f:any, idx:number)=>(
                          <div key={f.url ?? idx} className="rounded-lg border p-2">
                            <div className="mb-2 aspect-square overflow-hidden rounded-md bg-muted">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={f.url} alt={f.tipo || "Foto"} className="h-full w-full object-cover" />
                            </div>
                            <div className="truncate text-sm font-medium">{f.tipo || "Foto"}</div>
                            <div className="text-xs text-muted-foreground">Enviado em {f.dataEnvio}</div>
                            <div className="mt-2 flex justify-between">
                              <Link href={f.url} target="_blank" className="underline text-xs">Abrir</Link>
                              <Button variant="destructive" size="sm" onClick={()=>handleDeletePhoto(f)}>
                                <Trash className="mr-1 h-3 w-3" /> Excluir
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ======== Materiais Individuais ======== */}
                <TabsContent value="materiais" className="space-y-6">
                  <form onSubmit={handleUploadIndividualMaterial} className="grid gap-3 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <Label>Selecionar PDF</Label>
                      <Input type="file" accept="application/pdf" onChange={(e)=> setSelectedIndividualPDF(e.target.files?.[0] ?? null)} />
                    </div>
                    <div>
                      <Label>Nome do material</Label>
                      <Input value={nomeMaterialIndividual} onChange={(e)=> setNomeMaterialIndividual(e.target.value)} placeholder="Ex: Guia de Proteínas" />
                    </div>
                    <div className="md:col-span-3 flex justify-end">
                      <Button type="submit" disabled={isSubmittingIndividualMaterial} className={submitIndividualMaterialColorClass}>
                        {isSubmittingIndividualMaterial ? "Enviando..." : submitIndividualMaterialText}
                      </Button>
                    </div>
                  </form>

                  <div>
                    <h4 className="mb-2 font-medium">Materiais enviados</h4>
                    {!(patient?.materiaisIndividuais?.length) ? (
                      <div className="text-sm text-muted-foreground">Nenhum material enviado.</div>
                    ) : (
                      <div className="grid gap-3">
                        {(patient.materiaisIndividuais || []).map((m:any, idx:number)=>(
                          <div key={m.url ?? idx} className="flex items-center justify-between rounded-lg border p-3">
                            <div className="min-w-0">
                              <div className="truncate font-medium">{m.nomeMaterial || m.nome}</div>
                              <div className="text-xs text-muted-foreground">Enviado em {m.dataEnvio}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link href={m.url} target="_blank" className="underline text-sm">Abrir</Link>
                              <Button variant="destructive" size="sm" onClick={()=>handleDeleteIndividualMaterial(m)}>
                                <Trash className="mr-1 h-4 w-4" /> Excluir
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* ======== A partir daqui entram as MÉTRICAS (Partes 2/3) ======== */}
          <div id="metricas" />
          {/* ==================== Métricas ==================== */}

          {/* useEffect adicional que realiza todos os cálculos automáticos */}
          {/* (Pode coexistir com o placeholder da Parte 1; este aqui faz o trabalho) */}
          {(() => {
            // wrapper para permitir inserir hooks aqui sem quebrar a ordem
            // (não executa nada em render; os hooks reais ficam abaixo)
            return null
          })()}

          {/* Hooks reais de cálculo */}
          {/*
            Observação: manter dependências alinhadas com os campos editáveis.
          */}
          {/* eslint-disable react-hooks/rules-of-hooks */}
          {
            (() => {
              // usamos um IIFE para manter a organização sem mover o código da Parte 1
              // (os hooks abaixo executam normalmente)
              // eslint-disable-next-line react-hooks/rules-of-hooks
              useEffect(() => {
                const peso = parseNumber(pesoNovo)
                const altura = parseNumber(alturaNova)
                const cintura = parseNumber(cinturaNovo)
                const quadril = parseNumber(quadrilNovo)
                const braco = parseNumber(bracoNovo)
                const gorduraPercentualInput = parseNumber(gorduraPercentualNovoInput)

                const calculatedIMC = calculateIMC(peso, altura)
                setImcNovo(calculatedIMC > 0 ? calculatedIMC.toFixed(2).replace(".", ",") : "")
                setClassificacaoImcNovo(classifyIMC(calculatedIMC))

                const calculatedRCQ = calculateRCQ(cintura, quadril)
                setRcqNovo(calculatedRCQ > 0 ? calculatedRCQ.toFixed(2).replace(".", ",") : "")
                setRiscoRcqNovo(classifyRCQ(calculatedRCQ, patient?.sexo))

                const calculatedCMB = calculateCMB(braco)
                setCmbNovo(calculatedCMB > 0 ? calculatedCMB.toFixed(2).replace(".", ",") : "")
                setClassificacaoCmbNovo(classifyCMB(calculatedCMB))

                setClassificacaoGorduraNovo(classifyGordura(gorduraPercentualInput))

                const calculatedMassaGordura = calculateMassaGordura(gorduraPercentualInput, peso)
                setMassaGorduraNovo(calculatedMassaGordura > 0 ? calculatedMassaGordura.toFixed(2).replace(".", ",") : "")

                const calculatedMassaLivreGordura = calculateMassaLivreGordura(peso, calculatedMassaGordura)
                setMassaLivreGorduraNovo(calculatedMassaLivreGordura > 0 ? calculatedMassaLivreGordura.toFixed(2).replace(".", ",") : "")

                const calculatedMassaResidual = calculateMassaResidual(peso)
                setMassaResidualNovo(calculatedMassaResidual > 0 ? calculatedMassaResidual.toFixed(2).replace(".", ",") : "")

                // % massa gorda / % massa livre (100%)
                let percMG = 0, percMLG = 0
                if (peso > 0) {
                  percMG = (calculatedMassaGordura / peso) * 100
                  percMLG = Math.max(0, 100 - percMG)
                }
                setMassaGorduraPercentNovo(percMG > 0 ? percMG.toFixed(1).replace(".", ",") : "")
                setMassaLivreGorduraPercentNovo(percMLG > 0 ? percMLG.toFixed(1).replace(".", ",") : "")

                // === Dobras → BD e %G ===
                const idade = ((): number => {
                  const a = patient?.birthdate ? getAgeFromBirthdate(patient.birthdate) : null
                  return a ?? 0
                })()
                const sexo = patient?.sexo || "feminino"
                const d = {
                  tricipital: (skinfolds.tricipital || "").replace(",", "."),
                  bicipital: (skinfolds.bicipital || "").replace(",", "."),
                  abdominal: (skinfolds.abdominal || "").replace(",", "."),
                  subescapular: (skinfolds.subescapular || "").replace(",", "."),
                  axilarMedia: (skinfolds.axilarMedia || "").replace(",", "."),
                  coxa: (skinfolds.coxa || "").replace(",", "."),
                  toracica: (skinfolds.toracica || "").replace(",", "."),
                  suprailiaca: (skinfolds.suprailiaca || "").replace(",", "."),
                  panturrilha: (skinfolds.panturrilha || "").replace(",", "."),
                  supraespinhal: (skinfolds.supraespinhal || "").replace(",", "."),
                }
                // converter para número seguro
                const dn = {
                  tricipital: Number(d.tricipital) || 0,
                  bicipital: Number(d.bicipital) || 0,
                  abdominal: Number(d.abdominal) || 0,
                  subescapular: Number(d.subescapular) || 0,
                  axilarMedia: Number(d.axilarMedia) || 0,
                  coxa: Number(d.coxa) || 0,
                  toracica: Number(d.toracica) || 0,
                  suprailiaca: Number(d.suprailiaca) || 0,
                  panturrilha: Number(d.panturrilha) || 0,
                  supraespinhal: Number(d.supraespinhal) || 0,
                }

                let bd = 0, fat = 0
                switch (formulaDobras) {
                  case "POLLOCK3": {
                    const sum3 = (sexo.toLowerCase().startsWith("m"))
                      ? (dn.toracica + dn.abdominal + dn.coxa)
                      : (dn.tricipital + dn.suprailiaca + dn.coxa)
                    if (sum3 > 0 && idade > 0) {
                      bd = bdPollock3(sum3, idade, sexo)
                      fat = toPercentFatFromBD(bd, metodoPercentual)
                    }
                    break
                  }
                  case "POLLOCK7": {
                    const sum7 = dn.toracica + dn.axilarMedia + dn.tricipital + dn.subescapular + dn.abdominal + dn.suprailiaca + dn.coxa
                    if (sum7 > 0 && idade > 0) {
                      bd = bdPollock7(sum7, idade, sexo)
                      fat = toPercentFatFromBD(bd, metodoPercentual)
                    }
                    break
                  }
                  case "DURNIN": {
                    const sum4 = dn.tricipital + dn.bicipital + dn.subescapular + dn.suprailiaca
                    if (sum4 > 0 && idade > 0) {
                      bd = bdDurnin(sum4, idade, sexo)
                      fat = toPercentFatFromBD(bd, metodoPercentual)
                    }
                    break
                  }
                  case "FAULKNER": {
                    const sum4 = dn.tricipital + dn.subescapular + dn.suprailiaca + dn.abdominal
                    if (sum4 > 0) {
                      fat = percentFaulkner(sum4)
                      bd = fat ? 495 / (fat + 450) : 0
                    }
                    break
                  }
                  case "PETROSKI":
                  case "GUEDES":
                  case "NONE":
                  default:
                    // não calculado
                    break
                }
                setDensidadeCorporalCalc(bd ? bd.toFixed(3).replace(".", ",") : "")
                setGorduraPercentualPorDobras(fat ? fat.toFixed(1).replace(".", ",") : "")

              }, [
                pesoNovo, alturaNova, cinturaNovo, quadrilNovo, bracoNovo, gorduraPercentualNovoInput,
                patient?.sexo, patient?.birthdate, skinfolds, formulaDobras, metodoPercentual
              ])
              return null
            })()
          }
          {/* eslint-enable react-hooks/rules-of-hooks */}

          {/* --------- Card: Métricas básicas --------- */}
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

          {/* --------- Card: Dobras cutâneas --------- */}
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

          {/* --------- Card: Resultados --------- */}
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
                <Button onClick={async () => {
                  // salvarNovaMetrica — implementada aqui em linha para manter tudo nesta parte
                  if (!user?.email || !patient) { toast({ title: "Erro", description: "Usuário não autenticado ou paciente indisponível." }); return }

                  const dataFinal = dataNovaMetrica && !isNaN(new Date(dataNovaMetrica).getTime())
                    ? dataNovaMetrica
                    : todayISO()

                  const pesoNum = parseNumber(pesoNovo)
                  const alturaNum = parseNumber(alturaNova)
                  const cinturaNum = parseNumber(cinturaNovo)
                  const quadrilNum = parseNumber(quadrilNovo)
                  const bracoNum = parseNumber(bracoNovo)

                  const mgKg = massaGorduraNovo ? Number(massaGorduraNovo.replace(",", ".")) : 0
                  const mlgKg = massaLivreGorduraNovo ? Number(massaLivreGorduraNovo.replace(",", ".")) : 0
                  const mgPerc = (pesoNum > 0 && mgKg > 0) ? (mgKg / pesoNum) * 100 : 0
                  const mlgPerc = (pesoNum > 0 && mlgKg >= 0) ? Math.max(0, 100 - mgPerc) : 0

                  const novaMetrica: MetricaEntry = {
                    data: dataFinal,
                    peso: pesoNum,
                    altura: alturaNum,
                    cintura: cinturaNum,
                    quadril: quadrilNum,
                    braco: bracoNum,

                    dobras: {
                      tricipital: Number((skinfolds.tricipital || "0").replace(",", ".")) || 0,
                      bicipital: Number((skinfolds.bicipital || "0").replace(",", ".")) || 0,
                      abdominal: Number((skinfolds.abdominal || "0").replace(",", ".")) || 0,
                      subescapular: Number((skinfolds.subescapular || "0").replace(",", ".")) || 0,
                      axilarMedia: Number((skinfolds.axilarMedia || "0").replace(",", ".")) || 0,
                      coxa: Number((skinfolds.coxa || "0").replace(",", ".")) || 0,
                      toracica: Number((skinfolds.toracica || "0").replace(",", ".")) || 0,
                      suprailiaca: Number((skinfolds.suprailiaca || "0").replace(",", ".")) || 0,
                      panturrilha: Number((skinfolds.panturrilha || "0").replace(",", ".")) || 0,
                      supraespinhal: Number((skinfolds.supraespinhal || "0").replace(",", ".")) || 0,
                      formula: formulaDobras,
                      metodoPercentual,
                    },

                    somatorioDobras: [
                      Number((skinfolds.tricipital || "0").replace(",", ".")) || 0,
                      Number((skinfolds.bicipital || "0").replace(",", ".")) || 0,
                      Number((skinfolds.abdominal || "0").replace(",", ".")) || 0,
                      Number((skinfolds.subescapular || "0").replace(",", ".")) || 0,
                      Number((skinfolds.axilarMedia || "0").replace(",", ".")) || 0,
                      Number((skinfolds.coxa || "0").replace(",", ".")) || 0,
                      Number((skinfolds.toracica || "0").replace(",", ".")) || 0,
                      Number((skinfolds.suprailiaca || "0").replace(",", ".")) || 0,
                      Number((skinfolds.panturrilha || "0").replace(",", ".")) || 0,
                      Number((skinfolds.supraespinhal || "0").replace(",", ".")) || 0,
                    ].filter(v=>v>0).reduce((a,b)=>a+b,0),

                    // calculados
                    imc: (() => {
                      const v = calculateIMC(pesoNum, alturaNum)
                      return v ? Number(v.toFixed(2)) : undefined
                    })(),
                    classificacaoImc: (() => {
                      const v = calculateIMC(pesoNum, alturaNum)
                      return v ? classifyIMC(v) : undefined
                    })(),
                    rcq: (() => {
                      const v = calculateRCQ(cinturaNum, quadrilNum)
                      return v ? Number(v.toFixed(2)) : undefined
                    })(),
                    riscoRcq: (() => {
                      const v = calculateRCQ(cinturaNum, quadrilNum)
                      return v ? classifyRCQ(v, patient?.sexo) : undefined
                    })(),
                    cmb: (() => {
                      const v = calculateCMB(bracoNum)
                      return v ? Number(v.toFixed(2)) : undefined
                    })(),
                    classificacaoCmb: (() => {
                      const v = calculateCMB(bracoNum)
                      return v ? classifyCMB(v) : undefined
                    })(),

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
                    massaResidual: (pesoNum>0) ? Number(calculateMassaResidual(pesoNum).toFixed(2)) : undefined,
                    massaLivreGordura: mlgKg ? Number(mlgKg.toFixed(2)) : undefined,
                    massaGorduraPercent: mgPerc ? Number(mgPerc.toFixed(1)) : undefined,
                    massaLivreGorduraPercent: mgPerc ? Number((100 - mgPerc).toFixed(1)) : (mlgPerc ? Number(mlgPerc.toFixed(1)) : undefined),

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

                    setPatient(prev => prev ? { ...prev, historicoMetricas: atualizado } : prev)
                    setMetricas(atualizado)
                    // janela de 5 últimas será ajustada na Parte 3 (carrossel)

                    // limpar inputs
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
                }}>
                  Salvar medição
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* (Histórico + gráfico entram na PARTE 3/3) */}
          {/* ==================== Histórico (carrossel 5 colunas) ==================== */}
          {/*
            Controles do carrossel baseados no estado já criado (histStart, HIST_WINDOW, metricas).
            canPrev/canNext são computados aqui e usamos janelaMetricas como o "slice" visível.
          */}
          {(() => {
            return null
          })()}

          {/* eslint-disable react-hooks/rules-of-hooks */}
          {
            (() => {
              // helpers derivados
              const canPrev = histStart > 0
              const canNext = histStart + HIST_WINDOW < metricas.length
              const janelaMetricas = useMemo(() => {
                return metricas.slice(histStart, histStart + HIST_WINDOW)
              }, [metricas, histStart])

              // dados do gráfico (% massa gorda vs % livre)
              const chartData = useMemo(() => {
                return metricas.map((m: any) => {
                  const d = new Date((m.data || "") + "T12:00:00")
                  const label = isNaN(d.getTime())
                    ? (m.data || "")
                    : `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`
                  const mgpRaw = (typeof m.massaGorduraPercent === "number" ? m.massaGorduraPercent : undefined)
                    ?? (typeof m.gorduraPercentual === "number" ? m.gorduraPercentual : undefined)
                    ?? 0
                  const mgp = Number(Number(mgpRaw).toFixed(1))
                  const mlgp = Number((100 - mgp).toFixed(1))
                  return { data: label, "Massa gorda (%)": mgp, "Massa livre (%)": mlgp }
                })
              }, [metricas])

              return (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Histórico de medições</CardTitle>
                        <CardDescription>Ordem do mais antigo → mais novo. Use as setas para navegar.</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={!canPrev}
                          onClick={() => setHistStart((s) => (s > 0 ? s - 1 : s))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          disabled={!canNext}
                          onClick={() =>
                            setHistStart((s) => (s + HIST_WINDOW < metricas.length ? s + 1 : s))
                          }
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="overflow-x-auto">
                      {janelaMetricas.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Sem medições ainda.</div>
                      ) : (
                        <div className="min-w-[720px]">
                          {/* Cabeçalho de datas */}
                          <div className="grid grid-cols-[160px_repeat(5,minmax(120px,1fr))] gap-2 border-b pb-2 text-xs font-medium">
                            <div className="text-muted-foreground">Métrica</div>
                            {janelaMetricas.map((m: any) => (
                              <div key={m.data} className="text-center">
                                {new Date((m.data || "") + "T12:00:00").toLocaleDateString("pt-BR")}
                              </div>
                            ))}
                          </div>

                          {/* Linhas de métricas */}
                          {[
                            { k: "peso", label: "Peso (kg)", fmt: (v: any)=> (typeof v === "number" ? v.toFixed(1) : v) },
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
                          ].map((row) => (
                            <div
                              key={row.k}
                              className="grid grid-cols-[160px_repeat(5,minmax(120px,1fr))] gap-2 py-2 text-sm"
                            >
                              <div className="text-muted-foreground">{row.label}</div>
                              {janelaMetricas.map((m: any) => {
                                const raw: any = m[row.k as keyof typeof m]
                                const val = typeof row.fmt === "function" ? row.fmt(raw) : raw
                                return (
                                  <div key={m.data + "-" + row.k} className="text-center">
                                    {val ?? "-"}
                                  </div>
                                )
                              })}
                            </div>
                          ))}

                          {/* Ações por medição */}
                          <div className="grid grid-cols-[160px_repeat(5,minmax(120px,1fr))] gap-2 py-2 text-sm">
                            <div className="text-muted-foreground">Ações</div>
                            {janelaMetricas.map((m: any) => (
                              <div key={m.data + "-actions"} className="flex items-center justify-center">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={async () => {
                                    if (!user?.email || !patient) return
                                    try {
                                      const historicoAtualizado = (patient.historicoMetricas || []).filter(
                                        (x: any) => x.data !== m.data
                                      )
                                      const refPaciente = doc(db, "nutricionistas", user.email, "pacientes", id)
                                      await updateDoc(refPaciente, { historicoMetricas: historicoAtualizado })
                                      // atualizar estado e manter janela coerente
                                      setPatient((prev: any) =>
                                        prev ? { ...prev, historicoMetricas: historicoAtualizado } : prev
                                      )
                                      setMetricas(historicoAtualizado)
                                      // ajusta histStart se necessário
                                      setHistStart((s) => Math.min(s, Math.max(0, historicoAtualizado.length - HIST_WINDOW)))
                                      toast({ title: "Métrica excluída com sucesso" })
                                    } catch (error) {
                                      console.error("Erro ao excluir métrica:", error)
                                      toast({ title: "Erro ao excluir métrica", variant: "destructive" })
                                    }
                                  }}
                                >
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
                </>
              )
            })()
          }
          {/* eslint-enable react-hooks/rules-of-hooks */}
        </section>
      </div>
    </div>
  )
}
