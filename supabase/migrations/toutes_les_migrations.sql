-- ==============================================================
-- BTP Suivi Pro - V0 (demo) - schema initial
-- A executer dans Supabase : SQL Editor > New query > Run
-- ==============================================================

-- Chantiers
create table if not exists chantiers (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type text not null check (type in ('route', 'batiment')),
  maitre_ouvrage text,
  montant_marche bigint not null default 0,
  date_debut date,
  date_fin_prevue date,
  seuil_ecart_pct numeric(5,2) not null default 10.00,
  statut text not null default 'en_preparation'
    check (statut in ('en_preparation','en_cours','suspendu','receptionne_provisoirement','cloture')),
  created_at timestamptz not null default now()
);

-- Postes du DQE
create table if not exists postes_dqe (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  code text,
  designation text not null,
  unite text not null,
  quantite_marche numeric(12,2) not null default 0,
  prix_unitaire bigint not null default 0,
  created_at timestamptz not null default now()
);

-- Quantites realisees (saisie terrain)
create table if not exists quantites_realisees (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  poste_dqe_id uuid not null references postes_dqe(id) on delete cascade,
  quantite numeric(12,2) not null,
  date_saisie date not null default current_date,
  created_at timestamptz not null default now()
);

-- Alertes
create table if not exists alertes (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  poste_dqe_id uuid references postes_dqe(id) on delete set null,
  type text not null default 'ecart_quantite',
  valeur numeric(12,2) not null,
  seuil numeric(12,2) not null,
  statut text not null default 'ouverte' check (statut in ('ouverte','acquittee','cloturee')),
  date_alerte timestamptz not null default now()
);

-- Securite (V0 : un seul admin, acces authentifie total)
alter table chantiers enable row level security;
alter table postes_dqe enable row level security;
alter table quantites_realisees enable row level security;
alter table alertes enable row level security;

create policy "acces authentifie - chantiers"
  on chantiers for all to authenticated using (true) with check (true);
create policy "acces authentifie - postes_dqe"
  on postes_dqe for all to authenticated using (true) with check (true);
create policy "acces authentifie - quantites_realisees"
  on quantites_realisees for all to authenticated using (true) with check (true);
create policy "acces authentifie - alertes"
  on alertes for all to authenticated using (true) with check (true);-- ==============================================================
-- BTP Suivi Pro - Phase 1.1 : Authentification et roles
-- A executer dans Supabase apres 0001_v0_schema.sql
-- ==============================================================

-- Profils utilisateurs (1 ligne par compte auth.users)
create table if not exists profils (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text,
  email text,
  telephone text,
  role_global text not null default 'utilisateur'
    check (role_global in ('administrateur','utilisateur')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Roles par chantier
create table if not exists chantier_utilisateurs (
  chantier_id uuid not null references chantiers(id) on delete cascade,
  utilisateur_id uuid not null references profils(id) on delete cascade,
  role text not null
    check (role in ('administrateur','conducteur','chef_equipe','qualite','lecture')),
  created_at timestamptz not null default now(),
  primary key (chantier_id, utilisateur_id)
);

-- Retro-remplissage des profils deja existants
insert into profils (id, email, role_global)
select id, email, 'utilisateur'
from auth.users
on conflict (id) do nothing;

-- Creation automatique du profil lors de l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profils (id, email, nom, telephone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nom', ''),
    coalesce(new.raw_user_meta_data->>'telephone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Securite RLS (V1 : acces authentifie total, comme en V0)
alter table profils enable row level security;
alter table chantier_utilisateurs enable row level security;

create policy "acces authentifie - profils"
  on profils for all to authenticated using (true) with check (true);
create policy "acces authentifie - chantier_utilisateurs"
  on chantier_utilisateurs for all to authenticated using (true) with check (true);-- ==============================================================
-- BTP Suivi Pro - Phase 1.2 : Chantiers detailles
-- A executer dans Supabase apres 0002_phase1_auth_roles.sql
-- ==============================================================

-- Informations de localisation du chantier
alter table chantiers
  add column if not exists latitude numeric(9,6),
  add column if not exists longitude numeric(9,6);

-- Intervenants d'un chantier
create table if not exists intervenants_chantier (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  nom text not null,
  fonction text,
  telephone text,
  email text,
  created_at timestamptz not null default now()
);

-- Decoupage : sections et PK (route) ou niveaux et lots (batiment)
create table if not exists sections_chantier (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  nom text not null,
  pk_debut numeric(10,3),
  pk_fin numeric(10,3),
  niveau text,
  lot text,
  type_ouvrage text,
  created_at timestamptz not null default now()
);

-- Documents joints au chantier
create table if not exists documents_chantier (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  nom text not null,
  type text not null default 'autre'
    check (type in ('plan','marche','ordre_service','pv','autre')),
  chemin text not null,
  uploaded_by uuid references profils(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Bucket de stockage (tentative automatique ; sinon le creer dans Storage)
insert into storage.buckets (id, name, public)
values ('chantiers-documents', 'chantiers-documents', false)
on conflict (id) do nothing;

-- Securite RLS (V1 : acces authentifie total, comme en V0)
alter table intervenants_chantier enable row level security;
alter table sections_chantier enable row level security;
alter table documents_chantier enable row level security;

create policy "acces authentifie - intervenants_chantier"
  on intervenants_chantier for all to authenticated using (true) with check (true);
create policy "acces authentifie - sections_chantier"
  on sections_chantier for all to authenticated using (true) with check (true);
create policy "acces authentifie - documents_chantier"
  on documents_chantier for all to authenticated using (true) with check (true);

-- Acces authentifie au bucket de documents
create policy "acces authentifie - storage chantiers-documents"
  on storage.objects for all to authenticated
  using (bucket_id = 'chantiers-documents')
  with check (bucket_id = 'chantiers-documents');-- ==============================================================
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

-- Securite RLS (V1 : acces authentifie total)
alter table parametres_metre enable row level security;
alter table bpu_postes enable row level security;

create policy "acces authentifie - parametres_metre"
  on parametres_metre for all to authenticated using (true) with check (true);
create policy "acces authentifie - bpu_postes"
  on bpu_postes for all to authenticated using (true) with check (true);-- ==============================================================
-- BTP Suivi Pro - Phase 2.1 : Journal de chantier
-- A executer dans Supabase apres 0004_phase1_metre_bpu.sql
-- ==============================================================

create table if not exists journaux (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  date_journal date not null default current_date,
  meteo text,
  observations text,
  statut text not null default 'brouillon'
    check (statut in ('brouillon','valide')),
  created_by uuid references profils(id) on delete set null,
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

create table if not exists journal_effectifs (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journaux(id) on delete cascade,
  corps_metier text not null,
  nombre integer not null default 0
);

create table if not exists journal_engins (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journaux(id) on delete cascade,
  type_engin text not null,
  immatriculation text,
  heures_marche numeric(6,2) not null default 0,
  quantite_produite numeric(12,2)
);

create table if not exists incidents_journal (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journaux(id) on delete cascade,
  type text not null
    check (type in ('panne','intemperie','accident','arret','autre')),
  description text,
  duree_heures numeric(6,2) not null default 0
);

create table if not exists photos_journal (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journaux(id) on delete cascade,
  chemin text not null,
  legende text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  created_at timestamptz not null default now()
);

-- Lien journal / section pour les quantites realisees
alter table quantites_realisees
  add column if not exists journal_id uuid references journaux(id) on delete set null,
  add column if not exists section_id uuid references sections_chantier(id) on delete set null;

-- Securite RLS (V1 : acces authentifie total)
alter table journaux enable row level security;
alter table journal_effectifs enable row level security;
alter table journal_engins enable row level security;
alter table incidents_journal enable row level security;
alter table photos_journal enable row level security;

create policy "acces authentifie - journaux"
  on journaux for all to authenticated using (true) with check (true);
create policy "acces authentifie - journal_effectifs"
  on journal_effectifs for all to authenticated using (true) with check (true);
create policy "acces authentifie - journal_engins"
  on journal_engins for all to authenticated using (true) with check (true);
create policy "acces authentifie - incidents_journal"
  on incidents_journal for all to authenticated using (true) with check (true);
create policy "acces authentifie - photos_journal"
  on photos_journal for all to authenticated using (true) with check (true);-- ==============================================================
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

create policy "acces authentifie - livraisons"
  on livraisons for all to authenticated using (true) with check (true);-- ==============================================================
-- BTP Suivi Pro - Multi-tenant : isolation des donnees par compte
-- A executer dans Supabase apres 0006_phase2_livraisons.sql
-- ==============================================================

-- Proprietaire d'un chantier
alter table chantiers
  add column if not exists proprietaire_id uuid references profils(id) on delete set null,
  alter column proprietaire_id set default auth.uid();

-- Fonctions d'acces (security definer pour eviter la recursion RLS)
create or replace function user_can_access_chantier(cid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from chantiers c
    where c.id = cid
      and (
        c.proprietaire_id = auth.uid()
        or exists (
          select 1
          from chantier_utilisateurs cu
          where cu.chantier_id = c.id
            and cu.utilisateur_id = auth.uid()
        )
      )
  );
$$;

create or replace function user_can_manage_chantier(cid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from chantiers c
    where c.id = cid
      and (
        c.proprietaire_id = auth.uid()
        or exists (
          select 1
          from chantier_utilisateurs cu
          where cu.chantier_id = c.id
            and cu.utilisateur_id = auth.uid()
            and cu.role = 'administrateur'
        )
      )
  );
$$;

create or replace function user_can_access_journal(jid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from journaux j
    where j.id = jid and user_can_access_chantier(j.chantier_id)
  );
$$;

-- Suppression des anciennes policies "acces total" pour les tables liees aux chantiers
drop policy if exists "acces authentifie - chantiers" on chantiers;
drop policy if exists "acces authentifie - postes_dqe" on postes_dqe;
drop policy if exists "acces authentifie - quantites_realisees" on quantites_realisees;
drop policy if exists "acces authentifie - alertes" on alertes;
drop policy if exists "acces authentifie - intervenants_chantier" on intervenants_chantier;
drop policy if exists "acces authentifie - sections_chantier" on sections_chantier;
drop policy if exists "acces authentifie - documents_chantier" on documents_chantier;
drop policy if exists "acces authentifie - parametres_metre" on parametres_metre;
drop policy if exists "acces authentifie - journaux" on journaux;
drop policy if exists "acces authentifie - journal_effectifs" on journal_effectifs;
drop policy if exists "acces authentifie - journal_engins" on journal_engins;
drop policy if exists "acces authentifie - incidents_journal" on incidents_journal;
drop policy if exists "acces authentifie - photos_journal" on photos_journal;
drop policy if exists "acces authentifie - livraisons" on livraisons;
drop policy if exists "acces authentifie - chantier_utilisateurs" on chantier_utilisateurs;

-- Chantiers : acces restreint au proprietaire + membres
create policy "chantier - acces"
  on chantiers for all to authenticated
  using (user_can_access_chantier(id))
  with check (proprietaire_id = auth.uid() or user_can_manage_chantier(id));

-- Membres d'un chantier
create policy "chantier_utilisateurs - lecture"
  on chantier_utilisateurs for select to authenticated
  using (user_can_access_chantier(chantier_id));
create policy "chantier_utilisateurs - gestion"
  on chantier_utilisateurs for insert to authenticated
  with check (user_can_manage_chantier(chantier_id));
create policy "chantier_utilisateurs - modification"
  on chantier_utilisateurs for update to authenticated
  using (user_can_manage_chantier(chantier_id))
  with check (user_can_manage_chantier(chantier_id));
create policy "chantier_utilisateurs - suppression"
  on chantier_utilisateurs for delete to authenticated
  using (user_can_manage_chantier(chantier_id));

-- Tables directement liees a un chantier
create policy "postes_dqe - acces"
  on postes_dqe for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "quantites_realisees - acces"
  on quantites_realisees for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "alertes - acces"
  on alertes for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "intervenants_chantier - acces"
  on intervenants_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "sections_chantier - acces"
  on sections_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "documents_chantier - acces"
  on documents_chantier for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "parametres_metre - acces"
  on parametres_metre for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "livraisons - acces"
  on livraisons for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));

-- Journaux
create policy "journaux - acces"
  on journaux for all to authenticated
  using (user_can_access_chantier(chantier_id))
  with check (user_can_access_chantier(chantier_id));
create policy "journal_effectifs - acces"
  on journal_effectifs for all to authenticated
  using (user_can_access_journal(journal_id))
  with check (user_can_access_journal(journal_id));
create policy "journal_engins - acces"
  on journal_engins for all to authenticated
  using (user_can_access_journal(journal_id))
  with check (user_can_access_journal(journal_id));
create policy "incidents_journal - acces"
  on incidents_journal for all to authenticated
  using (user_can_access_journal(journal_id))
  with check (user_can_access_journal(journal_id));
create policy "photos_journal - acces"
  on photos_journal for all to authenticated
  using (user_can_access_journal(journal_id))
  with check (user_can_access_journal(journal_id));

-- BPU reste partage (reference commune) ; pour le rendre prive, remplacez par user_can_access...
alter table bpu_postes enable row level security;
drop policy if exists "acces authentifie - bpu_postes" on bpu_postes;
create policy "bpu_postes - lecture partagee"
  on bpu_postes for select to authenticated using (true);
create policy "bpu_postes - ecriture partagee"
  on bpu_postes for insert to authenticated with check (true);
create policy "bpu_postes - modification partagee"
  on bpu_postes for update to authenticated using (true) with check (true);
create policy "bpu_postes - suppression partagee"
  on bpu_postes for delete to authenticated using (true);-- ==============================================================
-- BTP Suivi Pro - Phase 3.1 : Planning et Coûts
-- A executer dans Supabase apres 0007_phase3_multitenant_isolation.sql
-- ==============================================================

-- Tâches du planning (PLA-01)
create table if not exists taches_planning (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  nom text not null,
  description text,
  duree_jours integer not null default 1,
  date_prevue_debut date,
  date_prevue_fin date,
  date_reelle_debut date,
  date_reelle_fin date,
  avancement_pct numeric(5,2) not null default 0.00 check (avancement_pct between 0 and 100),
  est_jalon boolean not null default false,
  statut text not null default 'a_faire'
    check (statut in ('a_faire','en_cours','termine','retarde','annule')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dépendances entre tâches (PERT) (PLA-01)
create table if not exists dependances_planning (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  tache_predecesseur_id uuid not null references taches_planning(id) on delete cascade,
  tache_successeur_id uuid not null references taches_planning(id) on delete cascade,
  type_dependance text not null default 'fin_debut'
    check (type_dependance in ('fin_debut','debut_debut','fin_fin','debut_fin')),
  decalage_jours integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tache_predecesseur_id, tache_successeur_id)
);

-- Dépenses réelles (COU-02)
create table if not exists depenses_reelles (
  id uuid primary key default gen_random_uuid(),
  chantier_id uuid not null references chantiers(id) on delete cascade,
  categorie text not null
    check (categorie in ('materiaux','main_doeuvre','engins','sous_traitance','carburant','autre')),
  designation text not null,
  quantite numeric(12,2) not null default 0,
  unite text,
  prix_unitaire bigint not null default 0,
  montant_total bigint not null default 0,
  date_depense date not null default current_date,
  reference text, -- n° de bon, facture, etc.
  notes text,
  created_at timestamptz not null default now()
);

-- Securite RLS
alter table taches_planning enable row level security;
alter table dependances_planning enable row level security;
alter table depenses_reelles enable row level security;

create policy "taches_planning - acces"
  on taches_planning for all to authenticated
  using (true) with check (true);
create policy "dependances_planning - acces"
  on dependances_planning for all to authenticated
  using (true) with check (true);
create policy "depenses_reelles - acces"
  on depenses_reelles for all to authenticated
  using (true) with check (true);