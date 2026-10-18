// Détection des erreurs réseau (par opposition aux erreurs métier de la base).
// Sert à décider si une opération échouée doit être mise en file d'attente
// hors ligne pour être rejouée, ou si c'est une vraie erreur à montrer à l'utilisateur.

export type ErreurAvecMessage =
  | { message?: string; name?: string; code?: string }
  | null
  | undefined;

// Motifs que l'on retrouve dans les messages d'erreur quand le réseau est en cause
// (navigateurs, fetch, supabase-js, Node).
const MOTIFS_RESEAU = [
  "failed to fetch",
  "fetch failed",
  "net::err_",
  "networkerror",
  "network error",
  "network request failed",
  "network connection lost",
  "load failed",
  "econnrefused",
  "econnreset",
  "etimedout",
  "enotfound",
  "eai_again",
  "socket hang up",
  "signal is aborted",
  "the operation was aborted",
  "could not connect",
  "unable to resolve host",
];

export function estErreurReseau(erreur: ErreurAvecMessage): boolean {
  if (!erreur) return false;

  const nom = (erreur.name ?? "").toLowerCase();
  if (nom === "aborterror" || nom === "timeouterror") return true;

  const message = (erreur.message ?? "").toLowerCase();
  if (!message) return false;

  return MOTIFS_RESEAU.some((motif) => message.includes(motif));
}
