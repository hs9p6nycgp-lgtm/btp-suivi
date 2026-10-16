"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarRange,
  Calculator,
  ClipboardCheck,
  Coins,
  FileText,
  LayoutDashboard,
  Scale,
  Truck,
  Ruler,
  Users,
  Download,
  Printer,
} from "lucide-react";
import { getLangue, setLangue, t, Langue } from "@/lib/i18n";
import SignOutButton from "@/components/SignOutButton";

type ItemNav = {
  href: string;
  cle: string; // clé i18n pour le libellé
  icon: React.ReactNode;
};

// Écrans accessibles sans chantier (top level)
const NAV_TOP_LEVEL: ItemNav[] = [
  { href: "/", cle: "home.titre", icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: "/chantiers", cle: "chantiers.titre", icon: <Building2 className="h-5 w-5" /> },
  { href: "/bpu", cle: "nav.bpu", icon: <BookOpen className="h-5 w-5" /> },
  { href: "/fournisseurs", cle: "nav.fournisseurs", icon: <Users className="h-5 w-5" /> },
  { href: "/export", cle: "nav.export", icon: <Download className="h-5 w-5" /> },
  { href: "/rapports", cle: "nav.rapports", icon: <Printer className="h-5 w-5" /> },
  { href: "/calculateurs/devis", cle: "nav.devis", icon: <Calculator className="h-5 w-5" /> },
  { href: "/calculateurs/mur", cle: "nav.mur", icon: <Ruler className="h-5 w-5" /> },
];

// Onglets d'un chantier (visibles quand un chantier est ouvert)
type ItemNavChantier = {
  idChantier: string;
  href: (id: string) => string;
  cle: string;
  icon: React.ReactNode;
};

const NAV_CHANTIER: ItemNavChantier[] = [
  { idChantier: "", cle: "detail.planning", href: (id) => `/chantiers/${id}/planning`, icon: <CalendarRange className="h-5 w-5" /> },
  { idChantier: "", cle: "detail.couts", href: (id) => `/chantiers/${id}/couts`, icon: <Coins className="h-5 w-5" /> },
  { idChantier: "", cle: "detail.quality", href: (id) => `/chantiers/${id}/qualite`, icon: <ClipboardCheck className="h-5 w-5" /> },
  { idChantier: "", cle: "detail.metre", href: (id) => `/chantiers/${id}/metre`, icon: <Scale className="h-5 w-5" /> },
  { idChantier: "", cle: "detail.journal", href: (id) => `/chantiers/${id}/journaux`, icon: <FileText className="h-5 w-5" /> },
  { idChantier: "", cle: "detail.livraisons", href: (id) => `/chantiers/${id}/livraisons`, icon: <Truck className="h-5 w-5" /> },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [langue, setLangueState] = useState<Langue>(getLangue());
  const chemin = usePathname() ?? "/";

  useEffect(() => {
    setLangueState(getLangue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // En mode réduit, la barre latérale devient une fine colonne (64 px) :
  // la classe "sidebar-reduit" indique au layout le décalage du contenu.
  useEffect(() => {
    document.documentElement.classList.toggle("sidebar-reduit", collapsed);
  }, [collapsed]);

  // Id du chantier actuellement ouvert (/chantiers/<id>/...), s'il y en a un
  const segments = chemin.split("/").filter(Boolean);
  const idChantierActif =
    segments[0] === "chantiers" && segments.length >= 2 ? segments[1] : null;

  const estActif = (href: string) =>
    href === "/" ? chemin === "/" : chemin === href || chemin.startsWith(`${href}/`);

  const liensChantier = NAV_CHANTIER.filter((item) => {
    if (!idChantierActif) return false;
    const href = item.href(idChantierActif);
    return estActif(href);
  });

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden transition-all duration-200 md:flex md:flex-col ${
        collapsed ? "w-16" : "w-60"
      } bg-primary text-white`}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={`flex h-14 items-center border-b border-white/15 px-4 ${collapsed ? "justify-center" : "justify-start"}`}>
          {collapsed ? (
            <span className="text-xl font-bold">B</span>
          ) : (
            <span className="rounded-lg bg-white/10 px-2 py-1 text-lg font-bold tracking-tight">BTP</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {NAV_TOP_LEVEL.filter((item) => estActif(item.href)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={t(item.cle)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                estActif(item.href)
                  ? "bg-white/15 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              } ${collapsed ? "justify-center px-2" : ""}`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{t(item.cle)}</span>}
            </Link>
          ))}

          {/* Onglets d'un chantier */}
          {idChantierActif && (
            <div className={collapsed ? "mt-6" : "mt-6"}>
              {!collapsed && (
                <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  {t("nav.groupe_chantier")}
                </p>
              )}
              {liensChantier.map((item) => {
                const href = item.href(idChantierActif);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={t(item.cle)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                      estActif(href) ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                    } ${collapsed ? "justify-center px-2" : ""}`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{t(item.cle)}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Langue et déconnexion */}
        <div className="border-t border-white/15 p-4">
          {!collapsed && (
            <button
              onClick={() => {
                const next = langue === "fr" ? "en" : "fr";
                setLangue(next);
                setLangueState(next);
                window.location.reload();
              }}
              className="mb-3 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-white/80 hover:bg-white/10 transition"
            >
              {langue === "fr" ? "🇬🇧 English" : "🇫🇷 Français"}
            </button>
          )}
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
