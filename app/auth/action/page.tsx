"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { applyActionCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EmailActionPage() {
  const params = useSearchParams();
  const router = useRouter();
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");
  const continueUrl = params.get("continueUrl") || "/login?verified=1";

  const [status, setStatus] = useState<"loading" | "ok" | "expired" | "invalid">("loading");

  useEffect(() => {
    (async () => {
      if (mode !== "verifyEmail" || !oobCode) {
        setStatus("invalid");
        return;
      }
      try {
        await applyActionCode(auth, oobCode);   // conclui verificação
        await auth.currentUser?.reload?.();
        setStatus("ok");
        setTimeout(() => router.replace(continueUrl), 800);
      } catch (e: any) {
        setStatus(e?.code === "auth/expired-action-code" ? "expired" : "invalid");
      }
    })();
  }, [mode, oobCode, continueUrl, router]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {status === "loading" && "Confirmando seu e-mail..."}
            {status === "ok" && "E-mail verificado!"}
            {status === "expired" && "Link expirado"}
            {status === "invalid" && "Link inválido"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Por favor, aguarde alguns segundos."}
            {status === "ok" && "Redirecionando para o login..."}
            {status === "expired" && "O link de verificação expirou. Reenvie o e-mail de verificação."}
            {status === "invalid" && "Não foi possível validar este link."}
          </CardDescription>
        </CardHeader>
        {(status === "expired" || status === "invalid") && (
          <CardContent className="flex gap-2">
            <Button onClick={() => router.push("/verificar-email")}>Reenviar</Button>
            <Button variant="outline" onClick={() => router.push("/login")}>Ir para o login</Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
