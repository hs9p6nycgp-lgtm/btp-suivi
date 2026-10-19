"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarRange,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Coins,
  FileText,
  LayoutDashboard,
  Scale,
  Truck,
  Ruler,
  Box,
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
  { href: "/referentiel", cle: "nav.referentiel", icon: <BookOpen className="h-5 w-5" /> },
  { href: "/fournisseurs", cle: "nav.fournisseurs", icon: <Users className="h-5 w-5" /> },
  { href: "/export", cle: "nav.export", icon: <Download className="h-5 w-5" /> },
  { href: "/rapports", cle: "nav.rapports", icon: <Printer className="h-5 w-5" /> },
  { href: "/calculateurs/devis", cle: "nav.devis", icon: <Calculator className="h-5 w-5" /> },
  { href: "/calculateurs/mur", cle: "nav.mur", icon: <Ruler className="h-5 w-5" /> },
];

// Onglets d'un chantier (visibles quand un chantier est ouvert)
type ItemNavChantier = {
  href: (id: string) => string;
  cle: string;
  icon: React.ReactNode;
};

const NAV_CHANTIER: ItemNavChantier[] = [
  { cle: "detail.planning", href: (id) => `/chantiers/${id}/planning`, icon: <CalendarRange className="h-5 w-5" /> },
  { cle: "detail.couts", href: (id) => `/chantiers/${id}/couts`, icon: <Coins className="h-5 w-5" /> },
  { cle: "detail.quality", href: (id) => `/chantiers/${id}/qualite`, icon: <ClipboardCheck className="h-5 w-5" /> },
  { cle: "detail.metre", href: (id) => `/chantiers/${id}/metre`, icon: <Scale className="h-5 w-5" /> },
  { cle: "detail.journal", href: (id) => `/chantiers/${id}/journaux`, icon: <FileText className="h-5 w-5" /> },
  { cle: "detail.livraisons", href: (id) => `/chantiers/${id}/livraisons`, icon: <Truck className="h-5 w-5" /> },
  { cle: "detail.modelisation3d", href: (id) => `/chantiers/${id}/modelisation3d`, icon: <Box className="h-5 w-5" /> },
];

const CLE_REDUIT = "btp.sidebar.reduit";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [langue, setLangueState] = useState<Langue>(getLangue());
  const chemin = usePathname() ?? "/";

  useEffect(() => {
    setLangueState(getLangue());
    // Restaurer le mode réduit choisi lors de la dernière visite
    if (window.localStorage.getItem(CLE_REDUIT) === "1") setCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // En mode réduit, la barre latérale devient une fine colonne (64 px) :
  // la classe "sidebar-reduit" indique au layout le décalage du contenu.
  useEffect(() => {
    document.documentElement.classList.toggle("sidebar-reduit", collapsed);
    window.localStorage.setItem(CLE_REDUIT, collapsed ? "1" : "0");
  }, [collapsed]);

  // Id du chantier actuellement ouvert (/chantiers/<id>/...), s'il y en a un
  const segments = chemin.split("/").filter(Boolean);
  const idChantierActif =
    segments[0] === "chantiers" && segments.length >= 2 ? segments[1] : null;

  const estActif = (href: string) =>
    href === "/" ? chemin === "/" : chemin === href || chemin.startsWith(`${href}/`);

  return (
    <aside
      className={`sidebar-surface fixed inset-y-0 left-0 z-40 hidden border-r border-white/10 text-white shadow-2xl shadow-black/25 transition-all duration-300 md:flex md:flex-col ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Bouton réduire / étendre */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? "Étendre la navigation" : "Réduire la navigation"}
        aria-label={collapsed ? "Étendre la navigation" : "Réduire la navigation"}
        className="absolute -right-3 top-20 z-50 hidden h-6 w-6 place-items-center rounded-full border border-border bg-surface text-muted shadow-md transition hover:scale-110 hover:text-foreground md:grid"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      <div className="flex h-full flex-col">
        {/* Logo */}
        <div
          className={`flex h-16 shrink-0 items-center gap-3 border-b border-white/10 ${
            collapsed ? "justify-center px-2" : "px-4"
          }`}
        >
          <img
            src="/logo.svg"
            alt="BTP Suivi Pro"
            className="h-9 w-9 shrink-0 rounded-xl shadow-lg shadow-black/30"
          />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold">Suivi Pro</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Chantiers
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {NAV_TOP_LEVEL.map((item) => {
            const actif = estActif(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={t(item.cle)}
                className={`group relative mb-0.5 flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
                  collapsed ? "justify-center px-2" : "px-3"
                } ${
                  actif
                    ? "bg-white/[0.14] text-white"
                    : "text-white/65 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                {actif && (
                  <span className="absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-action to-action-strong shadow-lg shadow-action/50" />
                )}
                <span
                  className={`shrink-0 transition-transform duration-200 ${
                    actif ? "" : "group-hover:scale-110"
                  }`}
                >
                  {item.icon}
                </span>
                {!collapsed && <span className="truncate">{t(item.cle)}</span>}
              </Link>
            );
          })}

          {/* Onglets d'un chantier */}
          {idChantierActif && (
            <div className="mt-5 border-t border-white/10 pt-4">
              {!collapsed && (
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  {t("nav.groupe_chantier")}
                </p>
              )}
              {NAV_CHANTIER.map((item) => {
                const href = item.href(idChantierActif);
                const actif = estActif(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={t(item.cle)}
                    className={`group relative mb-0.5 flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200 ${
                      collapsed ? "justify-center px-2" : "px-3"
                    } ${
                      actif
                        ? "bg-white/[0.14] text-white"
                        : "text-white/65 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    {actif && (
                      <span className="absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-action to-action-strong shadow-lg shadow-action/50" />
                    )}
                    <span
                      className={`shrink-0 transition-transform duration-200 ${
                        actif ? "" : "group-hover:scale-110"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && <span className="truncate">{t(item.cle)}</span>}
                  </Link>
                );
              })}
            </div>
          )}
        </nav>

        {/* Langue et déconnexion */}
        <div className="border-t border-white/10 p-2">
          {!collapsed && (
            <button
              onClick={() => {
                const next = langue === "fr" ? "en" : "fr";
                setLangue(next);
                setLangueState(next);
                window.location.reload();
              }}
              className="mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <span className="text-base leading-none">{langue === "fr" ? "🇬🇧" : "🇫🇷"}</span>
              {langue === "fr" ? "English" : "Français"}
            </button>
          )}
          <SignOutButton compact={collapsed} pleineLargeur={!collapsed} />
        </div>
      </div>
    </aside>
  );
}
