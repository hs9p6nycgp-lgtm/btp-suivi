import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import AppShell from "@/components/layout/AppShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import NetworkStatus from "@/components/NetworkStatus";
import MiseAJourAppli from "@/components/MiseAJourAppli";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://btp-suivi-7w2i.vercel.app"),
  title: {
    default: "BTP Suivi Pro — Gestion et suivi de chantiers BTP",
    template: "%s · BTP Suivi Pro",
  },
  description:
    "Application de gestion, de suivi et de reporting des chantiers routiers et de bâtiment en Côte d'Ivoire : devis, BPU, journal de chantier, photos, qualité, planning et coûts.",
  applicationName: "BTP Suivi Pro",
  manifest: "/manifest.json",
  keywords: [
    "BTP",
    "suivi de chantier",
    "chantier",
    "génie civil",
    "Côte d'Ivoire",
    "devis",
    "BPU",
    "métré",
    "route",
    "bâtiment",
    "planning",
    "qualité",
  ],
  openGraph: {
    type: "website",
    locale: "fr_CI",
    siteName: "BTP Suivi Pro",
    url: "https://btp-suivi-7w2i.vercel.app",
    title: "BTP Suivi Pro — Gestion et suivi de chantiers BTP",
    description:
      "Devis, BPU, journal de chantier, photos, qualité, planning et coûts — l'application de chantier pour la Côte d'Ivoire.",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BTP Suivi Pro",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0F2A4A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning : next-themes ajuste la classe "dark" après le chargement
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="light">
          <ServiceWorkerRegister />
          <NetworkStatus />
          <MiseAJourAppli />
          <Toaster />
          {/* La coquille masque la navigation sur les pages de connexion (voir AppShell) */}
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
