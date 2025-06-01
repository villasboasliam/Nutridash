// 📁 app/esqueci-senha/page.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from "uuid"; // ✅ ADICIONADO

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = uuidv4(); // ✅ GERA O TOKEN

    const res = await fetch("/api/enviar-token-redefinicao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token }), // ✅ ENVIA TOKEN JUNTO
    });

    let data;
    try {
      data = await res.json();
    } catch (err) {
      toast({
        title: "Erro inesperado",
        description: "A resposta do servidor não pôde ser lida.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setLoading(false);

    if (res.ok) {
      toast({ title: "Verifique seu email", description: data.message });
    } else {
      toast({ title: "Erro", description: data.error, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h2 className="text-xl font-semibold">Redefinir senha</h2>
        <Input
          type="email"
          placeholder="Digite seu email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Enviando..." : "Enviar email de redefinição"}
        </Button>
      </form>
    </div>
  );
}
