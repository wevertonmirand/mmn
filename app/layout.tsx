import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurum | Painel de Afiliados",
  description: "Rede, vendas, pontos e prêmios em um só lugar",
  manifest: "/manifest.webmanifest"
};
export const viewport: Viewport = { themeColor: "#D4AF37", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
