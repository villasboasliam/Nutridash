"use client"

import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import * as React from "react"
import { Calendar, FileText, Home, LineChart, Menu, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"

interface AcessoDia { dia: string; acessos: number }
interface Paciente { id: string; status?: string; [key: string]: any }
interface ConsultaMes { mes: string; consultas: number }
interface NovosClientesMes { mes: string; novos: number }

export default function DashboardWrapper() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.push("/login") }, [loading, user, router]);
  if (loading || !user) return <div className="p-6 text-center">Carregando sessão...</div>;
  return <Dashboard user={user} />;
}

function Dashboard({ user }: { user: any }) {
  const pathname = usePathname();
  const { t } = { t: (k: string) => k };

  const [metrics, setMetrics] = useState({
    totalPacientes: 0,
    pacientesAtivos: 0,
    pacientesAtivosSemanaAnterior: 0,
    dietasEnviadas: 0,
    dietasSemanaAnterior: 0,
    taxaAcesso: 0,
    acessosPorDia: [] as AcessoDia[],
    novosClientesPorMes: [] as NovosClientesMes[],  // <<< novo (pós-trim)
    mesesNovosClientes: 12,                          // <<< novo (para o subtítulo)
  });
  const [consultasUltimos6Meses, setConsultasUltimos6Meses] = useState<ConsultaMes[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user?.email) return;
      const nutricionistaEmail = user.email;

      // ----- PACIENTES -----
      const pacientesSnap = await getDocs(collection(db, "nutricionistas", nutricionistaEmail, "pacientes"));
      const pacientes: Paciente[] = pacientesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const totalPacientes = pacientes.length;
      const pacientesAtivos = pacientes.filter(p => p.status === "Ativo").length;
      const pacientesAtivosSemanaAnterior = Math.max(0, pacientesAtivos - 1);

      // ----- DIETAS -----
      let dietasEnviadas = 0, dietasSemanaAnterior = 0;
      try {
        const estatSnap = await getDoc(doc(db, "nutricionistas", nutricionistaEmail, "estatisticas", "dietas"));
        if (estatSnap.exists()) {
          dietasEnviadas = estatSnap.data().totalDietasEnviadas || 0;
          dietasSemanaAnterior = Math.max(0, dietasEnviadas - 1);
        }
      } catch {}
      const taxaAcesso = Math.floor((pacientesAtivos / Math.max(totalPacientes, 1)) * 100);

      // ===== NOVOS CLIENTES POR MÊS (últimos 12) =====
      const mapaMes: Record<string, number> = {};
      const agora = new Date();
      const inicioJanPassado = new Date(agora.getFullYear(), agora.getMonth() - 11, 1); // 12 meses

      for (const d of pacientesSnap.docs) {
        const data = d.data() as any;
        const createdVal = data?.createdAt ?? data?.created_at;
        let created: Date | null = null;
        if (createdVal?.toDate) created = createdVal.toDate();
        else if (typeof createdVal === "string" || typeof createdVal === "number") created = new Date(createdVal);

        if (created && !isNaN(created.getTime()) && created >= inicioJanPassado) {
          const chave = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
          mapaMes[chave] = (mapaMes[chave] || 0) + 1;
        }
      }

      // gera os 12 meses cronológicos
      const mesesOrdenados: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
        mesesOrdenados.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
      const serie12: NovosClientesMes[] = mesesOrdenados.map(ym => {
        const [ano, mes] = ym.split("-");
        const nomeMes = new Date(parseInt(ano), parseInt(mes) - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
        return { mes: nomeMes, novos: mapaMes[ym] || 0 };
      });

      // ---- TRIM: remove zeros no início até o 1º mês com >=1 novo paciente
      let firstIdx = serie12.findIndex(m => m.novos > 0);
      if (firstIdx === -1) firstIdx = 0;             // se todos zero, mantém 12 meses
      const serieFinal = serie12.slice(firstIdx);
      const mesesNovosClientes = Math.max(1, serieFinal.length); // evita 0

      // ----- ACESSOS POR DIA (mantido) -----
      const acessosPorDiaMap: { [k: string]: number } = {};
      const seteDiasAtras = new Date(); seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
      for (const paciente of pacientes) {
        const acessosSnap = await getDocs(collection(db, "nutricionistas", nutricionistaEmail, "pacientes", paciente.id, "acessosApp"));
        acessosSnap.forEach(a => {
          const ts = a.data()?.timestamp?.toDate?.();
          if (ts && ts >= seteDiasAtras) {
            const key = ts.toISOString().slice(0, 10);
            acessosPorDiaMap[key] = (acessosPorDiaMap[key] || 0) + 1;
          }
        });
      }
      const diasSemana = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().slice(0,10);
      }).reverse();
      const acessosDataCompleta: AcessoDia[] = diasSemana.map(dia => {
        const dt = new Date(dia); dt.setTime(dt.getTime() + dt.getTimezoneOffset()*60000);
        return { dia: dt.toLocaleDateString("pt-BR", { weekday: "short" }), acessos: acessosPorDiaMap[dia] || 0 };
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
        novosClientesPorMes: serieFinal,          // <<< pronto para o gráfico
        mesesNovosClientes,                       // <<< para o subtítulo
      }));

      // ----- CONSULTAS (mantido) -----
      const consultasRef = collection(db, "nutricionistas", nutricionistaEmail, "consultas");
      const seisMesesAtras = new Date(); seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
      const qConsultas = query(
        consultasRef,
        where("data", ">=", `${seisMesesAtras.getFullYear()}-${String(seisMesesAtras.getMonth() + 1).padStart(2,"0")}-${String(seisMesesAtras.getDate()).padStart(2,"0")}`)
      );
      const consultasSnap = await getDocs(qConsultas);
      const consultas = consultasSnap.docs.map(d => d.data() as any);
      const bucket: Record<string, number> = {};
      consultas.forEach(c => {
        if (typeof c.data === "string" && c.data.includes("-")) {
          const [ano, mes] = c.data.split("-");
          const k = `${ano}-${mes}`;
          bucket[k] = (bucket[k] || 0) + 1;
        }
      });
      const dataGraficoConsultas = Object.keys(bucket).sort().map(k => {
        const [ano, mes] = k.split("-");
        const nomeMes = new Date(parseInt(ano), parseInt(mes)-1, 1).toLocaleDateString("pt-BR",{month:"short"});
        return { mes: nomeMes, consultas: bucket[k] };
      });
      setConsultasUltimos6Meses(dataGraficoConsultas.slice(-6));
    };

    fetchMetrics();
  }, [user]);

  const calcVariation = (current: number, previous: number) => {
    if (previous === 0) return "+100%";
    const percent = ((current - previous) / previous) * 100;
    return `${percent >= 0 ? "+" : ""}${percent.toFixed(0)}%`;
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* sidebar e header mantidos... */}

      <div className="flex flex-col flex-1 lg:ml-64">
        {/* ...header omitido para brevidade... */}

        <main className="flex-1 p-4 md:p-6">
          {/* cards mantidos... */}

          <div className="mt-6 grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {/* === NOVOS CLIENTES POR MÊS (dinâmico) === */}
            <Card>
              <CardHeader>
                <CardTitle>Novos clientes por mês</CardTitle>
                <CardDescription>
                  Número de pacientes nos últimos {metrics.mesesNovosClientes} {metrics.mesesNovosClientes === 1 ? "mês" : "meses"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.novosClientesPorMes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="novos" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* consultas mantido */}
            <Card>
              <CardHeader>
                <CardTitle>Consultas por Mês</CardTitle>
                <CardDescription>Número de consultas nos últimos 6 meses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={consultasUltimos6Meses}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="consultas" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

// SidebarItem e MetricCard iguais aos seus originais...
