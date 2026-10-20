-- ==============================================================
-- BTP Suivi Pro - Devis : remise, TVA et conditions de paiement
-- (audit metier du 19/10/2026, §3 : « pas de client, date, numero de
-- devis, TVA, remise, conditions de paiement »).
--
-- La remise et la TVA sont des taux en pourcentage ; 0 signifie
-- « non applicable » (devis sans remise, prix hors taxes).
--
-- Idempotente : peut etre relancee sans risque.
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

alter table devis
  add column if not exists remise_pct numeric(5,2) not null default 0,
  add column if not exists tva_pct numeric(5,2) not null default 0,
  add column if not exists conditions_paiement text;

comment on column devis.remise_pct is 'Remise commerciale en pourcentage du total brut (0 = aucune)';
comment on column devis.tva_pct is 'Taux de TVA en pourcentage (0 = prix hors taxes)';
comment on column devis.conditions_paiement is 'Conditions de paiement (ex. : 30 % a la commande, solde a la reception)';

-- Verification rapide (facultatif) :
-- select numero, remise_pct, tva_pct, conditions_paiement from devis order by created_at desc;
