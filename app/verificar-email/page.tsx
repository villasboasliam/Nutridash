"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function VerificarEmailPage() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get("email") ?? "";
  const { toast } = useToast();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "");

  const reenviar = async () => {
    if (!auth.currentUser) {
      toast({ title: "Sessão expirada", description: "Faça login novamente.", variant: "destructive" });
      router.push("/login");
      return;
    }
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser, {
        url: `${appUrl}/auth/action`,
        handleCodeInApp: true,
      });
      toast({
        title: "E-mail reenviado",
        description: `Verifique sua caixa de entrada ${email ? `(${email})` : ""}.`,
      });
    } catch (e: any) {
      toast({ title: "Falha ao reenviar", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  const checar = async () => {
    if (!auth.currentUser) {
      router.push("/login");
      return;
    }
    setChecking(true);
    await auth.currentUser.reload();
    if (auth.currentUser.emailVerified) {
      toast({ title: "E-mail verificado!", description: "Redirecionando…" });
      router.push("/login"); // ou "/" se preferir
    } else {
      toast({ title: "Ainda não verificado", description: "Confirme pelo link enviado ao seu e-mail." });
    }
    setChecking(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Confirme seu e-mail</CardTitle>
          <CardDescription>
            Enviamos um link de confirmação {email ? `para ${email}` : ""}. Abra sua caixa de entrada e clique no link.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={reenviar} disabled={resending}>
            {resending ? "Reenviando..." : "Reenviar e-mail"}
          </Button>
          <Button variant="outline" onClick={checar} disabled={checking}>
            {checking ? "Checando..." : "Já confirmei"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

