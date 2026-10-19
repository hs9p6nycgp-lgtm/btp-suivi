-- ==============================================================
-- BTP Suivi Pro - Phase 1.3 : Metre, BPU et parametres de calcul
-- A executer dans Supabase apres 0003_phase1_chantiers_details.sql
-- ==============================================================

-- Parametres de calcul par chantier
create table if not exists parametres_metre (
  chantier_id uuid primary key references chantiers(id) on delete cascade,
  coefficient_foisonnement numeric(6,3) not null default 1.200,
  coefficient_compactage numeric(6,3) not null default 1.000,
  coefficient_pertes numeric(6,3) not null default 1.000,
  capacite_benne_m3 numeric(6,2) not null default 15.00,
  updated_at timestamptz not null default now()
);

-- Bibliotheque de prix unitaires (BPU)
create table if not exists bpu_postes (
  id uuid primary key default gen_random_uuid(),
  code text,
  designation text not null,
  unite text not null,
  prix_unitaire bigint not null default 0,
  source text,
  date_source date,
  date_validite date,
  statut text not null default 'a_verifier'
    check (statut in ('valide','a_verifier')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Securite RLS (V3 : isolation par chantier)
alter table parametres_metre enable row level security;
alter table bpu_postes enable row level security;

create policy "parametres_metre - acces"
  on parametres_metre for all to authenticated
  using (user_can_access_chantier(chantier_id));