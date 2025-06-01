"use client"

import { useState } from "react"
import { Eye, EyeOff, LineChart } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ThemeToggle } from "@/components/theme-toggle"
import { db } from "@/lib/firebase"

export default function CadastroPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const ref = doc(db, "nutricionistas", email)
      await setDoc(ref, {
        nome: name,
        email: email,
        senha: password, // armazenar senha em texto plano não é ideal em produção!
        assinatura_ativa: false,
        plano: "teste", // <-- CAMPO ADICIONADO
        data_criacao: serverTimestamp(),
      })

      setIsLoading(false)
      router.push("/login")
    } catch (error) {
      console.error("Erro ao cadastrar nutricionista:", error)
      setIsLoading(false)
      alert("Erro ao cadastrar. Tente novamente.")
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="flex h-14 items-center px-4 lg:px-6 border-b bg-background">
        <Link href="/" className="flex items-center gap-2 font-semibold text-indigo-600">
          <LineChart className="h-5 w-5" />
          <span>NutriDash</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <Card className="mx-auto max-w-md w-full">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Criar conta</CardTitle>
            <CardDescription>Preencha os dados abaixo para se cadastrar como nutricionista</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" type="text" placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">{showPassword ? "Esconder senha" : "Mostrar senha"}</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="terms" required />
                <Label htmlFor="terms" className="text-sm">
                  Eu concordo com os{" "}
                  <Link href="#" className="text-indigo-600 hover:text-indigo-700">Termos de Serviço</Link> e{" "}
                  <Link href="#" className="text-indigo-600 hover:text-indigo-700">Política de Privacidade</Link>
                </Label>
              </div>
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isLoading}>
                {isLoading ? "Criando conta..." : "Criar conta"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <div className="text-center text-sm">
              <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Já possui uma conta? Fazer login
              </Link>
            </div>
          </CardFooter>
        </Card>
      </main>
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} NutriDash. Todos os direitos reservados.
      </footer>
    </div>
  )
}
