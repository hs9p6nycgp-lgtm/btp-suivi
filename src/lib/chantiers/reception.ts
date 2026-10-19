// Rapport de reception (cahier des charges, §6.3 : « Rapport de reception
// — fin de chantier — bilan quantites et couts, controles, levee des
// reserves »).
//
// Logique pure : bilans et points bloquants, testables.

export type PosteReception = {
  id: string;
  code?: string | null;
  designation: string;
  unite: string;
  quantite_marche: number;
  prix_unitaire: number;
};

export type LigneBilan = {
  posteId: string;
  code: string | null;
  designation: string;
  unite: string;
  quantiteMarche: number;
  quantiteRealisee: number;
  avancementPct: number;
  ecartQuantitePct: number;
  montantMarche: number;
  montantRealise: number;
};

export type BilanQuantites = {
  lignes: LigneBilan[];
  montantMarche: number;
  montantRealise: number;
  avancementGlobalPct: number;
  postesNonSoldes: number;
};

export type BilanFinancier = {
  montantMarche: number;
  valorisationTravaux: number;
  depensesReelles: number;
  marge: number;
  tauxConsommationPct: number;
};

export type BilanQualite = {
  nbEssais: number;
  nbConformes: number;
  tauxConformitePct: number;
  nbNonConformites: number;
  ncOuvertes: number;
  ncCloturees: number;
  reserves: { id: string; description: string; gravite: string; action: string | null; echeance: string | null }[];
};

function nombre(valeur: number | string | null | undefined): number {
  if (valeur === null || valeur === undefined || valeur === "") return 0;
  const n = Number(valeur);
  return Number.isFinite(n) ? n : 0;
}

/** Bilan quantites et couts poste par poste (formules 5.1 et 5.2). */
export function bilanQuantites(
  postes: PosteReception[],
  quantites: { poste_dqe_id: string; quantite: number }[],
): BilanQuantites {
  const realiseParPoste = new Map<string, number>();
  for (const q of quantites ?? []) {
    realiseParPoste.set(
      q.poste_dqe_id,
      (realiseParPoste.get(q.poste_dqe_id) ?? 0) + nombre(q.quantite),
    );
  }

  const lignes: LigneBilan[] = (postes ?? []).map((poste) => {
    const quantiteMarche = nombre(poste.quantite_marche);
    const quantiteRealisee = realiseParPoste.get(poste.id) ?? 0;
    const prix = nombre(poste.prix_unitaire);
    const avancementPct = quantiteMarche > 0 ? (quantiteRealisee / quantiteMarche) * 100 : 0;
    const ecartQuantitePct =
      quantiteMarche > 0 ? ((quantiteRealisee - quantiteMarche) / quantiteMarche) * 100 : 0;
    return {
      posteId: poste.id,
      code: poste.code ?? null,
      designation: poste.designation,
      unite: poste.unite,
      quantiteMarche,
      quantiteRealisee,
      avancementPct,
      ecartQuantitePct,
      montantMarche: quantiteMarche * prix,
      montantRealise: quantiteRealisee * prix,
    };
  });

  const montantMarche = lignes.reduce((s, l) => s + l.montantMarche, 0);
  const montantRealise = lignes.reduce((s, l) => s + l.montantRealise, 0);
  const avancementGlobalPct =
    montantMarche > 0 ? (montantRealise / montantMarche) * 100 : 0;

  return {
    lignes,
    montantMarche: Math.round(montantMarche),
    montantRealise: Math.round(montantRealise),
    avancementGlobalPct: Math.round(avancementGlobalPct * 10) / 10,
    postesNonSoldes: lignes.filter((l) => l.quantiteMarche > 0 && l.quantiteRealisee < l.quantiteMarche).length,
  };
}

/** Bilan financier : valorisation des travaux, depenses reelles et marge. */
export function bilanFinancier(entrees: {
  montantMarche: number;
  valorisationTravaux: number;
  depensesReelles: number;
}): BilanFinancier {
  const montantMarche = nombre(entrees.montantMarche);
  const valorisationTravaux = Math.round(nombre(entrees.valorisationTravaux));
  const depensesReelles = Math.round(nombre(entrees.depensesReelles));
  return {
    montantMarche: Math.round(montantMarche),
    valorisationTravaux,
    depensesReelles,
    marge: valorisationTravaux - depensesReelles,
    tauxConsommationPct:
      montantMarche > 0 ? Math.round((depensesReelles / montantMarche) * 1000) / 10 : 0,
  };
}

export type EssaiReception = { conforme: boolean };
export type NonConformiteReception = {
  id: string;
  description: string;
  gravite: string;
  statut: string;
  action_corrective?: string | null;
  echeance?: string | null;
};

/** Bilan qualite : taux de conformite et reserves restant a lever. */
export function bilanQualite(
  essais: EssaiReception[],
  nonConformites: NonConformiteReception[],
): BilanQualite {
  const listeEssais = essais ?? [];
  const nbConformes = listeEssais.filter((e) => e.conforme).length;
  const listeNc = nonConformites ?? [];
  const reserves = listeNc
    .filter((nc) => nc.statut !== "cloturee" && nc.statut !== "rejetee")
    .map((nc) => ({
      id: nc.id,
      description: nc.description,
      gravite: nc.gravite,
      action: nc.action_corrective ?? null,
      echeance: nc.echeance ?? null,
    }));
  return {
    nbEssais: listeEssais.length,
    nbConformes,
    tauxConformitePct:
      listeEssais.length > 0 ? Math.round((nbConformes / listeEssais.length) * 1000) / 10 : 100,
    nbNonConformites: listeNc.length,
    ncOuvertes: reserves.length,
    ncCloturees: listeNc.length - reserves.length,
    reserves,
  };
}

export type PointsBloquants = {
  bloquants: string[];
  reserves: string[];
  receptable: boolean;
};

/**
 * Points bloquant la reception : reserves non levees, postes du DQE non
 * soldes et accidents avec arret (RG-05 pour les non-conformites).
 */
export function pointsBloquantsReception(entrees: {
  bilanQuantites: BilanQuantites;
  bilanQualite: BilanQualite;
  accidentsAvecArret?: number;
}): PointsBloquants {
  const bloquants: string[] = [];
  const reserves: string[] = [];

  for (const reserve of entrees.bilanQualite.reserves) {
    reserves.push(
      `Réserve non levée : ${reserve.description}${reserve.action ? ` — action : ${reserve.action}` : ""}`,
    );
  }
  if (entrees.bilanQualite.reserves.length > 0) {
    bloquants.push(
      `${entrees.bilanQualite.reserves.length} non-conformité(s) non clôturée(s)`,
    );
  }
  if (entrees.bilanQuantites.postesNonSoldes > 0) {
    bloquants.push(
      `${entrees.bilanQuantites.postesNonSoldes} poste(s) du DQE non soldé(s)`,
    );
  }
  if ((entrees.accidentsAvecArret ?? 0) > 0) {
    bloquants.push(
      `${entrees.accidentsAvecArret} accident(s) avec arrêt de travail à solder`,
    );
  }

  return { bloquants, reserves, receptable: bloquants.length === 0 };
}
