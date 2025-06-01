"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Home, Users, FileText, LineChart, Menu } from "lucide-react"
import { useToast } from "@/components/ui/use-toast" // Importe o useToast

export default function NovoPacientePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast() // Inicialize o toast

  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [isLoading, setIsLoading] = useState(false); // Estado para controlar o loading do botão

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.email) {
      toast({ title: "Erro de autenticação", description: "Sua sessão expirou. Faça login novamente." });
      return;
    }

    setIsLoading(true); // Inicia o loading

    try {
      const response = await fetch('/api/enviar-convite-paciente', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    nome,
    email,
    telefone,
    nutricionistaId: session.user.email,
  }),
});


      const data = await response.json();

      if (response.ok) {
        toast({ title: "Paciente criado!", description: `Um e-mail com as instruções de login foi enviado para ${email}.` });
        router.push("/pacientes");
      } else {
        toast({ title: "Erro ao criar paciente", description: data.error || "Não foi possível criar o paciente." });
      }
    } catch (error) {
      console.error("Erro ao comunicar com a API:", error);
      toast({ title: "Erro de comunicação", description: "Ocorreu um erro ao tentar criar o paciente." });
    } finally {
      setIsLoading(false); // Finaliza o loading
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* ... sua sidebar e header ... */}

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
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isLoading}>
              {isLoading ? "Cadastrando..." : "Cadastrar Paciente"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}