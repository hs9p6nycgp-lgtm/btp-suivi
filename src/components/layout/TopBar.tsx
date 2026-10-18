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
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 px-4 md:px-6">
      {/* Titre de la page courante */}
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-lg font-bold tracking-tight text-foreground md:text-xl">
          {t(cleTitre)}
        </h1>
      </div>

      {/* Actions du haut */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPaletteOuverte(true)}
          aria-label={t("topbar.rechercher")}
          className="group flex items-center gap-2 rounded-full border border-border/80 bg-surface-2 py-2 pl-3 pr-2 text-sm font-medium text-muted shadow-sm transition hover:border-primary-light/50 hover:text-foreground"
        >
          <Search className="h-4 w-4 transition group-hover:scale-110" />
          <span className="hidden lg:inline">{t("topbar.rechercher")}</span>
          <kbd className="hidden rounded-md border border-border/80 bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted md:inline-block">
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
