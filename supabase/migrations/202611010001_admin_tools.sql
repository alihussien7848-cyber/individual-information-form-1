-- Admin tools, social links, backups, and role-based access.
-- Run once in Supabase SQL Editor. Safe to re-run.

alter table public.submissions
  add column if not exists facebook_url text not null default '',
  add column if not exists instagram_url text not null default '',
  add column if not exists tiktok_url text not null default '',
  add column if not exists twitter_url text not null default '';

create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','admin')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.admin_roles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_roles ar
    where ar.user_id = auth.uid() and ar.is_active = true
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "admins read" on public.submissions;
drop policy if exists "admins update" on public.submissions;
drop policy if exists "admins delete" on public.submissions;
drop policy if exists "submissions admin read" on public.submissions;
drop policy if exists "submissions admin update" on public.submissions;
drop policy if exists "submissions admin delete" on public.submissions;
create policy "submissions admin read" on public.submissions
  for select to authenticated using (public.is_admin());
create policy "submissions admin update" on public.submissions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "submissions admin delete" on public.submissions
  for delete to authenticated using (public.is_admin());

drop policy if exists "admin roles self read" on public.admin_roles;
create policy "admin roles self read" on public.admin_roles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

create table if not exists public.backup_runs (
  id bigint generated always as identity primary key,
  storage_path text not null,
  record_count integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  backup_type text not null default 'manual' check (backup_type in ('manual','scheduled'))
);
alter table public.backup_runs enable row level security;
drop policy if exists "backup runs admin read" on public.backup_runs;
create policy "backup runs admin read" on public.backup_runs
  for select to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-backups', 'private-backups', false, 52428800, array['application/json'])
on conflict (id) do update set public = false;

drop policy if exists "private backups admin read" on storage.objects;
create policy "private backups admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'private-backups' and public.is_admin());

-- Used only by the server-side Edge Function after a validated restore.
create or replace function public.sync_submissions_identity()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare seq_name text;
begin
  seq_name := pg_get_serial_sequence('public.submissions', 'id');
  if seq_name is not null then
    perform setval(seq_name, coalesce((select max(id) from public.submissions), 1),
                   exists(select 1 from public.submissions));
  end if;
end;
$$;
revoke all on function public.sync_submissions_identity() from public, anon, authenticated;
grant execute on function public.sync_submissions_identity() to service_role;

-- Bootstrap the first administrator manually after creating their Auth user:
-- insert into public.admin_roles(user_id, role) values ('AUTH-USER-UUID-HERE','super_admin');
