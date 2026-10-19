// Regles de validation des prix (exigence REF-04 et section 16 du cahier
// des charges). Chaque prix doit porter une source et une date.
//
// Ce module est volontairement sans dependance (ni Excel, ni base de donnees)
// pour etre utilise par tous les chemins d'import : import du Base de prix
// (Excel) comme import du referentiel depuis l'interface.

/** Champs d'une ligne de prix necessaires a la validation REF-04. */
export type LignePrixAValider = {
  source: string | null;
  date_source: string | null;
};

/**
 * Exigence REF-04 - Chaque prix doit porter une source et une date.
 * Renvoie null lorsque la ligne est valide, sinon le message du premier
 * probleme rencontre.
 */
export function validerBasePrix(row: LignePrixAValider): string | null {
  if (!row.source) {
    return "la ligne est sans source";
  }
  if (!row.date_source) {
    return "la ligne est sans date de source";
  }
  return null;
}
