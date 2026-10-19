// Plan de controle qualite (exigence QUA-01) : parametre controle, valeur
// exigee et tolerances appliquees aux essais d'un chantier.
//
// Deux points importants :
// - la table `plans_controle` stocke le parametre dans la colonne accentuee
//   « paramètre » ; le code lit les deux ecritures possibles et l'insertion
//   reessaie l'autre colonne si la premiere echoue ;
// - les modeles proposes couvrent les controles courants d'une route et d'un
//   batiment (implantation, epaisseur, devers, compactage, slump, resistance).
//
// La conformite d'un essai est ensuite verifiee par `estConforme`
// (src/lib/calculs/qualite.ts) : une mesure hors tolerance declenche
// automatiquement une fiche de non-conformite (RG-04).

export type TypeOuvrageControle = "route" | "batiment";

export type ModelePlanControle = {
  parametre: string;
  unite: string;
  valeurExigee: number;
  tolerancePos: number;
  toleranceNeg: number;
};

/** Plan de controle tel que stocke en base (le parametre peut etre accentue). */
export type PlanControle = {
  id?: string;
  chantier_id?: string | null;
  type_ouvrage?: string | null;
  parametre?: string | null;
  "paramètre"?: string | null;
  valeur_exigee: number;
  tolerance_pos: number;
  tolerance_neg: number;
  unite?: string | null;
};

export const COLONNE_PARAMETRE = "paramètre";
export const COLONNE_PARAMETRE_ALTERNATIVE = "parametre";

export const UNITES_CONTROLE = ["m", "cm", "mm", "%", "% OPM", "MPa", "°C", "kg/m²", "m²"];

/** Modeles de controles d'une route (chaussee revetue). */
export const MODELES_ROUTE: ModelePlanControle[] = [
  { parametre: "Largeur de la chaussée", unite: "m", valeurExigee: 7, tolerancePos: 0.15, toleranceNeg: 0.15 },
  { parametre: "Dévers en alignement", unite: "%", valeurExigee: 2.5, tolerancePos: 0.5, toleranceNeg: 0.5 },
  { parametre: "Compacité de la couche de fondation (Proctor)", unite: "% OPM", valeurExigee: 95, tolerancePos: 5, toleranceNeg: 0 },
  { parametre: "Épaisseur de la couche de roulement", unite: "cm", valeurExigee: 5, tolerancePos: 1, toleranceNeg: 1 },
  { parametre: "Épaisseur de la couche de fondation", unite: "cm", valeurExigee: 25, tolerancePos: 2, toleranceNeg: 2 },
  { parametre: "Planéité (écart maximal)", unite: "mm", valeurExigee: 5, tolerancePos: 0, toleranceNeg: 5 },
  { parametre: "Écart d'implantation", unite: "m", valeurExigee: 0, tolerancePos: 0.05, toleranceNeg: 0.05 },
  { parametre: "Écart altimétrique (nivellement)", unite: "m", valeurExigee: 0, tolerancePos: 0.03, toleranceNeg: 0.03 },
];

/** Modeles de controles d'un batiment. */
export const MODELES_BATIMENT: ModelePlanControle[] = [
  { parametre: "Affaissement (slump) du béton", unite: "cm", valeurExigee: 8, tolerancePos: 3, toleranceNeg: 3 },
  { parametre: "Résistance caractéristique du béton à 28 jours", unite: "MPa", valeurExigee: 25, tolerancePos: 20, toleranceNeg: 0 },
  { parametre: "Température du béton à la mise en œuvre", unite: "°C", valeurExigee: 30, tolerancePos: 0, toleranceNeg: 30 },
  { parametre: "Épaisseur des éléments en béton", unite: "cm", valeurExigee: 20, tolerancePos: 1, toleranceNeg: 1 },
  { parametre: "Enrobage des aciers", unite: "cm", valeurExigee: 5, tolerancePos: 5, toleranceNeg: 0 },
  { parametre: "Écart de pose / implantation", unite: "m", valeurExigee: 0, tolerancePos: 0.01, toleranceNeg: 0.01 },
  { parametre: "Écart de nivellement (plancher)", unite: "m", valeurExigee: 0, tolerancePos: 0.01, toleranceNeg: 0.01 },
];

/** Modeles correspondant au type d'ouvrage du chantier. */
export function modelesPlanControle(type: string | null | undefined): ModelePlanControle[] {
  return type === "batiment" ? MODELES_BATIMENT : MODELES_ROUTE;
}

/** Compare deux parametres sans tenir compte de la casse, des accents ni des-separateurs. */
export function normaliserParametre(valeur: string | null | undefined): string {
  return String(valeur ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Nom du parametre d'un plan, quelle que soit l'ecriture de la colonne. */
export function nomParametre(
  plan: { parametre?: string | null; "paramètre"?: string | null } | null | undefined,
): string {
  if (!plan) return "";
  const valeurs = [plan.parametre, plan["paramètre"]];
  return valeurs.find((v) => Boolean(v && String(v).trim()))?.toString().trim() ?? "";
}

/** Vrai si deux libelles designent le meme parametre de controle. */
export function parametresEquivalents(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normaliserParametre(a);
  const nb = normaliserParametre(b);
  return na.length > 0 && na === nb;
}

export type EntreePlan = {
  parametre: string;
  unite: string;
  valeur_exigee: number | string;
  tolerance_pos: number | string;
  tolerance_neg: number | string;
};

/** Controle la saisie d'un parametre avant enregistrement. */
export function validerPlan(entree: EntreePlan): { ok: boolean; erreurs: string[] } {
  const erreurs: string[] = [];
  const parametre = String(entree.parametre ?? "").trim();
  const unite = String(entree.unite ?? "").trim();
  const valeur = Number(entree.valeur_exigee);
  const tolPos = Number(entree.tolerance_pos);
  const tolNeg = Number(entree.tolerance_neg);

  if (!parametre) erreurs.push("Indiquez le paramètre contrôlé.");
  if (!unite) erreurs.push("Indiquez l'unité de mesure.");
  if (!Number.isFinite(valeur) || valeur < 0) {
    erreurs.push("La valeur exigée doit être un nombre positif ou nul.");
  }
  if (!Number.isFinite(tolPos) || tolPos < 0) {
    erreurs.push("La tolérance (+) doit être un nombre positif ou nul.");
  }
  if (!Number.isFinite(tolNeg) || tolNeg < 0) {
    erreurs.push("La tolérance (−) doit être un nombre positif ou nul.");
  }
  if (
    Number.isFinite(valeur) &&
    Number.isFinite(tolPos) &&
    Number.isFinite(tolNeg) &&
    valeur === 0 &&
    tolPos === 0 &&
    tolNeg === 0
  ) {
    erreurs.push("Précisez une tolérance : une valeur exigée nulle doit en avoir une.");
  }

  return { ok: erreurs.length === 0, erreurs };
}

/** Bornes acceptables d'un plan de controle. */
export function bornesPlan(plan: {
  valeur_exigee: number;
  tolerance_pos: number;
  tolerance_neg: number;
}): { min: number; max: number } {
  return {
    min: plan.valeur_exigee - plan.tolerance_neg,
    max: plan.valeur_exigee + plan.tolerance_pos,
  };
}

/** Nombre formate a la francaise, sans zéros inutiles. */
export function formaterNombre(valeur: number): string {
  if (!Number.isFinite(valeur)) return "—";
  return valeur.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

/** Intervalle acceptable, lisible dans un tableau. */
export function texteIntervalle(plan: {
  valeur_exigee: number;
  tolerance_pos: number;
  tolerance_neg: number;
  unite?: string | null;
}): string {
  const unite = String(plan.unite ?? "").trim();
  const suffixe = unite ? ` ${unite}` : "";
  const valeur = formaterNombre(plan.valeur_exigee);

  if (plan.tolerance_pos === 0 && plan.tolerance_neg === 0) return `${valeur}${suffixe} (valeur exacte)`;
  if (plan.tolerance_neg === 0) return `≥ ${valeur}${suffixe}`;
  if (plan.tolerance_pos === 0) return `≤ ${valeur}${suffixe}`;

  const { min, max } = bornesPlan(plan);
  if (plan.tolerance_pos === plan.tolerance_neg) {
    return `${valeur} ± ${formaterNombre(plan.tolerance_pos)}${suffixe} (${formaterNombre(min)} à ${formaterNombre(max)})`;
  }
  return `${valeur} (+${formaterNombre(plan.tolerance_pos)} / -${formaterNombre(plan.tolerance_neg)})${suffixe} (${formaterNombre(min)} à ${formaterNombre(max)})`;
}

/** Colonnes a inserer en base pour un modele de controle. */
export function valeursPlanDepuisModele(
  modele: ModelePlanControle,
  type: TypeOuvrageControle,
): {
  type_ouvrage: string;
  parametre: string;
  valeur_exigee: number;
  tolerance_pos: number;
  tolerance_neg: number;
  unite: string;
} {
  return {
    type_ouvrage: type,
    parametre: modele.parametre,
    valeur_exigee: modele.valeurExigee,
    tolerance_pos: modele.tolerancePos,
    tolerance_neg: modele.toleranceNeg,
    unite: modele.unite,
  };
}

/** Modeles qui ne figurent pas encore dans le plan de controle du chantier. */
export function plansManquants(
  modeles: ModelePlanControle[],
  existants: string[],
): ModelePlanControle[] {
  return modeles.filter((modele) => !existants.some((nom) => parametresEquivalents(nom, modele.parametre)));
}
