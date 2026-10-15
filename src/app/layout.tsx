import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import NetworkStatus from "@/components/NetworkStatus";
import HeaderClient from "@/components/HeaderClient";
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
        <HeaderClient />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}