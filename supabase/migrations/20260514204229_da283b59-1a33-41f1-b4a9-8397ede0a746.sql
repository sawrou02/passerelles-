
-- 1) Create private bucket for book images
insert into storage.buckets (id, name, public) values ('book-images', 'book-images', true)
on conflict (id) do nothing;

-- Allow public read of book images, owner-only write
create policy "Book images public read"
on storage.objects for select
using (bucket_id = 'book-images');

create policy "Users upload own book images"
on storage.objects for insert to authenticated
with check (bucket_id = 'book-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own book images"
on storage.objects for update to authenticated
using (bucket_id = 'book-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own book images"
on storage.objects for delete to authenticated
using (bucket_id = 'book-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- 2) Make avatars bucket private (no anon listing or public URL access)
update storage.buckets set public = false where id = 'avatars';

-- Allow read via signed URLs only (signed URLs bypass RLS, so SELECT policy here governs the authenticated endpoint)
drop policy if exists "Avatar images are publicly accessible" on storage.objects;

create policy "Avatars readable by authenticated"
on storage.objects for select to authenticated
using (bucket_id = 'avatars');

create policy "Users upload own avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own avatar"
on storage.objects for update to authenticated
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- 3) Tighten notifications INSERT RLS: only self-notify
drop policy if exists "Authenticated users can create notifications" on public.notifications;

create policy "Users insert own notifications"
on public.notifications for insert to authenticated
with check (auth.uid() = user_id);

-- 4) Restrict EXECUTE on SECURITY DEFINER trigger functions
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.assign_default_role() from public, anon, authenticated;
-- has_role is called from RLS policies, so authenticated/anon must keep EXECUTE.
-- Ensure no excess grants beyond what RLS needs.
revoke execute on function public.has_role(uuid, app_role) from public;
grant execute on function public.has_role(uuid, app_role) to authenticated, anon;
