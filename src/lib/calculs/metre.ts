// Formules metier de la section 5 du cahier des charges.
// A verifier contre la fiche de recette (T-01, T-02, ...).

export function volumeCouche(longueur: number, largeur: number, epaisseur: number): number {
  return longueur * largeur * epaisseur;
}

export function volumeFoisonne(volumeEnPlace: number, coefficientFoisonnement: number): number {
  return volumeEnPlace * coefficientFoisonnement;
}

export function nombreBennes(volumeFoisonne: number, capaciteBenne: number): number {
  if (capaciteBenne <= 0) throw new Error("La capacite d'une benne doit etre > 0.");
  return Math.ceil(volumeFoisonne / capaciteBenne);
}

export function volumeBeton(elements: Array<{ longueur: number; largeur: number; hauteur: number }>): number {
  return elements.reduce((total, el) => total + el.longueur * el.largeur * el.hauteur, 0);
}

export function ratioAcier(masseAcier: number, volumeBeton: number): number {
  if (volumeBeton <= 0) throw new Error("Le volume de beton doit etre > 0.");
  return masseAcier / volumeBeton;
}

export function surfaceRectangle(longueur: number, largeur: number): number {
  return longueur * largeur;
}

export function avancementPoste(qteRealisee: number, qteMarche: number): number {
  if (qteMarche <= 0) return 0;
  return (qteRealisee / qteMarche) * 100;
}

export function arrondir2Decimales(valeur: number): number {
  return Math.round(valeur * 100) / 100;
}

// ---------------------------------------------------------------------------
// Fonctions complémentaires de la section 5 du cahier des charges.
// Chaque fonction reprend la formule exactement telle qu'elle figure dans la
// section 5, avec des entrées explicites et le calcul annoncé.
// ---------------------------------------------------------------------------

/** Indicateur 5.1 - Écart de quantité (%). Formule : (Qréelle − Qprévue) / Qprévue × 100. */
export function ecartQuantite(qteRealisee: number, qtePrevue: number): number {
  if (qtePrevue <= 0) return 0;
  return ((qteRealisee - qtePrevue) / qtePrevue) * 100;
}

/** Indicateur 5.2 - Avancement physique global (%). Formule : Σ (avancement × montant) / montant total. */
export function avancementPhysiqueGlobal(
  avancements: Array<{ avancementPct: number; montant: number }>,
  montantTotal: number,
): number {
  if (montantTotal <= 0) return 0;
  const somme = avancements.reduce(
    (total, poste) => total + poste.avancementPct * poste.montant,
    0,
  );
  return somme / montantTotal;
}

/** Indicateur 5.3 - Avancement financier (%). Formule : Montant réalisé / montant du marché × 100. */
export function avancementFinancier(montantRealise: number, montantMarche: number): number {
  if (montantMarche <= 0) return 0;
  return (montantRealise / montantMarche) * 100;
}

/** Indicateur 5.4 - Écart de délai (jours). Formule : fin prévue - fin contractuelle. */
export function joursEcartDelai(
  dateFinPrevue: string | null,
  dateFinContractuelle: string | null,
): number {
  if (!dateFinPrevue || !dateFinContractuelle) return 0;
  const prevue = new Date(`${dateFinPrevue}T00:00:00`).getTime();
  const contractuelle = new Date(`${dateFinContractuelle}T00:00:00`).getTime();
  if (Number.isNaN(prevue) || Number.isNaN(contractuelle)) return 0;
  return Math.round((prevue - contractuelle) / 86400000);
}

/** Indicateur 5.5 - Écart budgétaire (FCFA). Formule : coût réel - coût prévu à date. */
export function ecartBudgetaire(coutReel: number, coutPrevu: number): number {
  return coutReel - coutPrevu;
}

/** Indicateur 5.6 - Rendement d'un engin (m³/h ou ml/h). Formule : quantité produite / heures de marche. */
export function rendementEngin(quantiteProduite: number, heuresMarche: number): number {
  if (heuresMarche <= 0) {
    throw new Error("Les heures de marche doivent être supérieures à 0.");
  }
  return quantiteProduite / heuresMarche;
}

/** Indicateur 5.7 - Taux de disponibilité de l'engin (%). Formule : heures de marche / heures prévues × 100. */
export function tauxDisponiteEngin(heuresMarchees: number, heuresPrevues: number): number {
  if (heuresPrevues <= 0) return 0;
  return (heuresMarchees / heuresPrevues) * 100;
}

/** Indicateur 5.8 - Taux de conformité qualité (%). Formule : contrôles conformes / contrôles realises × 100. */
export function tauxConformite(conformes: number, realises: number): number {
  if (realises <= 0) return 0;
  return (conformes / realises) * 100;
}

/** Indicateur 5.9 - Marge totale d'une tâche (PERT) (jours). Formule : fin au plus tard - fin au plus tôt. */
export function margeTotaleTache(
  dateFinAuPlusTard: string | null,
  dateFinAuPlusTot: string | null,
): number {
  if (!dateFinAuPlusTard || !dateFinAuPlusTot) return 0;
  const auPlusTard = new Date(`${dateFinAuPlusTard}T00:00:00`).getTime();
  const auPlusTot = new Date(`${dateFinAuPlusTot}T00:00:00`).getTime();
  if (Number.isNaN(auPlusTard) || Number.isNaN(auPlusTot)) return 0;
  return Math.round((auPlusTard - auPlusTot) / 86400000);
}

/** Indicateur 5.10 - Indice de performance coût. Formule : valeur acquise / coût réel. */
export function indicePerformanceCoût(valeurAcquise: number, coutReel: number): number {
  if (coutReel <= 0) return 0;
  return valeurAcquise / coutReel;
}

/** Indicateur 5.11 - Indice de performance du délai. Formule : valeur acquise / valeur planifiée. */
export function indicePerformanceDelai(valeurAcquise: number, valeurPlanifiee: number): number {
  if (valeurPlanifiee <= 0) return 0;
  return valeurAcquise / valeurPlanifiee;
}

// ---------------------------------------------------------------------------
// Ameliorations (priorite S) - Valeur acquise (COU-04).
// ---------------------------------------------------------------------------

export type ValeurAcquise = {
  budgetPrevu: number;      // BAC - Budget à l'achèvement (valeur planifiée)
  valeurAcquise: number;    // EV - Valeur acquise (travail réellement effectué)
  coutReel: number;         // AC - Coût réel engagé
  ecartCout: number;        // CV = EV - AC
  ecartDelai: number;       // SV = EV - PV
  indicePerformanceCout: number;   // CPI = EV / AC
  indicePerformanceDelai: number;  // SPI = EV / PV
};

/** Calcule l'ensemble des indicateurs de la valeur acquise (méthode COU-04). */
export function calculValeurAcquise(
  budgetPrevu: number,
  valeurPlanifiee: number,
  valeurAcquise: number,
  coutReel: number,
): ValeurAcquise {
  const ecartCout = valeurAcquise - coutReel;
  const ecartDelai = valeurAcquise - valeurPlanifiee;
  // Indices 5.10 et 5.11 : on appelle les formules de reference de la section 5.
  const indiceCout = indicePerformanceCoût(valeurAcquise, coutReel);
  const indiceDelai = indicePerformanceDelai(valeurAcquise, valeurPlanifiee);
  return {
    budgetPrevu,
    valeurAcquise,
    coutReel,
    ecartCout,
    ecartDelai,
    indicePerformanceCout: indiceCout,
    indicePerformanceDelai: indiceDelai,
  };
}

// ---------------------------------------------------------------------------
// Ameliorations (priorite S) - Avenants (MET-06).
// ---------------------------------------------------------------------------

export type Avenant = {
  id: string;
  posteDqeId: string;
  ancienneQuantite: number;
  nouvelleQuantite: number;
  ancienPrixUnitaire: number;
  nouveauPrixUnitaire: number;
  motif: string;
  dateValidation: string;
};

/** Calcule l'impact d'un avenant sur le montant d'un poste DQE. */
export function impactAvenant(
  ancienneQuantite: number,
  nouvelleQuantite: number,
  ancienPrixUnitaire: number,
  nouveauPrixUnitaire: number,
): { ancienMontant: number; nouveauMontant: number; ecart: number } {
  const ancienMontant = ancienneQuantite * ancienPrixUnitaire;
  const nouveauMontant = nouvelleQuantite * nouveauPrixUnitaire;
  return { ancienMontant, nouveauMontant, ecart: nouveauMontant - ancienMontant };
}

// ---------------------------------------------------------------------------
// Ameliorations (priorite S) - fonctions complementaires.
// ---------------------------------------------------------------------------

/** MET-05 (S) : nombre de rotations d'un engin pour evacuer un volume foisonne. */
export function nombreRotations(volumeFoisonne: number, capaciteBenne: number): number {
  if (capaciteBenne <= 0) throw new Error("La capacite d'une benne doit etre > 0.");
  return Math.ceil(volumeFoisonne / capaciteBenne);
}

/** PLA-05 (S) : serie cumulative d'une liste de valeurs (courbe en S). */
export function serieCumulative(valeurs: number[]): number[] {
  const resultat: number[] = [];
  let cumul = 0;
  for (const v of valeurs) {
    cumul += v;
    resultat.push(cumul);
  }
  return resultat;
}

/** PLA-05 (S) : part realisee d'une tache (entre 0 et 1) au jour d, progression lineaire de debut a fin. */
export function partRealisee(debutJour: number, finJour: number, jour: number): number {
  if (jour < debutJour) return 0;
  if (jour >= finJour) return 1;
  return (jour - debutJour) / Math.max(finJour - debutJour, 1);
}

/** COU-05 (S) : projection du cout final (EAC = AC + (BAC - EV)). */
export function projectionCoutFinal(budgetTotal: number, valeurAcquise: number, coutActuel: number): number {
  return coutActuel + (budgetTotal - valeurAcquise);
}

/** APP-03 (S) : stock theorique d'un materiau (entrees - sorties). */
export function stockTheorique(entrees: number, sorties: number): number {
  return entrees - sorties;
}
