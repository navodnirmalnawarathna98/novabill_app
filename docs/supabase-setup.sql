create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  bill_title text not null check (char_length(bill_title) between 1 and 150),
  name text not null check (char_length(name) between 1 and 100),
  amount numeric(12,2) not null check (amount >= 0),
  bill_date date not null,
  image_base64 text not null check (char_length(image_base64) <= 3000000),
  created_at timestamptz not null default now()
);
grant insert on public.bills to anon, authenticated;
grant select on public.bills to authenticated;
grant all on public.bills to service_role;
alter table public.bills enable row level security;
create policy "Anyone can submit bills" on public.bills for insert to anon, authenticated with check (true);
create policy "Admins can view bills" on public.bills for select to authenticated using (public.has_role(auth.uid(), 'admin'));