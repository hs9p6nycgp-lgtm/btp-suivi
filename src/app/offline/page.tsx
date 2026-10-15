export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-3 text-2xl font-semibold text-primary">Hors connexion</h1>
      <p className="text-slate-600">
        Vous etes actuellement hors ligne. Les donnees deja consultees restent
        disponibles des que la connexion revient. Reessayez plus tard.
      </p>
    </main>
  );
}