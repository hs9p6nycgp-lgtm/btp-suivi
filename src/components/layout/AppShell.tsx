"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import MobileNavigation from "@/components/layout/MobileNavigation";
import { estRouteAuth } from "@/components/layout/routeAuth";

// Coquille de l'application : barre latérale, barre du haut, navigation mobile.
// Sur les pages de connexion / mot de passe, rien de tout cela ne s'affiche :
// l'écran est plein et sans bouton « Saisie du jour ».
export default function AppShell({ children }: { children: React.ReactNode }) {
  const chemin = usePathname() ?? "/";
  const pageAuth = estRouteAuth(chemin);

  // Une page « avant connexion » ne doit pas hériter du décalage de la barre
  // latérale réduite (classe posée sur <html> par la Sidebar).
  useEffect(() => {
    if (pageAuth) document.documentElement.classList.remove("sidebar-reduit");
  }, [pageAuth]);

  return (
    <div className="flex h-screen overflow-hidden">
      {!pageAuth && <Sidebar />}
      {/* md:ml-60 : la barre latérale occupe 240 px dès le md (voir globals.css) */}
      <div
        data-contenu
        className={`flex flex-1 flex-col overflow-hidden ${pageAuth ? "" : "md:ml-60"}`}
      >
        {!pageAuth && <TopBar />}
        <main
          className={`flex-1 overflow-y-auto bg-background ${
            pageAuth ? "" : "p-4 pb-28 md:p-6 md:pb-6"
          }`}
        >
          {children}
        </main>
      </div>
      {!pageAuth && <MobileNavigation />}
    </div>
  );
}
