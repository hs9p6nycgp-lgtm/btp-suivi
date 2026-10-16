// Recherche et filtrage du referentiel de prix (section 4.12, exigence REF-07).
// Logique pure : filtre par categorie, ville (zone) et date de mise a jour.

export type { LigneReferentiel } from "./prix";
import type { LigneReferentiel } from "./prix";

export type FiltreReferentiel = {
  categorie?: string | null;
  zone?: string | null;
  dateMin?: string | null;
  texte?: string | null;
};

/** Filtre une liste de lignes selon les criteres fournis. */
export function filtrerReferentiel(
  lignes: LigneReferentiel[],
  filtre: FiltreReferentiel,
): LigneReferentiel[] {
  return lignes.filter((l) => {
    if (filtre.categorie && l.categorie?.toLowerCase() !== filtre.categorie.toLowerCase()) return false;
    if (filtre.zone && l.zone?.toLowerCase() !== filtre.zone.toLowerCase()) return false;
    if (filtre.dateMin && (!l.date_source || l.date_source < filtre.dateMin)) return false;
    if (filtre.texte) {
      const t = filtre.texte.toLowerCase();
      if (!l.designation.toLowerCase().includes(t) && !(l.code ?? "").toLowerCase().includes(t)) {
        return false;
      }
    }
    return true;
  });
}

/** Trie une liste de lignes selon une colonne et un sens. */
export function trierReferentiel(
  lignes: LigneReferentiel[],
  colonne: keyof LigneReferentiel,
  sens: "asc" | "desc",
): LigneReferentiel[] {
  return [...lignes].sort((a, b) => {
    const va = a[colonne] ?? "";
    const vb = b[colonne] ?? "";
    let cmp = 0;
    if (typeof va === "number" && typeof vb === "number") cmp = va - vb;
    else cmp = String(va).localeCompare(String(vb));
    return sens === "asc" ? cmp : -cmp;
  });
}