"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getLangue, setLangue, t, Langue } from "@/lib/i18n";

export default function SignOutButton({
  compact = false,
  pleineLargeur = false,
}: {
  compact?: boolean;
  pleineLargeur?: boolean;
}) {
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

  const etire = compact || pleineLargeur;

  return (
    <div className={`relative inline-block ${etire ? "w-full" : ""}`}>
      <button
        onClick={() => setMenuOuvert(!menuOuvert)}
        title={compact ? (langue === "fr" ? "Français" : "English") : undefined}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border/80 bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary-light/50 hover:bg-slate-50 dark:hover:bg-white/10 ${
          etire ? "w-full" : ""
        }`}
      >
        <span className="text-xs leading-none">{langue === "fr" ? "🇫🇷" : "🇬🇧"}</span>
        {!compact && (
          <>
            <span className="hidden sm:inline">{langue === "fr" ? "Français" : "English"}</span>
            <span className="text-[10px] opacity-60">▾</span>
          </>
        )}
      </button>

      {menuOuvert && (
        <div
          className={`absolute mt-2 w-48 rounded-xl border border-border bg-surface p-1 shadow-xl shadow-black/10 ${
            compact ? "bottom-full left-0 mb-2" : "right-0"
          }`}
        >
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("langue.titre")}</p>
          </div>
          <button
            onClick={() => {
              handleLangueChange("fr");
              setMenuOuvert(false);
            }}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-white/10 ${
              langue === "fr" ? "bg-primary/10 font-semibold text-primary" : "text-foreground"
            }`}
          >
            🇫🇷 {t("langue.francais")}
          </button>
          <button
            onClick={() => {
              handleLangueChange("en");
              setMenuOuvert(false);
            }}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-white/10 ${
              langue === "en" ? "bg-primary/10 font-semibold text-primary" : "text-foreground"
            }`}
          >
            🇬🇧 {t("langue.anglais")}
          </button>
          <div className="my-1 border-t border-border" />
          <button
            onClick={() => {
              setMenuOuvert(false);
              handleLogout();
            }}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-danger transition hover:bg-rose-50 dark:hover:bg-rose-950/30"
          >
            {t("auth.deconnecter")}
          </button>
        </div>
      )}
    </div>
  );
}
