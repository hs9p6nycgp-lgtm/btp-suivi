-- ==============================================================
-- BTP Suivi Pro - Module Approvisionnements (APP-03 / APP-04)
-- Seuils d'alerte de stock parametrables par chantier et par materiau
-- (regle RG-07 : tous les seuils d'alerte sont parametrables par chantier)
-- A executer dans Supabase apres 0015_reparation_colonnes_chantiers.sql
-- ==============================================================

create table if not exists seuils_stock_chantier (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  materiau text not null,
  seuil numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (chantier_id, materiau)
);

comment on table seuils_stock_chantier is 'Seuil d''alerte de stock bas, par materiau et par chantier (APP-04)';

alter table seuils_stock_chantier enable row level security;

-- Meme regle d'acces que les autres tables rattachees a un chantier (voir 0007)
drop policy if exists "seuils stock - acces" on seuils_stock_chantier;
create policy "seuils stock - acces"
  on seuils_stock_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
