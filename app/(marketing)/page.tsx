export const dynamic = "force-dynamic";

import Link from "next/link";
import dynamic from "next/dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Users, BarChart3, Smartphone, Star, Menu } from "lucide-react";

// Carrega o redirecionamento como client component (sem SSR)
const ClientAuthRedirect = dynamic(() => import("./_ClientAuthRedirect"), { ssr: false });

export default function NutriDashLanding() {
  return (
    <div className="min-h-screen bg-white">
      {/* Redireciona logado -> /dashboard (somente no client) */}
      <ClientAuthRedirect />

      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-nutridash-purple rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">NutriDash</span>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-nutridash-purple transition-colors">
              Recursos
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-nutridash-purple transition-colors">
              Planos
            </a>
            <a href="#testimonials" className="text-gray-600 hover:text-nutridash-purple transition-colors">
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

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge className="mb-6 bg-nutridash-light text-nutridash-purple border-nutridash-purple/20">
            ✨ A plataforma referência em gestão de nutrição
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 text-balance">
            Transforme seu consultório com o <span className="text-nutridash-purple">NutriDash</span>
          </h1>

          <p className="text-xl text-gray-600 mb-8 text-pretty max-w-2xl mx-auto">
            Centralize o atendimento, automatize planos alimentares e acompanhe resultados em um painel criado por
            nutricionistas, para nutricionistas.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro">
              <Button size="lg" className="bg-nutridash-purple hover:bg-nutridash-blue text-white px-8 py-3 text-lg">
                Inicie seu teste gratuito
              </Button>
            </Link>

            <a href="#features">
              <Button
                size="lg"
                variant="outline"
                className="border-nutridash-purple text-nutridash-purple hover:bg-nutridash-purple hover:text-white px-8 py-3 text-lg bg-transparent"
              >
                Ver demonstração
              </Button>
            </a>
          </div>

          <p className="text-sm text-gray-500 mt-4">Sem cartão de crédito • 14 dias de teste</p>
        </div>
      </section>

      {/* Benefícios */}
      <section id="features" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Por que escolher o NutriDash</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Economize tempo, melhore a adesão dos pacientes e escale seu consultório com automações inteligentes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-nutridash-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-nutridash-purple" />
                </div>
                <CardTitle className="text-xl">+10 horas salvas/semana</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600">
                  Automatize cardápios, listas de compras e comunicações para focar no que importa.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-nutridash-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-nutridash-purple" />
                </div>
                <CardTitle className="text-xl">Mais adesão dos pacientes</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600">
                  Planos interativos e acompanhamento de progresso mantêm o paciente engajado.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-nutridash-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-nutridash-purple" />
                </div>
                <CardTitle className="text-xl">Insights com dados</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600">
                  Acompanhe métricas e receba recomendações personalizadas para cada paciente.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-nutridash-light rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-nutridash-purple" />
                </div>
                <CardTitle className="text-xl">Mobile-first</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <CardDescription className="text-gray-600">
                  Acesse de qualquer lugar com o painel responsivo e app do paciente.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Prints do app */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Veja o NutriDash em ação</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Uma interface limpa e intuitiva para simplificar sua rotina
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="aspect-[4/3] bg-gradient-to-br from-nutridash-purple to-nutridash-blue p-8 flex items-center justify-center">
                <img
                  src="/img_1.jpg"
                  alt="Painel do NutriDash"
                  className="w-full h-full object-cover rounded-lg shadow-lg"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-2">Painel do Paciente</h3>
                <p className="text-gray-600">Visão completa de progresso e métricas de nutrição</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="aspect-[4/3] bg-gradient-to-br from-nutridash-blue to-nutridash-purple p-8 flex items-center justify-center">
                <img
                  src="/img_3.jpg"
                  alt="Interface de planejamento de refeições"
                  className="w-full h-full object-cover rounded-lg shadow-lg"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-2">Planejamento de Refeições</h3>
                <p className="text-gray-600">Drag-and-drop com cálculo automático de macros</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="aspect-[4/3] bg-gradient-to-br from-nutridash-purple to-nutridash-blue p-8 flex items-center justify-center">
                <img
                  src="/img_2.jpg"
                  alt="App mobile do paciente"
                  className="w-full h-full object-cover rounded-lg shadow-lg"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-2">Aplicativo Mobile</h3>
                <p className="text-gray-600">O paciente acompanha refeições e evolução em tempo real</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="pricing" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Escolha seu plano</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Comece grátis e escale conforme seu consultório cresce. Todos os planos incluem os recursos essenciais.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Básico — “Mais popular” */}
            <Card className="relative border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-nutridash-purple text-white px-4 py-1">Mais popular</Badge>
              </div>
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl mb-2">Básico</CardTitle>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  R$ 29<span className="text-lg font-normal text-gray-600">/mês</span>
                </div>
                <CardDescription>Para profissionais solo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Feature>Até 50 pacientes</Feature>
                <Feature>Planejamento básico</Feature>
                <Feature>Acompanhamento de progresso</Feature>
                <Feature>Suporte por e-mail</Feature>
                <Link href="/cadastro">
                  <Button className="w-full mt-8 bg-gray-900 hover:bg-gray-800 text-white">Assinar</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Profissional — película cinza + “Em breve” */}
            <Card className="relative border-2 border-nutridash-purple shadow-xl hover:shadow-2xl transition-shadow">
              <div className="pointer-events-none absolute inset-0 rounded-xl bg-gray-900/50 z-10" />
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                <Badge className="bg-gray-800 text-white px-4 py-1">Em breve</Badge>
              </div>

              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl mb-2">Profissional</CardTitle>
                <div className="text-4xl font-bold text-nutridash-purple mb-2">
                  R$ 79<span className="text-lg font-normal text-gray-600">/mês</span>
                </div>
                <CardDescription>Para consultórios em crescimento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Feature>Até 200 pacientes</Feature>
                <Feature>Planejamento avançado</Feature>
                <Feature>Listas de compras automáticas</Feature>
                <Feature>Analytics e relatórios</Feature>
                <Feature>Suporte prioritário</Feature>
                <Button className="w-full mt-8 bg-nutridash-purple text-white" disabled>
                  Em breve
                </Button>
              </CardContent>
            </Card>

            {/* Premium — película cinza + “Em breve” */}
            <Card className="relative border-0 shadow-lg hover:shadow-xl transition-shadow">
              <div className="pointer-events-none absolute inset-0 rounded-xl bg-gray-900/50 z-10" />
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                <Badge className="bg-gray-800 text-white px-4 py-1">Em breve</Badge>
              </div>

              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl mb-2">Premium</CardTitle>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  R$ 149<span className="text-lg font-normal text-gray-600">/mês</span>
                </div>
                <CardDescription>Para grandes clínicas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Feature>Pacientes ilimitados</Feature>
                <Feature>Recomendações com IA</Feature>
                <Feature>App white-label</Feature>
                <Feature>Acesso à API</Feature>
                <Feature>Suporte dedicado</Feature>
                <Button className="w-full mt-8 bg-gray-900 text-white" disabled>
                  Em breve
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section id="testimonials" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Profissionais confiam no NutriDash</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Veja o que nutricionistas estão dizendo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Testimonial
              quote="O NutriDash transformou meu dia a dia. Ganhei horas toda semana e os pacientes estão mais engajados."
              name="Sarah Martinez, RD"
              role="Nutricionista Clínica"
              initials="SM"
            />
            <Testimonial
              quote="Os gráficos e relatórios elevaram meu acompanhamento. Os resultados melhoraram muito."
              name="Dr. James Wilson"
              role="Nutrição Esportiva"
              initials="DJ"
            />
            <Testimonial
              quote="Como gestora, as automações fazem toda a diferença. Recomendo demais!"
              name="Lisa Chen, MS, RD"
              role="Gestora de Clínica"
              initials="LC"
            />
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 px-4 bg-gradient-to-r from-nutridash-purple to-nutridash-blue">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Pronto para transformar seu consultório?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Junte-se a profissionais que já usam o NutriDash para simplificar processos e melhorar resultados.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro">
              <Button size="lg" className="bg-white text-nutridash-purple hover:bg-gray-100 px-8 py-3 text-lg">
                Começar grátis
              </Button>
            </Link>
            <a href="#features">
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-nutridash-purple px-8 py-3 text-lg bg-transparent"
              >
                Ver recursos
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
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
                <li><a href="#features" className="hover:text-white transition-colors">Recursos</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Planos</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">App Mobile</a></li>
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

/** Componentes auxiliares (server-safe) */
function Feature({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center space-x-3">
      <CheckCircle className="w-5 h-5 text-green-500" />
      <span>{children}</span>
    </div>
  );
}

function Testimonial({
  quote,
  name,
  role,
  initials,
}: {
  quote: string;
  name: string;
  role: string;
  initials: string;
}) {
  return (
    <Card className="border-0 shadow-lg">
      <CardContent className="p-8">
        <div className="flex items-center mb-4">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
          ))}
        </div>
        <blockquote className="text-gray-700 mb-6 italic">“{quote}”</blockquote>
        <div className="flex items-center">
          <div className="w-12 h-12 bg-nutridash-light rounded-full flex items-center justify-center mr-4">
            <span className="text-nutridash-purple font-semibold">{initials}</span>
          </div>
          <div>
            <div className="font-semibold">{name}</div>
            <div className="text-gray-600 text-sm">{role}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

