import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/cadastro",
  "/esqueci-senha",
  "/recuperar-senha",
  "/redefinir-senha",
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const isPublic = PUBLIC_PATHS.some(
    path => pathname === path || pathname.startsWith(path + "/")
  )

  if (isPublic) {
    return NextResponse.next()
  }

  // 🔒 Aqui você ainda pode adicionar verificação por cookies futuramente
  // Por enquanto: deixa passar tudo
  return NextResponse.next()
}
