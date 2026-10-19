"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

// Page d'erreur : affichée si une page plante en cours d'utilisation.
// Rassure l'utilisateur (aucune donnée perdue) et propose de réessayer.
export default function ErreurPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Consigne l'erreur dans la console pour le diagnostic (rien n'est envoyé).
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="anim-fade-up w-full max-w-md text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <TriangleAlert className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-foreground">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted">
          Pas d&apos;inquiétude : vos données enregistrées ne sont pas affectées. Réessayez — et
          si le problème persiste, revenez à l&apos;accueil.
        </p>
        {error.digest && (
          <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs text-muted">
            Code technique : {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-action to-action-strong px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-action/30 transition-all duration-200 hover:shadow-xl hover:brightness-[1.04] active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary/60 px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
