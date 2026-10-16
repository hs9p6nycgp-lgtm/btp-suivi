// Propagation d'une mise a jour de prix (section 4.12, exigence REF-06).
// Logique pure : identifie les lignes de DQE/BPU touchees par un changement de prix.

export type LigneTarifee = {
  id: string;
  code: string | null;
  designation: string;
  prix_unitaire: number;
};

/** Renvoie les lignes dont le prix doit etre verifie apres une mise a jour. */
export function lignesConcerneesParMiseAJour(
  codePrix: string | null,
  designationPrix: string,
  lignes: LigneTarifee[],
): LigneTarifee[] {
  const codeNorm = (codePrix ?? "").trim().toLowerCase();
  const desigNorm = designationPrix.trim().toLowerCase();
  return lignes.filter((l) => {
    const lc = (l.code ?? "").trim().toLowerCase();
    const ld = l.designation.trim().toLowerCase();
    if (codeNorm && lc && lc === codeNorm) return true;
    return ld === desigNorm;
  });
}

/** Calcule le nouveau montant d'une ligne apres changement de prix unitaire. */
export function nouveauMontantLigne(
  quantite: number,
  nouveauPrixUnitaire: number,
): number {
  return quantite * nouveauPrixUnitaire;
}