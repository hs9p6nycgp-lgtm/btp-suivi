// Tableau de bord multi-chantiers pour la direction (cahier des charges,
// §6.2) : carte geographique avec code couleur, classement par ecart de
// cout et de delai, chiffre d'affaires realise et reste a realiser, et
// utilisation des engins entre chantiers.
//
// Logique pure, testable.

export type ChantierDirection = {
  id: string;
  nom: string;
  type: string;
  statut: string | null;
  latitude: number | null;
  longitude: number | null;
  montantMarche: number;
  dateFinPrevue: string | null;
  avancementPct: number;
  valorisationTravaux: number;
  depensesReelles: number;
  alertesOuvertes: number;
  nonConformitesOuvertes: number;
  ecartDelaiJours: number | null;
};

export type EtatChantier = "vert" | "orange" | "rouge";

export type LigneDirection = ChantierDirection & {
  etat: EtatChantier;
  ecartBudgetaire: number;
  resteARealiser: number;
};

/** Code couleur : rouge si le chantier est en retard ou bloque, orange si
 *  l'ecart est important, vert sinon. */
export function etatChantier(entrees: {
  ecartDelaiJours: number | null;
  alertesOuvertes: number;
  nonConformitesOuvertes: number;
  ecartBudgetairePct: number;
}): EtatChantier {
  if ((entrees.ecartDelaiJours ?? 0) > 0) return "rouge";
  if (entrees.nonConformitesOuvertes > 0) return "rouge";
  if (entrees.alertesOuvertes > 0) return "orange";
  if (Math.abs(entrees.ecartBudgetairePct) > 10) return "orange";
  return "vert";
}

/** Met en forme les chantiers pour le tableau de bord de direction. */
export function lignesDirection(chantiers: ChantierDirection[]): LigneDirection[] {
  return (chantiers ?? []).map((c) => {
    const ecartBudgetaire = c.valorisationTravaux - c.depensesReelles;
    const ecartBudgetairePct =
      c.valorisationTravaux > 0 ? (ecartBudgetaire / c.valorisationTravaux) * 100 : 0;
    return {
      ...c,
      ecartBudgetaire,
      resteARealiser: Math.max(0, c.montantMarche - c.valorisationTravaux),
      etat: etatChantier({
        ecartDelaiJours: c.ecartDelaiJours,
        alertesOuvertes: c.alertesOuvertes,
        nonConformitesOuvertes: c.nonConformitesOuvertes,
        ecartBudgetairePct,
      }),
    };
  });
}

export type CritereClassement = "delai" | "cout" | "avancement";

/** Classe les chantiers du plus critique au moins critique. */
export function classerChantiers(
  lignes: LigneDirection[],
  critere: CritereClassement,
): LigneDirection[] {
  const copie = [...(lignes ?? [])];
  if (critere === "delai") {
    return copie.sort(
      (a, b) =>
        (b.ecartDelaiJours ?? -99999) - (a.ecartDelaiJours ?? -99999) ||
        b.alertesOuvertes - a.alertesOuvertes,
    );
  }
  if (critere === "cout") {
    return copie.sort((a, b) => b.ecartBudgetaire - a.ecartBudgetaire);
  }
  return copie.sort((a, b) => a.avancementPct - b.avancementPct);
}

export type SyntheseGlobale = {
  nbChantiers: number;
  montantMarcheTotal: number;
  chiffreAffairesRealise: number;
  resteARealiserTotal: number;
  depensesReellesTotal: number;
  margeTotale: number;
  tauxRealisationPct: number;
  alertesOuvertesTotal: number;
  nonConformitesOuvertesTotal: number;
  chantiersEnRetard: number;
};

/** Cumul de la direction : chiffre d'affaires, reste à réaliser, marge. */
export function syntheseGlobale(lignes: LigneDirection[]): SyntheseGlobale {
  const liste = lignes ?? [];
  const montantMarcheTotal = liste.reduce((s, c) => s + (c.montantMarche || 0), 0);
  const chiffreAffairesRealise = liste.reduce((s, c) => s + (c.valorisationTravaux || 0), 0);
  const depensesReellesTotal = liste.reduce((s, c) => s + (c.depensesReelles || 0), 0);
  const resteARealiserTotal = liste.reduce((s, c) => s + c.resteARealiser, 0);
  return {
    nbChantiers: liste.length,
    montantMarcheTotal,
    chiffreAffairesRealise,
    resteARealiserTotal,
    depensesReellesTotal,
    margeTotale: chiffreAffairesRealise - depensesReellesTotal,
    tauxRealisationPct:
      montantMarcheTotal > 0
        ? Math.round((chiffreAffairesRealise / montantMarcheTotal) * 1000) / 10
        : 0,
    alertesOuvertesTotal: liste.reduce((s, c) => s + c.alertesOuvertes, 0),
    nonConformitesOuvertesTotal: liste.reduce((s, c) => s + c.nonConformitesOuvertes, 0),
    chantiersEnRetard: liste.filter((c) => (c.ecartDelaiJours ?? 0) > 0).length,
  };
}

export type LigneEngin = {
  typeEngin: string;
  heuresMarche: number;
  chantiers: number;
  parChantier: { chantier: string; heures: number }[];
};

/** Utilisation des engins entre chantiers (heures de marche par type). */
export function utilisationEngins(
  lignes: { type_engin: string; heures_marche: number; chantier: string }[],
): LigneEngin[] {
  const map = new Map<string, { heures: number; chantiers: Set<string>; parChantier: Map<string, number> }>();
  for (const l of lignes ?? []) {
    const type = String(l.type_engin ?? "").trim() || "Non précisé";
    const heures = Number(l.heures_marche) || 0;
    const chantier = String(l.chantier ?? "").trim() || "Chantier";
    const entree = map.get(type) ?? { heures: 0, chantiers: new Set<string>(), parChantier: new Map<string, number>() };
    entree.heures += heures;
    entree.chantiers.add(chantier);
    entree.parChantier.set(chantier, (entree.parChantier.get(chantier) ?? 0) + heures);
    map.set(type, entree);
  }
  return [...map.entries()]
    .map(([typeEngin, v]) => ({
      typeEngin,
      heuresMarche: Math.round(v.heures * 100) / 100,
      chantiers: v.chantiers.size,
      parChantier: [...v.parChantier.entries()]
        .map(([chantier, heures]) => ({ chantier, heures: Math.round(heures * 100) / 100 }))
        .sort((a, b) => b.heures - a.heures),
    }))
    .sort((a, b) => b.heuresMarche - a.heuresMarche);
}
