// Création d'une fiche journal robuste au réseau faible (PWA terrain).
//
// Problème résolu : sur un réseau instable, l'insertion Supabase peut soit
// échouer, soit ne jamais répondre. L'utilisateur ne doit ni perdre sa saisie
// (météo, observations) ni rester bloqué devant un bouton sans réaction.
//
// Déroulement de creerJournal() :
//   1. Hors ligne connu → l'opération est mise en file (rejouée à la reconnexion).
//   2. En ligne → insertion avec délai maximal. Si la base répond, c'est terminé.
//   3. Erreur réseau ou délai dépassé → on vérifie si la fiche a été créée
//      malgré tout (réponse perdue). Si oui, on renvoie son id.
//   4. Sinon → mise en file d'attente pour synchronisation automatique.
//
// Ce module n'importe de l'application que la détection d'erreur réseau
// (sans état, sans dépendance navigateur) ; le client Supabase et la fonction
// de mise en file sont injectés (voir creerJournalHorsLigne dans
// src/lib/offline/mutations.ts pour l'usage réel).

import { estErreurReseau } from "../offline/erreurs.ts";

export type ErreurJournal = { message?: string; name?: string; code?: string };

export type EntreeJournal = {
  chantierId: string;
  /** Date du journal, au format AAAA-MM-JJ. */
  date: string;
  meteo?: string | null;
  observations?: string | null;
};

// Client minimal (le vrai client Supabase, ou un faux dans les tests).
// Volontairement peu typé : seul le chaînage from().insert().select().single()
// et from().select()...maybeSingle() est utilisé.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClientJournal = { from: (table: string) => any };

/** Met une opération en file d'attente locale. Retourne false si le stockage est indisponible. */
export type MettreEnFile = (table: string, payload: Record<string, unknown>) => Promise<boolean>;

export type DependancesCreationJournal = {
  client: ClientJournal;
  mettreEnFile: MettreEnFile;
  /** Délai maximal d'attente de la base avant de considérer le réseau comme faible. */
  delaiMs?: number;
  /** Délai maximal d'attente de la vérification « la fiche existe-t-elle déjà ? ». */
  delaiVerificationMs?: number;
  /** Force le mode hors ligne (utile surtout pour les tests). */
  horsLigne?: boolean;
};

export type ResultatCreationJournal =
  | { statut: "cree"; id: string; recupereeApresAttente?: boolean }
  | { statut: "en_attente" }
  | { statut: "erreur"; raison: "base" | "stockage_indisponible"; erreur?: ErreurJournal };

type ReponsePostgrest = { data: { id?: string } | null; error: ErreurJournal | null };

export function estHorsLigne(
  enLigne: boolean | undefined = typeof navigator === "undefined" ? undefined : navigator.onLine,
): boolean {
  return enLigne === false;
}

/** Payload exact inséré dans la table `journaux` (observations incluses !). */
export function payloadJournal(entree: EntreeJournal): Record<string, unknown> {
  const meteo = (entree.meteo ?? "").trim();
  const observations = (entree.observations ?? "").trim();
  return {
    chantier_id: entree.chantierId,
    date_journal: entree.date,
    meteo: meteo || null,
    observations: observations || null,
    statut: "brouillon",
  };
}

async function avecDelai<T>(
  operation: PromiseLike<T>,
  delaiMs: number,
): Promise<{ resultat: T | null; delaiDepasse: boolean }> {
  if (!Number.isFinite(delaiMs) || delaiMs <= 0) {
    return { resultat: await operation, delaiDepasse: false };
  }
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  try {
    const attente = new Promise<{ resultat: null; delaiDepasse: true }>((resolve) => {
      minuteur = setTimeout(() => resolve({ resultat: null, delaiDepasse: true }), delaiMs);
    });
    const reponse = Promise.resolve(operation).then((resultat) => ({
      resultat,
      delaiDepasse: false as const,
    }));
    return await Promise.race([reponse, attente]);
  } finally {
    if (minuteur !== undefined) clearTimeout(minuteur);
  }
}

export async function creerJournal(
  entree: EntreeJournal,
  deps: DependancesCreationJournal,
): Promise<ResultatCreationJournal> {
  const delaiMs = deps.delaiMs ?? 15_000;
  const delaiVerificationMs = deps.delaiVerificationMs ?? 8_000;
  const payload = payloadJournal(entree);

  // 1. Hors ligne connu : mise en file directe, sans tenter l'insertion.
  if (deps.horsLigne ?? estHorsLigne()) {
    const mis = await deps.mettreEnFile("journaux", payload);
    return mis ? { statut: "en_attente" } : { statut: "erreur", raison: "stockage_indisponible" };
  }

  // 2. En ligne : insertion avec délai maximal.
  const essai = await avecDelai<ReponsePostgrest>(
    deps.client.from("journaux").insert(payload).select("id").single() as PromiseLike<ReponsePostgrest>,
    delaiMs,
  );

  if (!essai.delaiDepasse && essai.resultat) {
    const { data, error } = essai.resultat;
    if (!error && data?.id) return { statut: "cree", id: String(data.id) };
    if (error && !estErreurReseau(error)) {
      return { statut: "erreur", raison: "base", erreur: error };
    }
  }

  // 3. Échec réseau ou délai dépassé : la fiche a-t-elle été créée malgré tout ?
  const verification = await avecDelai<ReponsePostgrest>(
    deps.client
      .from("journaux")
      .select("id")
      .eq("chantier_id", entree.chantierId)
      .eq("date_journal", entree.date)
      .limit(1)
      .maybeSingle() as PromiseLike<ReponsePostgrest>,
    delaiVerificationMs,
  );
  if (!verification.delaiDepasse && verification.resultat?.data?.id) {
    return { statut: "cree", id: String(verification.resultat.data.id), recupereeApresAttente: true };
  }

  // 4. Mise en file d'attente pour synchronisation automatique à la reconnexion.
  const mis = await deps.mettreEnFile("journaux", payload);
  return mis ? { statut: "en_attente" } : { statut: "erreur", raison: "stockage_indisponible" };
}
