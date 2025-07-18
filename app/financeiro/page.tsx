"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
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
    updateDoc,
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
    Calendar as CalendarIcon, // Renamed to avoid conflict with the component
    FileText,
    Home,
    LineChart,
    Menu,
    Plus,
    Users,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Edit,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type Consulta = {
    id: string
    paciente: string
    data: string
    horario: string
    duracao: string
    valor: number
    status: string
    pacienteInfo?: any
}

export default function FinanceiroPage() {
    const pathname = usePathname();
    const [consultas, setConsultas] = useState<any[]>([]);
    const [pacientes, setPacientes] = useState<any[]>([]);
    const { data: session } = useSession();
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

    // States para o modal de edição
    const [editarConsultaModalAberto, setEditarConsultaModalAberto] = useState(false);
    const [consultaSendoEditada, setConsultaSendoEditada] = useState<Consulta | null>(null);
    const [editPaciente, setEditPaciente] = useState("");
    const [editData, setEditData] = useState("");
    const [editHorario, setEditHorario] = useState("");
    const [editDuracao, setEditDuracao] = useState("");
    const [editValor, setEditValor] = useState("");

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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
    }, [session, pacientes]); // Added pacientes to dependency array for correct patient info loading

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

            const nutricionistaDocRef = doc(db, "nutricionistas", idNutricionista);
            const nutricionistaDocSnap = await getDoc(nutricionistaDocRef);
            const valorPadraoNutricionista = nutricionistaDocSnap.data()?.valorConsultaPadrao;

            const listaConsultasComValor = await Promise.all(
                snapshotConsultas.docs.map(async (docConsulta) => {
                    const consultaData = docConsulta.data();
                    let valorConsulta = valorPadraoNutricionista;

                    // Find patient information within the already loaded 'pacientes' state
                    const pacienteEncontrado = pacientes.find(
                        (paciente) => paciente.nome === consultaData.paciente
                    );

                    if (pacienteEncontrado && pacienteEncontrado.valorConsulta !== undefined && pacienteEncontrado.valorConsulta !== null) {
                        valorConsulta = pacienteEncontrado.valorConsulta;
                    }

                    return { id: docConsulta.id, ...consultaData, valor: valorConsulta, pacienteInfo: pacienteEncontrado };
                })
            );

            setConsultas(
                listaConsultasComValor.sort((a, b) => {
                    const dataA = new Date(b.data).getTime();
                    const dataB = new Date(a.data).getTime();
                    if (dataA !== dataB) {
                        return dataA - dataB;
                    }

                    // Sort by whether valorConsulta is explicitly set in pacienteInfo
                    const hasValorA = a.pacienteInfo?.valorConsulta !== undefined && a.pacienteInfo?.valorConsulta !== null;
                    const hasValorB = b.pacienteInfo?.valorConsulta !== undefined && b.pacienteInfo?.valorConsulta !== null;

                    if (hasValorA && !hasValorB) {
                        return -1; // a comes before b if a has explicit valor and b doesn't
                    }
                    if (!hasValorA && hasValorB) {
                        return 1; // b comes before a if b has explicit valor and a doesn't
                    }

                    return 0; // Maintain original order if both or neither have explicit valor
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

        let valorConsulta = valorPadraoNutricionista || 0;

        if (pacienteData?.valorConsulta !== undefined && pacienteData.valorConsulta !== null) {
            valorConsulta = pacienteData.valorConsulta;
        }

        const pacienteNome = pacienteData?.nome || pacienteSelecionado;

        await addDoc(collection(db, "nutricionistas", idNutricionista, "consultas"), {
            paciente: pacienteNome,
            data: dataConsulta,
            horario,
            duracao,
            valor: valorConsulta,
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

    async function handleEditConsultaClick(consulta: Consulta) {
        setConsultaSendoEditada(consulta);
        // Ensure that editPaciente is the ID if available, otherwise the name
        setEditPaciente(pacientes.find(p => p.nome === consulta.paciente)?.id || consulta.paciente);
        setEditData(consulta.data);
        setEditHorario(consulta.horario);
        setEditDuracao(consulta.duracao);
        setEditValor(consulta.valor.toString());
        setEditarConsultaModalAberto(true);
    }

    async function atualizarConsulta() {
        if (!consultaSendoEditada || !idNutricionista) return;

        const pacienteData = pacientes.find((p) => p.id === editPaciente);
        const pacienteNome = pacienteData?.nome || editPaciente; // Use ID to find the patient, then get the name

        const updatedData = {
            paciente: pacienteNome, // Store the name, not the ID
            data: editData,
            horario: editHorario,
            duracao: editDuracao,
            valor: parseFloat(editValor),
        };

        try {
            await updateDoc(doc(db, "nutricionistas", idNutricionista, "consultas", consultaSendoEditada.id), updatedData);
            setEditarConsultaModalAberto(false);
            await carregarConsultas(idNutricionista);
            alert("Consulta atualizada com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar consulta:", error);
            alert("Erro ao atualizar consulta.");
        }
    }

    function calcularReceita(consultasFiltradas: any[]) {
        const total = consultasFiltradas.reduce(
            (acc, consulta) => acc + Number(consulta.valor || 0),
            0
        );
        return `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    }

    function calcularReceitaDaSemana() {
        const hoje = new Date();
        const inicioDaSemana = new Date(hoje);
        inicioDaSemana.setDate(hoje.getDate() - hoje.getDay()); // Sunday
        inicioDaSemana.setHours(0, 0, 0, 0);

        const fimDaSemana = new Date(inicioDaSemana);
        fimDaSemana.setDate(inicioDaSemana.getDate() + 6); // Saturday
        fimDaSemana.setHours(23, 59, 59, 999);

        const consultasDaSemana = consultas.filter((consulta) => {
            const dataConsulta = new Date(consulta.data + "T00:00:00"); // Add T00:00:00 to avoid timezone issues
            return dataConsulta >= inicioDaSemana && dataConsulta <= fimDaSemana;
        });
        return calcularReceita(consultasDaSemana);
    }

    function consultasDoMesSelecionado() {
        return consultas.filter((consulta) => {
            const data = new Date(consulta.data + "T00:00:00"); // Add T00:00:00
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
        // getDay() returns 0 for Sunday, 1 for Monday, etc.
        // We want it to align with our grid (0 for Sunday)
        return new Date(ano, mes, 1).getDay();
    }

    const diasDaSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const getDiasDoMes = () => {
        const numDias = diasNoMes(mesSelecionado, anoSelecionado);
        const primeiroDiaIndex = primeiroDiaSemana(mesSelecionado, anoSelecionado); // 0=Dom, 1=Seg...

        const diasArray: (number | null)[] = [];

        // Preencher com null para os dias vazios antes do 1º dia do mês
        for (let i = 0; i < primeiroDiaIndex; i++) {
            diasArray.push(null);
        }

        // Preencher com os dias do mês
        for (let i = 1; i <= numDias; i++) {
            diasArray.push(i);
        }
        return diasArray;
    };

    const temConsultaNoDia = (dia: number | null) => {
        if (dia === null) return false;
        const consultasDoMes = consultasDoMesSelecionado();
        return consultasDoMes.some(consulta => {
            const data = new Date(consulta.data + "T00:00:00");
            return data.getDate() === dia;
        });
    };

    // Pagination logic
    const totalPages = Math.ceil(consultas.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedConsultas = consultas.slice(startIndex, endIndex);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    return (
        <div className="flex min-h-screen bg-background">
            <aside className="hidden w-64 flex-col bg-card border-r border-border lg:flex">
                <div className="flex h-14 items-center border-b px-4">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-indigo-600">
                        <LineChart className="h-5 w-5" />
                        <span>NutriDash</span>
                    </Link>
                </div>
                <nav className="flex-1 space-y-1 p-2">
                    <SidebarItem href="/" icon={<Home className="h-4 w-4" />} label="Dashboard" pathname={pathname} />
                    <SidebarItem href="/pacientes" icon={<Users className="h-4 w-4" />} label="Pacientes" pathname={pathname} />
                    <SidebarItem href="/materiais" icon={<FileText className="h-4 w-4" />} label="Materiais" pathname={pathname} />
                    <SidebarItem href="/financeiro" icon={<LineChart className="h-4 w-4" />} label="Financeiro" pathname={pathname} />
                    <SidebarItem href="/perfil" icon={<Users className="h-4 w-4" />} label="Perfil" pathname={pathname} />
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
                        <SheetContent side="left" className="w-64 p-0 z-50">
                            <div className="flex h-14 items-center border-b px-4">
                                <Link href="/" className="flex items-center gap-2 font-semibold text-indigo-600">
                                    <LineChart className="h-5 w-5" />
                                    <span>NutriDash</span>
                                </Link>
                            </div>
                            <nav className="flex-1 space-y-1 p-2">
                                <SidebarItem href="/" icon={<Home className="h-4 w-4" />} label="Dashboard" pathname={pathname} />
                                <SidebarItem href="/pacientes" icon={<Users className="h-4 w-4" />} label="Pacientes" pathname={pathname} />
                                <SidebarItem href="/materiais" icon={<FileText className="h-4 w-4" />} label="Materiais" pathname={pathname} />
                                <SidebarItem href="/financeiro" icon={<LineChart className="h-4 w-4" />} label="Financeiro" pathname={pathname} />
                                <SidebarItem href="/perfil" icon={<Users className="h-4 w-4" />} label="Perfil" pathname={pathname} />
                            </nav>
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
                                <div className="grid grid-cols-7 gap-1 text-center font-semibold mb-2 text-muted-foreground">
                                    {diasDaSemana.map((dia, index) => (
                                        <div key={index} className="py-2">
                                            {dia}
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center">
                                    {getDiasDoMes().map((dia, index) => (
                                        <div
                                            key={index}
                                            className={`
                                                relative p-2 rounded-md flex items-center justify-center
                                                ${dia === null ? "text-muted-foreground opacity-50 cursor-not-allowed" : "cursor-pointer"}
                                                ${dia !== null && dia === diaAtual && mesSelecionado === mesAtual && anoSelecionado === anoAtual
                                                    ? "bg-indigo-100 text-indigo-800 font-bold dark:bg-indigo-900 dark:text-indigo-100"
                                                    : "hover:bg-muted"
                                                }
                                                ${temConsultaNoDia(dia) ? "border-2 border-indigo-600 font-medium" : ""}
                                            `}
                                        >
                                            {dia}
                                            {temConsultaNoDia(dia) && dia !== null && (
                                                <span className="absolute bottom-1 right-1 h-2 w-2 bg-indigo-600 rounded-full"></span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tabela de Consultas Agendadas */}
                        <Card className="mt-6">
                            <CardHeader>
                                <CardTitle>Consultas Agendadas</CardTitle>
                                <CardDescription>Lista completa das suas consultas</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 dark:bg-gray-800">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Paciente</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Data</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Horário</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Duração</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Valor (R$)</th>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
                                            {paginatedConsultas.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center dark:text-gray-400">Nenhuma consulta encontrada.</td>
                                                </tr>
                                            ) : (
                                                paginatedConsultas.map((consulta) => (
                                                    <tr key={consulta.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">{consulta.paciente}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{consulta.data}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{consulta.horario}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{consulta.duracao} min</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">R$ {consulta.valor?.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleEditConsultaClick(consulta)}
                                                                    className="text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => excluirConsulta(consulta.id)}
                                                                    className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex justify-between items-center mt-4">
                                        <Button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
                                        </Button>
                                        <span>Página {currentPage} de {totalPages}</span>
                                        <Button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Próxima <ChevronRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </main>
            </div>

            {/* Modal para Nova Consulta */}
            <Dialog open={novaConsultaModalAberto} onOpenChange={setNovaConsultaModalAberto}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Agendar Nova Consulta</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="paciente">Paciente</Label>
                            <Select
                                value={pacienteSelecionado}
                                onValueChange={setPacienteSelecionado}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um paciente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {pacientes.map((paciente) => (
                                        <SelectItem key={paciente.id} value={paciente.id}>
                                            {paciente.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="dataConsulta">Data</Label>
                                <Input
                                    id="dataConsulta"
                                    type="date"
                                    value={dataConsulta}
                                    onChange={(e) => setDataConsulta(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="horario">Horário</Label>
                                <Input
                                    id="horario"
                                    type="time"
                                    value={horario}
                                    onChange={(e) => setHorario(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="duracao">Duração (minutos)</Label>
                            <Select
                                value={duracao}
                                onValueChange={setDuracao}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a duração" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="30">30 minutos</SelectItem>
                                    <SelectItem value="45">45 minutos</SelectItem>
                                    <SelectItem value="60">60 minutos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setNovaConsultaModalAberto(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={criarConsulta}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Agendar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal para Editar Consulta */}
            <Dialog open={editarConsultaModalAberto} onOpenChange={setEditarConsultaModalAberto}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Consulta</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="editPaciente">Paciente</Label>
                            <Select
                                value={editPaciente}
                                onValueChange={setEditPaciente}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um paciente" />
                                </SelectTrigger>
                                <SelectContent>
                                    {pacientes.map((paciente) => (
                                        <SelectItem key={paciente.id} value={paciente.id}>
                                            {paciente.nome}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="editData">Data</Label>
                                <Input
                                    id="editData"
                                    type="date"
                                    value={editData}
                                    onChange={(e) => setEditData(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="editHorario">Horário</Label>
                                <Input
                                    id="editHorario"
                                    type="time"
                                    value={editHorario}
                                    onChange={(e) => setEditHorario(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="editDuracao">Duração (minutos)</Label>
                            <Select
                                value={editDuracao}
                                onValueChange={setEditDuracao}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a duração" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="30">30 minutos</SelectItem>
                                    <SelectItem value="45">45 minutos</SelectItem>
                                    <SelectItem value="60">60 minutos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="editValor">Valor (R$)</Label>
                            <Input
                                id="editValor"
                                type="number"
                                value={editValor}
                                onChange={(e) => setEditValor(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditarConsultaModalAberto(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={atualizarConsulta}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Salvar Alterações
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Componentes auxiliares (mantidos do código anterior)
function SidebarItem({ href, icon, label, pathname }: { href: string; icon: React.ReactNode; label: string; pathname: string }) {
    const isActive = pathname === href;
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${isActive ? "bg-muted text-primary" : ""}`}
        >
            {icon}
            {label}
        </Link>
    );
}

function DollarIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
    );
}
