"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { FcGoogle } from "react-icons/fc"; // Ícone do Google

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login realizado", description: "Redirecionando..." });
      router.push("/pacientes");
    } catch (error: any) {
      console.error("Erro de login:", error);
      setErrorMessage("E-mail ou senha incorretos");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({ title: "Login com Google realizado", description: "Redirecionando..." });
      router.push("/pacientes");
    } catch (error: any) {
      console.error("Erro no login com Google:", error);
      toast({ title: "Erro no login com Google", description: "Tente novamente." });
    } finally {
      setLoading(false);
    }
  };

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
            onClick={handleGoogleLogin}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            <FcGoogle size={20} />
            Entrar com Google
          </Button>

          <div className="mt-6 text-sm text-center">
            Não tem uma conta?{" "}
            <Link href="/cadastro" className="text-indigo-600 hover:underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
