// Conformité des essais de contrôle (exigence QUA-02).
// Formule : valeur mesurée comprise entre valeur exigée - tolérance négative
// et valeur exigée + tolérance positive.

/**
 * Conforme lorsque la valeur mesurée est dans la fourchette de tolérance.
 * Une tolérance nulle signifie que la valeur doit être exactement égale.
 */
export function estConforme(
  valeurMesurée: number,
  valeurExigée: number,
  tolerancePositives: number,
  toleranceNégatives: number,
): boolean {
  const borneInférieure = valeurExigée - toleranceNégatives;
  const borneSupérieure = valeurExigée + tolerancePositives;
  return valeurMesurée >= borneInférieure && valeurMesurée <= borneSupérieure;
}
