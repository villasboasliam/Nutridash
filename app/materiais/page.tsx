"use client"

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
import { useSession } from "next-auth/react"
import { db, storage } from "@/lib/firebase"
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, getDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"


export default function MateriaisPage() {
    const pathname = usePathname()
    const { toast } = useToast()
    const { data: session } = useSession()
    const [plano, setPlano] = useState("")
    const [isAddingNewCollection, setIsAddingNewCollection] = useState(false)
    const [newCollectionTitle, setNewCollectionTitle] = useState("")
    const [newCollectionDescription, setNewCollectionDescription] = useState("")
    const [newCollectionPdf, setNewCollectionPdf] = useState<File | null>(null)
    const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);

    const [colecoes, setColecoes] = useState<any[]>([])
    const [isEditingCollection, setIsEditingCollection] = useState(false);
    const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);
    const [editCollectionTitle, setEditCollectionTitle] = useState("");
    const [editCollectionDescription, setEditCollectionDescription] = useState("");

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
        if (!editCollectionTitle || !editCollectionDescription || !editingCollectionId || !session?.user?.email) {
            toast({
                title: "Erro",
                description: "Por favor, preencha todos os campos.",
                variant: "destructive",
            });
            return;
        }

        try {
            const colRef = doc(db, "nutricionistas", session.user.email, "colecoes", editingCollectionId);
            await updateDoc(colRef, {
                titulo: editCollectionTitle,
                descricao: editCollectionDescription,
            });

            toast({
                title: "Coleção atualizada!",
                description: "A coleção foi atualizada com sucesso.",
            });

            setIsEditingCollection(false);
            setEditingCollectionId(null);
            setEditCollectionTitle("");
            setEditCollectionDescription("");

            // Refresh data
            const snapshot = await getDocs(collection(db, "nutricionistas", session.user.email, "colecoes"));
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setColecoes(data);

        } catch (error) {
            console.error("Erro ao atualizar coleção:", error);
            toast({
                title: "Erro ao atualizar coleção",
                description: "Não foi possível atualizar a coleção.",
                variant: "destructive",
            });
        }
    };

    useEffect(() => {
        const fetchCollections = async () => {
            if (!session?.user?.email) return
            const userDocRef = doc(db, "nutricionistas", session.user.email);
const userSnap = await getDoc(userDocRef);
if (userSnap.exists()) {
  setPlano(userSnap.data().plano || "");
}

            const colRef = collection(db, "nutricionistas", session.user.email, "colecoes")
            const snapshot = await getDocs(colRef)
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            
            // Fetch PDFs for each collection
            const collectionsWithPdfs = await Promise.all(data.map(async (colecao) => {
                const pdfCollectionRef = collection(db, "nutricionistas", session.user.email, "colecoes", colecao.id, "pdfs");
                const pdfSnapshot = await getDocs(pdfCollectionRef);
                const pdfData = pdfSnapshot.docs.map(pdfDoc => ({ id: pdfDoc.id, ...pdfDoc.data() }));
                return { ...colecao, pdfs: pdfData };
            }));
            setColecoes(collectionsWithPdfs);
        }

        fetchCollections()
    }, [session])

    const handleSendMaterial = async () => {
        if (!newCollectionTitle || !newCollectionDescription || !newCollectionPdf) {
            toast({
                title: "Erro",
                description: "Por favor, preencha todos os campos e selecione um PDF.",
                variant: "destructive",
            })
            return
        }

        if (!session?.user?.email) return

        try {
            // Primeiro, cria a coleção no Firestore para obter o ID
            const docRef = collection(db, "nutricionistas", session.user.email, "colecoes");
            const newDocRef = await addDoc(docRef, {
                titulo: newCollectionTitle,
                descricao: newCollectionDescription,
                criadoEm: new Date().toISOString(), // Adiciona data de criação para a coleção
            });

            // Em seguida, faz o upload do PDF usando o ID da coleção recém-criada
            const storageRef = ref(storage, `materiais/${session.user.email}/${newDocRef.id}/${newCollectionPdf.name}`);
            await uploadBytes(storageRef, newCollectionPdf);
            const url = await getDownloadURL(storageRef);

            // Adiciona o PDF à subcoleção 'pdfs' da coleção recém-criada
            const pdfCollectionRef = collection(db, "nutricionistas", session.user.email, "colecoes", newDocRef.id, "pdfs");
            await addDoc(pdfCollectionRef, {
                pdfUrl: url,
                nomePdf: newCollectionPdf.name,
                criadoEm: new Date().toISOString(),
            });

            toast({
                title: "Coleção criada!",
                description: `A coleção "${newCollectionTitle}" foi salva.`,
            });

            setIsAddingNewCollection(false);
            setNewCollectionTitle("");
            setNewCollectionDescription("");
            setNewCollectionPdf(null);

            // Atualiza a lista após salvar
            const snapshot = await getDocs(docRef);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Refetch PDFs for the newly added collection
            const collectionsWithPdfs = await Promise.all(data.map(async (colecao) => {
                const pdfsRef = collection(db, "nutricionistas", session.user.email, "colecoes", colecao.id, "pdfs");
                const pdfsSnapshot = await getDocs(pdfsRef);
                const pdfsData = pdfsSnapshot.docs.map(pdfDoc => ({ id: pdfDoc.id, ...pdfDoc.data() }));
                return { ...colecao, pdfs: pdfsData };
            }));
            setColecoes(collectionsWithPdfs);

        } catch (err) {
            console.error("Erro ao salvar coleção:", err);
            toast({
                title: "Erro ao enviar",
                description: "Não foi possível salvar a coleção.",
                variant: "destructive",
            });
        }
    }

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
        }
    }

    const handleAddPdfToCollection = (collectionId: string) => {
        setSelectedCollectionId(collectionId);
        setIsUploadingPdf(true);
    };

    const handleCancelPdfUpload = () => {
        setSelectedCollectionId(null);
        setIsUploadingPdf(false);
        setNewCollectionPdf(null);
    };

    const handleUploadPdf = async () => {
        if (!newCollectionPdf || !selectedCollectionId || !session?.user?.email) return;

        try {
            const storageRef = ref(storage, `materiais/${session.user.email}/${selectedCollectionId}/${newCollectionPdf.name}`);
            await uploadBytes(storageRef, newCollectionPdf);
            const url = await getDownloadURL(storageRef);

            const pdfCollectionRef = collection(db, "nutricionistas", session.user.email, "colecoes", selectedCollectionId, "pdfs");
            const newPdfDocRef = await addDoc(pdfCollectionRef, {
                pdfUrl: url,
                nomePdf: newCollectionPdf.name,
                criadoEm: new Date().toISOString(),
            });

            toast({
                title: "PDF adicionado!",
                description: "PDF adicionado à coleção.",
            });

            setSelectedCollectionId(null);
            setIsUploadingPdf(false);
            setNewCollectionPdf(null);

            // Refresh data
            setColecoes(prevColecoes => prevColecoes.map(colecao => {
                if (colecao.id === selectedCollectionId) {
                    return {
                        ...colecao,
                        pdfs: [...(colecao.pdfs || []), { id: newPdfDocRef.id, pdfUrl: url, nomePdf: newCollectionPdf.name, criadoEm: new Date().toISOString() }]
                    };
                }
                return colecao;
            }));

        } catch (error) {
            console.error("Erro ao adicionar PDF:", error);
            toast({
                title: "Erro ao adicionar PDF",
                description: "Não foi possível adicionar o PDF à coleção.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteCollection = async (collectionId: string) => {
        // Usar um modal personalizado em vez de window.confirm
        const confirmed = await new Promise((resolve) => {
            // Implemente seu modal de confirmação aqui.
            // Por simplicidade, vou usar um alert temporariamente, mas substitua por um componente de modal real.
            const result = window.confirm("Tem certeza que deseja excluir esta coleção? Esta ação não pode ser desfeita.");
            resolve(result);
        });

        if (!confirmed) {
            return;
        }

        if (!session?.user?.email) return;

        try {
            const colRef = doc(db, "nutricionistas", session.user.email, "colecoes", collectionId);

            // Delete PDFs from storage first
            const pdfCollectionRef = collection(db, "nutricionistas", session.user.email, "colecoes", collectionId, "pdfs");
            const pdfSnapshot = await getDocs(pdfCollectionRef);
            for (const pdfDoc of pdfSnapshot.docs) {
                const pdfData = pdfDoc.data() as { pdfUrl: string };
                try {
                    const storageRef = ref(storage, pdfData.pdfUrl);
                    await deleteObject(storageRef);
                } catch (storageError: any) {
                    // Ignorar erro se o arquivo não existir no storage (já foi deletado ou caminho incorreto)
                    if (storageError.code === 'storage/object-not-found') {
                        console.warn(`Arquivo não encontrado no Storage para exclusão: ${pdfData.pdfUrl}`);
                    } else {
                        throw storageError; // Re-throw outros erros de storage
                    }
                }
                // Deletar o documento PDF do Firestore, mesmo que o arquivo no Storage não exista
                await deleteDoc(doc(pdfCollectionRef, pdfDoc.id));
            }

            // Finally, delete the collection document from Firestore
            await deleteDoc(colRef);

            toast({
                title: "Coleção excluída!",
                description: "A coleção foi excluída com sucesso.",
            });

            // Atualiza a lista após excluir
            setColecoes(prevColecoes => prevColecoes.filter(colecao => colecao.id !== collectionId));

        } catch (error) {
            console.error("Erro ao excluir coleção:", error);
            toast({
                title: "Erro ao excluir coleção",
                description: "Não foi possível excluir a coleção.",
                variant: "destructive",
            });
        }
    };

    const handleDeletePdf = async (collectionId: string, pdfId: string, pdfUrl: string) => {
        // Usar um modal personalizado em vez de window.confirm
        const confirmed = await new Promise((resolve) => {
            // Implemente seu modal de confirmação aqui.
            // Por simplicidade, vou usar um alert temporariamente, mas substitua por um componente de modal real.
            const result = window.confirm("Tem certeza que deseja excluir este PDF? Esta ação não pode ser desfeita.");
            resolve(result);
        });

        if (!confirmed) {
            return;
        }

        if (!session?.user?.email) return;

        try {
            const pdfDocRef = doc(db, "nutricionistas", session.user.email, "colecoes", collectionId, "pdfs", pdfId);
            await deleteDoc(pdfDocRef);

            // Delete PDF from storage
            try {
                const storageRef = ref(storage, pdfUrl);
                await deleteObject(storageRef);
            } catch (storageError: any) {
                if (storageError.code === 'storage/object-not-found') {
                    console.warn(`Arquivo não encontrado no Storage para exclusão: ${pdfUrl}`);
                } else {
                    throw storageError;
                }
            }

            toast({
                title: "PDF excluído!",
                description: "O PDF foi excluído com sucesso.",
            });

            // Atualiza a lista após excluir
            setColecoes(prevColecoes => prevColecoes.map(colecao => {
                if (colecao.id === collectionId) {
                    return {
                        ...colecao,
                        pdfs: colecao.pdfs.filter((pdf: any) => pdf.id !== pdfId)
                    };
                }
                return colecao;
            }));

        } catch (error) {
            console.error("Erro ao excluir PDF:", error);
            toast({
                title: "Erro ao excluir PDF",
                description: "Não foi possível excluir o PDF.",
                variant: "destructive",
            });
        }
    };


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

                        {isAddingNewCollection && (
                            <Card className="p-6 rounded-xl shadow-lg animate-in fade-in-0 zoom-in-95 duration-300">
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
                                                {newCollectionPdf && (
                                                    <p className="mt-2 text-sm text-green-600 ml-4">Arquivo selecionado: {newCollectionPdf.name}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <Button variant="outline" onClick={handleCancelNewCollection}>
                                                Cancelar
                                            </Button>
                                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSendMaterial}>
                                                Criar Coleção
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {isEditingCollection && editingCollectionId && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <Card className="w-full max-w-md p-6 rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
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
                                <Card key={collection.id} className="rounded-xl shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between">
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
                                                {collection.pdfs.map((pdf: any) => (
                                                    <li key={pdf.id} className="flex items-center justify-between bg-secondary/20 p-2 rounded-md transition-colors duration-200 hover:bg-secondary">
                                                        <a
                                                            href={pdf.pdfUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline truncate"
                                                        >
                                                            <FileText className="h-4 w-4 text-indigo-500" />
                                                            {pdf.nomePdf.split('.').slice(0, -1).join('.')}
                                                        </a>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-destructive transition-colors duration-200"
                                                            onClick={() => handleDeletePdf(collection.id, pdf.id, pdf.pdfUrl)}
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

                        {/* Modal to upload PDF */}
                        {isUploadingPdf && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <Card className="w-full max-w-md p-6 rounded-xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
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
                                                        onChange={(e) => {
                                                            if (e.target.files && e.target.files.length > 0) {
                                                                setNewCollectionPdf(e.target.files[0]);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                                {newCollectionPdf && (
                                                    <p className="mt-2 text-sm text-green-600 ml-4">Arquivo selecionado: {newCollectionPdf.name}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2 mt-4">
                                            <Button variant="outline" onClick={handleCancelPdfUpload}>
                                                Cancelar
                                            </Button>
                                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleUploadPdf}>
                                                Enviar PDF
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </main>
            </div>
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
