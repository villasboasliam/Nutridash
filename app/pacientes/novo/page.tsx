"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function NovoPacientePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()

  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [senha, setSenha] = useState("") // Novo campo de senha provisória
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.email) {
      toast({ title: "Erro de autenticação", description: "Sua sessão expirou. Faça login novamente." })
      return
    }

    setIsLoading(true)

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
          senha: senha && senha.length >= 6 ? senha : "nutri000", // garante mínimo de 6 caracteres
          nutricionistaId: session.user.email,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({ title: "Paciente criado!", description: `Um e-mail com as instruções de acesso foi enviado para ${email}.` })
        router.push("/pacientes")
      } else {
        toast({ title: "Erro ao criar paciente", description: data.error || "Não foi possível criar o paciente." })
      }
    } catch (error) {
      console.error("Erro ao comunicar com a API:", error)
      toast({ title: "Erro de comunicação", description: "Ocorreu um erro ao tentar criar o paciente." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
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
            <div>
              <Label htmlFor="senha">Senha provisória (opcional)</Label>
              <Input
                id="senha"
                type="text"
                value={senha}
                placeholder="nutri000"
                onChange={(e) => setSenha(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Se deixado em branco, será usada a senha padrão: <code>nutri000</code>
              </p>
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
