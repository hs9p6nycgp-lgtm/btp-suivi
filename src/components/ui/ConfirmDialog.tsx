"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "./Button";

// Boîte de dialogue de confirmation aux couleurs de l'application.
// Remplace les fenêtres « confirm() » du navigateur : même rôle,
// mais l'interface reste cohérente (thème clair/sombre, mobile, français).

export type DemandeConfirmation = {
  titre: string;
  message?: string;
  confirmerLibelle?: string;
  danger?: boolean;
  action: () => void | Promise<void>;
};

export function ConfirmDialog({
  demande,
  onFermer,
}: {
  demande: DemandeConfirmation | null;
  onFermer: () => void;
}) {
  const [enCours, setEnCours] = React.useState(false);

  // Échap ferme la boîte ; le focus part sur « Annuler » (choix sûr par défaut).
  React.useEffect(() => {
    if (!demande) return;
    setEnCours(false);
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") onFermer();
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [demande, onFermer]);

  if (!demande) return null;

  async function confirmer() {
    if (!demande) return;
    setEnCours(true);
    try {
      await demande.action();
    } finally {
      onFermer();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center"
      role="presentation"
      onClick={onFermer}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={demande.titre}
        className="anim-fade-up w-full max-w-md rounded-2xl border border-border/70 bg-surface p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              demande.danger ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
            }`}
            aria-hidden
          >
            <TriangleAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground">{demande.titre}</p>
            {demande.message && <p className="mt-1 text-sm text-muted">{demande.message}</p>}
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onFermer} disabled={enCours} autoFocus>
            Annuler
          </Button>
          <Button
            variant={demande.danger ? "danger" : "primary"}
            onClick={confirmer}
            isLoading={enCours}
          >
            {demande.confirmerLibelle ?? "Confirmer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
