// Mutations "offline-aware" pour le mode hors connexion.
// Si le navigateur est hors ligne, l'opération est mise en file (IndexedDB)
// et rejouee automatiquement a la reconnexion (voir NetworkStatus.tsx).
// Si le navigateur est en ligne, l'insertion/mise a jour/suppression est directe.

import { createClient } from "@/lib/supabase/client";
import { queueAdd } from "./storage";

export async function offlineInsert(table: string, payload: any) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await queueAdd({ table, operation: "insert", payload });
    return { error: null };
  }
  const supabase = createClient();
  return await supabase.from(table).insert(payload);
}

export async function offlineUpdate(table: string, id: string, payload: any) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await queueAdd({ table, operation: "update", payload: { ...payload, id } });
    return { error: null };
  }
  const supabase = createClient();
  return await supabase.from(table).update(payload).eq("id", id);
}

export async function offlineDelete(table: string, id: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await queueAdd({ table, operation: "delete", payload: { id } });
    return { error: null };
  }
  const supabase = createClient();
  return await supabase.from(table).delete().eq("id", id);
}
