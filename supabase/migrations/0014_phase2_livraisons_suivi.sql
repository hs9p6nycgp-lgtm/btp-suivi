-- ==============================================================
-- BTP Suivi Pro - Module Approvisionnements (APP-02)
-- Comparaison quantites commandees, livrees et mises en oeuvre
-- A executer dans Supabase apres 0013_phase4_fournisseurs_conditions.sql
-- ==============================================================

alter table livraisons
  add column if not exists quantite_commandee numeric(14,2) default 0,
  add column if not exists quantite_mise_en_oeuvre numeric(14,2) default 0;

comment on column livraisons.quantite_commandee is 'Quantite commandee pour ce materiau (cumulee)';
comment on column livraisons.quantite_mise_en_oeuvre is 'Quantite mise en oeuvre sur le chantier (cumulee)';
