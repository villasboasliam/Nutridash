'use client'

import { useState, useEffect } from "react"
import { FileText, Home, LineChart, Menu, Search, Users } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { useLanguage } from "@/contexts/language-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, doc, getDoc, setDoc } from "firebase/firestore"
import { useSession } from "next-auth/react"

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()
  const [patients, setPatients] = useState<any[]>([])
  const [nutricionistaId, setNutricionistaId] = useState("")
  const [plano, setPlano] = useState("teste")
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    const verificarCadastro = async () => {
      if (!session?.user?.email) return
      const ref = doc(db, "nutricionistas", session.user.email)
      const snap = await getDoc(ref)

      if (!snap.exists()) {
        await setDoc(ref, {
          nome: session.user.name || "",
          email: session.user.email,
          plano: "gratuito",
          assinatura_ativa: false,
          data_criacao: new Date()
        })
      }
    }
    verificarCadastro()
  }, [session])

  useEffect(() => {
    const fetchNutriInfo = async () => {
      if (!session?.user?.email) return
      const ref = collection(db, "nutricionistas")
      const q = query(ref, where("email", "==", session.user.email))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const doc = snap.docs[0]
        setNutricionistaId(doc.id)
        setPlano(doc.data().plano || "teste")
      }
    }
    fetchNutriInfo()
  }, [session])

  useEffect(() => {
    const fetchPacientes = async () => {
      if (!nutricionistaId) return
      const ref = collection(db, "nutricionistas", nutricionistaId, "pacientes")
      const snapshot = await getDocs(ref)
      const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setPatients(lista)
    }
    fetchPacientes()
  }, [nutricionistaId])

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone?.includes(searchTerm),
  )

  const exibirAvisoUpgrade = plano === "teste" && patients.length >= 5;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar fixado para desktop */}
      <aside className="hidden w-64 flex-col bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border-r border-[hsl(var(--sidebar-border))] lg:flex fixed h-full">
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

      <div className="lg:ml-64 flex-1 flex flex-col">
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
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar pacientes..."
                  className="w-full bg-background pl-8 md:w-[300px] lg:w-[400px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </form>
          </div>

          <ThemeToggle />
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto w-full">
            {exibirAvisoUpgrade && (
              <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 text-sm px-4 py-3 rounded mb-4">
                <strong>Plano Gratuito:</strong> Você atingiu o limite de 5 pacientes.{' '}
                <Link href="/upgrade" className="underline font-medium">
                  Faça upgrade agora →
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-4 md:gap-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{t("patients")}</h1>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Link href="/">Voltar ao Dashboard</Link>
                  </Button>
                  {plano === "teste" && patients.length >= 5 ? (
  <Button disabled className="bg-gray-300 text-gray-600 cursor-not-allowed">
    + Novo Paciente
  </Button>
) : (
  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
    <Link href="/pacientes/novo">+ Novo Paciente</Link>
  </Button>
)}

                </div>
              </div>

              <Tabs defaultValue="todos" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
                  <TabsTrigger value="todos">{t("all")}</TabsTrigger>
                  <TabsTrigger value="ativos">{t("active")}</TabsTrigger>
                  <TabsTrigger value="inativos">{t("inactive")}</TabsTrigger>
                </TabsList>

                {['todos', 'ativos', 'inativos'].map((label) => {
                  const filtro =
                    label === 'ativos' ? (p: any) => p.status === 'Ativo' :
                    label === 'inativos' ? (p: any) => p.status === 'Inativo' :
                    () => true
                  const titulo =
                    label === 'ativos' ? 'Pacientes Ativos' :
                    label === 'inativos' ? 'Pacientes Inativos' :
                    t('patient.list')

                  return (
                    <TabsContent key={label} value={label} className="mt-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>{titulo}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-4">
                            {filteredPatients.filter(filtro).length > 0 ? (
                              filteredPatients.filter(filtro).map((patient) => (
                                <Link key={patient.email} href={`/pacientes/${encodeURIComponent(patient.email)}`}>

                                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted transition-colors">
                                    <div className="flex items-center gap-4">
                                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                                        <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                                      </div>
                                      <div>
                                        <p className="font-medium">{patient.nome}</p>
                                        <p className="text-sm text-muted-foreground">{patient.email}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="hidden md:block">
                                        <p className="text-sm text-right">{t("last.visit")}</p>
                                        <p className="text-sm font-medium text-right">{patient.lastVisit}</p>
                                      </div>
                                      <div>
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                          patient.status === "Ativo"
                                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                                          }`}>
                                          {patient.status}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </Link>
                              ))
                            ) : (
                              <div className="flex flex-col items-center justify-center p-8 text-center">
                                <p className="text-muted-foreground">Nenhum paciente encontrado</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  )
                })}
              </Tabs>
            </div>
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
              ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))]"
              : "hover:bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      ))}
    </>
  )
}
