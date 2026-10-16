// Types TypeScript pour le schema V0 (supabase/migrations/0001_v0_schema.sql)

export type TypeChantier = "route" | "batiment";
export type StatutChantier =
  | "en_preparation"
  | "en_cours"
  | "suspendu"
  | "receptionne_provisoirement"
  | "cloture";
export type StatutAlerte = "ouverte" | "acquittee" | "cloturee";

export interface Chantier {
  id: string;
  nom: string;
  proprietaire_id: string | null;
  type: TypeChantier;
  longueur: number | null;
  largeur: number | null;
  hauteur: number | null;
  maitre_ouvrage: string | null;
  montant_marche: number; // en FCFA (sans decimale)
  date_debut: string | null;
  date_fin_prevue: string | null;
  latitude: number | null;
  longitude: number | null;
  seuil_ecart_pct: number;
  statut: StatutChantier;
  created_at: string;
}

export interface PosteDQE {
  id: string;
  chantier_id: string;
  code: string | null;
  designation: string;
  unite: string;
  quantite_marche: number; // 2 decimales
  prix_unitaire: number; // en FCFA
  created_at: string;
}

export interface QuantiteRealisee {
  id: string;
  chantier_id: string;
  poste_dqe_id: string;
  quantite: number;
  date_saisie: string;
  journal_id: string | null;
  section_id: string | null;
  created_at: string;
}

export interface Alerte {
  id: string;
  chantier_id: string;
  poste_dqe_id: string | null;
  type: string;
  valeur: number;
  seuil: number;
  statut: StatutAlerte;
  date_alerte: string;
}

export type RoleChantier =
  | "administrateur"
  | "conducteur"
  | "chef_equipe"
  | "qualite"
  | "lecture";

export type StatutJournal = "brouillon" | "valide";

export interface Journal {
  id: string;
  chantier_id: string;
  date_journal: string;
  meteo: string | null;
  observations: string | null;
  statut: StatutJournal;
  created_by: string | null;
  created_at: string;
  validated_at: string | null;
}

export interface JournalEffectif {
  id: string;
  journal_id: string;
  corps_metier: string;
  nombre: number;
}

export interface JournalEngin {
  id: string;
  journal_id: string;
  type_engin: string;
  immatriculation: string | null;
  heures_marche: number;
  quantite_produite: number | null;
}

export interface IncidentJournal {
  id: string;
  journal_id: string;
  type: "panne" | "intemperie" | "accident" | "arret" | "autre";
  description: string | null;
  duree_heures: number;
}

export interface PhotoJournal {
  id: string;
  journal_id: string;
  chemin: string;
  legende: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Livraison {
  id: string;
  chantier_id: string;
  materiau: string;
  fournisseur: string | null;
  quantite: number;
  numero_bon: string | null;
  camion: string | null;
  photo_bon: string | null;
  date_livraison: string;
  created_at: string;
}

export type StatutTache = "a_faire" | "en_cours" | "termine" | "retarde" | "annule";
export type TypeDependance = "fin_debut" | "debut_debut" | "fin_fin" | "debut_fin";
export type CategorieDepense = "materiaux" | "main_doeuvre" | "engins" | "sous_traitance" | "carburant" | "autre";

export interface TachePlanning {
  id: string;
  chantier_id: string;
  nom: string;
  description: string | null;
  duree_jours: number;
  date_prevue_debut: string | null;
  date_prevue_fin: string | null;
  date_reelle_debut: string | null;
  date_reelle_fin: string | null;
  avancement_pct: number;
  est_jalon: boolean;
  statut: StatutTache;
  created_at: string;
  updated_at: string;
}

export interface DependancePlanning {
  id: string;
  chantier_id: string;
  tache_predecesseur_id: string;
  tache_successeur_id: string;
  type_dependance: TypeDependance;
  decalage_jours: number;
  created_at: string;
}

export interface DepenseReelle {
  id: string;
  chantier_id: string;
  categorie: CategorieDepense;
  designation: string;
  quantite: number;
  unite: string | null;
  prix_unitaire: number;
  montant_total: number;
  date_depense: string;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface CalculPert {
  tache_id: string;
  nom: string;
  duree_jours: number;
  es: number; // Early Start (date au plus tôt)
  ef: number; // Early Finish
  ls: number; // Late Start (date au plus tard)
  lf: number; // Late Finish
  marge: number; // Float / marge
  est_critique: boolean;
  est_jalon: boolean;
}

export interface Profil {
  id: string;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  role_global: "administrateur" | "utilisateur";
  created_at: string;
  updated_at: string;
}

export interface ParametresMetre {
  chantier_id: string;
  coefficient_foisonnement: number;
  coefficient_compactage: number;
  coefficient_pertes: number;
  capacite_benne_m3: number;
  updated_at: string;
}

export interface BpuPoste {
  id: string;
  code: string | null;
  designation: string;
  unite: string;
  prix_unitaire: number;
  source: string | null;
  date_source: string | null;
  date_validite: string | null;
  statut: "valide" | "a_verifier";
  created_at: string;
  updated_at: string;
}

export interface ChantierUtilisateur {
  chantier_id: string;
  utilisateur_id: string;
  role: RoleChantier;
  created_at: string;
}

export interface IntervenantChantier {
  id: string;
  chantier_id: string;
  nom: string;
  fonction: string | null;
  telephone: string | null;
  email: string | null;
  created_at: string;
}

export interface SectionChantier {
  id: string;
  chantier_id: string;
  nom: string;
  pk_debut: number | null;
  pk_fin: number | null;
  niveau: string | null;
  lot: string | null;
  type_ouvrage: string | null;
  created_at: string;
}

export interface DocumentChantier {
  id: string;
  chantier_id: string;
  nom: string;
  type: "plan" | "marche" | "ordre_service" | "pv" | "autre";
  chemin: string;
  uploaded_by: string | null;
  created_at: string;
}