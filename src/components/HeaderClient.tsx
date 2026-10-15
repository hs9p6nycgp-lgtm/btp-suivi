"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SignOutButton from "@/components/SignOutButton";
import { t, getLangue, setLangue, Langue } from "@/lib/i18n";

export default function HeaderClient() {
  const [langue, setLangueState] = useState<Langue>(getLangue());

  useEffect(() => {
    setLangueState(getLangue());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header className="app-header">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">BTP Suivi Pro</span>
        </Link>
        <nav className="flex gap-4 text-sm hidden md:flex">
          <Link href="/" className="nav-link hover:underline">{t("nav.accueil")}</Link>
          <Link href="/chantiers" className="nav-link hover:underline">{t("nav.chantiers")}</Link>
          <Link href="/bpu" className="nav-link hover:underline">{t("nav.bpu")}</Link>
          <Link href="/calculateurs/devis" className="nav-link hover:underline">{t("nav.devis")}</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 text-sm font-semibold hover:bg-white/20 transition">
            Se connecter
          </Link>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}