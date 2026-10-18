// Types de chantier (CHA-01) et sous-types detailles.
// La table `chantiers` stocke : type ('route' | 'batiment') et type_detail (text).
// Cette liste est la reference unique cote logique : le formulaire (Session 1)
// doit la lire d'ici pour proposer les choix, et `estTypeDetailValide`
// permet de verifier une valeur avant enregistrement.

export const TYPES_CHANTIER = ["route", "batiment"] as const;

export type TypeChantier = (typeof TYPES_CHANTIER)[number];

export type TypeDetail = {
  /** Valeur stockee en base dans chantiers.type_detail */
  value: string;
  /** Libelle affiche (francais). */
  label: string;
  /** Type de chantier parent. */
  type: TypeChantier;
};

/** Sous-types detailles proposes dans le formulaire "Nouveau chantier". */
export const TYPES_DETAILLES: TypeDetail[] = [
  // ----- Route -----
  { value: "terrassement", label: "Terrassement / mouvement de terres", type: "route" },
  { value: "chaussee", label: "Chaussée / revêtement", type: "route" },
  { value: "assainissement", label: "Assainissement / drainage", type: "route" },
  { value: "ouvrage_art", label: "Ouvrage d'art (pont, dalot, buse)", type: "route" },
  { value: "voirie_urbaine", label: "Voirie urbaine (bordures, caniveaux, trottoirs)", type: "route" },
  { value: "route_rurale", label: "Route rurale / piste", type: "route" },
  // ----- Batiment -----
  { value: "fondations", label: "Fondations", type: "batiment" },
  { value: "gros_oeuvre", label: "Gros œuvre / ossature", type: "batiment" },
  { value: "charpente_couverture", label: "Charpente / couverture", type: "batiment" },
  { value: "finition", label: "Finitions / revêtements", type: "batiment" },
  { value: "second_oeuvre", label: "Second œuvre (menuiserie, électricité, plomberie)", type: "batiment" },
  { value: "batiment_industriel", label: "Bâtiment industriel / entrepôt", type: "batiment" },
];

/** Renvoie les sous-types correspondant a un type de chantier. */
export function typesDetaillesPour(type: TypeChantier): TypeDetail[] {
  return TYPES_DETAILLES.filter((t) => t.type === type);
}

/** Verifie qu'un sous-type appartient bien au type de chantier donne. */
export function estTypeDetailValide(
  type: TypeChantier,
  typeDetail: string | null | undefined,
): boolean {
  if (typeDetail === null || typeDetail === undefined || typeDetail === "") return true; // champ optionnel
  return TYPES_DETAILLES.some((t) => t.type === type && t.value === typeDetail);
}

/** Libelle affichable d'un sous-type (ou la valeur brute si inconnue). */
export function libelleTypeDetail(value: string | null | undefined): string {
  if (!value) return "";
  return TYPES_DETAILLES.find((t) => t.value === value)?.label ?? value;
}
