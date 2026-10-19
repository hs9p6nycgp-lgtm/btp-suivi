"use client";

import { useEffect, useState } from "react";
import { Contrast } from "lucide-react";
import { t } from "@/lib/i18n";

// Mode terrain : lisibilité en plein soleil.
//
// Sur un chantier, l'écran est souvent en pleine lumière : les textes restent
// difficiles à lire. Ce mode agrandit la taille des caractères (l'application
// est construite en « rem ») et renforce les contrastes. Le réglage est
// mémorisé sur l'appareil et s'applique à toutes les pages.

const CLE = "btp-suivi-mode-terrain";

export function ModeTerrainToggle() {
  const [actif, setActif] = useState(false);

  useEffect(() => {
    const stocke = localStorage.getItem(CLE) === "1";
    setActif(stocke);
    document.documentElement.classList.toggle("mode-terrain", stocke);
  }, []);

  function basculer() {
    const nouveau = !actif;
    setActif(nouveau);
    try {
      localStorage.setItem(CLE, nouveau ? "1" : "0");
    } catch {
      // Stockage indisponible : le mode reste actif pour cette session.
    }
    document.documentElement.classList.toggle("mode-terrain", nouveau);
  }

  return (
    <button
      type="button"
      onClick={basculer}
      aria-pressed={actif}
      aria-label={t("topbar.modeTerrain")}
      title={t("topbar.modeTerrain")}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition ${
        actif
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border/80 bg-surface text-muted hover:border-primary-light/50 hover:text-foreground"
      }`}
    >
      <Contrast className="h-5 w-5" />
    </button>
  );
}
