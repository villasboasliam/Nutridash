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

  // pega token JWT
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  console.log("🔑 Token JWT do next-auth ->", token)

  if (!token) {
    console.warn("🔒 Token ausente, redirecionando para login")
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.url)
    return NextResponse.redirect(loginUrl)
  }

  console.log("✅ Token presente, permitindo acesso a:", pathname)
  return NextResponse.next()
}
