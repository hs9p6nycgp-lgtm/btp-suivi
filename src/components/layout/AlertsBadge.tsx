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
    <span className="relative inline-flex" title={t("topbar.alertes")} aria-label={t("topbar.alertes")}>
      <Bell className="h-5 w-5 text-danger" />
      <span className="absolute -top-1 -right-2.5 rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-white">
        {nombre}
      </span>
    </span>
  );
}
