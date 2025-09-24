"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";

import { Eye, EyeOff, BarChart3, Menu } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

export default function CadastroPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, authLoading] = useAuthState(auth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Se já estiver logado, manda para a área interna
  useEffect(() => {
    if (!authLoading && user) router.replace("/pacientes");
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "nutricionistas", uid), {
        nome: name,
        email,
        plano: "teste",
        assinatura_ativa: false,
        data_criacao: serverTimestamp(),
      });

      toast({ title: "Cadastro realizado!", description: "Sua conta foi criada com sucesso. Faça login." });
      router.push("/login");
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

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const u = result.user;

      const ref = doc(db, "nutricionistas", u.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          nome: u.displayName || "",
          email: u.email,
          plano: "teste",
          assinatura_ativa: false,
          data_criacao: serverTimestamp(),
        });
      }

      toast({ title: "Cadastro com Google realizado!", description: "Sua conta foi criada com sucesso." });
      router.push("/login");
    } catch (error: any) {
      console.error("Erro ao autenticar com Google:", error);
      toast({
        title: "Erro ao autenticar com Google",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ===== Header (igual à landing) ===== */}
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
          <Card className="mx-auto max-w-md w-full">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Criar conta</CardTitle>
              <CardDescription>Preencha os dados abaixo para se cadastrar como nutricionista</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
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
                    autoComplete="email"
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
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword((v) => !v)}
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
                    <Link href="#" className="text-nutridash-purple hover:text-nutridash-blue">
                      Termos de Serviço
                    </Link>{" "}
                    e{" "}
                    <Link href="#" className="text-nutridash-purple hover:text-nutridash-blue">
                      Política de Privacidade
                    </Link>
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-nutridash-purple hover:bg-nutridash-blue text-white"
                  disabled={isLoading}
                >
                  {isLoading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>

              <Separator className="my-6" />

              <Button
                variant="outline"
                onClick={handleGoogleSignup}
                className="w-full flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                <FcGoogle size={20} />
                Cadastrar com Google
              </Button>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <div className="text-center text-sm">
                <Link href="/login" className="text-nutridash-purple hover:text-nutridash-blue font-medium">
                  Já possui uma conta? Fazer login
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* ===== Footer (igual à landing) ===== */}
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
