"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";

import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

import { BarChart3, Menu } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Se já estiver logado, manda para área interna
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/pacientes");
    }
  }, [authLoading, user, router]);

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

  // Enquanto verifica sessão, evita flicker
  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ===== Header (mesmo da landing) ===== */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-nutridash-purple rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">NutriDash</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="/#features" className="text-gray-600 hover:text-nutridash-purple transition-colors">
              Recursos
            </a>
            <a href="/#pricing" className="text-gray-600 hover:text-nutridash-purple transition-colors">
              Planos
            </a>
            <a href="/#testimonials" className="text-gray-600 hover:text-nutridash-purple transition-colors">
              Depoimentos
            </a>

            {/* Estamos na página de login — mantém o botão por consistência visual */}
            <Link href="/login">
              <Button
                variant="outline"
                className="border-nutridash-purple text-nutridash-purple hover:bg-nutridash-purple hover:text-white bg-transparent"
              >
                Entrar
              </Button>
            </Link>

            <Link href="/cadastro">
              <Button className="bg-nutridash-purple hover:bg-nutridash-blue text-white">
                Começar grátis
              </Button>
            </Link>
          </nav>

          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* ===== Main (formulário) ===== */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl">Entrar no NutriDash</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium">
                    E-mail
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@nutridash.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
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
                    autoComplete="current-password"
                  />
                </div>

                {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}

                <Button
                  type="submit"
                  className="w-full bg-nutridash-purple hover:bg-nutridash-blue text-white"
                  disabled={loading}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>

              <div className="mt-4 text-sm text-center">
                <Link href="/esqueci-senha" className="text-nutridash-purple hover:underline">
                  Esqueci minha senha
                </Link>
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
                <Link href="/cadastro" className="text-nutridash-purple hover:underline">
                  Cadastre-se
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* ===== Footer (mesmo da landing) ===== */}
      <footer className="py-12 px-4 bg-gray-900 text-white">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-nutridash-purple rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">NutriDash</span>
              </div>
              <p className="text-gray-400">A plataforma completa de gestão para nutricionistas.</p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Produto</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/#features" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="/#pricing" className="hover:text-white transition-colors">Planos</a></li>
                <li><a href="/#features" className="hover:text-white transition-colors">App Mobile</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacidade (LGPD)</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Termos de uso</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Segurança</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Conformidade</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} NutriDash. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
