"use client"

import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

export default function NovoPacientePage() {
  const [user, loading] = useAuthState(auth)
  const router = useRouter()
  const { toast } = useToast()

  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.email) {
      toast({
        title: "Erro de autenticação",
        description: "Sua sessão expirou. Faça login novamente.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch("/api/createPatient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          email,
          telefone,
          nutricionistaId: user.email,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erro ao criar paciente.")

      toast({
        title: "Paciente criado com sucesso!",
        description: `Um e-mail foi enviado para ${email}.`,
      })

      router.push("/pacientes")
    } catch (error: any) {
      console.error("Erro ao criar paciente:", error)
      toast({
        title: "Erro ao criar paciente",
        description: error.message || "Erro desconhecido.",
        variant: "destructive",
      })
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
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Cadastrando..." : "Cadastrar Paciente"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}

