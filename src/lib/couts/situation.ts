// Situations de paiement (decomptes) : ce que l'entreprise demande a
//etre paye pour les travaux realises.
//
// Regles (usage courant des chantiers) :
//   - le montant brut d'une situation est la valorisation cumulee des travaux
//     realises (quantites saisies x prix du DQE), diminuee des decomptes
//     anterieurs ;
//   - la retenue de garantie (souvent 5 a 10 %) est mise de cote sur le
//     montant brut et versee a la reception ;
//   - les acomptes deja verses sur la periode sont deduits du net a payer ;
//   - le reste du marche est ce qui reste a faire, en valeur.
//
// Module pur : les calculs sont testables sans base de donnees.

export type StatutSituation = "brouillon" | "soumise" | "acceptee" | "paye" | "rejetee";

export const LIBELLES_STATUT: Record<StatutSituation, { fr: string; en: string }> = {
  brouillon: { fr: "Brouillon", en: "Draft" },
  soumise: { fr: "Soumise", en: "Submitted" },
  acceptee: { fr: "Acceptée", en: "Accepted" },
  paye: { fr: "Payée", en: "Paid" },
  rejetee: { fr: "Rejetée", en: "Rejected" },
};

/** Une situation enregistree. */
export type Situation = {
  id: string;
  chantier_id: string;
  numero: string;
  periode_debut: string;
  periode_fin: string;
  /** Valorisation cumulee avant la periode. */
  cumul_avant: number;
  /** Valorisation de la periode. */
  cumul_periode: number;
  /** Total deja decompte (situations anterieures, cumul brut). */
  decompte_anterieur: number;
  /** Acomptes deja verses sur la periode. */
  acomptes: number;
  /** Taux de retenue de garantie (%). */
  taux_retenue: number;
  /** Montant brut decompte par cette situation. */
  montant_brut: number;
  statut: StatutSituation;
  observations: string | null;
};

/** Une ligne du DQE valorisee. */
export type LigneValorisationSituation = {
  posteDqeId: string;
  code: string | null;
  designation: string;
  unite: string;
  quantiteMarche: number;
  quantiteRealisee: number;
  prixUnitaire: number;
};

/** Une quantite realisee, avec sa date. */
export type QuantiteRealiseeSituation = {
  posteDqeId: string;
  quantite: number;
  date: string;
};

export type ResultatValorisation = {
  /** Montant cumule des travaux realises. */
  montant: number;
  /** Detail poste par poste. */
  lignes: Array<
    LigneValorisationSituation & {
      quantiteCumulee: number;
      montantCumule: number;
      montantMarche: number;
      avancementPct: number;
    }
  >;
};

/**
 * Valorisation cumulee des travaux realises jusqu'a une date (inclus).
 */
export function valorisationCumulee(
  postes: LigneValorisationSituation[],
  quantites: QuantiteRealiseeSituation[],
  dateLimite: string | null,
): ResultatValorisation {
  const cumulParPoste = new Map<string, number>();
  for (const q of quantites) {
    if (dateLimite && q.date > dateLimite) continue;
    cumulParPoste.set(q.posteDqeId, (cumulParPoste.get(q.posteDqeId) ?? 0) + Number(q.quantite || 0));
  }
  const lignes = postes.map((poste) => {
    const quantiteCumulee = cumulParPoste.get(poste.posteDqeId) ?? 0;
    const montantMarche = Number(poste.quantiteMarche || 0) * Number(poste.prixUnitaire || 0);
    const montantCumule = quantiteCumulee * Number(poste.prixUnitaire || 0);
    return {
      ...poste,
      quantiteCumulee,
      montantCumule,
      montantMarche,
      avancementPct:
        Number(poste.quantiteMarche || 0) > 0
          ? (quantiteCumulee / Number(poste.quantiteMarche)) * 100
          : 0,
    };
  });
  return { montant: lignes.reduce((t, l) => t + l.montantCumule, 0), lignes };
}

export type CalculSituation = {
  /** Cumul total des travaux realises (avant + periode). */
  cumulTotal: number;
  /** Montant brut decompte par cette situation. */
  montantBrut: number;
  /** Retenue de garantie mise de cote. */
  retenue: number;
  /** Net a payer apres retenue et acomptes. */
  netAPayer: number;
  /** Reste du marche (valeur des travaux non encore realises). */
  resteDuMarche: number;
  /** Avancement du marche en %. */
  progressionPct: number;
};

/**
 * Calcul d'une situation : cumul, montant brut, retenue de garantie, acomptes
 * et net a payer.
 */
export function calculerSituation(params: {
  cumulAvant: number;
  cumulPeriode: number;
  decompteAnterieur: number;
  acomptes: number;
  tauxRetenue: number;
  montantMarche: number;
}): CalculSituation {
  const cumulTotal = (Number(params.cumulAvant) || 0) + (Number(params.cumulPeriode) || 0);
  const montantBrut = Math.max(0, cumulTotal - (Number(params.decompteAnterieur) || 0));
  const retenue = Math.round((montantBrut * (Number(params.tauxRetenue) || 0)) / 100);
  const netAPayer = Math.max(0, montantBrut - retenue - (Number(params.acomptes) || 0));
  const resteDuMarche = Math.max(0, (Number(params.montantMarche) || 0) - cumulTotal);
  const progressionPct =
    Number(params.montantMarche) > 0 ? (cumulTotal / Number(params.montantMarche)) * 100 : 0;
  return { cumulTotal, montantBrut, retenue, netAPayer, resteDuMarche, progressionPct };
}

/** Numero suivant d'une situation : « SIT-001 », « SIT-002 »… */
export function prochainNumero(situations: Pick<Situation, "numero">[]): string {
  let max = 0;
  for (const s of situations) {
    const m = /(\d+)\s*$/.exec(s.numero ?? "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `SIT-${String(max + 1).padStart(3, "0")}`;
}

export type AlerteSituation = { niveau: "info" | "attention" | "bloquant"; message: string };

/**
 * Points de vigilance d'une situation : periode incoherente, retenue
 * excessive, cumul qui depasse le marche, chevauchement avec une autre
 * situation.
 */
export function alertesSituation(
  situation: Pick<
    Situation,
    "numero" | "periode_debut" | "periode_fin" | "cumul_periode" | "taux_retenue" | "statut"
  >,
  autres: Array<Pick<Situation, "numero" | "periode_debut" | "periode_fin">>,
  montantMarche: number,
  cumulTotal: number,
): AlerteSituation[] {
  const alertes: AlerteSituation[] = [];
  if (situation.periode_debut > situation.periode_fin) {
    alertes.push({ niveau: "bloquant", message: "La date de début est après la date de fin." });
  }
  if (Number(situation.cumul_periode) <= 0) {
    alertes.push({
      niveau: "attention",
      message: "Aucun travail valorisé sur la période : vérifiez les quantités saisies.",
    });
  }
  if (Number(situation.taux_retenue) > 10) {
    alertes.push({
      niveau: "attention",
      message: `Retenue de garantie de ${situation.taux_retenue} % : c'est au-delà de l'usage courant (5 à 10 %).`,
    });
  }
  if (montantMarche > 0 && cumulTotal > montantMarche) {
    alertes.push({
      niveau: "attention",
      message: "Le cumul valorisé dépasse le montant du marché.",
    });
  }
  for (const autre of autres) {
    if (autre.numero === situation.numero) continue;
    const chevauche =
      situation.periode_debut <= autre.periode_fin && autre.periode_debut <= situation.periode_fin;
    if (chevauche) {
      alertes.push({
        niveau: "attention",
        message: `La période chevauche la situation ${autre.numero}.`,
      });
    }
  }
  if (situation.statut === "paye" && alertes.length === 0) {
    alertes.push({ niveau: "info", message: "Situation payée." });
  }
  return alertes;
}

/** Une situation est-elle modifiable ? (seules les situations en brouillon) */
export function situationModifiable(situation: Pick<Situation, "statut">): boolean {
  return situation.statut === "brouillon" || situation.statut === "soumise";
}

/** Total des decomptes anterieurs (montants bruts cumules). */
export function totalDecompteAnterieur(
  situations: Pick<Situation, "statut" | "montant_brut">[],
): number {
  return situations
    .filter((s) => s.statut === "acceptee" || s.statut === "paye" || s.statut === "soumise")
    .reduce((t, s) => t + (Number(s.montant_brut) || 0), 0);
}
