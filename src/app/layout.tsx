import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/layout/Sidebar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import NetworkStatus from "@/components/NetworkStatus";
import SignOutButton from "@/components/SignOutButton";
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
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <ServiceWorkerRegister />
        <NetworkStatus />
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-20 shadow-sm">
              <div className="flex items-center gap-2 md:hidden">
                <button className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 text-center">
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Tableau de bord</span>
              </div>
              <div className="flex items-center gap-2">
                <SignOutButton />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}