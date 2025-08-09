import "@/app/globals.css"
import { Inter } from "next/font/google"
import { Providers } from "@/app/providers"

const inter = Inter({ subsets: ["latin"] })

export const viewport = { width: "device-width", initialScale: 1 };

export const metadata = {
  title: "NutriDash",
  description: "Dashboard para nutricionistas",
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
