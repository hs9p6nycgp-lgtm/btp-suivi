"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";

// Nombre de non-conformités encore ouvertes (lecture seule, pour la pastille)
export default function AlertsBadge() {
  const [nombre, setNombre] = useState(0);

  useEffect(() => {
    let actif = true;
    async function charger() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("non_conformites")
          .select("id, statut");
        if (!actif) return;
        const ouvertes = (data ?? []).filter((ligne) => ligne.statut !== "cloturee").length;
        setNombre(ouvertes);
      } catch {
        if (actif) setNombre(0);
      }
    }
    charger();
    return () => {
      actif = false;
    };
  }, []);

  if (nombre === 0) return null;

  return (
    <span
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-600/20 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
      title={t("topbar.alertes")}
      aria-label={t("topbar.alertes")}
    >
      <Bell className="h-5 w-5" />
      <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-br from-rose-500 to-rose-600 px-1 text-[10px] font-bold text-white shadow-md shadow-rose-500/40">
        {nombre}
      </span>
    </span>
  );
}
