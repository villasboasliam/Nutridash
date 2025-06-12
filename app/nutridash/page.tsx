"use client"

import { useSession } from "next-auth/react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function NutriDashLandingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/pacientes") // Redireciona para dashboard se estiver logado
    }
  }, [status, router])

  if (status === "loading") {
    return <div className="text-center py-10">Carregando...</div>
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center bg-white dark:bg-card p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-indigo-600 mb-4">NutriDash</h1>
        <p className="text-muted-foreground mb-6">
          Bem-vindo ao sistema de acompanhamento nutricional. Faça login ou cadastre-se para acessar sua conta.
        </p>
        <div className="flex flex-col space-y-4">
          <Button onClick={() => router.push("/login")}>Login</Button>
          <Button variant="outline" onClick={() => router.push("/cadastro")}>Cadastrar</Button>
        </div>
      </div>
    </div>
  )
}
