import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Sidebar from "@/components/layout/Sidebar";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import NetworkStatus from "@/components/NetworkStatus";
import TopBar from "@/components/layout/TopBar";
import MobileNavigation from "@/components/layout/MobileNavigation";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BTP Suivi Pro",
  description: "Gestion et suivi de chantiers routiers et de bâtiment",
  manifest: "/manifest.json",
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
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-y-auto bg-background p-4 pb-28 md:p-6 md:pb-6">
                {children}
              </main>
            </div>
          </div>
          {/* Navigation mobile en bas de l'écran */}
          <MobileNavigation />
        </ThemeProvider>
      </body>
    </html>
  );
}
