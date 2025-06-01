"use client"

import { useToast } from "@/components/ui/use-toast"
import { Sheet } from "@/components/ui/sheet"
import {
    FileText, Home, LineChart, Menu, Save, Users, Video, LogOut,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { useLanguage } from "@/contexts/language-context"

export default function PerfilPage() {
    const pathname = usePathname()
    const { t } = useLanguage()
    const { theme } = useTheme()
    const { data: session } = useSession()
    const router = useRouter()
    const { toast } = useToast()

    const [formData, setFormData] = useState({
        nome: "",
        email: "",
        telefone: "",
        crn: "",
        valorConsultaPadrao: "",
        dataNascimento: "",
        cep: "",
        endereco: "",
        cidade: "",
        estado: "",
        plano: ""
    })

    const [saveButtonText, setSaveButtonText] = useState("Salvar alterações")
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        const fetchUserData = async () => {
            if (!session?.user?.email) return
            const ref = doc(db, "nutricionistas", session.user.email)
            const snap = await getDoc(ref)
            if (snap.exists()) {
                const data = snap.data()
                setFormData({
  nome: data.nome || "",
  email: data.email || "",
  telefone: data.telefone || "",
  crn: data.crn || "",
  valorConsultaPadrao: data.valorConsultaPadrao || "",
  dataNascimento: data.dataNascimento || "",
  cep: data.cep || "",
  endereco: data.endereco || "",
  cidade: data.cidade || "",         // <- aqui
  estado: data.estado || "",         // <- aqui
  plano: data.plano || ""
})
            }
        }
        fetchUserData()
    }, [session])

    const buscarEndereco = async (cep: string) => {
        const cleanedCep = cep.replace(/\D/g, "")
        if (!cleanedCep || cleanedCep.length !== 8) {
            toast({ title: "Atenção", description: "Por favor, insira um CEP válido com 8 dígitos." })
            return
        }
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`)
            const data = await response.json()
            if (data.erro) {
                toast({ title: "Erro", description: "Não foi possível encontrar o endereço para este CEP." })
                return
            }
            setFormData((prev) => ({
                ...prev,
                endereco: data.logradouro || "",
                cidade: data.localidade || "",
                estado: data.uf || ""
            }))
        } catch (error) {
            toast({ title: "Erro", description: "Ocorreu um erro ao buscar o endereço." })
            console.error("Erro ao buscar CEP:", error)
        }
    }

    const handleInputNumber = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
        const onlyNumbers = e.target.value.replace(/\D/g, "")
        setFormData({ ...formData, [field]: onlyNumbers })
    }

    const formatPhoneNumber = (value: string): string => {
        const cleaned = value.replace(/\D/g, "")
        const match = cleaned.match(/(\d{2})(\d{5})(\d{4})/)
        return match ? `(${match[1]})${match[2]}-${match[3]}` : value
    }

    const handleSave = async () => {
        if (!session?.user?.email) return
        setIsSaving(true)
        setSaveButtonText("Salvando...")
        const ref = doc(db, "nutricionistas", session.user.email)
        try {
            await updateDoc(ref, {
                nome: formData.nome,
                telefone: formData.telefone,
                crn: formData.crn,
                valorConsultaPadrao: formData.valorConsultaPadrao,
                dataNascimento: formData.dataNascimento,
                cep: formData.cep,
                endereco: formData.endereco,
                cidade: formData.cidade,
                estado: formData.estado
            })
            toast({ title: "Sucesso", description: "Dados salvos com sucesso." })
            setSaveButtonText("Salvo!")
        } catch (error) {
            console.error("Erro ao salvar dados:", error)
            toast({ title: "Erro", description: "Ocorreu um erro ao salvar os dados.", variant: "destructive" })
            setSaveButtonText("Erro ao salvar!")
        } finally {
            setIsSaving(false)
            setTimeout(() => setSaveButtonText("Salvar alterações"), 2000)
        }
    }


    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar para desktop */}
            <aside className="hidden w-64 flex-col bg-card border-r border-border lg:flex fixed h-full">
                <div className="flex h-14 items-center border-b px-4">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-indigo-600">
                        <LineChart className="h-5 w-5" />
                        <span>NutriDash</span>
                    </Link>
                </div>
                <nav className="flex-1 space-y-1 p-2">
                    <SidebarItem href="/" icon={<Home className="h-4 w-4" />} label={t("dashboard")} pathname={pathname} />
                    <SidebarItem href="/pacientes" icon={<Users className="h-4 w-4" />} label={t("patients")} pathname={pathname} />
                    <SidebarItem href="/materiais" icon={<FileText className="h-4 w-4" />} label="Materiais" pathname={pathname} />
                    <SidebarItem href="/financeiro" icon={<LineChart className="h-4 w-4" />} label="Financeiro" pathname={pathname} />
                    <SidebarItem href="/perfil" icon={<Users className="h-4 w-4" />} label={t("profile")} pathname={pathname} />
                </nav>
            </aside>


            {/* Conteúdo principal */}
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
                                <SidebarItem href="/" icon={<Home className="h-4 w-4" />} label={t("dashboard")} pathname={pathname} />
                                <SidebarItem href="/pacientes" icon={<Users className="h-4 w-4" />} label={t("patients")} pathname={pathname} />
                                <SidebarItem href="/materiais" icon={<FileText className="h-4 w-4" />} label="Materiais" pathname={pathname} />
                                <SidebarItem href="/financeiro" icon={<LineChart className="h-4 w-4" />} label="Financeiro" pathname={pathname} />
                                <SidebarItem href="/perfil" icon={<Users className="h-4 w-4" />} label={t("profile")} pathname={pathname} />
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <div className="w-full flex-1">
                        <h2 className="text-lg font-medium">Perfil</h2>
                    </div>
                    <ThemeToggle />
                </header>


                <main className="flex-1 p-4 md:p-6">
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card className="rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-2xl font-bold text-primary">Informações Pessoais</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="grid gap-2">
                                        <Label htmlFor="nome" className="text-sm font-medium text-muted-foreground">Nome completo</Label>
                                        <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email</Label>
                                        <Input id="email" value={formData.email} disabled className="rounded-md border border-input bg-muted px-3 py-2 text-base cursor-not-allowed" />
                                    </div>
                                    <div className="grid gap-2">
  <Label htmlFor="telefone" className="text-sm font-medium text-muted-foreground">Telefone</Label>
  <Input
    id="telefone"
    value={formData.telefone}
    onChange={(e) => {
      const raw = e.target.value.replace(/\D/g, "")
      const formatted = raw
        .replace(/^(\d{2})(\d)/, "($1)$2")
        .replace(/(\d{5})(\d)/, "$1-$2")
        .slice(0, 14)
      setFormData({ ...formData, telefone: formatted })
    }}
    placeholder="(00)00000-0000"
    className="rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
  />
</div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="dataNascimento" className="text-sm font-medium text-muted-foreground">Data de Nascimento</Label>
                                        <Input
                                            id="dataNascimento"
                                            type="date"
                                            value={formData.dataNascimento}
                                            onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                                            className="rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                   <div className="grid gap-2">
  <Label htmlFor="crn" className="text-sm font-medium text-muted-foreground">CRN</Label>
  <Input
    id="crn"
    value={formData.crn}
    onChange={(e) => {
      const numeric = e.target.value.replace(/\D/g, "")
      setFormData({ ...formData, crn: numeric })
    }}
    placeholder="Somente números"
    className="rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
  />
</div>

                                </CardContent>
                            </Card>


                            <Card className="rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-2xl font-bold text-primary">Endereço</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="grid gap-2">
                                        <Label htmlFor="cep" className="text-sm font-medium text-muted-foreground">CEP</Label>
                                       <Input
  id="cep"
  value={formData.cep}
  onChange={(e) => {
    let value = e.target.value.replace(/\D/g, ""); // remove tudo que não for número
    if (value.length > 8) value = value.slice(0, 8); // limita a 8 dígitos
    if (value.length > 5) {
      value = value.replace(/^(\d{5})(\d{0,3})$/, "$1-$2");
    }
    setFormData({ ...formData, cep: value });
  }}
  onBlur={(e) => buscarEndereco(e.target.value.replace(/\D/g, ""))} // busca o CEP limpo
  placeholder="00000-000"
  maxLength={9}
  className="rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
/>

                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="endereco" className="text-sm font-medium text-muted-foreground">Endereço</Label>
                                        <Input id="endereco" value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="cidade" className="text-sm font-medium text-muted-foreground">Cidade</Label>
                                        <Input id="cidade" value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="estado" className="text-sm font-medium text-muted-foreground">Estado</Label>
                                        <Input id="estado" value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200" />
                                    </div>
                                </CardContent>
                            </Card>


                            <Card className="rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-2xl font-bold text-primary">Configurações</CardTitle>
                                </CardHeader>
<CardContent className="space-y-5">

  {/* Botão de alterar senha - agora vem primeiro */}
 <div className="grid gap-2">
  <Label htmlFor="alterar-senha" className="text-sm font-medium text-muted-foreground">
    Alterar Senha
  </Label>
  <Link href="/perfil/atualizar-senha" id="alterar-senha">
    <Button
      variant="outline"
      className="w-full border border-indigo-500 text-indigo-600 hover:bg-indigo-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c.828 0 1.5-.672 1.5-1.5S12.828 8 12 8s-1.5.672-1.5 1.5S11.172 11 12 11zm0 0v2m0 0v2m-6 4h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.586a1 1 0 00-.707.293l-.707.707a1 1 0 01-1.414 0l-.707-.707A1 1 0 0010.586 11H8a2 2 0 00-2 2v4a2 2 0 002 2z" />
      </svg>
      Alterar senha
    </Button>
  </Link>
</div>


  {/* Campo valor da consulta */}
  <div className="grid gap-2">
    <Label htmlFor="valorConsulta" className="text-sm font-medium text-muted-foreground">Valor Consulta Padrão (R$)</Label>
    <Input
      id="valorConsulta"
      type="number"
      value={formData.valorConsultaPadrao}
      onChange={(e) => setFormData({ ...formData, valorConsultaPadrao: e.target.value })}
      className="rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
    />
  </div>

  {/* Exibição do plano */}
<div className="grid gap-2">
  <Label className="text-sm font-medium text-muted-foreground">Plano Atual</Label>
  <Button
    disabled
    variant="outline"
    className={`w-full justify-start gap-2 text-sm sm:text-base font-semibold px-4 py-2 rounded-md border-2 shadow-sm
      ${
        formData.plano === "premium"
          ? "border-yellow-500 text-yellow-700 bg-yellow-100"
          : formData.plano === "gratuito"
          ? "border-gray-400 text-gray-600 bg-gray-100"
          : "border-blue-500 text-blue-700 bg-blue-100"
      }
    `}
  >
    {formData.plano === "premium" && (
      <>
        <svg
          className="w-5 h-5 text-yellow-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.562-.955L10 0l2.95 5.955 6.562.955-4.756 4.635 1.122 6.545z" />
        </svg>
        Premium
      </>
    )}
    {formData.plano === "gratuito" && (
      <>
        <svg
          className="w-5 h-5 text-gray-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13z" />
        </svg>
        Gratuito
      </>
    )}
    {formData.plano === "teste" && (
      <>
        <svg
          className="w-5 h-5 text-blue-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M4 3a1 1 0 000 2h1v11a1 1 0 001 1h8a1 1 0 001-1V5h1a1 1 0 100-2H4zm3 2v10h6V5H7z" />
        </svg>
        Teste
      </>
    )}
    {!["premium", "gratuito", "teste"].includes(formData.plano) && (
      <>
        <svg
          className="w-5 h-5 text-indigo-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 7h2v2H9V7zm0 4h2v4H9v-4z" />
        </svg>
        {formData.plano || "Desconhecido"}
      </>
    )}
  </Button>
</div>

</CardContent>


                            </Card>
                        </div>


                        {/* Botões de ação */}
                        <div className="flex flex-col sm:flex-row gap-4 mt-6">
                            <Button
                                onClick={handleSave}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                                disabled={isSaving}
                            >
                                <Save className={`mr-2 h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} /> {saveButtonText}
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="py-2 px-6 rounded-lg text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200">
                                        <LogOut className="mr-2 h-4 w-4" /> {t("logout")}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-lg shadow-2xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Tem certeza que deseja sair?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Você será desconectado da sua conta.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-md">Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => signOut({ callbackUrl: "/" })} className="bg-destructive hover:bg-destructive/90 text-white rounded-md">Sair</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}


function SidebarItem({ href, icon, label, pathname }: { href: string, icon: React.ReactNode, label: string, pathname: string }) {
    const isActive = pathname === href || pathname.startsWith(`${href}/`)
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                isActive
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"
                    : "text-foreground hover:bg-muted"
            }`}
        >
            {icon}
            {label}
        </Link>
    )
}
