create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'account_status_type' and n.nspname = 'public'
  ) then
    create type account_status_type as enum ('active', 'pending_verification', 'suspended', 'banned', 'deleted');
  end if;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_provider_id text unique not null,
  email text unique,
  account_status account_status_type not null default 'active',
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users add column if not exists email_verified boolean not null default false;

alter table users
  alter column account_status type text,
  alter column account_status set default 'active';

update users
set account_status = 'active'
where account_status is null or account_status not in ('active', 'pending_verification', 'suspended', 'banned', 'deleted');

alter table users
  add constraint users_account_status_check
  check (account_status in ('active', 'pending_verification', 'suspended', 'banned', 'deleted'));

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_provider_id text not null unique references users(auth_provider_id) on delete cascade,
  username text not null,
  display_name text not null,
  avatar_url text,
  bio text,
  public_id text not null unique,
  level integer not null default 1,
  xp integer not null default 0,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  likes_received integer not null default 0,
  is_creator boolean not null default false,
  is_verified boolean not null default false,
  account_status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles add column if not exists auth_provider_id text;
alter table profiles add column if not exists xp integer not null default 0;
alter table profiles add column if not exists likes_received integer not null default 0;

update profiles p
set auth_provider_id = u.auth_provider_id
from users u
where p.auth_provider_id is null and p.user_id = u.id;

update profiles
set xp = experience_points
where xp = 0 and experience_points is not null;

update profiles
set likes_received = likes_received_count
where likes_received = 0 and likes_received_count is not null;

alter table profiles alter column auth_provider_id set not null;

alter table profiles
  add constraint profiles_auth_provider_id_unique unique (auth_provider_id);

create unique index if not exists profiles_username_normalized_unique_idx on profiles((lower(username)));

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role_id)
);

create table if not exists user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references users(id) on delete cascade,
  following_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references users(id) on delete cascade,
  blocked_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists mutes (
  id uuid primary key default gen_random_uuid(),
  muter_id uuid not null references users(id) on delete cascade,
  muted_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (muter_id, muted_id),
  check (muter_id <> muted_id)
);

create index if not exists idx_follows_follower_id on follows(follower_id);
create index if not exists idx_follows_following_id on follows(following_id);
create index if not exists idx_blocks_blocker_id on blocks(blocker_id);
create index if not exists idx_blocks_blocked_id on blocks(blocked_id);
create index if not exists idx_mutes_muter_id on mutes(muter_id);
create index if not exists idx_mutes_muted_id on mutes(muted_id);
