import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-center">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <WifiOff className="h-8 w-8 text-white" />
          </span>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">Hors connexion</h1>
          <p className="mt-2 text-sm text-muted">
            Vous etes actuellement hors ligne. Les donnees deja consultees restent
            disponibles dès que la connexion revient. Reessayez plus tard.
          </p>
        </div>
      </div>
    </main>
  );
}
