"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SignOutButton from "@/components/SignOutButton";
import { t, getLangue, setLangue, Langue } from "@/lib/i18n";

export default function HeaderClient() {
  const [langue, setLangueState] = useState<Langue>(getLangue());
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [userMenuOuvert, setUserMenuOuvert] = useState(false);

  useEffect(() => {
    setLangueState(getLangue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLangueChange = (next: Langue) => {
    setLangue(next);
    setLangueState(next);
    setMenuOuvert(false);
    window.location.reload();
  };

  const handleLogout = () => {
    setMenuOuvert(false);
    setUserMenuOuvert(false);
  };

  return (
    <header className="app-header">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">BTP Suivi Pro</span>
        </Link>

        {/* Navigation desktop */}
        <nav className="flex gap-4 text-sm hidden md:flex">
          <Link href="/" className="nav-link hover:underline">{t("nav.accueil")}</Link>
          <Link href="/chantiers" className="nav-link hover:underline">{t("nav.chantiers")}</Link>
          <Link href="/bpu" className="nav-link hover:underline">{t("nav.bpu")}</Link>
          <Link href="/calculateurs/devis" className="nav-link hover:underline">{t("nav.devis")}</Link>
        </nav>

        <div className="flex items-center gap-3">
          {/* Menu mobile */}
          <button
            onClick={() => setMenuOuvert(!menuOuvert)}
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/20 focus:outline-none"
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Langue */}
          <button
            onClick={() => setUserMenuOuvert(!userMenuOuvert)}
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/20 focus:outline-none"
            aria-label="Langue"
          >
            <span className="text-xs">{langue === "fr" ? "🇫🇷" : "🇬🇧"}</span>
          </button>

          {/* Déconnexion desktop */}
          <Link href="/login" className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 text-sm font-semibold hover:bg-white/20 transition">
            Se connecter
          </Link>

          <SignOutButton />
        </div>
      </div>

      {/* Menu mobile déroulant */}
      {menuOuvert && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-primary border-t border-white/20 z-50">
          <div className="px-4 py-4 space-y-3">
            <Link href="/" className="block px-3 py-2 rounded-lg text-white hover:bg-white/20 transition">
              {t("nav.accueil")}
            </Link>
            <Link href="/chantiers" className="block px-3 py-2 rounded-lg text-white hover:bg-white/20 transition">
              {t("nav.chantiers")}
            </Link>
            <Link href="/bpu" className="block px-3 py-2 rounded-lg text-white hover:bg-white/20 transition">
              {t("nav.bpu")}
            </Link>
            <Link href="/calculateurs/devis" className="block px-3 py-2 rounded-lg text-white hover:bg-white/20 transition">
              {t("nav.devis")}
            </Link>
            <div className="border-t border-white/20 pt-3">
              <p className="text-xs font-semibold text-white/80 uppercase tracking-wider mb-2">
                {t("langue.titre")}
              </p>
              <button
                onClick={() => { handleLangueChange("fr"); setUserMenuOuvert(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  langue === "fr" ? "bg-orange-50 text-orange-700 font-semibold" : "text-white hover:bg-white/20"
                }`}
              >
                🇫🇷 {t("langue.francais")}
              </button>
              <button
                onClick={() => { handleLangueChange("en"); setUserMenuOuvert(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  langue === "en" ? "bg-orange-50 text-orange-700 font-semibold" : "text-white hover:bg-white/20"
                }`}
              >
                🇬🇧 {t("langue.anglais")}
              </button>
            </div>
            <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 bg-red-50 hover:bg-red-100 transition">
              {t("auth.deconnecter")}
            </button>
          </div>
        </div>
      )}

      {/* Menu langue mobile */}
      {userMenuOuvert && (
        <div className="md:hidden absolute right-0 mt-8 w-48 overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-soft-lg z-50">
          <div className="px-3 py-2 border-b border-border/70">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">{t("langue.titre")}</p>
          </div>
          <button
            onClick={() => { handleLangueChange("fr"); setUserMenuOuvert(false); }}
            className={`w-full px-3 py-2 text-left text-sm rounded-none transition hover:bg-surface-2 ${
              langue === "fr" ? "bg-action/10 text-action font-semibold" : "text-muted"
            }`}
          >
            🇫🇷 {t("langue.francais")}
          </button>
          <button
            onClick={() => { handleLangueChange("en"); setUserMenuOuvert(false); }}
            className={`w-full px-3 py-2 text-left text-sm rounded-none transition hover:bg-surface-2 ${
              langue === "en" ? "bg-action/10 text-action font-semibold" : "text-muted"
            }`}
          >
            🇬🇧 {t("langue.anglais")}
          </button>
          <div className="border-t border-border/70" />
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger/10 transition"
          >
            {t("auth.deconnecter")}
          </button>
        </div>
      )}
    </header>
  );
}