-- =====================================================
-- PARTIE 1 : à exécuter en premier (tables + sécurité)
-- =====================================================
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  color text not null default '#1f3d3a'
);

create table products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  genre text,
  year int,
  type text not null default 'Livre',
  barcode text,
  cover text,
  owners text[] not null default '{}',
  duplicate boolean not null default false,
  added_by uuid references profiles(id),
  created_at timestamptz not null default now()  -- date d'enregistrement automatique
);
create index on products (barcode);

alter table profiles enable row level security;
alter table products enable row level security;

-- Seuls les comptes connectés (vous 4) accèdent aux données
create policy "profils lisibles" on profiles for select to authenticated using (true);
create policy "produits famille" on products for all to authenticated using (true) with check (true);

-- =====================================================
-- PARTIE 2 : à exécuter APRÈS avoir créé les 4 comptes
-- (remplacez les 4 adresses e-mail)
-- =====================================================
-- insert into profiles (id, name, color) select id, 'Robert',   '#2f6f8f' from auth.users where email = 'EMAIL_DE_ROBERT';
-- insert into profiles (id, name, color) select id, 'Isabelle', '#b8456b' from auth.users where email = 'EMAIL_DISABELLE';
-- insert into profiles (id, name, color) select id, 'Timothée', '#3f8a5a' from auth.users where email = 'EMAIL_DE_TIMOTHEE';
-- insert into profiles (id, name, color) select id, 'Raphaël',  '#7a5ab0' from auth.users where email = 'EMAIL_DE_RAPHAEL';
