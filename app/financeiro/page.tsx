"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
    Calendar as CalendarIcon,
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
    Phone, // Added Phone icon for consultation details
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type Consulta = {
    id: string
    paciente: string // This will be the patient's name
    data: string // YYYY-MM-DD
    horario: string // HH:MM
    duracao: string
    valor: number
    status: string
    pacienteInfo?: { // Explicitly define expected fields from patient
        nome: string;
        telefone?: string; // Assuming phone number might exist
        email?: string; // Assuming email might exist
        // ... other patient fields you might need
    };
}

type Paciente = {
    id: string;
    nome: string;
    valorConsulta?: number; // Optional, as it might come from default
    telefone?: string; // Add telefone to Paciente type
    email?: string;
}

export default function FinanceiroPage() {
    const pathname = usePathname();
    const [consultas, setConsultas] = useState<Consulta[]>([]);
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const { data: session } = useSession();
    const [novaConsultaModalAberto, setNovaConsultaModalAberto] =
        useState(false);
    const [pacienteSelecionado, setPacienteSelecionado] = useState("");
    const [dataConsulta, setDataConsulta] = useState("");
    const [newConsultaHora, setNewConsultaHora] = useState("");
    const [newConsultaMinuto, setNewConsultaMinuto] = useState("");
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
    const [editPacienteId, setEditPacienteId] = useState("");
    const [editData, setEditData] = useState("");
    const [editHora, setEditHora] = useState("");
    const [editMinuto, setEditMinuto] = useState("");
    const [editDuracao, setEditDuracao] = useState("");
    const [editValor, setEditValor] = useState("");

    // States para o modal de detalhes da consulta no calendário
    const [detalhesConsultaModalAberto, setDetalhesConsultaModalAberto] = useState(false);
    const [consultasDoDiaClicado, setConsultasDoDiaClicado] = useState<Consulta[]>([]);
    const [diaClicadoCalendar, setDiaClicadoCalendar] = useState<string>(""); // To show date in modal

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const dataAtual = new Date();
    const diaAtual = dataAtual.getDate();
    const mesAtual = dataAtual.getMonth();
    const anoAtual = dataAtual.getFullYear();

    // Helper to format date
    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        try {
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error("Error formatting date:", dateString, error);
            return dateString;
        }
    };

    // Helper to generate hour options (00-23)
    const generateHourOptions = () => {
        const hours = [];
        for (let h = 0; h < 24; h++) {
            hours.push(String(h).padStart(2, '0'));
        }
        return hours;
    };

    // Helper to generate minute options (00, 05, ..., 55)
    const generateMinuteOptions = () => {
        const minutes = [];
        for (let m = 0; m < 60; m += 5) {
            minutes.push(String(m).padStart(2, '0'));
        }
        return minutes;
    };

    const hourOptions = useMemo(generateHourOptions, []);
    const minuteOptions = useMemo(generateMinuteOptions, []);


    const carregarPacientes = useCallback(async (id: string) => {
        const pacientesRef = collection(db, "nutricionistas", id, "pacientes");
        const snapshot = await getDocs(pacientesRef);
        const listaPacientes = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Paciente[];
        // Sort patients alphabetically by name
        listaPacientes.sort((a, b) => a.nome.localeCompare(b.nome));
        setPacientes(listaPacientes);
        return listaPacientes; // Return for use in carregarConsultas
    }, []);

    const carregarConsultas = useCallback(async (nutricionistaId: string, currentPacientes: Paciente[]) => {
        try {
            const consultasRef = collection(db, "nutricionistas", nutricionistaId, "consultas");
            const snapshotConsultas = await getDocs(consultasRef);

            const nutricionistaDocRef = doc(db, "nutricionistas", nutricionistaId);
            const nutricionistaDocSnap = await getDoc(nutricionistaDocRef);
            const valorPadraoNutricionista = nutricionistaDocSnap.data()?.valorConsultaPadrao;

            const listaConsultasComValor = snapshotConsultas.docs.map((docConsulta) => {
                const consultaData = docConsulta.data();
                let valorConsulta = consultaData.valor; // Prioritize saved value

                const pacienteEncontrado = currentPacientes.find(
                    (paciente) => paciente.nome === consultaData.paciente
                );

                // If no value is saved for this specific consultation, try to get from patientInfo or default
                if (valorConsulta === undefined || valorConsulta === null) {
                    if (pacienteEncontrado && pacienteEncontrado.valorConsulta !== undefined && pacienteEncontrado.valorConsulta !== null) {
                        valorConsulta = pacienteEncontrado.valorConsulta;
                    } else {
                        valorConsulta = valorPadraoNutricionista;
                    }
                }

                return {
                    id: docConsulta.id,
                    ...consultaData,
                    valor: valorConsulta,
                    pacienteInfo: pacienteEncontrado // Ensure patientInfo is always attached
                };
            }) as Consulta[];

            setConsultas(
                listaConsultasComValor.sort((a, b) => {
                    const dateA = new Date(a.data + "T" + a.horario).getTime();
                    const dateB = new Date(b.data + "T" + b.horario).getTime();
                    if (dateA !== dateB) {
                        return dateA - dateB;
                    }
                    return 0;
                })
            );
        } catch (error) {
            console.error("Erro ao carregar as consultas:", error);
        }
    }, []);

    useEffect(() => {
        async function loadInitialData() {
            if (!session?.user?.email) return;
            const userEmail = session.user.email;

            const nutricionistasSnap = await getDocs(collection(db, "nutricionistas"));
            const nutricionista = nutricionistasSnap.docs.find(
                (doc) => doc.data().email === userEmail
            );
            if (nutricionista) {
                const id = nutricionista.id;
                setIdNutricionista(id);
                // Load patients first, then load consultations
                const loadedPacientes = await carregarPacientes(id);
                if (loadedPacientes) {
                    await carregarConsultas(id, loadedPacientes);
                }
            }
        }
        loadInitialData();
    }, [session, carregarPacientes, carregarConsultas]); // Add carregarConsultas to deps

    async function criarConsulta() {
        const fullHorario = `${newConsultaHora}:${newConsultaMinuto}`;
        if (!pacienteSelecionado || !dataConsulta || !fullHorario || !idNutricionista) {
            alert("Preencha todos os campos obrigatórios!");
            return;
        }

        const pacienteData = pacientes.find((p) => p.id === pacienteSelecionado);
        if (!pacienteData) {
             alert("Paciente não encontrado. Selecione um paciente válido.");
             return;
        }

        const nutricionistaDocRef = doc(db, "nutricionistas", idNutricionista);
        const nutricionistaDocSnap = await getDoc(nutricionistaDocRef);
        const valorPadraoNutricionista = nutricionistaDocSnap.data()?.valorConsultaPadrao;

        let valorConsulta = valorPadraoNutricionista || 0;

        if (pacienteData.valorConsulta !== undefined && pacienteData.valorConsulta !== null) {
            valorConsulta = pacienteData.valorConsulta;
        }

        try {
            await addDoc(collection(db, "nutricionistas", idNutricionista, "consultas"), {
                paciente: pacienteData.nome, // Use the name from the found patient
                data: dataConsulta,
                horario: fullHorario,
                duracao,
                valor: valorConsulta,
                status: "Agendada",
            });

            setPacienteSelecionado("");
            setDataConsulta("");
            setNewConsultaHora("");
            setNewConsultaMinuto("");
            setDuracao("30");
            setNovaConsultaModalAberto(false);
            await carregarConsultas(idNutricionista, pacientes);
            alert("Consulta agendada com sucesso!");
        } catch (error) {
            console.error("Erro ao criar consulta:", error);
            alert("Erro ao agendar consulta.");
        }
    }

    async function excluirConsulta(id: string) {
        if (!idNutricionista) return;
        const confirm = window.confirm("Tem certeza que deseja excluir esta consulta?");
        if (!confirm) return;
        try {
            await deleteDoc(doc(db, "nutricionistas", idNutricionista, "consultas", id));
            await carregarConsultas(idNutricionista, pacientes);
            alert("Consulta excluída com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir consulta:", error);
            alert("Erro ao excluir consulta.");
        }
    }

    async function handleEditConsultaClick(consulta: Consulta) {
        setConsultaSendoEditada(consulta);
        const foundPatient = pacientes.find(p => p.nome === consulta.paciente);
        setEditPacienteId(foundPatient?.id || "");

        setEditData(consulta.data);
        const [hora, minuto] = consulta.horario.split(":");
        setEditHora(hora);
        setEditMinuto(minuto);

        setEditDuracao(consulta.duracao);
        setEditValor(consulta.valor.toString());
        setEditarConsultaModalAberto(true);
    }

    async function atualizarConsulta() {
        if (!consultaSendoEditada || !idNutricionista) return;

        const pacienteData = pacientes.find((p) => p.id === editPacienteId);
        const pacienteNome = pacienteData?.nome || "";

        if (!pacienteNome) {
            alert("Paciente inválido selecionado.");
            return;
        }

        const fullHorario = `${editHora}:${editMinuto}`;

        const updatedData = {
            paciente: pacienteNome,
            data: editData,
            horario: fullHorario,
            duracao: editDuracao,
            valor: parseFloat(editValor),
        };

        try {
            await updateDoc(doc(db, "nutricionistas", idNutricionista, "consultas", consultaSendoEditada.id), updatedData);
            setEditarConsultaModalAberto(false);
            await carregarConsultas(idNutricionista, pacientes);
            alert("Consulta atualizada com sucesso!");
        } catch (error) {
            console.error("Erro ao atualizar consulta:", error);
            alert("Erro ao atualizar consulta.");
        }
    }

    // Function to handle click on a day in the calendar
    const handleDayClick = useCallback((day: number | null) => {
        if (day === null) return;
        const clickedDate = new Date(anoSelecionado, mesSelecionado, day);
        const formattedClickedDate = clickedDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
        const consultationsForThisDay = consultas.filter(consulta => {
            return consulta.data === formattedClickedDate;
        }).sort((a, b) => a.horario.localeCompare(b.horario));
    
        if (consultationsForThisDay.length > 0) {
            setConsultasDoDiaClicado(consultationsForThisDay);
            setDiaClicadoCalendar(formatDate(formattedClickedDate)); // Set formatted date for modal title
            setDetalhesConsultaModalAberto(true);
        } else {
            // Optionally, if you want to allow adding a new appointment by clicking an empty day:
            // setDataConsulta(formattedClickedDate);
            // setNewConsultaHora("09"); // Example default hour
            // setNewConsultaMinuto("00"); // Example default minute
            // setNovaConsultaModalAberto(true);
        }
    }, [consultas, anoSelecionado, mesSelecionado, formatDate]);


    const calcularReceita = useCallback((consultasFiltradas: Consulta[]) => {
        const total = consultasFiltradas.reduce(
            (acc, consulta) => acc + Number(consulta.valor || 0),
            0
        );
        return `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    }, []);

    const calcularReceitaDaSemana = useCallback(() => {
        const hoje = new Date();
        const inicioDaSemana = new Date(hoje);
        inicioDaSemana.setDate(hoje.getDate() - hoje.getDay()); // Sunday
        inicioDaSemana.setHours(0, 0, 0, 0);

        const fimDaSemana = new Date(inicioDaSemana);
        fimDaSemana.setDate(inicioDaSemana.getDate() + 6); // Saturday
        fimDaSemana.setHours(23, 59, 59, 999);

        const consultasDaSemana = consultas.filter((consulta) => {
            const dataConsulta = new Date(consulta.data + "T00:00:00");
            return dataConsulta >= inicioDaSemana && dataConsulta <= fimDaSemana;
        });
        return calcularReceita(consultasDaSemana);
    }, [consultas, calcularReceita]);

    const consultasDoMesSelecionado = useCallback(() => {
        return consultas.filter((consulta) => {
            const data = new Date(consulta.data + "T00:00:00");
            return (
                data.getMonth() === mesSelecionado &&
                data.getFullYear() === anoSelecionado
            );
        });
    }, [consultas, mesSelecionado, anoSelecionado]);

    const meses = useMemo(() => [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ], []);

    const anos = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear + i);
    }, []);

    const diasNoMes = useCallback((mes: number, ano: number) => {
        return new Date(ano, mes + 1, 0).getDate();
    }, []);

    const primeiroDiaSemana = useCallback((mes: number, ano: number) => {
        return new Date(ano, mes, 1).getDay();
    }, []);

    const diasDaSemana = useMemo(() => ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"], []);

    const getDiasDoMes = useCallback(() => {
        const numDias = diasNoMes(mesSelecionado, anoSelecionado);
        const primeiroDiaIndex = primeiroDiaSemana(mesSelecionado, anoSelecionado);

        const diasArray: (number | null)[] = [];

        for (let i = 0; i < primeiroDiaIndex; i++) {
            diasArray.push(null);
        }

        for (let i = 1; i <= numDias; i++) {
            diasArray.push(i);
        }
        return diasArray;
    }, [mesSelecionado, anoSelecionado, diasNoMes, primeiroDiaSemana]);

    const getConsultasDoDia = useCallback((dia: number | null) => {
        if (dia === null) return [];
        const currentMonthPadded = String(mesSelecionado + 1).padStart(2, '0');
        const currentDayPadded = String(dia).padStart(2, '0');
        const dateString = `${anoSelecionado}-${currentMonthPadded}-${currentDayPadded}`;

        return consultas.filter(consulta => {
            return consulta.data === dateString;
        }).sort((a, b) => a.horario.localeCompare(b.horario));
    }, [consultas, mesSelecionado, anoSelecionado]);


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
                                    {getDiasDoMes().map((dia, index) => {
                                        const isCurrentDay = dia !== null && dia === diaAtual && mesSelecionado === mesAtual && anoSelecionado === anoAtual;
                                        const consultasDoDia = getConsultasDoDia(dia);
                                        const hasConsultas = consultasDoDia.length > 0;

                                        return (
                                            <div
                                                key={index}
                                                className={`
                                                    relative p-2 rounded-md flex flex-col items-center justify-start min-h-[80px] text-sm
                                                    ${dia === null ? "text-muted-foreground opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted"}
                                                    ${isCurrentDay
                                                        ? "bg-indigo-100 text-indigo-800 font-bold dark:bg-indigo-900 dark:text-indigo-100"
                                                        : ""
                                                    }
                                                    ${hasConsultas && !isCurrentDay ? "border-2 border-indigo-600 font-medium" : ""}
                                                    ${hasConsultas && isCurrentDay ? "border-2 border-indigo-800 dark:border-indigo-400" : ""}
                                                `}
                                                onClick={() => handleDayClick(dia)} {/* Added click handler */}
                                            >
                                                <span className="font-semibold text-base">{dia}</span>
                                                {hasConsultas && (
                                                    <div className="mt-1 w-full text-xs text-left px-1 max-h-[50px] overflow-hidden">
                                                        {consultasDoDia.map((c, i) => {
                                                            const firstName = c.paciente.split(' ')[0];
                                                            return (
                                                                <div key={i} className="truncate leading-tight">
                                                                    <span className="font-medium">{c.horario}</span> - {firstName}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
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
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(consulta.data)}</td>
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
                <DialogContent className="max-h-[90vh] overflow-y-auto"> {/* Added max-h and overflow-y-auto */}
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
                                <SelectContent className="max-h-60 overflow-y-auto"> {/* Added max-h and overflow for long lists */}
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
                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="newConsultaHora">Hora</Label>
                                    <Select
                                        value={newConsultaHora}
                                        onValueChange={setNewConsultaHora}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="HH" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-48 overflow-y-auto"> {/* Constrain height of dropdown */}
                                            {hourOptions.map((hour) => (
                                                <SelectItem key={hour} value={hour}>
                                                    {hour}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="newConsultaMinuto">Minuto</Label>
                                    <Select
                                        value={newConsultaMinuto}
                                        onValueChange={setNewConsultaMinuto}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="MM" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-48 overflow-y-auto"> {/* Constrain height of dropdown */}
                                            {minuteOptions.map((minute) => (
                                                <SelectItem key={minute} value={minute}>
                                                    {minute}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                <SelectContent className="max-h-48 overflow-y-auto">
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
                            onClick={() => {
                                setNovaConsultaModalAberto(false);
                                setNewConsultaHora("");
                                setNewConsultaMinuto("");
                            }}
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
                <DialogContent className="max-h-[90vh] overflow-y-auto"> {/* Added max-h and overflow-y-auto */}
                    <DialogHeader>
                        <DialogTitle>Editar Consulta</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="editPaciente">Paciente</Label>
                            <Select
                                value={editPacienteId}
                                onValueChange={setEditPacienteId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um paciente" />
                                </SelectTrigger>
                                <SelectContent className="max-h-60 overflow-y-auto"> {/* Added max-h and overflow for long lists */}
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
                            <div className="grid grid-cols-2 gap-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="editHora">Hora</Label>
                                    <Select
                                        value={editHora}
                                        onValueChange={setEditHora}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="HH" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-48 overflow-y-auto"> {/* Constrain height of dropdown */}
                                            {hourOptions.map((hour) => (
                                                <SelectItem key={hour} value={hour}>
                                                    {hour}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="editMinuto">Minuto</Label>
                                    <Select
                                        value={editMinuto}
                                        onValueChange={setEditMinuto}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="MM" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-48 overflow-y-auto"> {/* Constrain height of dropdown */}
                                            {minuteOptions.map((minute) => (
                                                <SelectItem key={minute} value={minute}>
                                                    {minute}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                <SelectContent className="max-h-48 overflow-y-auto">
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
                            onClick={() => {
                                setEditarConsultaModalAberto(false);
                                setEditHora("");
                                setEditMinuto("");
                            }}
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

            {/* Modal para Detalhes da Consulta (ao clicar no dia do calendário) */}
            <Dialog open={detalhesConsultaModalAberto} onOpenChange={setDetalhesConsultaModalAberto}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Consultas em {diaClicadoCalendar}</DialogTitle>
                        <DialogDescription>
                            Detalhes das consultas agendadas para este dia.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto"> {/* Added scroll to content if too many consultations */}
                        {consultasDoDiaClicado.length === 0 ? (
                            <p className="text-muted-foreground">Nenhuma consulta agendada para este dia.</p>
                        ) : (
                            consultasDoDiaClicado.map((consulta) => (
                                <Card key={consulta.id} className="p-4 flex flex-col gap-2 border border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-semibold text-lg">{consulta.paciente}</h4>
                                        <span className="text-sm text-muted-foreground">{consulta.horario}</span>
                                    </div>
                                    {consulta.pacienteInfo?.telefone && (
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Phone className="h-4 w-4 mr-2" />
                                            {consulta.pacienteInfo.telefone}
                                        </div>
                                    )}
                                    {/* You can add more details here if needed, like email, etc. */}
                                    {consulta.valor && (
                                        <div className="text-sm text-muted-foreground">
                                            Valor: R$ {consulta.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                        </div>
                                    )}
                                    <div className="flex justify-end gap-2 mt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setDetalhesConsultaModalAberto(false); // Close details modal first
                                                handleEditConsultaClick(consulta); // Open edit modal
                                            }}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                setDetalhesConsultaModalAberto(false); // Close details modal first
                                                excluirConsulta(consulta.id); // Delete consultation
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setDetalhesConsultaModalAberto(false)}>Fechar</Button>
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
