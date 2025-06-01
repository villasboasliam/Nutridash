"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FcGoogle } from "react-icons/fc"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const error = searchParams.get("error")
    if (error === "CredentialsSignin") {
      setErrorMessage("Senha incorreta")
    } else {
      setErrorMessage(null)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    })

    setLoading(false)

    if (res?.error) {
      setErrorMessage("Senha incorreta")
    } else {
      toast({
        title: "Login realizado",
        description: "Redirecionando...",
      })
      router.push("/")
    }
  }

  const handleGoogleLogin = async () => {
    await signIn("google", { callbackUrl: "/" })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Entrar no NutriDash</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="exemplo@nutridash.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
            <Button type="submit" className="w-full bg-indigo-600 text-white hover:bg-indigo-700" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

         <div className="mt-4 text-sm text-center">
  <a href="/esqueci-senha" className="text-indigo-600 hover:underline">
    Esqueci minha senha
  </a>
</div>


          <Separator className="my-6" />

          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
          >
            <FcGoogle className="h-5 w-5" />
            Entrar com Google
          </Button>

          <div className="mt-4 text-sm text-center">
            Não tem uma conta?{" "}
            <Link href="/cadastro" className="text-indigo-600 hover:underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
