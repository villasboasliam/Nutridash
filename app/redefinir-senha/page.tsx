"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export default function RedefinirSenhaPage() {
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !email) {
      toast({ title: "Link inválido", variant: "destructive" });
      return;
    }

    if (senha !== confirmarSenha) {
      toast({ title: "As senhas não coincidem", variant: "destructive" });
      return;
    }

    setCarregando(true);

    const res = await fetch("/api/confirmar-redefinicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, novaSenha: senha }),
    });

    const data = await res.json();
    setCarregando(false);

    if (res.ok) {
      toast({ title: "Senha redefinida com sucesso!" });
      router.push("/login");
    } else {
      toast({ title: "Erro", description: data.error, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h2 className="text-xl font-semibold">Nova Senha</h2>
        <Input
          type="password"
          placeholder="Digite sua nova senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Confirme a nova senha"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          required
        />
        <Button type="submit" disabled={carregando} className="w-full">
          {carregando ? "Salvando..." : "Redefinir Senha"}
        </Button>
      </form>
    </div>
  );
}
