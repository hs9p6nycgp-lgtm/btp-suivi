// Description detaillee de l'ouvrage, demandee a la creation et a la modification
// d'un chantier. Ces champs alimentent le modele 3D et les estimations :
// - batiment : nombre de sous-sols / etages, hauteur par niveau, travees,
//   structure (poteaux-poutres, voiles) et toiture ;
// - route : nombre de voies, largeur des accotements et type de revetement.
// Les valeurs du formulaire restent du texte ; ce module les convertit en
// nombres propres (bornes) pour la base et pour le moteur 3D.

export type TypeOuvrage = "route" | "batiment";

export type DetailsOuvrage = {
  longueur: string;
  largeur: string;
  hauteurNiveau: string;
  nbSousSols: string;
  nbEtages: string;
  nbTraveesLongueur: string;
  nbTraveesLargeur: string;
  typeStructure: string;
  typeToiture: string;
  nbVoies: string;
  largeurAccotement: string;
  typeRevetement: string;
};

export const STRUCTURES_BATIMENT = [
  { value: "poteaux_poutres", label: "Poteaux-poutres (ossature)" },
  { value: "voiles", label: "Voiles porteurs" },
  { value: "mixte", label: "Mixte (poteaux + voiles)" },
] as const;

export const TOITURES_BATIMENT = [
  { value: "terrasse", label: "Dalle terrasse" },
  { value: "tole", label: "Toiture tôle (2 pans)" },
] as const;

export const REVETEMENTS_ROUTE = [
  { value: "bitume", label: "Enrobé bitumineux" },
  { value: "beton", label: "Béton de ciment" },
  { value: "pave", label: "Pavés" },
] as const;

export const NB_VOIES_MAX = 6;

export type ColonnesDetailsOuvrage = {
  longueur: number | null;
  largeur: number | null;
  hauteur: number | null;
  hauteur_niveau: number | null;
  nb_sous_sols: number | null;
  nb_etages: number | null;
  nb_travees_longueur: number | null;
  nb_travees_largeur: number | null;
  type_structure: string | null;
  type_toiture: string | null;
  nb_voies: number | null;
  largeur_accotement: number | null;
  type_revetement: string | null;
};

export function detailsOuvrageVides(): DetailsOuvrage {
  return {
    longueur: "",
    largeur: "",
    hauteurNiveau: "3",
    nbSousSols: "0",
    nbEtages: "0",
    nbTraveesLongueur: "",
    nbTraveesLargeur: "",
    typeStructure: "poteaux_poutres",
    typeToiture: "terrasse",
    nbVoies: "2",
    largeurAccotement: "",
    typeRevetement: "bitume",
  };
}

function nombre(valeur: string | number | null | undefined): number | null {
  if (valeur === null || valeur === undefined || String(valeur).trim() === "") return null;
  const n = Number(valeur);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function entier(valeur: string | number | null | undefined): number | null {
  const n = nombre(valeur);
  return n === null ? null : Math.round(n);
}

function borne(valeur: number | null, min: number, max: number): number | null {
  if (valeur === null) return null;
  return Math.min(max, Math.max(min, valeur));
}

function texteDepuis(data: Record<string, unknown>, champ: string, defaut: string): string {
  const valeur = data[champ];
  return valeur === null || valeur === undefined || String(valeur).trim() === "" ? defaut : String(valeur);
}

/** Nombre de niveaux au-dessus du sol : RDC + étages. */
export function nbNiveauxBatiment(details: DetailsOuvrage): number {
  const etages = entier(details.nbEtages) ?? 0;
  return 1 + Math.min(50, Math.max(0, etages));
}

/** Libellés des niveaux à suivre : sous-sols, RDC puis R+n. */
export function niveauxDepuisDetails(details: DetailsOuvrage): string[] {
  const sousSols = Math.min(10, entier(details.nbSousSols) ?? 0);
  const etages = Math.min(50, entier(details.nbEtages) ?? 0);
  const niveaux: string[] = [];
  for (let k = sousSols; k >= 1; k--) {
    niveaux.push(sousSols > 1 ? `Sous-sol ${k}` : "Sous-sol");
  }
  niveaux.push("RDC");
  for (let n = 1; n <= etages; n++) niveaux.push(`R+${n}`);
  return niveaux;
}

/** Champs de description lus depuis la base (nombres ou textes). */
export type ChantierDescription = {
  type: string;
  longueur?: number | null;
  largeur?: number | null;
  hauteur?: number | null;
  nb_sous_sols?: number | null;
  nb_etages?: number | null;
  hauteur_niveau?: number | null;
  nb_travees_longueur?: number | null;
  nb_travees_largeur?: number | null;
  type_structure?: string | null;
  type_toiture?: string | null;
  nb_voies?: number | null;
  largeur_accotement?: number | null;
  type_revetement?: string | null;
};

export type LigneDescription = { libelle: string; valeur: string };

function libelleOption(
  options: readonly { value: string; label: string }[],
  valeur: string | null | undefined,
): string | null {
  if (!valeur) return null;
  return options.find((o) => o.value === valeur)?.label ?? valeur;
}

/** Lignes lisibles pour la fiche chantier et la fiche imprimable. */
export function descriptionOuvrage(chantier: ChantierDescription): LigneDescription[] {
  const lignes: LigneDescription[] = [];

  if (chantier.type === "route") {
    const voies = entier(chantier.nb_voies as number | null | undefined);
    if (voies !== null) {
      lignes.push({ libelle: "Voies", valeur: `${voies} voie${voies > 1 ? "s" : ""}` });
    }
    const accotement = nombre(chantier.largeur_accotement as number | null | undefined);
    if (accotement !== null) {
      lignes.push({
        libelle: "Accotements",
        valeur: `${accotement.toLocaleString("fr-FR")} m`,
      });
    }
    const revetement = libelleOption(REVETEMENTS_ROUTE, chantier.type_revetement);
    if (revetement) lignes.push({ libelle: "Revêtement", valeur: revetement });
    return lignes;
  }

  const sousSols = entier(chantier.nb_sous_sols as number | null | undefined);
  const etages = entier(chantier.nb_etages as number | null | undefined);
  if (sousSols !== null && sousSols > 0) {
    lignes.push({ libelle: "Sous-sols", valeur: String(sousSols) });
  }
  if (etages !== null) {
    lignes.push({
      libelle: "Niveaux",
      valeur: etages > 0 ? `RDC + ${etages} étage${etages > 1 ? "s" : ""}` : "RDC seul",
    });
  }
  const hauteurNiveau = nombre(chantier.hauteur_niveau as number | null | undefined);
  if (hauteurNiveau !== null) {
    lignes.push({
      libelle: "Hauteur par niveau",
      valeur: `${hauteurNiveau.toLocaleString("fr-FR")} m`,
    });
  }
  const traveesX = entier(chantier.nb_travees_longueur as number | null | undefined);
  const traveesZ = entier(chantier.nb_travees_largeur as number | null | undefined);
  if (traveesX !== null || traveesZ !== null) {
    lignes.push({
      libelle: "Travées",
      valeur:
        traveesX !== null && traveesZ !== null
          ? `${traveesX} × ${traveesZ}`
          : String(traveesX ?? traveesZ),
    });
  }
  const structure = libelleOption(STRUCTURES_BATIMENT, chantier.type_structure);
  if (structure) lignes.push({ libelle: "Structure", valeur: structure });
  const toiture = libelleOption(TOITURES_BATIMENT, chantier.type_toiture);
  if (toiture) lignes.push({ libelle: "Toiture", valeur: toiture });
  return lignes;
}

/** Formate une surface en m2 (ou en hectares au-dela de 10 000 m2). */
export function formaterSurface(m2: number): string {
  if (!Number.isFinite(m2) || m2 <= 0) return "—";
  if (m2 >= 10000) {
    const ha = Math.round(m2 / 100) / 100;
    return `${ha.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ha`;
  }
  return `${m2.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} m²`;
}

/**
 * Surfaces indicatives deduites des dimensions (metre rapide) :
 * - batiment : emprise au sol, planchers RDC + etages, sous-sols ;
 * - route : chaussee et accotements.
 * Renvoie [] tant que longueur et largeur ne sont pas renseignees.
 */
export function surfacesOuvrage(chantier: ChantierDescription): LigneDescription[] {
  const longueur = nombre(chantier.longueur as number | null | undefined);
  const largeur = nombre(chantier.largeur as number | null | undefined);
  if (longueur === null || largeur === null) return [];

  if (chantier.type === "route") {
    const lignes: LigneDescription[] = [
      { libelle: "Surface chaussée", valeur: formaterSurface(longueur * largeur) },
    ];
    const accotement = nombre(chantier.largeur_accotement as number | null | undefined);
    const largeurAccotement = accotement ?? largeur * 0.2;
    lignes.push({
      libelle: accotement !== null ? "Surface accotements" : "Surface accotements (20 %)",
      valeur: formaterSurface(longueur * largeurAccotement * 2),
    });
    return lignes;
  }

  const emprise = longueur * largeur;
  const lignes: LigneDescription[] = [{ libelle: "Emprise au sol", valeur: formaterSurface(emprise) }];
  const etages = entier(chantier.nb_etages as number | null | undefined);
  if (etages !== null) {
    lignes.push({ libelle: "Surface planchers", valeur: formaterSurface(emprise * (1 + etages)) });
  }
  const sousSols = entier(chantier.nb_sous_sols as number | null | undefined);
  if (sousSols !== null && sousSols > 0) {
    lignes.push({ libelle: "Surface sous-sols", valeur: formaterSurface(emprise * sousSols) });
  }
  return lignes;
}

/** Hauteur totale du bâtiment (sous-sols + RDC + étages), en mètres. */
export function hauteurTotaleBatiment(details: DetailsOuvrage): number | null {
  const h = nombre(details.hauteurNiveau);
  if (h === null) return null;
  const sousSols = Math.min(10, entier(details.nbSousSols) ?? 0);
  const total = (sousSols + nbNiveauxBatiment(details)) * h;
  return Math.round(total * 100) / 100;
}

/** Reprend les valeurs enregistrees d'un chantier (creation par duplication, modification). */
export function detailsOuvrageDepuisChantier(
  type: TypeOuvrage,
  data: Record<string, unknown> | null | undefined,
): DetailsOuvrage {
  const base = detailsOuvrageVides();
  if (!data) return base;

  // Anciens chantiers : seule la hauteur totale existe. On en deduit un nombre
  // d'etages coherent (hauteur / 3 m) pour ne pas perdre l'information a l'edition.
  const hauteur = nombre(data.hauteur as number | null | undefined);
  const etagesDeduits = hauteur === null ? "0" : String(Math.max(0, Math.round(hauteur / 3) - 1));

  return {
    longueur: texteDepuis(data, "longueur", ""),
    largeur: texteDepuis(data, "largeur", ""),
    hauteurNiveau: texteDepuis(data, "hauteur_niveau", base.hauteurNiveau),
    nbSousSols: texteDepuis(data, "nb_sous_sols", base.nbSousSols),
    nbEtages: texteDepuis(data, "nb_etages", etagesDeduits),
    nbTraveesLongueur: texteDepuis(data, "nb_travees_longueur", ""),
    nbTraveesLargeur: texteDepuis(data, "nb_travees_largeur", ""),
    typeStructure: texteDepuis(data, "type_structure", base.typeStructure),
    typeToiture: texteDepuis(data, "type_toiture", base.typeToiture),
    nbVoies: texteDepuis(data, "nb_voies", base.nbVoies),
    largeurAccotement: texteDepuis(data, "largeur_accotement", ""),
    typeRevetement: texteDepuis(data, "type_revetement", base.typeRevetement),
  };
}

/** Niveaux a suivre d'un chantier deja enregistre (sous-sols, RDC, etages). */
export function niveauxDepuisChantier(chantier: ChantierDescription): string[] {
  const details = detailsOuvrageDepuisChantier("batiment", {
    hauteur: chantier.hauteur,
    nb_sous_sols: chantier.nb_sous_sols,
    nb_etages: chantier.nb_etages,
  });
  return niveauxDepuisDetails(details);
}

/** Colonnes `chantiers` a enregistrer (les champs de l'autre type sont remis a null). */
export function colonnesDetailsOuvrage(
  type: TypeOuvrage,
  details: DetailsOuvrage,
): ColonnesDetailsOuvrage {
  const longueur = nombre(details.longueur);
  const largeur = nombre(details.largeur);

  if (type === "batiment") {
    const hauteurNiveau = borne(nombre(details.hauteurNiveau), 2, 10);
    return {
      longueur,
      largeur,
      hauteur: hauteurTotaleBatiment(details),
      hauteur_niveau: hauteurNiveau,
      nb_sous_sols: borne(entier(details.nbSousSols), 0, 10) ?? 0,
      nb_etages: borne(entier(details.nbEtages), 0, 50) ?? 0,
      nb_travees_longueur: borne(entier(details.nbTraveesLongueur), 1, 30),
      nb_travees_largeur: borne(entier(details.nbTraveesLargeur), 1, 30),
      type_structure: details.typeStructure || null,
      type_toiture: details.typeToiture || null,
      nb_voies: null,
      largeur_accotement: null,
      type_revetement: null,
    };
  }

  return {
    longueur,
    largeur,
    hauteur: null,
    hauteur_niveau: null,
    nb_sous_sols: null,
    nb_etages: null,
    nb_travees_longueur: null,
    nb_travees_largeur: null,
    type_structure: null,
    type_toiture: null,
    nb_voies: borne(entier(details.nbVoies), 1, NB_VOIES_MAX),
    largeur_accotement: borne(nombre(details.largeurAccotement), 0, 20),
    type_revetement: details.typeRevetement || null,
  };
}
