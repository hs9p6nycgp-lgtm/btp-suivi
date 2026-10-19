-- ==============================================================
-- BTP Suivi Pro - Phase 2.2 : Approvisionnements et livraisons
-- A executer dans Supabase apres 0005_phase2_journal.sql
-- ==============================================================

create table if not exists livraisons (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  materiau text not null,
  fournisseur text,
  quantite numeric(12,2) not null default 0,
  numero_bon text,
  camion text,
  photo_bon text,
  date_livraison date not null default current_date,
  created_at timestamptz not null default now()
);

alter table livraisons enable row level security;

create policy "livraisons - acces"
  on livraisons for all to authenticated
  using (user_can_access_chantier(chantier_id));