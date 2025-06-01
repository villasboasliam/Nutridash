"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("")
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await sendPasswordResetEmail(auth, email)
      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      })
      router.push("/login")
    } catch (error: any) {
      toast({
        title: "Erro ao enviar",
        description: "Verifique se o e-mail está correto e cadastrado.",
        variant: "destructive",
      })
    }
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md p-6 shadow-xl">
        <CardHeader>
          <CardTitle>Recuperar Senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
              Enviar link de redefinição
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
