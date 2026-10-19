// Types de chantier (CHA-01) et sous-types detailles.
// La table `chantiers` stocke : type ('route' | 'batiment') et type_detail (text).
// Cette liste est la reference unique cote logique : le formulaire (Session 1)
// doit la lire d'ici pour proposer les choix, et `estTypeDetailValide`
// permet de verifier une valeur avant enregistrement.
//
// Catalogue : 100 sous-types (50 route + 50 batiment), regroupes par categorie
// pour rester lisibles dans les listes deroulantes (formulaire chantier, devis).

export const TYPES_CHANTIER = ["route", "batiment"] as const;

export type TypeChantier = (typeof TYPES_CHANTIER)[number];

export type TypeDetail = {
  /** Valeur stockee en base dans chantiers.type_detail */
  value: string;
  /** Libelle affiche (francais). */
  label: string;
  /** Type de chantier parent. */
  type: TypeChantier;
  /** Categorie de regroupement (libelle d'`optgroup` dans les listes). */
  categorie?: string;
};

// Categories de regroupement (une par famille de travaux).
export const CATEGORIE_ROUTE_TERRASSEMENT = "Route · Terrassement et sols";
export const CATEGORIE_ROUTE_CHAUSSEES = "Route · Chaussées et revêtements";
export const CATEGORIE_ROUTE_ASSAINISSEMENT = "Route · Assainissement et drainage";
export const CATEGORIE_ROUTE_OUVRAGES = "Route · Ouvrages d'art et structures";
export const CATEGORIE_ROUTE_VOIRIE = "Route · Voirie urbaine et accès";
export const CATEGORIE_ROUTE_RURALE = "Route · Routes rurales et pistes";
export const CATEGORIE_ROUTE_EQUIPEMENTS = "Route · Équipements et sécurité";
export const CATEGORIE_ROUTE_SPECIFIQUES = "Route · Ouvrages spécifiques";
export const CATEGORIE_BAT_FONDATIONS = "Bâtiment · Fondations et infrastructure";
export const CATEGORIE_BAT_STRUCTURE = "Bâtiment · Structure et gros œuvre";
export const CATEGORIE_BAT_ENVELOPPE = "Bâtiment · Enveloppe et couverture";
export const CATEGORIE_BAT_SECOND_OEUVRE = "Bâtiment · Cloisons et second œuvre";
export const CATEGORIE_BAT_FINITIONS = "Bâtiment · Finitions";
export const CATEGORIE_BAT_USAGE = "Bâtiment · Bâtiments par usage";
export const CATEGORIE_BAT_AMENAGEMENTS = "Bâtiment · Aménagements extérieurs";

/** Les 100 sous-types detailles proposes (formulaire chantier + devis). */
export const TYPES_DETAILLES: TypeDetail[] = [
  // ===== Route (50) =====
  // ----- Terrassement et sols (6) -----
  { value: "terrassement", label: "Terrassement / mouvement de terres", type: "route", categorie: CATEGORIE_ROUTE_TERRASSEMENT },
  { value: "deblai", label: "Déblai / excavation", type: "route", categorie: CATEGORIE_ROUTE_TERRASSEMENT },
  { value: "remblai", label: "Remblai / remblaiement", type: "route", categorie: CATEGORIE_ROUTE_TERRASSEMENT },
  { value: "decapage", label: "Décapage / terre végétale", type: "route", categorie: CATEGORIE_ROUTE_TERRASSEMENT },
  { value: "stabilisation_sol", label: "Stabilisation de sol (chaux / ciment)", type: "route", categorie: CATEGORIE_ROUTE_TERRASSEMENT },
  { value: "traitement_ravinement", label: "Traitement de ravinement / protection des talus", type: "route", categorie: CATEGORIE_ROUTE_TERRASSEMENT },

  // ----- Chaussées et revêtements (9) -----
  { value: "chaussee", label: "Chaussée / revêtement", type: "route", categorie: CATEGORIE_ROUTE_CHAUSSEES },
  { value: "couche_fondation", label: "Couche de fondation granulaire", type: "route", categorie: CATEGORIE_ROUTE_CHAUSSEES },
  { value: "couche_base", label: "Couche de base granulaire", type: "route", categorie: CATEGORIE_ROUTE_CHAUSSEES },
  { value: "revetement_bitumineux", label: "Revêtement bitumineux (enrobé)", type: "route", categorie: CATEGORIE_ROUTE_CHAUSSEES },
  { value: "revetement_beton", label: "Revêtement en béton de ciment", type: "route", categorie: CATEGORIE_ROUTE_CHAUSSEES },
  { value: "pavage", label: "Pavage / pavés autobloquants", type: "route", categorie: CATEGORIE_ROUTE_CHAUSSEES },
  { value: "enduit_superficiel", label: "Enduit superficiel (bicouche)", type: "route", categorie: CATEGORIE_ROUTE_CHAUSSEES },
  { value: "accotement", label: "Accotements et dépendances", type: "route", categorie: CATEGORIE_ROUTE_CHAUSSEES },
  { value: "entretien_chaussee", label: "Entretien / réfection de chaussée", type: "route", categorie: CATEGORIE_ROUTE_CHAUSSEES },

  // ----- Assainissement et drainage (7) -----
  { value: "assainissement", label: "Assainissement / drainage", type: "route", categorie: CATEGORIE_ROUTE_ASSAINISSEMENT },
  { value: "caniveau", label: "Caniveaux / cunettes", type: "route", categorie: CATEGORIE_ROUTE_ASSAINISSEMENT },
  { value: "buse_dalot", label: "Busage / dalots", type: "route", categorie: CATEGORIE_ROUTE_ASSAINISSEMENT },
  { value: "regard", label: "Regards / ouvrages de visite", type: "route", categorie: CATEGORIE_ROUTE_ASSAINISSEMENT },
  { value: "puisard", label: "Puisards / puits perdus", type: "route", categorie: CATEGORIE_ROUTE_ASSAINISSEMENT },
  { value: "drainage_tranchee", label: "Drainage en tranchée / drains", type: "route", categorie: CATEGORIE_ROUTE_ASSAINISSEMENT },
  { value: "drainage_agricole", label: "Drainage agricole / hydraulique", type: "route", categorie: CATEGORIE_ROUTE_ASSAINISSEMENT },

  // ----- Ouvrages d'art et structures (8) -----
  { value: "ouvrage_art", label: "Ouvrage d'art (pont, dalot, buse)", type: "route", categorie: CATEGORIE_ROUTE_OUVRAGES },
  { value: "pont", label: "Pont / passerelle", type: "route", categorie: CATEGORIE_ROUTE_OUVRAGES },
  { value: "viaduc", label: "Viaduc", type: "route", categorie: CATEGORIE_ROUTE_OUVRAGES },
  { value: "tunnel", label: "Tunnel", type: "route", categorie: CATEGORIE_ROUTE_OUVRAGES },
  { value: "dalot_cadre", label: "Dalot cadre / dalot buse", type: "route", categorie: CATEGORIE_ROUTE_OUVRAGES },
  { value: "mur_soutenement", label: "Mur de soutènement", type: "route", categorie: CATEGORIE_ROUTE_OUVRAGES },
  { value: "passage_souterrain", label: "Passage souterrain / souterrain piéton", type: "route", categorie: CATEGORIE_ROUTE_OUVRAGES },
  { value: "traversee_cours_eau", label: "Traversée de cours d'eau / radier", type: "route", categorie: CATEGORIE_ROUTE_OUVRAGES },

  // ----- Voirie urbaine et accès (8) -----
  { value: "voirie_urbaine", label: "Voirie urbaine (bordures, caniveaux, trottoirs)", type: "route", categorie: CATEGORIE_ROUTE_VOIRIE },
  { value: "bordure_trottoir", label: "Bordures et trottoirs", type: "route", categorie: CATEGORIE_ROUTE_VOIRIE },
  { value: "rue_lotissement", label: "Voirie de lotissement / rue", type: "route", categorie: CATEGORIE_ROUTE_VOIRIE },
  { value: "avenue_boulevard", label: "Avenue / boulevard", type: "route", categorie: CATEGORIE_ROUTE_VOIRIE },
  { value: "carrefour_giratoire", label: "Carrefour / giratoire", type: "route", categorie: CATEGORIE_ROUTE_VOIRIE },
  { value: "piste_cyclable", label: "Piste cyclable", type: "route", categorie: CATEGORIE_ROUTE_VOIRIE },
  { value: "trottoir_cheminement", label: "Trottoirs / cheminements piétons", type: "route", categorie: CATEGORIE_ROUTE_VOIRIE },
  { value: "parking", label: "Parking / aire de stationnement", type: "route", categorie: CATEGORIE_ROUTE_VOIRIE },

  // ----- Routes rurales et pistes (3) -----
  { value: "route_rurale", label: "Route rurale / piste", type: "route", categorie: CATEGORIE_ROUTE_RURALE },
  { value: "piste_acces", label: "Piste d'accès / chemin de chantier", type: "route", categorie: CATEGORIE_ROUTE_RURALE },
  { value: "piste_agricole", label: "Piste agricole / desserte rurale", type: "route", categorie: CATEGORIE_ROUTE_RURALE },

  // ----- Équipements et sécurité (7) -----
  { value: "marquage_routier", label: "Marquage routier", type: "route", categorie: CATEGORIE_ROUTE_EQUIPEMENTS },
  { value: "signalisation_verticale", label: "Signalisation verticale / panneaux", type: "route", categorie: CATEGORIE_ROUTE_EQUIPEMENTS },
  { value: "glissiere_securite", label: "Glissières de sécurité", type: "route", categorie: CATEGORIE_ROUTE_EQUIPEMENTS },
  { value: "eclairage_public", label: "Éclairage public", type: "route", categorie: CATEGORIE_ROUTE_EQUIPEMENTS },
  { value: "feux_tricolores", label: "Feux tricolores / régulation", type: "route", categorie: CATEGORIE_ROUTE_EQUIPEMENTS },
  { value: "ralentisseurs", label: "Ralentisseurs / dos d'âne", type: "route", categorie: CATEGORIE_ROUTE_EQUIPEMENTS },
  { value: "garde_corps", label: "Garde-corps / parapets", type: "route", categorie: CATEGORIE_ROUTE_EQUIPEMENTS },

  // ----- Ouvrages spécifiques (2) -----
  { value: "ferroviaire", label: "Voie ferrée / plateforme ferroviaire", type: "route", categorie: CATEGORIE_ROUTE_SPECIFIQUES },
  { value: "piste_aerodrome", label: "Piste d'aérodrome / héliport", type: "route", categorie: CATEGORIE_ROUTE_SPECIFIQUES },

  // ===== Batiment (50) =====
  // ----- Fondations et infrastructure (6) -----
  { value: "fondations", label: "Fondations", type: "batiment", categorie: CATEGORIE_BAT_FONDATIONS },
  { value: "fondations_semelles", label: "Fondations - semelles isolées", type: "batiment", categorie: CATEGORIE_BAT_FONDATIONS },
  { value: "fondations_profondes", label: "Fondations profondes / pieux", type: "batiment", categorie: CATEGORIE_BAT_FONDATIONS },
  { value: "radier_general", label: "Radier général", type: "batiment", categorie: CATEGORIE_BAT_FONDATIONS },
  { value: "longrines_chainages", label: "Longrines et chaînages", type: "batiment", categorie: CATEGORIE_BAT_FONDATIONS },
  { value: "terrassement_batiment", label: "Terrassement bâtiment / fouilles", type: "batiment", categorie: CATEGORIE_BAT_FONDATIONS },

  // ----- Structure et gros œuvre (9) -----
  { value: "gros_oeuvre", label: "Gros œuvre / ossature", type: "batiment", categorie: CATEGORIE_BAT_STRUCTURE },
  { value: "poteaux_beton", label: "Poteaux en béton armé", type: "batiment", categorie: CATEGORIE_BAT_STRUCTURE },
  { value: "poutres_beton", label: "Poutres en béton armé", type: "batiment", categorie: CATEGORIE_BAT_STRUCTURE },
  { value: "voiles_porteurs", label: "Voiles / murs porteurs", type: "batiment", categorie: CATEGORIE_BAT_STRUCTURE },
  { value: "dalle_beton_arme", label: "Dalle en béton armé", type: "batiment", categorie: CATEGORIE_BAT_STRUCTURE },
  { value: "plancher_hourdis", label: "Plancher poutrelles-hourdis", type: "batiment", categorie: CATEGORIE_BAT_STRUCTURE },
  { value: "escaliers", label: "Escaliers / rampes", type: "batiment", categorie: CATEGORIE_BAT_STRUCTURE },
  { value: "maconnerie_agglo", label: "Maçonnerie d'agglos", type: "batiment", categorie: CATEGORIE_BAT_STRUCTURE },
  { value: "mur_banche", label: "Murs banchés / béton banché", type: "batiment", categorie: CATEGORIE_BAT_STRUCTURE },

  // ----- Enveloppe et couverture (5) -----
  { value: "charpente_couverture", label: "Charpente / couverture", type: "batiment", categorie: CATEGORIE_BAT_ENVELOPPE },
  { value: "toiture_terrasse", label: "Toiture-terrasse / étanchéité", type: "batiment", categorie: CATEGORIE_BAT_ENVELOPPE },
  { value: "bardage", label: "Bardage / habillage", type: "batiment", categorie: CATEGORIE_BAT_ENVELOPPE },
  { value: "zinguerie", label: "Zinguerie / gouttières", type: "batiment", categorie: CATEGORIE_BAT_ENVELOPPE },
  { value: "charpente_metallique", label: "Charpente métallique", type: "batiment", categorie: CATEGORIE_BAT_ENVELOPPE },

  // ----- Cloisons et second œuvre (10) -----
  { value: "cloisons", label: "Cloisons de distribution", type: "batiment", categorie: CATEGORIE_BAT_SECOND_OEUVRE },
  { value: "plafonds_platre", label: "Plafonds / plâtrerie", type: "batiment", categorie: CATEGORIE_BAT_SECOND_OEUVRE },
  { value: "menuiserie_bois", label: "Menuiserie bois", type: "batiment", categorie: CATEGORIE_BAT_SECOND_OEUVRE },
  { value: "menuiserie_aluminium", label: "Menuiserie aluminium", type: "batiment", categorie: CATEGORIE_BAT_SECOND_OEUVRE },
  { value: "menuiserie_metallique", label: "Menuiserie métallique / ferronnerie", type: "batiment", categorie: CATEGORIE_BAT_SECOND_OEUVRE },
  { value: "vitrerie", label: "Vitrerie / vitrages", type: "batiment", categorie: CATEGORIE_BAT_SECOND_OEUVRE },
  { value: "plomberie_sanitaire", label: "Plomberie et sanitaires", type: "batiment", categorie: CATEGORIE_BAT_SECOND_OEUVRE },
  { value: "electricite_batiment", label: "Électricité bâtiment", type: "batiment", categorie: CATEGORIE_BAT_SECOND_OEUVRE },
  { value: "climatisation_ventilation", label: "Climatisation / ventilation", type: "batiment", categorie: CATEGORIE_BAT_SECOND_OEUVRE },
  { value: "securite_incendie", label: "Sécurité incendie / désenfumage", type: "batiment", categorie: CATEGORIE_BAT_SECOND_OEUVRE },

  // ----- Finitions (7) -----
  { value: "peinture_batiment", label: "Peinture intérieure / extérieure", type: "batiment", categorie: CATEGORIE_BAT_FINITIONS },
  { value: "revetement_sol", label: "Revêtements de sol / carrelage", type: "batiment", categorie: CATEGORIE_BAT_FINITIONS },
  { value: "faience_mur", label: "Faïence / revêtements muraux", type: "batiment", categorie: CATEGORIE_BAT_FINITIONS },
  { value: "chape_ragreage", label: "Chapes et ragréages", type: "batiment", categorie: CATEGORIE_BAT_FINITIONS },
  { value: "finition", label: "Finitions / revêtements", type: "batiment", categorie: CATEGORIE_BAT_FINITIONS },
  { value: "second_oeuvre", label: "Second œuvre (menuiserie, électricité, plomberie)", type: "batiment", categorie: CATEGORIE_BAT_FINITIONS },
  { value: "enduit_facade", label: "Enduits et façades", type: "batiment", categorie: CATEGORIE_BAT_FINITIONS },

  // ----- Bâtiments par usage (10) -----
  { value: "batiment_industriel", label: "Bâtiment industriel / entrepôt", type: "batiment", categorie: CATEGORIE_BAT_USAGE },
  { value: "hangar", label: "Hangar / stockage", type: "batiment", categorie: CATEGORIE_BAT_USAGE },
  { value: "entrepot_logistique", label: "Entrepôt logistique / plateforme", type: "batiment", categorie: CATEGORIE_BAT_USAGE },
  { value: "immeuble_bureaux", label: "Immeuble de bureaux", type: "batiment", categorie: CATEGORIE_BAT_USAGE },
  { value: "residence_logements", label: "Résidence / logements collectifs", type: "batiment", categorie: CATEGORIE_BAT_USAGE },
  { value: "villa_maison", label: "Villa / maison individuelle", type: "batiment", categorie: CATEGORIE_BAT_USAGE },
  { value: "etablissement_scolaire", label: "Établissement scolaire", type: "batiment", categorie: CATEGORIE_BAT_USAGE },
  { value: "centre_sante", label: "Centre de santé / hôpital", type: "batiment", categorie: CATEGORIE_BAT_USAGE },
  { value: "hotel_hebergement", label: "Hôtel / hébergement", type: "batiment", categorie: CATEGORIE_BAT_USAGE },
  { value: "commerce_marche", label: "Commerce / marché", type: "batiment", categorie: CATEGORIE_BAT_USAGE },

  // ----- Aménagements extérieurs (3) -----
  { value: "cloture_site", label: "Clôtures / portails de site", type: "batiment", categorie: CATEGORIE_BAT_AMENAGEMENTS },
  { value: "vrd_lotissement", label: "VRD de lotissement (voiries et réseaux divers)", type: "batiment", categorie: CATEGORIE_BAT_AMENAGEMENTS },
  { value: "fosse_assainissement", label: "Fosse septique / assainissement autonome", type: "batiment", categorie: CATEGORIE_BAT_AMENAGEMENTS },
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

/** Sous-types (optionnellement d'un seul type) regroupes par categorie, dans l'ordre du catalogue. */
export function groupesTypesDetailles(type?: TypeChantier): { categorie: string; types: TypeDetail[] }[] {
  const source = type ? typesDetaillesPour(type) : TYPES_DETAILLES;
  const ordre: string[] = [];
  const parCategorie = new Map<string, TypeDetail[]>();
  for (const t of source) {
    const categorie = t.categorie ?? "Autres";
    if (!parCategorie.has(categorie)) {
      parCategorie.set(categorie, []);
      ordre.push(categorie);
    }
    parCategorie.get(categorie)!.push(t);
  }
  return ordre.map((categorie) => ({ categorie, types: parCategorie.get(categorie)! }));
}
