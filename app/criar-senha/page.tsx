"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { EyeIcon, EyeOffIcon, CheckCircle2 } from "lucide-react"

export default function CriarSenhaPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const email = searchParams.get("email")

  const [senha, setSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState("")
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [tokenValido, setTokenValido] = useState<null | boolean>(null)
  const [erroToken, setErroToken] = useState("")

  // Substitua pelo ID do nutricionista correto se necessário
  const nutricionistaId = "NUTRICIONISTA_ID"

  useEffect(() => {
    const verificarToken = async () => {
      if (!token || !email) {
        setErroToken("Link inválido ou incompleto.")
        setTokenValido(false)
        return
      }

      try {
        const res = await fetch(
          `/api/verificar-token?email=${email}&token=${token}&nutricionistaId=${nutricionistaId}`
        )
        const data = await res.json()

        if (data.valid) {
          setTokenValido(true)
        } else {
          setErroToken(data.reason || "Token inválido ou expirado.")
          setTokenValido(false)
        }
      } catch (err) {
        setErroToken("Erro ao verificar o link.")
        setTokenValido(false)
      }
    }

    verificarToken()
  }, [token, email])

  const validarSenha = (senha: string) => {
    const temLetra = /[a-zA-Z]/.test(senha)
    const temNumero = /\d/.test(senha)
    return senha.length >= 6 && temLetra && temNumero
  }

  const handleSubmit = async () => {
    setErro("")

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.")
      return
    }

    if (!validarSenha(senha)) {
      setErro("A senha deve ter pelo menos 6 caracteres, incluindo letras e números.")
      return
    }

    setLoading(true)

    const response = await fetch("/api/confirmar-redefinicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, senha }),
    })

    if (response.ok) {
      setSucesso(true)
    } else {
      toast({ title: "Erro", description: "Token inválido ou expirado.", variant: "destructive" })
    }

    setLoading(false)
  }

  if (tokenValido === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <h2 className="text-xl font-semibold text-red-500 mb-2">Link inválido</h2>
        <p className="text-muted-foreground">{erroToken}</p>
      </div>
    )
  }

  if (tokenValido === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
        <p className="text-muted-foreground">Verificando link...</p>
      </div>
    )
  }

  if (sucesso) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Senha criada com sucesso!</h1>
        <p className="text-muted-foreground">Agora você já pode fazer login no aplicativo.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6 border">
        <h1 className="text-2xl font-bold mb-4 text-center">Criar Senha</h1>

        <p className="text-sm text-muted-foreground mb-4">
          A senha deve conter pelo menos 6 caracteres, incluindo <strong>letras</strong> e <strong>números</strong>.
        </p>

        <div className="mb-4 relative">
          <Input
            type={mostrarSenha ? "text" : "password"}
            placeholder="Nova senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={erro ? "border-red-500 pr-10" : "pr-10"}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            className="absolute right-3 top-2.5 text-muted-foreground"
          >
            {mostrarSenha ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
          </button>
        </div>

        <div className="mb-6">
          <Input
            type={mostrarSenha ? "text" : "password"}
            placeholder="Confirmar senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            className={erro ? "border-red-500" : ""}
          />
        </div>

        {erro && <p className="text-sm text-red-500 mb-4">{erro}</p>}

        <Button
          onClick={handleSubmit}
          disabled={loading || !senha || !confirmarSenha}
          className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white"
        >
          {loading ? "Salvando..." : "Criar Senha"}
        </Button>
      </div>
    </div>
  )
}
