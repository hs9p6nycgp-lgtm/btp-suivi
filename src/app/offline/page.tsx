import { RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-center">
      <div className="anim-fade-up w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/logo.svg"
            alt=""
            className="mb-4 h-14 w-14 rounded-2xl shadow-lg shadow-primary/25"
          />
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            BTP Suivi Pro
          </p>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Hors connexion</h1>
          <p className="mt-2 text-sm text-muted">
            Vous êtes actuellement hors ligne. Les données déjà consultées restent
            disponibles dès que la connexion revient.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border-2 border-primary/60 px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </a>
        </div>
      </div>
    </main>
  );
}
