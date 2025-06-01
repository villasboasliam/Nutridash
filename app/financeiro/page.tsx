"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react"; // adicione se ainda não tiver acima
import { usePathname } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    deleteDoc,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import {
    Calendar,
    FileText,
    Home,
    LineChart,
    Menu,
    Plus,
    Users,
    Video,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function FinanceiroPage() {
    const pathname = usePathname();
    const [consultas, setConsultas] = useState<any[]>([]);
    const [pacientes, setPacientes] = useState<any[]>([]);
    const { data: session } = useSession(); // adicione logo no topo do componente
    const [novaConsultaModalAberto, setNovaConsultaModalAberto] =
        useState(false);
    const [pacienteSelecionado, setPacienteSelecionado] = useState("");
    const [dataConsulta, setDataConsulta] = useState("");
    const [horario, setHorario] = useState("");
    const [duracao, setDuracao] = useState("30");
    const [mesSelecionado, setMesSelecionado] = useState(
        new Date().getMonth()
    );
    const [anoSelecionado, setAnoSelecionado] = useState(
        new Date().getFullYear()
    );
    const [idNutricionista, setIdNutricionista] = useState<string | null>(null);

    const dataAtual = new Date();
    const diaAtual = dataAtual.getDate();
    const mesAtual = dataAtual.getMonth();
    const anoAtual = dataAtual.getFullYear();

   useEffect(() => {
    async function fetchData() {
        if (!session?.user?.email) return;
        const userEmail = session.user.email;

        const nutricionistasSnap = await getDocs(collection(db, "nutricionistas"));
        const nutricionista = nutricionistasSnap.docs.find(
            (doc) => doc.data().email === userEmail
        );
        if (nutricionista) {
            const id = nutricionista.id;
            setIdNutricionista(id);
            await carregarPacientes(id);
            await carregarConsultas(id);
        }
    }
    fetchData();
}, [session]);

    async function carregarPacientes(id: string) {
        const pacientesRef = collection(db, "nutricionistas", id, "pacientes");
        const snapshot = await getDocs(pacientesRef);
        const listaPacientes = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        setPacientes(listaPacientes);
    }

    async function carregarConsultas(idNutricionista: string) {
      try {
          const consultasRef = collection(db, "nutricionistas", idNutricionista, "consultas");
          const snapshotConsultas = await getDocs(consultasRef);
  
          // Buscar o documento do nutricionista para obter o valor padrão da consulta
          const nutricionistaDocRef = doc(db, "nutricionistas", idNutricionista);
          const nutricionistaDocSnap = await getDoc(nutricionistaDocRef);
          const valorPadraoNutricionista = nutricionistaDocSnap.data()?.valorConsultaPadrao;
  
          const listaConsultasComValor = await Promise.all(
              snapshotConsultas.docs.map(async (docConsulta) => {
                  const consultaData = docConsulta.data();
                  let valorConsulta = valorPadraoNutricionista; // Inicializa com o valor padrão
  
                  // Buscar o paciente associado à consulta pelo nome (isso pode ser inefficiente se houver muitos pacientes)
                  const pacienteEncontrado = pacientes.find(
                      (paciente) => paciente.nome === consultaData.paciente
                  );
  
                  if (pacienteEncontrado && pacienteEncontrado.valorConsulta !== undefined && pacienteEncontrado.valorConsulta !== null) {
                      valorConsulta = pacienteEncontrado.valorConsulta; // Sobrescreve com o valor do paciente se existir
                  }
  
                  return { id: docConsulta.id, ...consultaData, valor: valorConsulta, pacienteInfo: pacienteEncontrado };
              })
          );
  
          setConsultas(
              listaConsultasComValor.sort((a, b) => {
                  // Prioridade 1: Datas mais recentes
                  const dataA = new Date(b.data).getTime();
                  const dataB = new Date(a.data).getTime();
                  if (dataA !== dataB) {
                      return dataA - dataB;
                  }
  
                  // Prioridade 2: Pacientes com valorConsulta definido (maior prioridade)
                  const hasValorA = a.pacienteInfo?.valorConsulta !== undefined && a.pacienteInfo?.valorConsulta !== null;
                  const hasValorB = b.pacienteInfo?.valorConsulta !== undefined && b.pacienteInfo?.valorConsulta !== null;
  
                  if (hasValorA && !hasValorB) {
                      return -1; // a vem antes
                  }
                  if (!hasValorA && hasValorB) {
                      return 1; // b vem antes
                  }
  
                  return 0; // Se ambos têm ou não valorConsulta, mantém a ordem original (que já é por data)
              })
          );
      } catch (error) {
          console.error("Erro ao carregar as consultas:", error);
      }
  }
    async function criarConsulta() {
        if (!pacienteSelecionado || !dataConsulta || !horario || !idNutricionista) {
            alert("Preencha todos os campos obrigatórios!");
            return;
        }

        const pacienteData = pacientes.find((p) => p.id === pacienteSelecionado);
        const nutricionistaDocRef = doc(db, "nutricionistas", idNutricionista);
        const nutricionistaDocSnap = await getDoc(nutricionistaDocRef);
        const valorPadraoNutricionista = nutricionistaDocSnap.data()?.valorConsultaPadrao;

        let valorConsulta = valorPadraoNutricionista || 0; // Fallback para 0 se padrão não existir

        if (pacienteData?.valorConsulta !== undefined && pacienteData.valorConsulta !== null) {
            valorConsulta = pacienteData.valorConsulta;
        }

        const pacienteNome = pacienteData?.nome || pacienteSelecionado;

        await addDoc(collection(db, "nutricionistas", idNutricionista, "consultas"), {
            paciente: pacienteNome,
            data: dataConsulta,
            horario,
            duracao,
            valor: valorConsulta, // Usar o valor dinâmico
            status: "Agendada",
        });

        setPacienteSelecionado("");
        setDataConsulta("");
        setHorario("");
        setDuracao("30");
        setNovaConsultaModalAberto(false);
        await carregarConsultas(idNutricionista);
    }

    async function excluirConsulta(id: string) {
        if (!idNutricionista) return;
        const confirm = window.confirm("Tem certeza que deseja excluir esta consulta?");
        if (!confirm) return;
        await deleteDoc(doc(db, "nutricionistas", idNutricionista, "consultas", id));
        await carregarConsultas(idNutricionista);
    }

    function calcularReceita(consultasFiltradas: any[]) {
        const total = consultasFiltradas.reduce(
            (acc, consulta) => acc + Number(consulta.valor || 0), // Garante que o valor seja um número
            0
        );
        return `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    }

    function calcularReceitaDaSemana() {
        const hoje = new Date();
        const inicioDaSemana = new Date(hoje);
        inicioDaSemana.setDate(hoje.getDate() - hoje.getDay());
        inicioDaSemana.setHours(0, 0, 0, 0);

        const fimDaSemana = new Date(inicioDaSemana);
        fimDaSemana.setDate(inicioDaSemana.getDate() + 6);
        fimDaSemana.setHours(23, 59, 59, 999);

        const consultasDaSemana = consultas.filter((consulta) => {
            const dataConsulta = new Date(consulta.data);
            dataConsulta.setHours(0, 0, 0, 0);
            return dataConsulta >= inicioDaSemana && dataConsulta <= fimDaSemana;
        });
        return calcularReceita(consultasDaSemana);
    }

    function consultasDoMesSelecionado() {
        return consultas.filter((consulta) => {
            const data = new Date(consulta.data);
            return (
                data.getMonth() === mesSelecionado &&
                data.getFullYear() === anoSelecionado
            );
        });
    }

    const meses = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
    ];

    const anos = [2023, 2024, 2025, 2026, 2027];

    function diasNoMes(mes: number, ano: number) {
        return new Date(ano, mes + 1, 0).getDate();
    }

    function primeiroDiaSemana(mes: number, ano: number) {
        return new Date(ano, mes, 1).getDay();
    }

    const diasDaSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    return (
        <div className="flex min-h-screen bg-background">
            <aside className="hidden w-64 flex-col bg-card border-r border-border lg:flex">
                <div className="flex h-14 items-center border-b px-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-semibold text-indigo-600"
                    >
                        <LineChart className="h-5 w-5" />
                        <span>NutriDash</span>
                    </Link>
                </div>
                <nav className="flex-1 space-y-1 p-2">
                    <SidebarItem
                        href="/"
                        icon={<Home className="h-4 w-4" />}
                        label="Dashboard"
                        pathname={pathname}
                    />
                    <SidebarItem
                        href="/pacientes"
                        icon={<Users className="h-4 w-4" />}
                        label="Pacientes"
                        pathname={pathname}
                    />
                    <SidebarItem
                        href="/materiais"
                        icon={<FileText className="h-4 w-4" />}
                        label="Materiais"
                        pathname={pathname}
                    />

                    <SidebarItem
                        href="/financeiro"
                        icon={<LineChart className="h-4 w-4" />}
                        label="Financeiro"
                        pathname={pathname}
                    />
                    <SidebarItem
                        href="/perfil"
                        icon={<Users className="h-4 w-4" />}
                        label="Perfil"
                        pathname={pathname}
                    />
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
                                <Link
                                    href="/"
                                    className="flex items-center gap-2 font-semibold text-indigo-600"
                                >
                                    <LineChart className="h-5 w-5" />
                                    <span>NutriDash</span>
                                </Link>
                            </div>
                        </SheetContent>
                    </Sheet>
                    <div className="w-full flex-1">
                        <h2 className="text-lg font-medium">Financeiro</h2>
                    </div>
                    <ThemeToggle />
                </header>
                <main className="flex-1 p-4 md:p-6">
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                Controle Financeiro
                            </h1>
                            <Button
                                onClick={() => setNovaConsultaModalAberto(true)}
                                className="bg-indigo-600 hover:bg-indigo-700"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nova Consulta
                            </Button>
                        </div>

                        {/* Cards de Receita */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Receita da Semana
                                    </CardTitle>
                                    <DollarIcon />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {calcularReceitaDaSemana()}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Total arrecadado com as consultas da semana
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Receita do Mês
                                    </CardTitle>
                                    <DollarIcon />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {calcularReceita(consultasDoMesSelecionado())}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {consultasDoMesSelecionado().length} consultas
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Filtros de mês/ano */}
                        <div className="flex items-center gap-4 mt-4">
                            <Select
                                value={mesSelecionado.toString()}
                                onValueChange={(mes) => setMesSelecionado(Number(mes))}
                            >
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Mês" />
                                </SelectTrigger>
                                <SelectContent>
                                    {meses.map((mes, index) => (
                                        <SelectItem key={index} value={index.toString()}>
                                            {mes}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={anoSelecionado.toString()}
                                onValueChange={(ano) => setAnoSelecionado(Number(ano))}
                            >
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue placeholder="Ano" />
                                </SelectTrigger>
                                <SelectContent>
                                    {anos.map((ano) => (
                                        <SelectItem key={ano} value={ano.toString()}>
                                            {ano}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Calendário de Consultas */}
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Agenda de Consultas</CardTitle>
                                <CardDescription>
                                    Visualize suas consultas no calendário mensal
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-7 gap-1 text-center font-semibold mb-2">
                                    {diasDaSemana.map((dia, index) => (
                                        <div key={index}>{dia}</div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from(
                                        { length: primeiroDiaSemana(mesSelecionado, anoSelecionado) },
                                        (_, i) => (
                                            <div
                                                key={`empty-${i}`}
                                                className="border rounded-md h-28 p-1 bg-muted"
                                            ></div>
                                        )
                                    )}

                                    {Array.from(
                                        { length: diasNoMes(mesSelecionado, anoSelecionado) },
                                        (_, index) => {
                                            const diaCalendario = index + 1;

                                            const consultasDoDia = consultas.filter((consulta) => {
                                                const dataConsulta = new Date(consulta.data);
                                                // Ajuste para UTC para evitar problemas de timezone
                                                const diaConsultaUTC = dataConsulta.getUTCDate();
                                                const mesConsultaUTC = dataConsulta.getUTCMonth();
                                                const anoConsultaUTC = dataConsulta.getUTCFullYear();
                                            
                                                return (
                                                    diaConsultaUTC === diaCalendario &&
                                                    mesConsultaUTC === mesSelecionado &&
                                                    anoConsultaUTC === anoSelecionado
                                                );
                                            });

                                            const isHoje =
                                                diaCalendario === diaAtual &&
                                                mesSelecionado === mesAtual &&
                                                anoSelecionado === anoAtual;

                                            return (
                                                <div
                                                    key={diaCalendario}
                                                    className={`border rounded-md h-28 p-1 flex flex-col overflow-y-auto ${
                                                        isHoje ? "bg-emerald-100 border-emerald-500 dark:bg-emerald-900 dark:border-emerald-300" : ""
                                                    }`}
                                                >
                                                    <div className="text-xs font-semibold">{diaCalendario}</div>
                                                    {consultasDoDia.map((consulta) => (
                                                        <div
                                                            key={consulta.id}
                                                            className="mt-1 text-sm bg-indigo-100 dark:bg-indigo-900 rounded p-1 px-2 text-indigo-600 dark:text-indigo-300 font-semibold"
                                                        >
                                                            <div>{consulta.horario}</div>
                                                            <div className="truncate">{consulta.paciente}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Lista de Consultas */}
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Consultas Agendadas</CardTitle>
                                <CardDescription>Lista completa das suas consultas</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {consultas.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted">
                                                <tr>
                                                    <th className="px-4 py-2">Paciente</th>
                                                    <th className="px-4 py-2">Data</th>
                                                    <th className="px-4 py-2">Horário</th>
                                                    <th className="px-4 py-2">Duração</th>
                                                    <th className="px-4 py-2">Valor (R$)</th>
                                                    <th className="px-4 py-2 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {consultas
                                                    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                                                    .map((consulta) => (
                                                        <tr key={consulta.id} className="border-b hover:bg-muted/50">
                                                            <td className="px-4 py-2">{consulta.paciente}</td>
                                                            <td className="px-4 py-2">{consulta.data}</td>
                                                            <td className="px-4 py-2">{consulta.horario}</td>
                                                            <td className="px-4 py-2">{consulta.duracao} min</td>
                                                            <td className="px-4 py-2">
    R$ {consulta.pacienteInfo?.valorConsulta !== undefined && consulta.pacienteInfo?.valorConsulta !== null
        ? consulta.pacienteInfo.valorConsulta
        : consulta.valor // Se pacienteInfo.valorConsulta não existir, usa o valor da consulta (que pode ser o padrão)
    }
</td>
                                                            <td className="px-4 py-2 text-right">
                                                                <Button
                                                                    variant="destructive"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        if (confirm("Tem certeza que deseja excluir esta consulta?")) {
                                                                            excluirConsulta(consulta.id);
                                                                        }
                                                                    }}
                                                                >
                                                                    Excluir
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-center text-muted-foreground py-10">
                                        Nenhuma consulta cadastrada ainda.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <ModalNovaConsulta
                            open={novaConsultaModalAberto}
                            onOpenChange={setNovaConsultaModalAberto}
                            pacientes={pacientes}
                            pacienteSelecionado={pacienteSelecionado}
                            setPacienteSelecionado={setPacienteSelecionado}
                            dataConsulta={dataConsulta}
                            setDataConsulta={setDataConsulta}
                            horario={horario}
                            setHorario={setHorario}
                            duracao={duracao}
                            setDuracao={setDuracao}
                            criarConsulta={criarConsulta}
                        />
                    </div>
                </main>
            </div>
        </div>
    );
}

// Funções auxiliares
function diasNoMes(mes: number, ano: number) {
    return new Date(ano, mes + 1, 0).getDate();
}

function primeiroDiaSemana(mes: number, ano: number) {
    return new Date(ano, mes, 1).getDay(); // 0 = Domingo
}

// Ícone de Dinheiro
function DollarIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 text-muted-foreground"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
            <path d="M12 18V6" />
        </svg>
    );
}

// Constantes de datas
const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const anos = [2023, 2024, 2025, 2026, 2027];

const diasDaSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
// SidebarItem - botão de navegação lateral
function SidebarItem({
    href,
    icon,
    label,
    pathname,
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    pathname: string;
}) {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
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
    );
}

// Modal de Nova Consulta
function ModalNovaConsulta({
    open,
    onOpenChange,
    pacientes,
    pacienteSelecionado,
    setPacienteSelecionado,
    dataConsulta,
    setDataConsulta,
    horario,
    setHorario,
    duracao,
    setDuracao,
    criarConsulta,
}: any) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Nova Consulta</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 gap-2">
                        <Label>Paciente</Label>
                        <Select value={pacienteSelecionado} onValueChange={setPacienteSelecionado}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o paciente" />
                            </SelectTrigger>
                            <SelectContent>
                                {pacientes.length > 0 ? (
                                    pacientes.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.nome}
                                        </SelectItem>
                                    ))
                                ) : (
                                    <SelectItem value="nenhum" disabled>
                                        Nenhum paciente encontrado
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <Label>Data</Label>
                        <Input type="date" value={dataConsulta} onChange={(e) => setDataConsulta(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <Label>Horário</Label>
                        <Input type="time" step="300" value={horario} onChange={(e) => setHorario(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        <Label>Duração (min)</Label>
                        <Input value={duracao} onChange={(e) => setDuracao(e.target.value)} placeholder="Ex: 30" />
                    </div>
                </div>
                <DialogFooter className="mt-4">
                    <Button
                        onClick={criarConsulta}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                    >
                        Salvar Consulta
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}