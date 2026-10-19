import Link from "next/link";
import { Compass, Home } from "lucide-react";

// Page 404 : affichée lorsqu'une adresse ne correspond à aucune page.
// L'application garde sa coquille (menu, barre du haut) autour de ce message.
export default function PageIntrouvable() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="anim-fade-up w-full max-w-md text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Compass className="h-8 w-8" />
        </span>
        <p className="mt-5 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-muted">
          Erreur 404
        </p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Page introuvable</h1>
        <p className="mt-2 text-sm text-muted">
          La page demandée n&apos;existe pas ou a été déplacée. Vérifiez l&apos;adresse, ou
          revenez d&apos;où vous venez.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-action to-action-strong px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-action/30 transition-all duration-200 hover:shadow-xl hover:brightness-[1.04] active:scale-[0.98]"
          >
            <Home className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/chantiers"
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-primary/60 px-4 py-2 text-sm font-semibold text-primary transition-all duration-200 hover:border-primary hover:bg-primary/5 active:scale-[0.98]"
          >
            Voir mes chantiers
          </Link>
        </div>
      </div>
    </div>
  );
}
