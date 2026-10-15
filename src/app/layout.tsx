import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import NetworkStatus from "@/components/NetworkStatus";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BTP Suivi Pro",
  description: "Gestion et suivi de chantiers routiers et de bâtiment",
  manifest: "/manifest.json",
  themeColor: "#1e3a5f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ServiceWorkerRegister />
        <NetworkStatus />
        <header className="app-header">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              BTP Suivi Pro
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="nav-link hover:underline">Accueil</Link>
              <Link href="/chantiers" className="nav-link hover:underline">Chantiers</Link>
              <Link href="/bpu" className="nav-link hover:underline">BPU</Link>
              <Link href="/calculateurs/devis" className="nav-link hover:underline">Devis</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}