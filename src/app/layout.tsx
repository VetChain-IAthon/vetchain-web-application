import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "VetChain · Mederi", description: "Inteligencia comercial para Mederi Pharma" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="es"><body>{children}</body></html>);
}
