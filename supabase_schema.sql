create table if not exists public.submissions (
 id bigint generated always as identity primary key,
 full_name text not null, birth_date date not null, affiliation_date date not null,
 marital_status text not null check (marital_status in ('أعزب','متزوج','مطلق','أرمل')),
 mother_name text not null, voter_number text not null default '',
 province text not null, district text not null, subdistrict text not null default '',
 mahalla text not null default '', street text not null default '', house_number text not null default '',
 education text not null, phone text not null, is_employee boolean not null,
 workplace text not null default '', profession text not null default '', recommender text not null default '',
 consent boolean not null check (consent = true),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists submissions_name_idx on public.submissions(full_name);
create index if not exists submissions_phone_idx on public.submissions(phone);
create index if not exists submissions_province_idx on public.submissions(province);
alter table public.submissions enable row level security;
drop policy if exists "public insert only" on public.submissions;
create policy "public insert only" on public.submissions for insert to anon, authenticated with check (consent = true);
drop policy if exists "admins read" on public.submissions;
create policy "admins read" on public.submissions for select to authenticated using (auth.uid() is not null);
drop policy if exists "admins update" on public.submissions;
create policy "admins update" on public.submissions for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
drop policy if exists "admins delete" on public.submissions;
create policy "admins delete" on public.submissions for delete to authenticated using (auth.uid() is not null);
-- لا تفعّل التسجيل العام؛ كل مستخدم authenticated قادر على إدارة السجلات، لذلك أنشئ حسابات الإدارة الموثوقة فقط.
