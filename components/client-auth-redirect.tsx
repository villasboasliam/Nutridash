"use client";

import { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

/**
 * Redireciona para /dashboard se o usuário já estiver autenticado.
 * É client-only para não rodar Firebase no build do Vercel.
 */
export default function ClientAuthRedirect() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  return null;
}
