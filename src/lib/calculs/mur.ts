// Calcul du devis d'un mur en agglos (assistant « Mur »).
//
// Deux corrections importantes par rapport à la première version de l'écran :
//
//  1. **Le prix du BPU est dans une unité, la quantité dans une autre.**
//     Un sac de ciment coûte 4 800 FCFA *le sac*, pas le kilo : multiplier
//     107 kg × 4 800 donnait un total 50 fois trop élevé. On convertit donc la
//     quantité dans l'unité du prix avant de multiplier.
//  2. **Les montants sont en FCFA sans décimale** (exigence RG-06) : chaque
//     poste et le total sont arrondis à l'entier.
//
// Les formules de volume (surface, mortier, nombre de blocs) sont inchangées :
// elles donnent les valeurs de la fiche de recette (mur 20 × 3 m, ép. 0,20 m).
//
// Module pur : aucune dépendance, tout est testable.

// --- Hypothèses de calcul (documentées) ---------------------------------------

/** Poids d'un sac de ciment (kg). */
export const POIDS_SAC_CIMENT_KG = 50;
/** Poids d'un sac d'enduit (kg). */
export const POIDS_SAC_ENDUIT_KG = 25;
/** Dosage du ciment dans le mortier (kg de ciment par m³ de mortier). */
export const DOSAGE_CIMENT_KG_PAR_M3 = 280;
/** Proportion de sable dans le mortier (m³ de sable par m³ de mortier). */
export const DOSAGE_SABLE_M3_PAR_M3 = 0.8;
/** Surface d'un bloc d'agglo de 20 × 20 (m²). */
export const SURFACE_BLOC_M2 = 0.2 * 0.2;
/** Masse volumique du sable (t par m³). */
export const MASSE_SABLE_T_PAR_M3 = 1.6;
/** Consommation d'enduit (kg par m² de parement). */
export const ENDUIT_KG_PAR_M2 = 25;
/** Marge de pose du mortier (part du volume des blocs couverte). */
export const FACTEUR_MISE_EN_PLACE = 0.92;

// --- Unités ------------------------------------------------------------------
// La normalisation et la conversion des unités vivent dans « src/lib/unites.ts »
// (source unique, partagée avec le contrôle qualité du BPU) ; elles sont
// réexportées ici pour la commodité de l'écran.

import { convertirQuantite, normaliserUnite } from "../unites.ts";

export { convertirQuantite, normaliserUnite };

/** Quantité disponible dans une unité (ex. « 1 497 blocs », « 2,14 sacs »). */
export type Quantite = { unite: string; valeur: number };

/**
 * Retient, parmi les quantités disponibles d'un matériau, celle qui correspond
 * à l'unité du prix du BPU. La conversion est faite si possible ; sinon la
 * quantité est renvoyée telle quelle avec `convertie: false`.
 */
export function choisirQuantite(
  quantites: Quantite[],
  unitePrix: string | null | undefined,
): { quantite: number; unite: string; convertie: boolean } | null {
  if (!unitePrix) return null;
  const cible = normaliserUnite(unitePrix);
  if (!cible) return null;
  // 1) une quantité déjà exprimée dans l'unité du prix
  for (const q of quantites) {
    if (normaliserUnite(q.unite) === cible) {
      return { quantite: q.valeur, unite: cible, convertie: false };
    }
  }
  // 2) sinon, conversion depuis une unité compatible
  for (const q of quantites) {
    const converti = convertirQuantite(q.valeur, q.unite, cible);
    if (converti !== null) {
      return { quantite: converti, unite: cible, convertie: true };
    }
  }
  return null;
}

// --- Calcul d'un poste --------------------------------------------------------

export type StatutLigne = "ok" | "prix-converti" | "unite-incompatible" | "sans-prix";

export type PosteMur = {
  cle: string;
  libelle: string;
  /** Quantités disponibles, dans les unités usuelles du matériau. */
  quantites: Quantite[];
  /** Prix unitaire du BPU (FCFA HT). */
  prixUnitaire: number | null;
  /** Unité du prix dans le BPU (« sac », « m3 », « u »…). */
  unitePrix: string | null;
};

export type LigneDevisMur = {
  cle: string;
  libelle: string;
  /** Quantité de besoin (celle du matériau). */
  quantiteBesoin: number;
  uniteBesoin: string;
  /** Quantité retenue, dans l'unité du prix. */
  quantite: number | null;
  unite: string | null;
  prixUnitaire: number | null;
  /** Montant du poste, arrondi à l'entier (FCFA sans décimale). */
  total: number | null;
  statut: StatutLigne;
  message: string | null;
};

/** Arrondi monetary : FCFA sans décimale (exigence RG-06). */
export function arrondirFcfa(montant: number): number {
  if (!Number.isFinite(montant)) return 0;
  return Math.round(montant);
}

/** Calcule une ligne de devis : quantité convertie, montant entier. */
export function calculerLigneMur(poste: PosteMur): LigneDevisMur {
  const base: LigneDevisMur = {
    cle: poste.cle,
    libelle: poste.libelle,
    quantiteBesoin: poste.quantites[0]?.valeur ?? 0,
    uniteBesoin: normaliserUnite(poste.quantites[0]?.unite) || poste.quantites[0]?.unite || "",
    quantite: null,
    unite: null,
    prixUnitaire: poste.prixUnitaire,
    total: null,
    statut: "sans-prix",
    message: null,
  };

  if (poste.prixUnitaire === null || poste.prixUnitaire === undefined) {
    return { ...base, message: "Aucun prix sélectionné dans le BPU." };
  }

  const retenue = choisirQuantite(poste.quantites, poste.unitePrix);
  if (!retenue) {
    return {
      ...base,
      statut: "unite-incompatible",
      message: `Unité du prix « ${poste.unitePrix ?? "?"} » incompatible avec les quantités disponibles : montant non calculé.`,
    };
  }

  const total = arrondirFcfa(retenue.quantite * poste.prixUnitaire);
  return {
    ...base,
    quantite: retenue.quantite,
    unite: retenue.unite,
    total,
    statut: retenue.convertie ? "prix-converti" : "ok",
    message: retenue.convertie
      ? `Quantité convertie en ${retenue.unite} (unité du prix du BPU).`
      : null,
  };
}

// --- Calcul complet d'un mur -------------------------------------------------

export type ParametresMur = {
  longueur: number;
  hauteur: number;
  epaisseur: number;
  /** Pourcentage d'ouvertures déduites (5 par défaut). */
  ouverturesPct?: number;
  /** Pertes de blocs (5 par défaut). */
  pertesPct?: number;
  /** Prix unitaires choisis dans le BPU (null si non choisi). */
  prix?: {
    agglos?: number | null;
    ciment?: number | null;
    sable?: number | null;
    enduit?: number | null;
  };
  /** Unités des prix choisis dans le BPU. */
  unites?: {
    agglos?: string | null;
    ciment?: string | null;
    sable?: string | null;
    enduit?: string | null;
  };
};

export type TacheMur = { nom: string; jours: number };

export type ResultatMur = {
  surfaceBrute: number;
  surfaceNette: number;
  volumeMur: number;
  nbBlocs: number;
  volumeMortier: number;
  cimentKg: number;
  sableM3: number;
  lignes: LigneDevisMur[];
  /** Total des postes calculables (arrondi à l'entier). */
  totalMateriaux: number;
  /** true si au moins un poste n'a pas pu être valorisé. */
  posteNonValorise: boolean;
  taches: TacheMur[];
};

/** Calcule les quantités, les montants et le planning d'un mur en agglos. */
export function calculerDevisMur(params: ParametresMur): ResultatMur {
  const L = Number(params.longueur) || 0;
  const H = Number(params.hauteur) || 0;
  const E = Number(params.epaisseur) || 0;
  const ouverturesPct = Number(params.ouverturesPct ?? 5) || 0;
  const pertesPct = Number(params.pertesPct ?? 5) || 0;

  const surfaceBrute = L * H;
  const surfaceNette = Math.max(surfaceBrute - surfaceBrute * (ouverturesPct / 100), 0);
  const coeffPertes = 1 + pertesPct / 100;
  const nbBlocs = Math.ceil((surfaceNette / SURFACE_BLOC_M2) * coeffPertes);
  const volumeMur = surfaceNette * E;
  const volumeBloc = nbBlocs * SURFACE_BLOC_M2 * E;
  const volumeMortier = Math.max(volumeMur - volumeBloc * FACTEUR_MISE_EN_PLACE, 0);
  const cimentKg = volumeMortier * DOSAGE_CIMENT_KG_PAR_M3;
  const sableM3 = volumeMortier * DOSAGE_SABLE_M3_PAR_M3;
  const enduitKg = surfaceNette * ENDUIT_KG_PAR_M2;

  const prix = params.prix ?? {};
  const unites = params.unites ?? {};

  const postes: PosteMur[] = [
    {
      cle: "agglos",
      libelle: "Agglos / blocs",
      quantites: [
        { unite: "u", valeur: nbBlocs },
        { unite: "m2", valeur: nbBlocs * SURFACE_BLOC_M2 },
        { unite: "m3", valeur: nbBlocs * SURFACE_BLOC_M2 * E },
      ],
      prixUnitaire: prix.agglos ?? null,
      unitePrix: unites.agglos ?? null,
    },
    {
      cle: "ciment",
      libelle: "Ciment",
      quantites: [
        { unite: "kg", valeur: cimentKg },
        { unite: "sac", valeur: cimentKg / POIDS_SAC_CIMENT_KG },
      ],
      prixUnitaire: prix.ciment ?? null,
      unitePrix: unites.ciment ?? null,
    },
    {
      cle: "sable",
      libelle: "Sable",
      quantites: [
        { unite: "m3", valeur: sableM3 },
        { unite: "t", valeur: sableM3 * MASSE_SABLE_T_PAR_M3 },
      ],
      prixUnitaire: prix.sable ?? null,
      unitePrix: unites.sable ?? null,
    },
    {
      cle: "enduit",
      libelle: "Enduit",
      quantites: [
        { unite: "m2", valeur: surfaceNette },
        { unite: "kg", valeur: enduitKg },
        { unite: "sac", valeur: enduitKg / POIDS_SAC_ENDUIT_KG },
      ],
      prixUnitaire: prix.enduit ?? null,
      unitePrix: unites.enduit ?? null,
    },
  ];

  const lignes = postes.map(calculerLigneMur);
  const totalMateriaux = arrondirFcfa(
    lignes.reduce((total, l) => total + (l.total ?? 0), 0),
  );

  const taches: TacheMur[] = [
    { nom: "Implantation et fondations", jours: 1 },
    { nom: "Montage mur en agglos", jours: Math.max(1, Math.ceil(surfaceNette / 8)) },
    { nom: "Pose mortier / reglage", jours: Math.max(1, Math.ceil(volumeMortier / 0.5)) },
    { nom: "Enduit", jours: Math.max(1, Math.ceil(surfaceNette / 15)) },
    { nom: "Finition et cure", jours: Math.max(1, Math.ceil(surfaceNette / 25)) },
  ];

  return {
    surfaceBrute,
    surfaceNette,
    volumeMur,
    nbBlocs,
    volumeMortier,
    cimentKg,
    sableM3,
    lignes,
    totalMateriaux,
    posteNonValorise: lignes.some((l) => l.statut === "unite-incompatible"),
    taches,
  };
}
