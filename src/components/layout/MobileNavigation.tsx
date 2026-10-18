"use client";

import { BookOpen, Building2, LayoutDashboard, PenLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";

// Navigation visible sur mobile : la barre fixe en bas de l'écran
const NAV_MOBILE = [
  { href: "/", cle: "home.titre", icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: "/chantiers", cle: "chantiers.titre", icon: <Building2 className="h-5 w-5" /> },
  { href: "/bpu", cle: "nav.bpu", icon: <BookOpen className="h-5 w-5" /> },
];

// Mémorise le dernier chantier ouvert pour que « Saisie du jour » y retourne directement
const CLE_DERNIER_CHANTIER = "btp.dernier.chantier";

export default function MobileNavigation() {
  const chemin = usePathname() ?? "/";
  const [dernierChantier, setDernierChantier] = useState<string | null>(null);

  useEffect(() => {
    const segments = chemin.split("/").filter(Boolean);
    const idDansUrl =
      segments[0] === "chantiers" && segments.length >= 2 && segments[1] !== "nouveau"
        ? segments[1]
        : null;
    if (idDansUrl) {
      try {
        localStorage.setItem(CLE_DERNIER_CHANTIER, idDansUrl);
      } catch {
        // stockage indisponible : on ignore
      }
      setDernierChantier(idDansUrl);
      return;
    }
    try {
      setDernierChantier(localStorage.getItem(CLE_DERNIER_CHANTIER));
    } catch {
      setDernierChantier(null);
    }
  }, [chemin]);

  // « Saisie du jour » : journal du chantier en cours, sinon du dernier chantier visité
  const cibleSaisie = dernierChantier ? `/chantiers/${dernierChantier}/journaux` : "/chantiers";

  return (
    <>
      {/* Barre de navigation inférieure */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border/70 pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV_MOBILE.map((item) => {
          const actif = item.href === "/" ? chemin === "/" : chemin.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
                actif ? "text-action" : "text-muted"
              }`}
            >
              {actif && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-gradient-to-r from-action to-action-strong" />
              )}
              <span
                className={`grid h-8 w-14 place-items-center rounded-full transition ${
                  actif ? "bg-action/10" : ""
                }`}
              >
                {item.icon}
              </span>
              <span>{t(item.cle)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bouton orange flottant : saisie du jour */}
      <Link
        href={cibleSaisie}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-2xl bg-gradient-to-br from-action to-action-strong px-5 py-4 text-sm font-bold text-white shadow-xl shadow-action/40 transition hover:brightness-105 active:scale-95 md:hidden"
      >
        <PenLine className="h-5 w-5" />
        <span>{t("topbar.saisie_jour")}</span>
      </Link>
    </>
  );
}
