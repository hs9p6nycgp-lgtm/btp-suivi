-- ==============================================================
-- BTP Suivi Pro - Situations de paiement (decomptes)
--
-- Ce que l'entreprise demande a etre paye pour les travaux realises :
-- valorisation cumulee, montant brut, retenue de garantie, acomptes et
-- net a payer, avec le suivi du statut (brouillon, soumise, acceptee, payee).
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

create table if not exists situations_paiement (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  numero text not null,
  periode_debut date not null,
  periode_fin date not null,
  cumul_avant numeric(14,2) not null default 0,
  cumul_periode numeric(14,2) not null default 0,
  decompte_anterieur numeric(14,2) not null default 0,
  acomptes numeric(14,2) not null default 0,
  taux_retenue numeric(5,2) not null default 10,
  montant_brut numeric(14,2) not null default 0,
  retenue numeric(14,2) not null default 0,
  net_a_payer numeric(14,2) not null default 0,
  statut text not null default 'brouillon'
    check (statut in ('brouillon','soumise','acceptee','paye','rejetee')),
  observations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chantier_id, numero)
);

comment on table situations_paiement is
  'Situations de paiement (decomptes) : cumul valorise, retenue de garantie, net a payer';

create index if not exists idx_situations_paiement_chantier
  on situations_paiement(chantier_id, periode_fin desc);

alter table situations_paiement enable row level security;

drop policy if exists "situations_paiement - acces" on situations_paiement;
create policy "situations_paiement - acces"
  on situations_paiement for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
