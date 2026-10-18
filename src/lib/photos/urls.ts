// URLs d'affichage des photos de journal.
//
// Le bucket de stockage « chantiers-documents » est privé (public = false) :
// il faut donc des URLs signées temporaires pour afficher une image.
// Sans cela, un <img src={chemin}> montre une image cassée (chemin brut).

import { createClient } from "@/lib/supabase/client";

export const BUCKET_PHOTOS = "chantiers-documents";

/** Durée de validité par défaut d'une URL signée : 1 heure. */
export const DUREE_URL_SIGNEE_SECONDES = 3600;

/**
 * Signe une liste de chemins de photos en un seul appel réseau.
 * Retourne une table chemin → URL signée (les chemins en erreur sont absents).
 */
export async function urlsSignees(
  chemins: Array<string | null | undefined>,
  dureeSecondes: number = DUREE_URL_SIGNEE_SECONDES,
): Promise<Map<string, string>> {
  const table = new Map<string, string>();
  const uniques = [...new Set(chemins.filter((c): c is string => typeof c === "string" && c.trim() !== ""))];
  if (uniques.length === 0) return table;

  const supabase = createClient();
  const { data } = await supabase.storage
    .from(BUCKET_PHOTOS)
    .createSignedUrls(uniques, dureeSecondes);

  for (const element of data ?? []) {
    if (element?.path && element?.signedUrl) {
      table.set(element.path, element.signedUrl);
    }
  }
  return table;
}

/** Signe un seul chemin de photo. Retourne null si le chemin est vide ou en erreur. */
export async function urlSignee(
  chemin: string | null | undefined,
  dureeSecondes: number = DUREE_URL_SIGNEE_SECONDES,
): Promise<string | null> {
  if (!chemin) return null;
  const table = await urlsSignees([chemin], dureeSecondes);
  return table.get(chemin) ?? null;
}
