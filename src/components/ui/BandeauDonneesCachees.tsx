"use client";

import { WifiOff } from "lucide-react";

/**
 * Bandeau affiché quand l'écran montre une copie locale des données
 * (hors connexion) : l'utilisateur sait qu'il ne voit pas la toute dernière
 * information, et depuis quand.
 */
export function BandeauDonneesCachees({ horodatage }: { horodatage: number | null }) {
  const date = horodatage ? new Date(horodatage) : null;
  const texte = date
    ? `Hors connexion : données enregistrées le ${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}/${date.getFullYear()} à ${String(date.getHours()).padStart(2, "0")}:${String(
        date.getMinutes(),
      ).padStart(2, "0")}.`
    : "Hors connexion : affichage des dernières données enregistrées.";

  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground"
    >
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      <span>{texte}</span>
    </div>
  );
}
