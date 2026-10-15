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
  type: TypeChantier;
  maitre_ouvrage: string | null;
  montant_marche: number; // en FCFA (sans decimale)
  date_debut: string | null;
  date_fin_prevue: string | null;
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