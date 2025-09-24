import "@/app/globals.css";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";

const inter = Inter({ subsets: ["latin"] });

// carrega Providers no client, sem SSR (evita executar Firebase no build)
const Providers = dynamic(() => import("./providers").then(m => m.Providers), { ssr: false });

export const viewport = { width: "device-width", initialScale: 1 };
export const metadata = {
  title: "NutriDash",
  description: "Dashboard para nutricionistas",
  generator: "v0.dev",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
