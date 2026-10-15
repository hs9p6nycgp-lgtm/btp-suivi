-- ==============================================================
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
  on chantier_utilisateurs for all to authenticated using (true) with check (true);