"use client";

import { BookOpen, Building2, LayoutDashboard, PenLine } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";

// Navigation visible sur mobile : la barre fixe en bas de l'écran
const NAV_MOBILE = [
  { href: "/", cle: "home.titre", icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: "/chantiers", cle: "chantiers.titre", icon: <Building2 className="h-5 w-5" /> },
  { href: "/bpu", cle: "nav.bpu", icon: <BookOpen className="h-5 w-5" /> },
];

export default function MobileNavigation() {
  const chemin = usePathname() ?? "/";

  // « Saisie du jour » : journal du chantier actuellement ouvert, sinon la liste des chantiers
  let cibleSaisie = "/chantiers";
  const segments = chemin.split("/").filter(Boolean);
  if (segments[0] === "chantiers" && segments.length >= 2) {
    cibleSaisie = `/chantiers/${segments[1]}/journaux`;
  }

  return (
    <>
      {/* Barre de navigation inférieure */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV_MOBILE.map((item) => {
          const actif = item.href === "/" ? chemin === "/" : chemin.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs font-medium ${
                actif ? "text-action" : "text-muted"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{t(item.cle)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bouton orange flottant : saisie du jour */}
      <Link
        href={cibleSaisie}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-2xl bg-action px-5 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-action/90 md:hidden"
      >
        <PenLine className="h-5 w-5" />
        <span>{t("topbar.saisie_jour")}</span>
      </Link>
    </>
  );
}
