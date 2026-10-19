"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Détecte qu'une nouvelle version de l'application a été déployée pendant que
// l'onglet ou l'application restait ouverte, et propose de recharger.
// Sans cela, un poste laissé ouvert gardait l'ancienne interface pendant des jours.
// La version est comparée via /api/version (aucune donnée personnelle).

const INTERVALLE_VERIFICATION_MS = 10 * 60 * 1000;

export default function MiseAJourAppli() {
  const [disponible, setDisponible] = useState(false);
  const [ignoree, setIgnoree] = useState(false);

  useEffect(() => {
    let versionInitiale: string | null = null;
    let arreter = false;

    async function verifier() {
      if (document.visibilityState !== "visible") return;
      try {
        const reponse = await fetch("/api/version", { cache: "no-store" });
        if (!reponse.ok) return;
        const donnees = (await reponse.json()) as { version?: string };
        const version = donnees.version ?? "";
        if (!version) return;
        if (versionInitiale === null) {
          versionInitiale = version;
          return;
        }
        if (!arreter && version !== versionInitiale) setDisponible(true);
      } catch {
        // Réseau indisponible : on réessaiera au prochain passage.
      }
    }

    verifier();
    const minuteur = window.setInterval(verifier, INTERVALLE_VERIFICATION_MS);
    window.addEventListener("online", verifier);
    document.addEventListener("visibilitychange", verifier);
    return () => {
      arreter = true;
      window.clearInterval(minuteur);
      window.removeEventListener("online", verifier);
      document.removeEventListener("visibilitychange", verifier);
    };
  }, []);

  if (!disponible || ignoree) return null;

  return (
    <div
      role="status"
      className="anim-fade-up fixed bottom-20 left-4 z-[60] w-[calc(100%-2rem)] max-w-xs rounded-2xl border border-border/70 bg-surface p-4 shadow-xl md:bottom-4"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-action" aria-hidden />
        Nouvelle version disponible
      </p>
      <p className="mt-1 text-xs text-muted">
        Rechargez la page pour profiter des dernières améliorations.
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => window.location.reload()}>
          Recharger
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setIgnoree(true)}>
          Plus tard
        </Button>
      </div>
    </div>
  );
}
