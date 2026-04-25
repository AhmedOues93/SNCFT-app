-- SNCFT Digital Platform schema
-- Apply in your existing Supabase project (SQL Editor)

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('super_admin', 'editor', 'reviewer', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lines (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  is_active boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  latitude numeric,
  longitude numeric,
  is_active boolean not null default true,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.line_stations (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.lines(id) on delete cascade,
  station_id uuid not null references public.stations(id) on delete cascade,
  direction text not null check (direction in ('aller', 'retour')),
  stop_sequence int not null check (stop_sequence > 0),
  is_active boolean not null default true,
  is_published boolean not null default true,
  unique (line_id, station_id, direction),
  unique (line_id, direction, stop_sequence)
);

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.lines(id) on delete restrict,
  station_id uuid not null references public.stations(id) on delete restrict,
  direction text not null check (direction in ('aller', 'retour')),
  season text not null check (season in ('hiver', 'ete', 'ramadan')),
  train_number text not null,
  stop_sequence int not null check (stop_sequence > 0),
  scheduled_time time not null,
  valid_from date,
  valid_to date,
  is_published boolean not null default false,
  imported_batch_id uuid,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (line_id, direction, season, train_number, stop_sequence, scheduled_time)
);

create table if not exists public.fares (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.lines(id) on delete restrict,
  sections text not null,
  price_tnd numeric(10,3) not null check (price_tnd >= 0),
  valid_from date,
  valid_to date,
  is_published boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid references auth.users(id),
  import_type text not null check (import_type in ('schedules_csv', 'schedules_xml', 'fares_csv')),
  file_name text not null,
  status text not null check (status in ('preview', 'validated', 'published', 'failed')),
  rows_total int not null default 0,
  rows_valid int not null default 0,
  rows_invalid int not null default 0,
  errors jsonb,
  payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_schedules_search
  on public.schedules (season, direction, scheduled_time, is_published);
create index if not exists idx_schedules_line_station
  on public.schedules (line_id, station_id, stop_sequence);
create index if not exists idx_fares_line_publish
  on public.fares (line_id, is_published);
create index if not exists idx_line_stations_line_dir_seq
  on public.line_stations (line_id, direction, stop_sequence);

alter table public.admin_users enable row level security;
alter table public.lines enable row level security;
alter table public.stations enable row level security;
alter table public.line_stations enable row level security;
alter table public.schedules enable row level security;
alter table public.fares enable row level security;
alter table public.imports enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select role from public.admin_users where id = auth.uid() and is_active = true
$$;

create policy if not exists "public can read published lines" on public.lines
for select using (is_published = true);

create policy if not exists "public can read published stations" on public.stations
for select using (is_published = true);

create policy if not exists "public can read published line stations" on public.line_stations
for select using (is_published = true);

create policy if not exists "public can read published schedules" on public.schedules
for select using (is_published = true);

create policy if not exists "public can read published fares" on public.fares
for select using (is_published = true);

create policy if not exists "admins full access on core tables" on public.lines
for all using (public.current_user_role() in ('super_admin', 'editor', 'reviewer'))
with check (public.current_user_role() in ('super_admin', 'editor', 'reviewer'));

create policy if not exists "admins full access on stations" on public.stations
for all using (public.current_user_role() in ('super_admin', 'editor', 'reviewer'))
with check (public.current_user_role() in ('super_admin', 'editor', 'reviewer'));

create policy if not exists "admins full access on line stations" on public.line_stations
for all using (public.current_user_role() in ('super_admin', 'editor', 'reviewer'))
with check (public.current_user_role() in ('super_admin', 'editor', 'reviewer'));

create policy if not exists "admins full access on schedules" on public.schedules
for all using (public.current_user_role() in ('super_admin', 'editor', 'reviewer'))
with check (public.current_user_role() in ('super_admin', 'editor', 'reviewer'));

create policy if not exists "admins full access on fares" on public.fares
for all using (public.current_user_role() in ('super_admin', 'editor', 'reviewer'))
with check (public.current_user_role() in ('super_admin', 'editor', 'reviewer'));

create policy if not exists "admins manage imports" on public.imports
for all using (public.current_user_role() in ('super_admin', 'editor', 'reviewer'))
with check (public.current_user_role() in ('super_admin', 'editor', 'reviewer'));

create policy if not exists "admins read audit" on public.audit_logs
for select using (public.current_user_role() in ('super_admin', 'editor', 'reviewer', 'viewer'));

create policy if not exists "super admin manage users" on public.admin_users
for all using (public.current_user_role() = 'super_admin')
with check (public.current_user_role() = 'super_admin');

create table if not exists public.train_positions (
  id uuid primary key default gen_random_uuid(),
  train_id text not null,
  lat numeric not null,
  lng numeric not null,
  speed numeric,
  recorded_at timestamptz not null default now()
);

create table if not exists public.live_train_status (
  train_id text primary key,
  next_station text,
  delay_minutes int,
  status text,
  last_speed numeric,
  updated_at timestamptz not null default now()
);

create index if not exists idx_train_positions_train_time on public.train_positions(train_id, recorded_at desc);
create index if not exists idx_live_train_status_updated on public.live_train_status(updated_at desc);

alter table public.train_positions enable row level security;
alter table public.live_train_status enable row level security;

create policy if not exists "public can read live train status" on public.live_train_status
for select using (true);

create policy if not exists "public can read train positions" on public.train_positions
for select using (true);

create policy if not exists "driver prototype insert positions" on public.train_positions
for insert with check (true);

create policy if not exists "driver prototype upsert live status" on public.live_train_status
for insert with check (true);

create policy if not exists "driver prototype update live status" on public.live_train_status
for update using (true) with check (true);
