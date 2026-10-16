"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import AlertsBadge from "@/components/layout/AlertsBadge";
import CommandPalette from "@/components/layout/CommandPalette";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import SignOutButton from "@/components/SignOutButton";

// Correspondance entre le chemin courant et une clé du dictionnaire
const CLE_PAR_ROUTE: Record<string, string> = {
  "/": "home.titre",
  "/chantiers": "chantiers.titre",
  "/bpu": "nav.bpu",
  "/calculateurs/devis": "nav.devis",
  "/calculateurs/mur": "nav.mur",
  "/login": "auth.connexion",
};

export default function TopBar() {
  const chemin = usePathname() ?? "/";
  const cleTitre = CLE_PAR_ROUTE[chemin] ?? "home.titre";
  const [paletteOuverte, setPaletteOuverte] = useState(false);

  // Raccourci ⌘K / Ctrl + K pour la recherche globale
  useEffect(() => {
    function ecouterTouches(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOuverte((ouvert) => !ouvert);
      }
    }
    window.addEventListener("keydown", ecouterTouches);
    return () => window.removeEventListener("keydown", ecouterTouches);
  }, []);

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-surface px-4 shadow-sm md:px-6 z-30">
      {/* Titre de la page courante */}
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-lg font-bold text-foreground md:text-xl">{t(cleTitre)}</h1>
      </div>

      {/* Actions du haut */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPaletteOuverte(true)}
          aria-label={t("topbar.rechercher")}
          className="flex items-center gap-2 rounded-xl border border-border bg-slate-50 px-3 py-2 text-sm font-medium text-muted transition hover:bg-slate-100 dark:hover:bg-white/10 dark:text-slate-300"
        >
          <Search className="h-4 w-4" />
          <span className="hidden lg:inline">{t("topbar.rechercher")}</span>
          <kbd className="rounded-md border border-border bg-white px-1.5 py-0.5 text-[10px] font-semibold text-muted dark:bg-slate-800 dark:text-slate-400">
            ⌘K
          </kbd>
        </button>

        <AlertsBadge />

        <ThemeToggle />

        <SignOutButton />
      </div>

      {paletteOuverte && (
        <CommandPalette
          ouvert={paletteOuverte}
          onFermer={() => setPaletteOuverte(false)}
        />
      )}
    </header>
  );
}
