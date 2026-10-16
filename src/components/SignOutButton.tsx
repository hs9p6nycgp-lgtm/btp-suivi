"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getLangue, setLangue, t, Langue } from "@/lib/i18n";

export default function SignOutButton() {
  const router = useRouter();
  const [menuOuvert, setMenuOuvert] = useState(false);
  const [langue, setLangueState] = useState<Langue>(getLangue());

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  const handleLangueChange = (next: Langue) => {
    setLangue(next);
    setLangueState(next);
    // Recharger la page pour appliquer la nouvelle langue partout
    window.location.reload();
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setMenuOuvert(!menuOuvert)}
        className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-slate-100 dark:hover:bg-white/10 transition"
      >
        <span className="text-xs">{langue === "fr" ? "🇫🇷" : "🇬🇧"}</span>
        <span className="hidden sm:inline">{langue === "fr" ? "Français" : "English"}</span>
        <span className="text-[10px]">▾</span>
      </button>

      {menuOuvert && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-surface p-1 shadow-lg z-50">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">{t("langue.titre")}</p>
          </div>
          <button
            onClick={() => {
              handleLangueChange("fr");
              setMenuOuvert(false);
            }}
            className={`w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition ${
              langue === "fr" ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
            }`}
          >
            🇫🇷 {t("langue.francais")}
          </button>
          <button
            onClick={() => {
              handleLangueChange("en");
              setMenuOuvert(false);
            }}
            className={`w-full px-3 py-2 text-left text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition ${
              langue === "en" ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
            }`}
          >
            🇬🇧 {t("langue.anglais")}
          </button>
          <div className="border-t border-border my-1" />
          <button
            onClick={() => {
              setMenuOuvert(false);
              handleLogout();
            }}
            className="w-full px-3 py-2 text-left text-sm rounded-lg text-danger hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
          >
            {t("auth.deconnecter")}
          </button>
        </div>
      )}
    </div>
  );
}
