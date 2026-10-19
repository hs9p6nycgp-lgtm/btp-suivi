// Mutations "offline-aware" pour le mode hors connexion.
// Si le navigateur est hors ligne, l'opération est mise en file (IndexedDB)
// et rejouee automatiquement a la reconnexion (voir NetworkStatus.tsx).
// Si le navigateur est en ligne, l'insertion/mise a jour/suppression est directe.

import { createClient } from "@/lib/supabase/client";
import { creerJournal, type EntreeJournal, type ResultatCreationJournal } from "@/lib/journal/creation";
import { queueAdd } from "./storage";
import { estErreurReseau } from "./erreurs.ts";

export async function offlineInsert(table: string, payload: any) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await queueAdd({ table, operation: "insert", payload });
    return { error: null };
  }
  const supabase = createClient();
  const resultat = await supabase.from(table).insert(payload);
  // Le réseau a lâché pendant l'envoi : on met en file plutôt que de perdre la saisie.
  if (resultat.error && estErreurReseau(resultat.error)) {
    const miseEnFile = await queueAdd({ table, operation: "insert", payload });
    if (miseEnFile) return { error: null };
  }
  return resultat;
}

export async function offlineUpdate(table: string, id: string, payload: any) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await queueAdd({ table, operation: "update", payload: { ...payload, id } });
    return { error: null };
  }
  const supabase = createClient();
  const resultat = await supabase.from(table).update(payload).eq("id", id);
  if (resultat.error && estErreurReseau(resultat.error)) {
    const miseEnFile = await queueAdd({ table, operation: "update", payload: { ...payload, id } });
    if (miseEnFile) return { error: null };
  }
  return resultat;
}

export async function offlineDelete(table: string, id: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await queueAdd({ table, operation: "delete", payload: { id } });
    return { error: null };
  }
  const supabase = createClient();
  const resultat = await supabase.from(table).delete().eq("id", id);
  if (resultat.error && estErreurReseau(resultat.error)) {
    const miseEnFile = await queueAdd({ table, operation: "delete", payload: { id } });
    if (miseEnFile) return { error: null };
  }
  return resultat;
}

// Création d'une fiche journal robuste au réseau faible (blocage n°1 du terrain).
// - En ligne : insertion avec délai maximal, vérification en cas de réponse perdue,
//   puis mise en file si le réseau ne répond pas.
// - Hors ligne : mise en file directe (IndexedDB), rejouée à la reconnexion
//   par NetworkStatus.tsx.
export async function creerJournalHorsLigne(
  entree: EntreeJournal,
): Promise<ResultatCreationJournal> {
  return creerJournal(entree, {
    client: createClient(),
    mettreEnFile: (table, payload) => queueAdd({ table, operation: "insert", payload }),
  });
}
