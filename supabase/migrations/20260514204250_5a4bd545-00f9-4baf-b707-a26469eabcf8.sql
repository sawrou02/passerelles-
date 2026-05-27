
-- Drop SELECT policy on book-images (public bucket already serves files via /public URL without RLS; policy enabled listing)
drop policy if exists "Book images public read" on storage.objects;

-- Move has_role to a private schema so it's not in the exposed API
create schema if not exists internal;

create or replace function internal.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

revoke execute on function internal.has_role(uuid, public.app_role) from public;
grant execute on function internal.has_role(uuid, public.app_role) to authenticated, anon;

-- Update RLS policies that reference public.has_role to use internal.has_role
drop policy if exists "Admins can delete any book" on public.books;
create policy "Admins can delete any book" on public.books
for delete using (internal.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can delete any review" on public.reviews;
create policy "Admins can delete any review" on public.reviews
for delete using (internal.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can manage roles" on public.user_roles;
create policy "Admins can manage roles" on public.user_roles
for all using (internal.has_role(auth.uid(), 'admin'::public.app_role))
with check (internal.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can view all roles" on public.user_roles;
create policy "Admins can view all roles" on public.user_roles
for select using (internal.has_role(auth.uid(), 'admin'::public.app_role));

-- Now drop the public has_role
drop function if exists public.has_role(uuid, public.app_role);
