"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";

// Petites notifications transitaires affichées après une action réussie
// (« Fournisseur supprimé. », « Journal validé. »...).
// Volontairement sans dépendance externe : un simple abonnement en mémoire.
// Les erreurs de formulaire restent affichées dans la page ; les réussites
// passent par une bulle discrète qui s'efface toute seule.

type VarianteToast = "succes" | "erreur";

type ToastInterne = {
  id: number;
  message: string;
  variante: VarianteToast;
};

let abonnes: Array<(t: ToastInterne) => void> = [];
let compteur = 0;

// Affiche une notification discrète, effacée automatiquement.
export function toast(message: string, variante: VarianteToast = "succes") {
  compteur += 1;
  const t: ToastInterne = { id: compteur, message, variante };
  for (const abonne of [...abonnes]) abonne(t);
}

const DUREE_AFFICHAGE_MS = 4200;

export function Toaster() {
  const [toasts, setToasts] = useState<ToastInterne[]>([]);

  useEffect(() => {
    function surToast(t: ToastInterne) {
      setToasts((precedents) => [...precedents, t]);
      window.setTimeout(() => {
        setToasts((precedents) => precedents.filter((x) => x.id !== t.id));
      }, DUREE_AFFICHAGE_MS);
    }
    abonnes.push(surToast);
    return () => {
      abonnes = abonnes.filter((a) => a !== surToast);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="anim-fade-up pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-xl border border-border/70 bg-surface px-4 py-3 text-sm font-medium text-foreground shadow-lg"
        >
          {t.variante === "erreur" ? (
            <TriangleAlert className="h-5 w-5 shrink-0 text-danger" aria-hidden />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
          )}
          <span className="min-w-0">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
