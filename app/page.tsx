"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { collection, getDocs, getDoc, doc, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

import { Calendar, FileText, Home, LineChart, Menu, Plus, Users, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { useMobile } from "@/hooks/use-mobile"
import { useLanguage } from "@/contexts/language-context"
import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

interface AcessoDia {
  dia: string
  acessos: number
}

interface ConsultaMes {
  mes: string
  consultas: number
}

export default function DashboardWrapper() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/nutridash")
    }
  }, [status, router])

  if (status === "loading") {
    return <div className="p-6 text-center">Carregando...</div>
  }

  return <Dashboard session={session} />
}

function Dashboard({ session }: { session: any }) {
  const isMobile = useMobile()
  const pathname = usePathname()
  const { t } = useLanguage()
  const { toast } = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [metrics, setMetrics] = useState({
    totalPacientes: 0,
    pacientesAtivos: 0,
    pacientesAtivosSemanaAnterior: 0,
    dietasEnviadas: 0,
    dietasSemanaAnterior: 0,
    taxaAcesso: 0,
    acessosPorDia: [] as AcessoDia[],
  })
  const [consultasUltimos6Meses, setConsultasUltimos6Meses] = useState<ConsultaMes[]>([])

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!session?.user?.email) return;
      const nutricionistaEmail = session.user.email;
      const nutricionistaPacientesRef = collection(db, "nutricionistas", nutricionistaEmail, "pacientes");
      const pacientesSnap = await getDocs(nutricionistaPacientesRef);
      const pacientes = pacientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const totalPacientes = pacientes.length;
      const pacientesAtivos = pacientes.filter(p => p.status === "Ativo").length;
      const pacientesAtivosSemanaAnterior = Math.max(0, pacientesAtivos - 1);

      let dietasEnviadas = 0;
      let dietasSemanaAnterior = 0;
      try {
        const estatRef = doc(db, "nutricionistas", nutricionistaEmail, "estatisticas", "dietas");
        const estatSnap = await getDoc(estatRef);
        if (estatSnap.exists()) {
          dietasEnviadas = estatSnap.data().totalDietasEnviadas || 0;
          dietasSemanaAnterior = Math.max(0, dietasEnviadas - 1);
        }
      } catch (error) {
        console.error("Erro ao buscar estatísticas de dietas:", error);
      }

      const taxaAcesso = Math.floor((pacientesAtivos / Math.max(totalPacientes, 1)) * 100);

      const acessosPorDiaMap: { [key: string]: number } = {};
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      for (const paciente of pacientes) {
        const acessosRef = collection(db, "nutricionistas", nutricionistaEmail, "pacientes", paciente.id, "acessosApp");
        const acessosSnap = await getDocs(acessosRef);
        acessosSnap.forEach(acessoDoc => {
          const timestamp = acessoDoc.data()?.timestamp?.toDate();
          if (timestamp && timestamp >= seteDiasAtras) {
            const dataAcesso = timestamp.toISOString().slice(0, 10);
            acessosPorDiaMap[dataAcesso] = (acessosPorDiaMap[dataAcesso] || 0) + 1;
          }
        });
      }

      const diasSemana = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().slice(0, 10);
      }).reverse();

      const acessosDataCompleta: AcessoDia[] = diasSemana.map(dia => {
        const date = new Date(dia);
        date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
        return {
          dia: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
          acessos: acessosPorDiaMap[dia] || 0,
        };
      });

      setMetrics(prev => ({
        ...prev,
        totalPacientes,
        pacientesAtivos,
        pacientesAtivosSemanaAnterior,
        dietasEnviadas,
        dietasSemanaAnterior,
        taxaAcesso,
        acessosPorDia: acessosDataCompleta,
      }));

      const consultasRef = collection(db, "nutricionistas", nutricionistaEmail, "consultas");
      const seisMesesAtras = new Date();
      seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
      const seisMesesAtrasString = `${seisMesesAtras.getFullYear()}-${(seisMesesAtras.getMonth() + 1).toString().padStart(2, '0')}-${seisMesesAtras.getDate().toString().padStart(2, '0')}`;
      const q = query(consultasRef, where("data", ">=", seisMesesAtrasString));
      const consultasSnap = await getDocs(q);
      const consultas = consultasSnap.docs.map(doc => doc.data());
      const consultasPorMes: { [key: string]: number } = {};
      consultas.forEach(consulta => {
        const dataConsulta = consulta.data;
        if (typeof dataConsulta === 'string' && dataConsulta.includes('-')) {
          const [ano, mes] = dataConsulta.split('-');
          const chave = `${ano}-${mes}`;
          consultasPorMes[chave] = (consultasPorMes[chave] || 0) + 1;
        }
      });
      const dataGraficoConsultas = Object.keys(consultasPorMes)
        .sort()
        .map(chave => {
          const [ano, mes] = chave.split('-');
          const nomeMes = new Date(parseInt(ano), parseInt(mes) - 1, 1).toLocaleDateString('pt-BR', { month: 'short' });
          return { mes: nomeMes, consultas: consultasPorMes[chave] };
        });
      setConsultasUltimos6Meses(dataGraficoConsultas.slice(-6));
    };

    fetchMetrics();
  }, [session]);

  const calcVariation = (current: number, previous: number) => {
    if (previous === 0) return "+100%"
    const percent = ((current - previous) / previous) * 100
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(0)}%`
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className="hidden w-64 flex-col border-r border-border lg:flex"
        style={{
          backgroundColor: "hsl(var(--sidebar-background))",
          color: "hsl(var(--sidebar-foreground))"
        }}
      >
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
      <div className="flex flex-1 flex-col">
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
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            <h2 className="text-lg font-medium">{t("dashboard")}</h2>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
            <MetricCard title={t("total.patients")} value={metrics.totalPacientes} icon={<Users className="h-4 w-4 text-muted-foreground" />} note={`+${metrics.totalPacientes - 2} no último mês`} />
            <MetricCard title={t("active.patients")} value={metrics.pacientesAtivos} icon={<Calendar className="h-4 w-4 text-muted-foreground" />} note={calcVariation(metrics.pacientesAtivos, metrics.pacientesAtivosSemanaAnterior)} />
            <MetricCard title={t("sent.diets")} value={metrics.dietasEnviadas} icon={<FileText className="h-4 w-4 text-muted-foreground" />} note={calcVariation(metrics.dietasEnviadas, metrics.dietasSemanaAnterior)} />
            <MetricCard title={t("app.access.rate")} value={`${metrics.taxaAcesso}%`} icon={<LineChart className="h-4 w-4 text-muted-foreground" />} note={`+${metrics.taxaAcesso - 45}% que mês passado`} />
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("app.access")}</CardTitle>
                <CardDescription>{t("daily.access")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.acessosPorDia}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dia" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="acessos" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("Consultas por Mês") || "Consultas por Mês"}</CardTitle>
                <CardDescription>{t("Número de consultas nos últimos 6 meses") || "Número de consultas nos últimos 6 meses"}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={consultasUltimos6Meses}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="consultas" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon, note }: { title: string; value: any; icon: JSX.Element; note: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
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
