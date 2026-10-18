"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getLangue, t } from "@/lib/i18n";
import AlertsBadge from "@/components/layout/AlertsBadge";
import CommandPalette from "@/components/layout/CommandPalette";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import SignOutButton from "@/components/SignOutButton";

// Titre affiché selon la page courante : du plus précis au plus général.
// `cle` renvoie au dictionnaire bilingue ; `fr`/`en` servent de secours.
const TITRES_PAR_ROUTE: Array<{ motif: RegExp; cle?: string; fr: string; en?: string }> = [
  { motif: /^\/chantiers\/[^/]+\/journaux/, cle: "detail.journal", fr: "Journal de chantier" },
  { motif: /^\/chantiers\/[^/]+\/planning/, cle: "detail.planning", fr: "Planning" },
  { motif: /^\/chantiers\/[^/]+\/qualite/, fr: "Qualité & Contrôle", en: "Quality & Control" },
  { motif: /^\/chantiers\/[^/]+\/couts/, cle: "detail.couts", fr: "Coûts & Budget" },
  { motif: /^\/chantiers\/[^/]+\/livraisons/, cle: "detail.livraisons", fr: "Livraisons" },
  { motif: /^\/chantiers\/[^/]+\/metre/, cle: "detail.metre", fr: "Métré" },
  { motif: /^\/chantiers\/[^/]+\/modelisation3d/, fr: "Modélisation 3D", en: "3D Modeling" },
  { motif: /^\/chantiers\/[^/]+\/modifier/, fr: "Modifier le chantier", en: "Edit site" },
  { motif: /^\/chantiers\/nouveau/, cle: "nouveau_chantier.titre", fr: "Nouveau chantier" },
  { motif: /^\/chantiers\/[^/]+/, fr: "Fiche chantier", en: "Site sheet" },
  { motif: /^\/chantiers/, cle: "chantiers.titre", fr: "Chantiers" },
  { motif: /^\/bpu/, cle: "nav.bpu", fr: "BPU" },
  { motif: /^\/calculateurs\/devis/, cle: "nav.devis", fr: "Calcul de devis" },
  { motif: /^\/calculateurs\/mur/, cle: "nav.mur", fr: "Calcul de murs" },
  { motif: /^\/fournisseurs/, cle: "nav.fournisseurs", fr: "Fournisseurs" },
  { motif: /^\/rapports/, cle: "nav.rapports", fr: "Rapports" },
  { motif: /^\/export/, cle: "nav.export", fr: "Export" },
  { motif: /^\/referentiel/, cle: "nav.referentiel", fr: "Référentiel" },
  { motif: /^\/(login|mot-de-passe-oublie|reinitialiser-mot-de-passe)/, cle: "auth.connexion", fr: "Connexion" },
  { motif: /^\/offline/, fr: "Hors connexion", en: "Offline" },
  { motif: /^\/$/, cle: "home.titre", fr: "Tableau de bord" },
];

function titreDeLaPage(chemin: string): string {
  const regle = TITRES_PAR_ROUTE.find((r) => r.motif.test(chemin));
  if (!regle) return t("home.titre");
  if (regle.cle && getLangue() !== "en") return t(regle.cle);
  return getLangue() === "en" ? (regle.en ?? regle.fr) : regle.fr;
}

export default function TopBar() {
  const chemin = usePathname() ?? "/";
  const titre = titreDeLaPage(chemin);
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
          {titre}
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
