-- ==============================================================
-- BTP Suivi Pro - Rattachement des chantiers sans proprietaire
--
-- Apres l'activation de l'isolation (RLS), un chantier dont
-- « proprietaire_id » est vide n'est visible par PERSONNE : son
-- proprietaire ne le voit plus, et les autres comptes non plus.
--
-- Ce script permet de :
--   1. verifier s'il reste des chantiers sans proprietaire ;
--   2. les lister (nom, date, montant) pour les reconnaitre ;
--   3. les rattacher au bon compte (a faire manuellement, compte par
--      compte : une ligne par proprietaire).
--
-- A executer dans Supabase : SQL Editor > New query > Run
-- (SQL Editor dispose des droits d'administration).
-- ==============================================================

-- ----------------------------------------------------------------------------
-- 1) Verification : combien de chantiers n'ont pas de proprietaire ?
-- ----------------------------------------------------------------------------
select count(*) as "chantiers sans proprietaire"
from chantiers
where proprietaire_id is null;

-- ----------------------------------------------------------------------------
-- 2) Liste detaillee (pour les reconnaitre avant de les rattacher)
-- ----------------------------------------------------------------------------
select
  c.id,
  c.nom,
  c.type,
  c.montant_marche,
  c.created_at::date as "cree le",
  (select count(*) from postes_dqe p where p.chantier_id = c.id) as "postes DQE",
  (select count(*) from journaux j where j.chantier_id = c.id) as "journaux"
from chantiers c
where c.proprietaire_id is null
order by c.created_at;

-- ----------------------------------------------------------------------------
-- 3) Rattachement
--    Remplacez <UUID_DU_COMPTE> par l'identifiant du profil du proprietaire
--    (voir «select id, email from profils order by email;» plus bas).
--    ⚠ Ne lancez cette requete que pour les chantiers qui vous appartiennent
--      et apres avoir identifie le bon compte : elle modifie les donnees.
-- ----------------------------------------------------------------------------

-- Liste des comptes et de leur identifiant :
-- select id, email, nom from profils order by email;

-- Exemple : rattacher les chantiers sans proprietaire crees avant une date
-- donnee a un compte (a adapter, puis a verifier le resultat) :
--
-- update chantiers
-- set proprietaire_id = '<UUID_DU_COMPTE>'
-- where proprietaire_id is null
--   and created_at < '2026-10-19';
--
-- Verification finale :
-- select count(*) as "chantiers sans proprietaire restants" from chantiers where proprietaire_id is null;
