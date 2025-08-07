"use client"

import { getAuth } from "firebase/auth";
import { useState, useEffect } from "react"
import { FileText, Home, LineChart, Menu, Plus, Upload, Users, Video, X, Trash2, Edit } from "lucide-react";
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { useToast } from "@/components/ui/use-toast"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { db, storage } from "@/lib/firebase"
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Definindo um tipo para os PDFs para incluir o storagePath
interface PdfData {
    id: string;
    pdfUrl: string;
    nomePdf: string;
    criadoEm: string;
    storagePath?: string; // Tornar opcional para compatibilidade com dados existentes
    fileName?: string; // Adicionado para compatibilidade com PDFs antigos
    tamanho?: number; // Adicionado para exibir o tamanho
}

// Função para validar arquivo PDF
const validatePdfFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB em bytes
    
    if (!file) {
        throw new Error('Nenhum arquivo selecionado.');
    }
    
    if (file.type !== 'application/pdf') {
        throw new Error('Apenas arquivos PDF são permitidos.');
    }
    
    if (file.size > maxSize) {
        throw new Error(`O arquivo deve ter no máximo ${formatFileSize(maxSize)}.`);
    }
    
    return true;
};

// Função para formatar tamanho do arquivo
const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};


export default function MateriaisPage() {
    const pathname = usePathname()
    const { toast } = useToast()
    const [user, loading] = useAuthState(auth)
    const [uploading, setUploading] = useState(false);

    const [plano, setPlano] = useState("")
    const [isAddingNewCollection, setIsAddingNewCollection] = useState(false)
    const [newCollectionTitle, setNewCollectionTitle] = useState("")
    const [newCollectionDescription, setNewCollectionDescription] = useState("")
    const [newCollectionPdf, setNewCollectionPdf] = useState<File | null>(null)
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [isUploadingPdf, setIsUploadingPdf] = useState(false); // Controla o modal de upload de PDF para coleção existente
    const [isCreatingCollection, setIsCreatingCollection] = useState(false); // Controla o botão de criar nova coleção
    const [isUploadingPdfToCollection, setIsUploadingPdfToCollection] = useState(false); // Controla o botão de upload de PDF no modal

    const [colecoes, setColecoes] = useState<any[]>([])
    const [isEditingCollection, setIsEditingCollection] = useState(false);
    const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
    const [editCollectionTitle, setEditCollectionTitle] = useState("");
    const [editCollectionDescription, setEditCollectionDescription] = useState("");

    // Estados para o modal de confirmação (AlertDialog)
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmModalTitle, setConfirmModalTitle] = useState("");
    const [confirmModalDescription, setConfirmModalDescription] = useState("");
    const [confirmModalAction, setConfirmModalAction] = useState<(() => void) | null>(null);
    
    const handleEditCollection = (collection: any) => {
        setIsEditingCollection(true);
        setEditingCollectionId(collection.id);
        setEditCollectionTitle(collection.titulo);
        setEditCollectionDescription(collection.descricao);
    };

    const handleCancelEditCollection = () => {
        setIsEditingCollection(false);
        setEditingCollectionId(null);
        setEditCollectionTitle("");
        setEditCollectionDescription("");
    };

   const handleSaveEditCollection = async () => {
    if (!editCollectionTitle || !editCollectionDescription || !editingCollectionId || !user?.email) {
        toast({
            title: "Erro",
            description: "Por favor, preencha todos os campos.",
            variant: "destructive",
        });
        return;
    }

    try {
        const colRef = doc(db, "nutricionistas", user.email, "colecoes", editingCollectionId);
        await updateDoc(colRef, {
            titulo: editCollectionTitle,
            descricao: editCollectionDescription,
        });

        toast({
            title: "Coleção atualizada!",
            description: "A coleção foi atualizada com sucesso.",
        });

        handleCancelEditCollection();
        await fetchCollections(); // Recarregar dados

    } catch (error) {
        console.error("Erro ao atualizar coleção:", error);
        toast({
            title: "Erro ao atualizar coleção",
            description: "Não foi possível atualizar a coleção.",
            variant: "destructive",
        });
    }
};


    // Função para buscar coleções
   const fetchCollections = async () => {
    if (!user?.email) {
        console.warn("Usuário não autenticado para buscar coleções.");
        return;
    }

    try {
        // Buscar dados do usuário
        const userDocRef = doc(db, "nutricionistas", user.email);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
            setPlano(userSnap.data().plano || "");
        }

        // Buscar coleções
        const colRef = collection(db, "nutricionistas", user.email, "colecoes");
        const snapshot = await getDocs(colRef);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Buscar PDFs para cada coleção
        const collectionsWithPdfs = await Promise.all(data.map(async (colecao) => {
            const pdfCollectionRef = collection(db, "nutricionistas", user.email, "colecoes", colecao.id, "pdfs");
            const pdfSnapshot = await getDocs(pdfCollectionRef);
            const pdfData = pdfSnapshot.docs.map(pdfDoc => ({ id: pdfDoc.id, ...pdfDoc.data() as PdfData }));
            return { ...colecao, pdfs: pdfData };
        }));

        setColecoes(collectionsWithPdfs);
    } catch (error) {
        console.error("Erro ao buscar coleções:", error);
        toast({
            title: "Erro ao carregar materiais",
            description: "Não foi possível carregar os materiais.",
            variant: "destructive",
        });
    }
};


    useEffect(() => {
  if (!loading && user?.email) {
    fetchCollections();
  }
}, [user, loading]);



const handleSendMaterial = async () => {
  if (isCreatingCollection) return;
  if (!newCollectionTitle.trim() || !newCollectionDescription.trim()) {
    toast({
      title: "Erro",
      description: "Título e descrição são obrigatórios.",
      variant: "destructive",
    });
    return;
  }

  setUploading(true);
  setIsCreatingCollection(true);

  console.log("🚀 Iniciando criação de coleção...");
  
  console.log("📄 PDF selecionado:", newCollectionPdf?.name);

  try {
    // 1️⃣ Cria a coleção
    const collectionRef = await addDoc(
      collection(db, `nutricionistas/${user?.email}/colecoes`),
      {
        titulo: newCollectionTitle,
        descricao: newCollectionDescription,
        criadoEm: new Date().toISOString(),
      }
    );
    const collectionId = collectionRef.id;
    console.log("✅ Coleção criada:", collectionId);

    // 2️⃣ Se tiver PDF, faz upload
    if (newCollectionPdf) {
      const timestamp = Date.now();
      const sanitizedFileName = newCollectionPdf.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileNameInStorage = `${timestamp}_${sanitizedFileName}`;
      const storagePath = `materiais/${user?.email}/${collectionId}/${fileNameInStorage}`;
      console.log("📂 Caminho no Storage:", storagePath);

      const fileRef = ref(storage, storagePath);

      // Upload do arquivo
      await uploadBytes(fileRef, newCollectionPdf, {
        contentType: "application/pdf",
        customMetadata: {
          originalName: newCollectionPdf.name,
          collectionId,
        },
      });
      console.log("✅ Upload do PDF concluído");

      // Recupera a URL do arquivo
      const downloadURL = await getDownloadURL(fileRef);
      console.log("🔗 URL do PDF:", downloadURL);

      // Salva os metadados no Firestore
      const pdfRef = collection(
        db,
        "nutricionistas",
        user?.email,
        "colecoes",
        collectionId,
        "pdfs"
      );

      await addDoc(pdfRef, {
        nomePdf: newCollectionPdf.name,
        fileName: fileNameInStorage,
        storagePath,
        criadoEm: new Date().toISOString(),
        tamanho: newCollectionPdf.size,
        pdfUrl: downloadURL,
      });

      console.log("✅ Dados do PDF salvos no Firestore");
    }

    toast({ title: "Material criado com sucesso!" });

    // Limpa estados
    setIsAddingNewCollection(false);
    setNewCollectionTitle("");
    setNewCollectionDescription("");
    setNewCollectionPdf(null);

    // Recarrega coleções
    await fetchCollections();

  } catch (error: any) {
    console.error("❌ Erro ao criar material:", error);
    toast({
      title: "Erro",
      description: error.message || "Não foi possível criar o material.",
      variant: "destructive",
    });
  } finally {
    setUploading(false);
    setIsCreatingCollection(false);
  }
};





    const handleNewCollectionClick = () => {
        setIsAddingNewCollection(true)
    }

    const handleCancelNewCollection = () => {
        setIsAddingNewCollection(false)
        setNewCollectionTitle("")
        setNewCollectionDescription("")
        setNewCollectionPdf(null)
    }

    const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setNewCollectionPdf(e.target.files[0])
        } else {
            setNewCollectionPdf(null); // Limpa o PDF se nenhum arquivo for selecionado
        }
    }

    const handleAddPdfToCollection = (collectionId: string) => {
        setSelectedCollectionId(collectionId);
        setIsUploadingPdf(true); // Abre o modal de upload
        setNewCollectionPdf(null); // Limpa qualquer PDF pré-selecionado do formulário de nova coleção
    };

    const handleCancelPdfUpload = () => {
        setSelectedCollectionId(null);
        setIsUploadingPdf(false);
        setNewCollectionPdf(null); // Limpa o PDF selecionado no modal
    };

    const handleUploadPdf = async () => {
    if (!newCollectionPdf || !selectedCollectionId || !user?.email) {
        toast({
            title: "Dados Incompletos",
            description: "Por favor, selecione um PDF e certifique-se de que a coleção está selecionada.",
            variant: "destructive",
        });
        return;
    }

    try {
        validatePdfFile(newCollectionPdf);
    } catch (error: any) {
        toast({
            title: "Arquivo Inválido",
            description: error.message,
            variant: "destructive",
        });
        return;
    }

    setIsUploadingPdfToCollection(true);

    try {
        const timestamp = Date.now();
        const sanitizedFileName = newCollectionPdf.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileNameInStorage = `${timestamp}_${sanitizedFileName}`;
        const storagePath = `materiais/${user.email}/${selectedCollectionId}/${fileNameInStorage}`;
        const storageRef = ref(storage, storagePath);

        const metadata = {
            contentType: 'application/pdf',
            customMetadata: {
                originalName: newCollectionPdf.name,
                collectionId: selectedCollectionId
            }
        };

        await uploadBytes(storageRef, newCollectionPdf, metadata);
        const downloadURL = await getDownloadURL(storageRef);

        const pdfCollectionRef = collection(
            db,
            "nutricionistas",
            user.email,
            "colecoes",
            selectedCollectionId,
            "pdfs"
        );

        await addDoc(pdfCollectionRef, {
            pdfUrl: downloadURL,
            nomePdf: newCollectionPdf.name,
            fileName: fileNameInStorage,
            storagePath: storagePath,
            criadoEm: new Date().toISOString(),
            tamanho: newCollectionPdf.size
        });

        toast({
            title: "🎉 Sucesso!",
            description: "PDF adicionado à coleção com sucesso.",
        });

        handleCancelPdfUpload();
        await fetchCollections();

    } catch (error: any) {
        console.error("❌ Erro ao adicionar PDF à coleção:", error);

        let errorMessage = "Ocorreu um erro inesperado. Tente novamente.";

        if (error.code === 'storage/unauthorized') {
            errorMessage = "Erro de permissão! Verifique as regras de segurança do Firebase Storage.";
        } else if (error.code === 'storage/canceled') {
            errorMessage = "Upload cancelado pelo usuário.";
        } else if (error.code === 'storage/unknown') {
            errorMessage = "Erro desconhecido no Storage. Verifique sua conexão ou tente novamente.";
        } else if (error.message) {
            errorMessage = `Erro: ${error.message}`;
        }

        toast({
            title: "❌ Falha no Upload",
            description: errorMessage,
            variant: "destructive",
        });
    } finally {
        setIsUploadingPdfToCollection(false);
    }
};

   const handleDeleteCollection = async (collectionId: string) => {
    if (!user?.email) {
        toast({
            title: "Erro de Autenticação",
            description: "Sua sessão não está ativa. Por favor, faça login novamente.",
            variant: "destructive",
        });
        return;
    }

    setConfirmModalTitle("Confirmar Exclusão da Coleção");
    setConfirmModalDescription("Tem certeza que deseja excluir esta coleção? Esta ação removerá permanentemente todos os PDFs associados e não poderá ser desfeita.");
    
    setConfirmModalAction(() => async () => {
        try {
            const colRef = doc(db, "nutricionistas", user.email, "colecoes", collectionId);
            const pdfCollectionRef = collection(db, "nutricionistas", user.email, "colecoes", collectionId, "pdfs");
            const pdfSnapshot = await getDocs(pdfCollectionRef);

            for (const pdfDoc of pdfSnapshot.docs) {
                const pdfData = pdfDoc.data() as PdfData;
                let pathToDelete = pdfData.storagePath;

                if (!pathToDelete && pdfData.pdfUrl) {
                    try {
                        const url = new URL(pdfData.pdfUrl);
                        pathToDelete = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
                        console.warn("Caminho derivado para exclusão de PDF da coleção (Storage):", pathToDelete);
                    } catch (err) {
                        console.error("Erro ao derivar caminho do Storage da URL:", err);
                        continue;
                    }
                } else if (!pathToDelete && pdfData.fileName) {
                    pathToDelete = `materiais/${user.email}/${collectionId}/${pdfData.fileName}`;
                    console.warn("Caminho construído via fileName para exclusão de PDF da coleção (Storage):", pathToDelete);
                }

                if (pathToDelete) {
                    try {
                        const storageRef = ref(storage, pathToDelete);
                        console.log("Tentando deletar do Storage:", pathToDelete);
                        await deleteObject(storageRef);
                        console.log("Deletado do Storage com sucesso:", pathToDelete);
                    } catch (storageError: any) {
                        if (storageError.code === 'storage/object-not-found') {
                            console.warn(`Arquivo não encontrado no Storage para exclusão: ${pathToDelete}`);
                        } else {
                            console.error(`Erro ao deletar do Storage (${pathToDelete}):`, storageError);
                            throw storageError;
                        }
                    }
                }

                await deleteDoc(doc(pdfCollectionRef, pdfDoc.id));
            }

            await deleteDoc(colRef);

            toast({
                title: "Coleção excluída!",
                description: "A coleção foi excluída com sucesso.",
            });

            setColecoes(prev => prev.filter(c => c.id !== collectionId));
            setIsConfirmModalOpen(false);
        } catch (error: any) {
            console.error("Erro ao excluir coleção:", error);
            toast({
                title: "Erro ao excluir coleção",
                description: `Erro: ${error.message || 'Desconhecido'}`,
                variant: "destructive",
            });
            setIsConfirmModalOpen(false);
        }
    });

    setIsConfirmModalOpen(true);
};


   const handleDeletePdf = async (collectionId: string, pdfId: string, pdfData: PdfData) => {
    if (!user?.email) {
        toast({
            title: "Erro de Autenticação",
            description: "Sua sessão não está ativa. Por favor, faça login novamente.",
            variant: "destructive",
        });
        return;
    }

    setConfirmModalTitle("Confirmar Exclusão do PDF");
    setConfirmModalDescription(`Tem certeza que deseja excluir o PDF "${pdfData.nomePdf}"? Esta ação não pode ser desfeita.`);

    setConfirmModalAction(() => async () => {
        try {
            const pdfDocRef = doc(db, "nutricionistas", user.email, "colecoes", collectionId, "pdfs", pdfId);
            await deleteDoc(pdfDocRef);

            let pathToDelete = pdfData.storagePath;

            if (!pathToDelete && pdfData.pdfUrl) {
                try {
                    const url = new URL(pdfData.pdfUrl);
                    pathToDelete = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
                    console.warn("Usando caminho derivado do Storage para exclusão de PDF:", pathToDelete);
                } catch (urlError) {
                    console.error("Erro ao derivar caminho do Storage da URL:", urlError);
                    pathToDelete = undefined;
                }
            } else if (!pathToDelete && pdfData.fileName) {
                pathToDelete = `materiais/${user.email}/${collectionId}/${pdfData.fileName}`;
                console.warn("Caminho construído via fileName para exclusão de PDF:", pathToDelete);
            }

            if (pathToDelete) {
                try {
                    const storageRef = ref(storage, pathToDelete);
                    console.log("Tentando deletar PDF do Storage:", pathToDelete);
                    await deleteObject(storageRef);
                    console.log("PDF deletado do Storage com sucesso:", pathToDelete);
                } catch (storageError: any) {
                    if (storageError.code === 'storage/object-not-found') {
                        console.warn(`Arquivo não encontrado no Storage: ${pathToDelete}`);
                    } else {
                        console.error(`Erro ao deletar do Storage (${pathToDelete}):`, storageError);
                        throw storageError;
                    }
                }
            }

            toast({
                title: "PDF excluído!",
                description: "O PDF foi excluído com sucesso.",
            });

            setColecoes(prev => prev.map(colecao => {
                if (colecao.id === collectionId) {
                    return {
                        ...colecao,
                        pdfs: colecao.pdfs.filter((pdf: PdfData) => pdf.id !== pdfId),
                    };
                }
                return colecao;
            }));

            setIsConfirmModalOpen(false);
        } catch (error: any) {
            console.error("Erro ao excluir PDF:", error);
            toast({
                title: "Erro ao excluir PDF",
                description: `Erro: ${error.message || 'Desconhecido'}. Verifique permissões.`,
                variant: "destructive",
            });
            setIsConfirmModalOpen(false);
        }
    });

    setIsConfirmModalOpen(true);
};


    if (status === "loading") return null; // Ou exiba um spinner de carregamento

    return (
        <div className="flex min-h-screen bg-background">
            {/* Sidebar para desktop */}
            <aside className="hidden w-64 flex-col bg-card border-r border-border lg:flex">
                <div className="flex h-14 items-center border-b px-4">
                    <Link href="/" className="flex items-center gap-2 font-semibold text-indigo-600">
                        <LineChart className="h-5 w-5" />
                        <span>NutriDash</span>
                    </Link>
                </div>
                <nav className="flex-1 space-y-1 p-2">
                    <SidebarItem href="/" label="Dashboard" icon={<Home className="h-4 w-4" />} pathname={pathname} />
                    <SidebarItem href="/pacientes" label="Pacientes" icon={<Users className="h-4 w-4" />} pathname={pathname} />
                    <SidebarItem href="/materiais" label="Materiais" icon={<FileText className="h-4 w-4" />} pathname={pathname} />
                    <SidebarItem href="/financeiro" label="Financeiro" icon={<LineChart className="h-4 w-4" />} pathname={pathname} />
                    <SidebarItem href="/perfil" label="Perfil" icon={<Users className="h-4 w-4" />} pathname={pathname} />
                </nav>
            </aside>

            {/* Conteúdo principal */}
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
                            <nav className="flex-1 space-y-1 p-2">
                                <SidebarItem href="/" label="Dashboard" icon={<Home className="h-4 w-4" />} pathname={pathname} />
                                <SidebarItem href="/pacientes" label="Pacientes" icon={<Users className="h-4 w-4" />} pathname={pathname} />
                                <SidebarItem href="/materiais" label="Materiais" icon={<FileText className="h-4 w-4" />} pathname={pathname} />
                                <SidebarItem href="/financeiro" label="Financeiro" icon={<LineChart className="h-4 w-4" />} pathname={pathname} />
                                <SidebarItem href="/perfil" label="Perfil" icon={<Users className="h-4 w-4" />} pathname={pathname} />
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <div className="w-full flex-1">
                        <h2 className="text-lg font-medium">Materiais</h2>
                    </div>
                    <ThemeToggle />
                </header>

                <main className="flex-1 p-4 md:p-6">
                    <div className="flex flex-col gap-4 md:gap-6">
                        <div className="flex items-center justify-between">
                            <h1 className="text-2xl font-semibold tracking-tight">Biblioteca de Materiais</h1>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                                {plano === "teste" && colecoes.length >= 1 ? (
                                    <>
                                        <div className="rounded-md border border-yellow-400 bg-yellow-100 text-yellow-800 px-4 py-2 text-sm font-medium shadow-sm text-center">
                                            Limite de 1 coleção atingido no plano gratuito.
                                            <span className="block mt-1 text-xs text-yellow-700">
                                                Faça upgrade para liberar mais coleções.
                                            </span>
                                        </div>
                                        <Button
                                            className="bg-gray-300 text-gray-600 cursor-not-allowed"
                                            disabled
                                            title="Limite de 1 coleção atingido. Faça upgrade para desbloquear mais."
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Limite Atingido
                                        </Button>
                                    </>
                                ) : (
                                    <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleNewCollectionClick}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Nova Coleção
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Formulário para nova coleção */}
                        {isAddingNewCollection && (
                            <Card className="p-6 rounded-xl border animate-in fade-in-0 zoom-in-95 duration-300">
                                <CardHeader className="p-0 mb-4">
                                    <CardTitle className="text-xl font-bold">Adicionar Nova Coleção</CardTitle>
                                    <CardDescription className="text-muted-foreground">Crie uma nova coleção de materiais para seus pacientes</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="flex flex-col gap-4">
                                        <div className="grid w-full gap-2">
                                            <Label htmlFor="collection-name">Nome da Coleção</Label>
                                            <Input
                                                id="collection-name"
                                                placeholder="Ex: E-books de Dietas"
                                                value={newCollectionTitle}
                                                onChange={(e) => setNewCollectionTitle(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid w-full gap-2">
                                            <Label htmlFor="collection-description">Descrição</Label>
                                            <Input
                                                id="collection-description"
                                                placeholder="Breve descrição da coleção"
                                                value={newCollectionDescription}
                                                onChange={(e) => setNewCollectionDescription(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid w-full gap-2">
                                            <Label htmlFor="pdf-upload">Arquivo PDF</Label>
                                            <div className="flex items-center justify-center w-full">
                                                <label
                                                    htmlFor="pdf-upload"
                                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 dark:border-gray-600 transition-colors duration-200"
                                                >
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                                        <p className="mb-2 text-sm text-muted-foreground">
                                                            Clique para fazer upload ou arraste o arquivo
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">PDF (MAX. 10MB)</p>
                                                    </div>
                                                    <input
                                                        id="pdf-upload"
                                                        type="file"
                                                        accept=".pdf"
                                                        className="hidden"
                                                        onChange={handlePdfChange}
                                                    />
                                                </label>
                                            </div>
                                            {newCollectionPdf && (
                                                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-green-600" />
                                                        <span className="text-sm text-green-700 font-medium">{newCollectionPdf.name}</span>
                                                        <span className="text-xs text-green-600">({formatFileSize(newCollectionPdf.size)})</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <Button variant="outline" onClick={handleCancelNewCollection}>
                                                Cancelar
                                            </Button>
                                            <Button 
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white" 
                                                onClick={handleSendMaterial}
                                                disabled={isCreatingCollection} // Desabilita durante o carregamento
                                            >
                                                {isCreatingCollection ? "Criando..." : "Criar Coleção"}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}


                        {/* Modal para editar coleção */}
                        {isEditingCollection && editingCollectionId && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <Card className="w-full max-w-md p-6 rounded-xl border animate-in fade-in-0 zoom-in-95 duration-300">
                                    <CardHeader className="p-0 mb-4">
                                        <CardTitle className="text-xl font-bold">Editar Coleção</CardTitle>
                                        <CardDescription className="text-muted-foreground">Edite o nome e a descrição da coleção</CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0 flex flex-col gap-4">
                                        <div className="grid w-full gap-2">
                                            <Label htmlFor="edit-collection-name">Nome da Coleção</Label>
                                            <Input
                                                id="edit-collection-name"
                                                value={editCollectionTitle}
                                                onChange={(e) => setEditCollectionTitle(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid w-full gap-2">
                                            <Label htmlFor="edit-collection-description">Descrição</Label>
                                            <Input
                                                id="edit-collection-description"
                                                value={editCollectionDescription}
                                                onChange={(e) => setEditCollectionDescription(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <Button variant="outline" onClick={handleCancelEditCollection}>
                                                Cancelar
                                            </Button>
                                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveEditCollection}>
                                                Salvar Edições
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {colecoes.map((collection) => (
                                <Card key={collection.id} className="rounded-xl border flex flex-col justify-between">
                                    <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
                                        <CardTitle className="text-lg font-semibold text-primary">{collection.titulo}</CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditCollection(collection)}
                                            className="text-muted-foreground hover:text-indigo-600 transition-colors duration-200"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </CardHeader>
                                    <CardDescription className="px-4 text-sm text-muted-foreground">{collection.descricao}</CardDescription>
                                    <CardContent className="p-4 pt-2 flex-grow">
                                        {collection.pdfs && collection.pdfs.length > 0 ? (
                                            <ul className="space-y-2 mt-2">
                                                {collection.pdfs.map((pdf: PdfData) => (
                                                    <li key={pdf.id} className="flex items-center justify-between bg-secondary/20 p-2 rounded-md transition-colors duration-200 hover:bg-secondary">
                                                        <a
                                                            href={pdf.pdfUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline truncate"
                                                        >
                                                            <FileText className="h-4 w-4 text-indigo-500" />
                                                            {pdf.nomePdf} {pdf.tamanho ? `(${formatFileSize(pdf.tamanho)})` : ''}
                                                        </a>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-destructive transition-colors duration-200"
                                                            onClick={() => handleDeletePdf(collection.id, pdf.id, pdf)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-muted-foreground italic mt-2">Nenhum PDF nesta coleção.</p>
                                        )}
                                    </CardContent>
                                    <div className="p-4 border-t border-border flex justify-between items-center">
                                        <Button
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5 h-auto rounded-md"
                                            onClick={() => handleAddPdfToCollection(collection.id)}
                                        >
                                            <Plus className="mr-1 h-3 w-3" /> Adicionar PDF
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteCollection(collection.id)}
                                            className="text-muted-foreground hover:text-destructive transition-colors duration-200"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>

                        {/* Modal para adicionar PDF a uma coleção existente */}
                        {isUploadingPdf && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <Card className="w-full max-w-md p-6 rounded-xl border animate-in fade-in-0 zoom-in-95 duration-300">
                                    <CardHeader className="p-0 mb-4">
                                        <CardTitle className="text-xl font-bold">Adicionar PDF à Coleção</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 flex flex-col gap-4">
                                        <div className="grid w-full gap-2">
                                            <Label htmlFor="pdf-upload-modal">Arquivo PDF</Label>
                                            <div className="flex items-center justify-center w-full">
                                                <label
                                                    htmlFor="pdf-upload-modal"
                                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted hover:bg-muted/80 dark:border-gray-600 transition-colors duration-200"
                                                >
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                                        <p className="mb-2 text-sm text-muted-foreground">
                                                            Clique para fazer upload ou arraste o arquivo
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">PDF (MAX. 10MB)</p>
                                                    </div>
                                                    <input
                                                        id="pdf-upload-modal"
                                                        type="file"
                                                        accept=".pdf"
                                                        className="hidden"
                                                        onChange={handlePdfChange} // Usa a mesma função de mudança de PDF
                                                    />
                                                </label>
                                            </div>
                                            {newCollectionPdf && ( // Exibe o PDF selecionado no modal
                                                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-green-600" />
                                                        <span className="text-sm text-green-700 font-medium">{newCollectionPdf.name}</span>
                                                        <span className="text-xs text-green-600">({formatFileSize(newCollectionPdf.size)})</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <Button variant="outline" onClick={handleCancelPdfUpload}>
                                                Cancelar
                                            </Button>
                                            <Button 
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white" 
                                                onClick={handleUploadPdf}
                                                disabled={isUploadingPdfToCollection} // Desabilita durante o carregamento
                                            >
                                                {isUploadingPdfToCollection ? "Enviando..." : "Enviar PDF"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Modal de Confirmação Customizado (AlertDialog) */}
            <AlertDialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmModalTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmModalDescription}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsConfirmModalOpen(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmModalAction} className="bg-red-600 hover:bg-red-700 text-white">
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function SidebarItem({
    href,
    icon,
    label,
    pathname,
}: {
    href: string
    icon: React.ReactNode
    label: string
    pathname: string
}) {
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
