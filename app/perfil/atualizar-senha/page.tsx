"use client"

import { useState, useMemo } from "react"
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"

import { Button } from "@/components/ui/button"
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter as DialogFooterUI,
} from "@/components/ui/dialog"

export default function UpdatePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Inline feedback
  const [inlineErrorCurrent, setInlineErrorCurrent] = useState<string | null>(null)
  const [inlineErrorConfirm, setInlineErrorConfirm] = useState<string | null>(null)

  // Sucesso
  const [successOpen, setSuccessOpen] = useState(false)

  const [user] = useAuthState(auth)
  const router = useRouter()
  const { toast } = useToast()

  const canSubmit = useMemo(() => {
    if (!newPassword || !confirmPassword || !currentPassword) return false
    if (newPassword.length < 6) return false
    if (newPassword !== confirmPassword) return false
    return !isLoading
  }, [newPassword, confirmPassword, currentPassword, isLoading])

  const mapAuthError = (code?: string) => {
    switch (code) {
      case "auth/wrong-password":
        return "Senha atual não confere."
      case "auth/invalid-login-credentials":
        return "Credenciais inválidas. Verifique e tente novamente."
      case "auth/too-many-requests":
        return "Muitas tentativas. Tente novamente mais tarde."
      case "auth/requires-recent-login":
        return "Por segurança, faça login novamente e tente de novo."
      case "auth/network-request-failed":
        return "Falha de rede. Verifique sua conexão."
      case "auth/weak-password":
        return "A nova senha é muito fraca."
      default:
        return "Não foi possível atualizar a senha. Tente novamente."
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setInlineErrorCurrent(null)
    setInlineErrorConfirm(null)

    if (!user?.email) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      const msg = "As senhas não coincidem."
      setInlineErrorConfirm(msg)
      toast({ title: "As senhas não coincidem", description: "Revise os campos de nova senha.", variant: "destructive" })
      return
    }

    setIsLoading(true)
    try {
      // Reautentica com a senha atual
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)

      // Atualiza a senha
      await updatePassword(user, newPassword)

      // Confirmação visual antes de sair
      setSuccessOpen(true)
    } catch (error: any) {
      const msg = mapAuthError(error?.code)
      if (error?.code === "auth/wrong-password") {
        setInlineErrorCurrent("Senha atual não confere.")
      }
      toast({
        title: "Erro ao atualizar senha",
        description: msg,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
          <Button variant="outline" size="icon" asChild>
            <Link href="/perfil">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <div className="w-full flex-1">
            <h2 className="text-lg font-medium">Atualizar Senha</h2>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>Atualizar Senha</CardTitle>
                <CardDescription>Use uma senha forte e fácil de lembrar.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Senha atual */}
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Senha atual</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value)
                          if (inlineErrorCurrent) setInlineErrorCurrent(null)
                        }}
                        required
                        aria-invalid={!!inlineErrorCurrent}
                        aria-describedby={inlineErrorCurrent ? "current-password-error" : undefined}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {inlineErrorCurrent && (
                      <p id="current-password-error" className="text-sm text-destructive">
                        {inlineErrorCurrent}
                      </p>
                    )}
                  </div>

                  {/* Nova senha */}
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value)
                          if (inlineErrorConfirm && e.target.value === confirmPassword) {
                            setInlineErrorConfirm(null)
                          }
                        }}
                        required
                        aria-invalid={newPassword.length > 0 && newPassword.length < 6}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {newPassword.length > 0 && newPassword.length < 6 && (
                      <p className="text-sm text-muted-foreground">
                        A senha deve ter pelo menos 6 caracteres.
                      </p>
                    )}
                  </div>

                  {/* Confirmar senha */}
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          if (inlineErrorConfirm && e.target.value === newPassword) {
                            setInlineErrorConfirm(null)
                          }
                        }}
                        required
                        aria-invalid={!!inlineErrorConfirm}
                        aria-describedby={inlineErrorConfirm ? "confirm-password-error" : undefined}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {inlineErrorConfirm && (
                      <p id="confirm-password-error" className="text-sm text-destructive">
                        {inlineErrorConfirm}
                      </p>
                    )}
                    {!inlineErrorConfirm && confirmPassword.length > 0 && confirmPassword !== newPassword && (
                      <p className="text-sm text-destructive">As senhas não coincidem.</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={!canSubmit}
                  >
                    {isLoading ? "Atualizando..." : "Atualizar Senha"}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button variant="ghost" asChild>
                  <Link href="/perfil">Cancelar</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>

      {/* Dialog de sucesso */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent aria-describedby="success-desc">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Senha atualizada com sucesso
            </DialogTitle>
            <DialogDescription id="success-desc">
              Sua nova senha foi salva com segurança.
            </DialogDescription>
          </DialogHeader>
          <DialogFooterUI>
            <Button
              onClick={() => {
                setSuccessOpen(false)
                router.push("/perfil")
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Ok, voltar ao perfil
            </Button>
          </DialogFooterUI>
        </DialogContent>
      </Dialog>
    </>
  )
}

