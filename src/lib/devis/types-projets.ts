// Correspondance entre les types de chantier (catalogue de 100, CHA-01)
// et les modeles de devis detailles (15 calculateurs de `templates.ts`).
//
// Principe : chaque type de chantier propose le modele de calcul le plus proche
// de la nature des travaux. Le modele reste modifiable dans l'interface.
// La correspondance est verifiee automatiquement (test) : les 100 types doivent
// pointer vers un modele existant.

/** Type de chantier (value de `TYPES_DETAILLES`) -> identifiant de modele de devis. */
export const TEMPLATE_PAR_TYPE_DE_CHANTIER: Record<string, string> = {
  // ===== Route =====
  // Terrassement et sols
  terrassement: "terrassement-route",
  deblai: "terrassement-route",
  remblai: "remblai-apport",
  decapage: "terrassement-route",
  stabilisation_sol: "terrassement-route",
  traitement_ravinement: "assainissement-fouille",
  // Chaussées et revêtements
  chaussee: "chaussee-bitume",
  couche_fondation: "terrassement-route",
  couche_base: "terrassement-route",
  revetement_bitumineux: "chaussee-bitume",
  revetement_beton: "chaussee-bitume",
  pavage: "chaussee-bitume",
  enduit_superficiel: "chaussee-bitume",
  accotement: "terrassement-route",
  entretien_chaussee: "chaussee-bitume",
  // Assainissement et drainage
  assainissement: "assainissement-fouille",
  caniveau: "voirie-bordures-caniveaux",
  buse_dalot: "assainissement-fouille",
  regard: "assainissement-fouille",
  puisard: "assainissement-fouille",
  drainage_tranchee: "assainissement-fouille",
  drainage_agricole: "assainissement-fouille",
  // Ouvrages d'art et structures
  ouvrage_art: "poutres-chaine",
  pont: "fondations-profondes",
  viaduc: "fondations-profondes",
  tunnel: "poutres-chaine",
  dalot_cadre: "poutres-chaine",
  mur_soutenement: "poutres-chaine",
  passage_souterrain: "poutres-chaine",
  traversee_cours_eau: "assainissement-fouille",
  // Voirie urbaine et accès
  voirie_urbaine: "voirie-bordures-caniveaux",
  bordure_trottoir: "voirie-bordures-caniveaux",
  rue_lotissement: "voirie-bordures-caniveaux",
  avenue_boulevard: "chaussee-bitume",
  carrefour_giratoire: "chaussee-bitume",
  piste_cyclable: "voirie-bordures-caniveaux",
  trottoir_cheminement: "voirie-bordures-caniveaux",
  parking: "voirie-bordures-caniveaux",
  // Routes rurales et pistes
  route_rurale: "chaussee-bitume",
  piste_acces: "terrassement-route",
  piste_agricole: "terrassement-route",
  // Équipements et sécurité
  marquage_routier: "chaussee-bitume",
  signalisation_verticale: "voirie-bordures-caniveaux",
  glissiere_securite: "voirie-bordures-caniveaux",
  eclairage_public: "voirie-bordures-caniveaux",
  feux_tricolores: "voirie-bordures-caniveaux",
  ralentisseurs: "voirie-bordures-caniveaux",
  garde_corps: "poutres-chaine",
  // Ouvrages spécifiques
  ferroviaire: "terrassement-route",
  piste_aerodrome: "chaussee-bitume",

  // ===== Bâtiment =====
  // Fondations et infrastructure
  fondations: "fondations-semelles",
  fondations_semelles: "fondations-semelles",
  fondations_profondes: "fondations-profondes",
  radier_general: "dalle-beton",
  longrines_chainages: "poutres-chaine",
  terrassement_batiment: "terrassement-route",
  // Structure et gros œuvre
  gros_oeuvre: "poteaux-beton-arme",
  poteaux_beton: "poteaux-beton-arme",
  poutres_beton: "poutres-chaine",
  voiles_porteurs: "poutres-chaine",
  dalle_beton_arme: "dalle-beton",
  plancher_hourdis: "plancher-poutrelles",
  escaliers: "dalle-beton",
  maconnerie_agglo: "mur-agglos",
  mur_banche: "mur-agglos",
  // Enveloppe et couverture
  charpente_couverture: "charpente-toiture",
  toiture_terrasse: "charpente-toiture",
  bardage: "charpente-toiture",
  zinguerie: "charpente-toiture",
  charpente_metallique: "charpente-toiture",
  // Cloisons et second œuvre
  cloisons: "mur-agglos",
  plafonds_platre: "peinture",
  menuiserie_bois: "charpente-toiture",
  menuiserie_aluminium: "charpente-toiture",
  menuiserie_metallique: "charpente-toiture",
  vitrerie: "charpente-toiture",
  plomberie_sanitaire: "mur-agglos",
  electricite_batiment: "mur-agglos",
  climatisation_ventilation: "mur-agglos",
  securite_incendie: "mur-agglos",
  // Finitions
  peinture_batiment: "peinture",
  revetement_sol: "finition-revetement-sol",
  faience_mur: "finition-revetement-sol",
  chape_ragreage: "finition-revetement-sol",
  finition: "finition-revetement-sol",
  second_oeuvre: "finition-revetement-sol",
  enduit_facade: "peinture",
  // Bâtiments par usage
  batiment_industriel: "poteaux-beton-arme",
  hangar: "charpente-toiture",
  entrepot_logistique: "poteaux-beton-arme",
  immeuble_bureaux: "poteaux-beton-arme",
  residence_logements: "poteaux-beton-arme",
  villa_maison: "mur-agglos",
  etablissement_scolaire: "poteaux-beton-arme",
  centre_sante: "poteaux-beton-arme",
  hotel_hebergement: "poteaux-beton-arme",
  commerce_marche: "poteaux-beton-arme",
  // Aménagements extérieurs
  cloture_site: "poutres-chaine",
  vrd_lotissement: "voirie-bordures-caniveaux",
  fosse_assainissement: "assainissement-fouille",
};

/** Identifiant du modele de devis propose pour un type de chantier (null si inconnu). */
export function templatePourTypeDeChantier(typeValue: string): string | null {
  return TEMPLATE_PAR_TYPE_DE_CHANTIER[typeValue] ?? null;
}

/** Types de chantier qui utilisent un modele de devis donne (ordre du catalogue). */
export function typesPourTemplate(templateId: string): string[] {
  return Object.entries(TEMPLATE_PAR_TYPE_DE_CHANTIER)
    .filter(([, id]) => id === templateId)
    .map(([value]) => value);
}
