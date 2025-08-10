"use client";

import { useState } from "react";
import { Eye, EyeOff, LineChart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/ui/use-toast";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function CadastroPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // URL base do app para o link de ação
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1) Cria usuário
      const { user } = await createUserWithEmailAndPassword(auth, email, password);

      // 2) Envia verificação para rota interna do app
      await sendEmailVerification(user, {
        url: `${appUrl}/auth/action`,
        handleCodeInApp: true,
      });

      // 3) Salva doc do nutricionista por UID
      await setDoc(doc(db, "nutricionistas", user.uid), {
        nome: name,
        email,
        plano: "teste",
        assinatura_ativa: false,
        data_criacao: serverTimestamp(),
        provedor: "password",
      });

      toast({
        title: "Verifique seu e-mail",
        description: `Enviamos um link de confirmação para ${email}.`,
      });

      router.push(`/verificar-email?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      console.error("Erro ao cadastrar:", error);
      toast({
        title: "Erro no cadastro",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Cria doc se não existir
      const ref = doc(db, "nutricionistas", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          nome: user.displayName ?? "",
          email: user.email ?? "",
          plano: "teste",
          assinatura_ativa: false,
          data_criacao: serverTimestamp(),
          provedor: "google",
        });
      }

      // Se por algum motivo o e-mail não veio verificado, dispara verificação
      if (!user.emailVerified && user.email) {
        await sendEmailVerification(user, {
          url: `${appUrl}/auth/action`,
          handleCodeInApp: true,
        });
        toast({
          title: "Verifique seu e-mail",
          description: `Enviamos um link de confirmação para ${user.email}.`,
        });
        router.push(`/verificar-email?email=${encodeURIComponent(user.email)}`);
        return;
      }

      toast({ title: "Login realizado!", description: "Bem-vindo(a) ao NutriDash." });
      router.push("/");
    } catch (error: any) {
      console.error("Erro no login com Google:", error);
      toast({
        title: "Não foi possível entrar com Google",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

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
            {/* Google */}
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || isLoading}
              >
                {isGoogleLoading ? "Conectando…" : "Continuar com Google"}
              </Button>

              <div className="flex items-center gap-2 my-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>

            {/* E-mail/senha */}
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
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

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isLoading || isGoogleLoading}
              >
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
  );
}
