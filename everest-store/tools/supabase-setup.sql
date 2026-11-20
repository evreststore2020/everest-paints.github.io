-- =====================================================================
-- إفرست للدهانات – تجهيز قاعدة بيانات Supabase (شغّله مرة واحدة)
-- Supabase ← مشروعك ← SQL Editor ← New query ← الصق الملف كله ← Run
-- آمن لو اتشغل أكتر من مرة.
-- =====================================================================

-- ---------- الجداول ----------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key check (id ~ '^[a-z0-9-]+$'),
  sort int not null default 0,
  active boolean not null default true,
  cat text not null default 'interior',
  line text,
  ar text not null,
  en text,
  d text,
  f jsonb not null default '[]'::jsonb,
  img bigint,
  image text,
  col text,
  price numeric,
  u text not null default 'لتر',
  sizes jsonb,
  packs jsonb,
  cov numeric not null default 10,
  url text,
  best boolean not null default false,
  is_new boolean not null default false,
  floor boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists products_cat_idx on public.products (cat);
create index if not exists products_sort_idx on public.products (sort);

-- الإعدادات والباقات والآراء وأكواد الخصم والفيديوهات
create table if not exists public.site_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- الطلبات والحجوزات
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('order','booking','package','wholesale','colour_combo','contact')),
  status text not null default 'جديد' check (char_length(status) <= 30),
  name text check (char_length(name) <= 80),
  phone text check (char_length(phone) <= 20),
  area text check (char_length(area) <= 160),
  total numeric,
  details text check (char_length(details) <= 3000),
  page text check (char_length(page) <= 200)
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_type_idx on public.orders (type);
create index if not exists orders_status_idx on public.orders (status);

-- ---------- صلاحيات الأدمن ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- أول حساب يدخل لوحة التحكم بيبقى هو الأدمن (مرة واحدة بس)
create or replace function public.claim_admin() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if not exists (select 1 from public.admins) then
    insert into public.admins (user_id) values (auth.uid());
  end if;
  return exists (select 1 from public.admins where user_id = auth.uid());
end $$;

revoke all on function public.claim_admin() from public, anon;
grant execute on function public.claim_admin() to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- قواعد الأمان (Row Level Security) ----------
alter table public.admins    enable row level security;
alter table public.products  enable row level security;
alter table public.site_data enable row level security;
alter table public.orders    enable row level security;

drop policy if exists "admins see self" on public.admins;
create policy "admins see self" on public.admins for select to authenticated using (user_id = auth.uid());

-- المنتجات: الكل يشوف الظاهر، والأدمن يشوف ويعدّل كله
drop policy if exists "products read" on public.products;
create policy "products read" on public.products for select to anon, authenticated using (active or public.is_admin());
drop policy if exists "products insert" on public.products;
create policy "products insert" on public.products for insert to authenticated with check (public.is_admin());
drop policy if exists "products update" on public.products;
create policy "products update" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "products delete" on public.products;
create policy "products delete" on public.products for delete to authenticated using (public.is_admin());

-- بيانات الموقع: الكل يقرا، الأدمن بس يعدّل
drop policy if exists "site read" on public.site_data;
create policy "site read" on public.site_data for select to anon, authenticated using (true);
drop policy if exists "site insert" on public.site_data;
create policy "site insert" on public.site_data for insert to authenticated with check (public.is_admin());
drop policy if exists "site update" on public.site_data;
create policy "site update" on public.site_data for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "site delete" on public.site_data;
create policy "site delete" on public.site_data for delete to authenticated using (public.is_admin());

-- الطلبات: أي زائر يقدر يبعت طلب جديد بس، والأدمن بس يشوفها ويعدّلها
drop policy if exists "orders create" on public.orders;
create policy "orders create" on public.orders for insert to anon, authenticated with check (status = 'جديد');
drop policy if exists "orders read" on public.orders;
create policy "orders read" on public.orders for select to authenticated using (public.is_admin());
drop policy if exists "orders update" on public.orders;
create policy "orders update" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "orders delete" on public.orders;
create policy "orders delete" on public.orders for delete to authenticated using (public.is_admin());

grant select on public.products, public.site_data to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant select, insert, update, delete on public.products, public.site_data, public.orders to authenticated;
grant select on public.admins to authenticated;

-- ---------- تخزين الفيديوهات ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "videos read" on storage.objects;
create policy "videos read" on storage.objects for select to anon, authenticated using (bucket_id = 'videos');
drop policy if exists "videos upload" on storage.objects;
create policy "videos upload" on storage.objects for insert to authenticated with check (bucket_id = 'videos' and public.is_admin());
drop policy if exists "videos update" on storage.objects;
create policy "videos update" on storage.objects for update to authenticated using (bucket_id = 'videos' and public.is_admin());
drop policy if exists "videos delete" on storage.objects;
create policy "videos delete" on storage.objects for delete to authenticated using (bucket_id = 'videos' and public.is_admin());
