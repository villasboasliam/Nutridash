import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/cadastro",
  "/esqueci-senha",
  "/recuperar-senha",
  "/redefinir-senha",
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignorar arquivos estáticos e rotas internas
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  console.log("🔍 Middleware executado para:", pathname)

  const isPublic = PUBLIC_PATHS.some(
    path => pathname === path || pathname.startsWith(path + "/")
  )

  if (isPublic) {
    console.log("🟢 Rota pública detectada, permitindo acesso:", pathname)
    return NextResponse.next()
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    raw: true, // força leitura do JWT puro
  })

  // Log extra para debug
  const sessionCookie =
    request.cookies.get("next-auth.session-token")?.value ??
    request.cookies.get("__Secure-next-auth.session-token")?.value

  if (!token && sessionCookie) {
    try {
      const decoded = JSON.parse(
        Buffer.from(sessionCookie.split(".")[1], "base64").toString("utf8")
      )
      console.log("🧠 Token manualmente decodificado:", decoded)
    } catch (e) {
      console.warn("❌ Erro ao decodificar o token manualmente:", e)
    }
  }

  if (!token) {
    console.warn("🔒 Token não encontrado. Redirecionando para login.")
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.url)
    return NextResponse.redirect(loginUrl)
  }

  console.log("✅ Token encontrado. Acesso autorizado para:", pathname)
  return NextResponse.next()
}
