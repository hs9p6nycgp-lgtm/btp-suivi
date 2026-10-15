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
        className="rounded border px-3 py-1 text-sm flex items-center gap-2 hover:bg-slate-100 transition"
      >
        <span className="text-xs font-medium">{langue === "fr" ? "🇫🇷" : "🇬🇧"}</span>
        <span className="ml-1">{langue === "fr" ? "Français" : "English"}</span>
        <span className="ml-1 text-[10px]">▾</span>
      </button>

      {menuOuvert && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white border border-slate-200 shadow-lg z-50">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">{t("langue.titre")}</p>
          </div>
          <button
            onClick={() => {
              handleLangueChange("fr");
              setMenuOuvert(false);
            }}
            className={`w-full px-3 py-2 text-left text-sm rounded-none hover:bg-slate-50 transition ${
              langue === "fr" ? "bg-orange-50 text-orange-700 font-semibold" : "text-slate-600"
            }`}
          >
            🇫🇷 {t("langue.francais")}
          </button>
          <button
            onClick={() => {
              handleLangueChange("en");
              setMenuOuvert(false);
            }}
            className={`w-full px-3 py-2 text-left text-sm rounded-none hover:bg-slate-50 transition ${
              langue === "en" ? "bg-orange-50 text-orange-700 font-semibold" : "text-slate-600"
            }`}
          >
            🇬🇧 {t("langue.anglais")}
          </button>
          <div className="border-t border-slate-100" />
          <button
            onClick={() => {
              setMenuOuvert(false);
              handleLogout();
            }}
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition"
          >
            {t("auth.deconnecter")}
          </button>
        </div>
      )}
    </div>
  );
}