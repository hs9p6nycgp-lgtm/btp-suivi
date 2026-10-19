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
