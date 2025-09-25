"use client"

import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { setDoc, doc, Timestamp } from "firebase/firestore"

// ⬇️ imports só para UI do menu/logo (não alteram sua lógica/variáveis)
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { BarChart3, Home, Users, FileText, LineChart, Menu } from "lucide-react"

export default function NovoPacientePage() {
  const [user, loading] = useAuthState(auth)
  const router = useRouter()
  const { toast } = useToast()

  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!user && !loading) router.push("/login")
  }, [user, loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.email) {
      toast({
        title: "Erro de autenticação",
        description: "Sua sessão expirou. Faça login novamente.",
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/createPatient", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          nutricionistaId: user.email,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro desconhecido")

      toast({
        title: "Paciente criado!",
        description: `Paciente ${nome} criado com sucesso. Um e-mail foi enviado.`,
      })

      router.push("/pacientes")
    } catch (error: any) {
      console.error("Erro ao criar paciente:", error)
      toast({
        title: "Erro ao criar paciente",
        description: error.message || "Erro desconhecido.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 flex-col bg-card border-r border-border lg:flex fixed h-full">
        <div className="flex h-14 items-center border-b px-4">
          {/* Logo igual à landing/área logada */}
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <div className="w-8 h-8 bg-nutridash-purple rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">NutriDash</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          <NavItem href="/dashboard" icon={<Home className="h-4 w-4" />} label="Dashboard" />
          <NavItem href="/pacientes" icon={<Users className="h-4 w-4" />} label="Pacientes" />
          <NavItem href="/materiais" icon={<FileText className="h-4 w-4" />} label="Materiais" />
          <NavItem href="/financeiro" icon={<LineChart className="h-4 w-4" />} label="Financeiro" />
          <NavItem href="/perfil" icon={<Users className="h-4 w-4" />} label="Perfil" />
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex flex-col flex-1 lg:ml-64">
        {/* Header/topbar com menu mobile e ThemeToggle */}
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <Sheet>
  <SheetTrigger asChild>
    <Button variant="outline" size="icon" className="lg:hidden">
      <Menu className="h-5 w-5" />
    </Button>
  </SheetTrigger>

  <SheetContent side="left" className="w-64 p-0">
    {/* Título acessível exigido pelo Radix (invisível visualmente) */}
    <SheetHeader className="sr-only">
      <SheetTitle>Menu de navegação</SheetTitle>
    </SheetHeader>

    <div className="flex h-14 items-center border-b px-4">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
        <div className="w-8 h-8 bg-nutridash-purple rounded-lg flex items-center justify-center">
          <BarChart3 className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900 dark:text-white">NutriDash</span>
      </Link>
    </div>

    <nav className="flex-1 space-y-1 p-2">
      <NavItem href="/dashboard" icon={<Home className="h-4 w-4" />} label="Dashboard" />
      <NavItem href="/pacientes" icon={<Users className="h-4 w-4" />} label="Pacientes" />
      <NavItem href="/materiais" icon={<FileText className="h-4 w-4" />} label="Materiais" />
      <NavItem href="/financeiro" icon={<LineChart className="h-4 w-4" />} label="Financeiro" />
      <NavItem href="/perfil" icon={<Users className="h-4 w-4" />} label="Perfil" />
    </nav>
  </SheetContent>
</Sheet>


          <div className="w-full flex-1">
            <h2 className="text-lg font-medium">Novo Paciente</h2>
          </div>

          <ThemeToggle />
        </header>

        {/* MAIN: seu formulário 100% intacto */}
        <main className="flex-1 p-6">
          <Card className="max-w-xl mx-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
              </div>
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Cadastrando..." : "Cadastrar Paciente"}
              </Button>
            </form>
          </Card>
        </main>
      </div>
    </div>
  )
}

/* Auxiliar simples para o menu (sem estados extras) */
function NavItem({
  href, icon, label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
    >
      {icon}
      {label}
    </Link>
  );
}
