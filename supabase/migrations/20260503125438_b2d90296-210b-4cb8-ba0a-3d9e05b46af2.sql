
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  title text,
  birthdate date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- books
create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null,
  condition text not null,
  city text not null,
  price numeric not null default 0,
  is_donation boolean not null default false,
  image_url text not null,
  seller_id uuid not null references auth.users(id) on delete cascade,
  seller_name text not null,
  created_at timestamptz not null default now()
);
alter table public.books enable row level security;
create policy "Books are viewable by everyone" on public.books for select using (true);
create policy "Users can insert own books" on public.books for insert with check (auth.uid() = seller_id);
create policy "Users can update own books" on public.books for update using (auth.uid() = seller_id);
create policy "Users can delete own books" on public.books for delete using (auth.uid() = seller_id);
create index books_created_at_idx on public.books(created_at desc);

-- chats
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  participants uuid[] not null,
  book_id uuid references public.books(id) on delete set null,
  book_title text,
  book_image_url text,
  last_message text,
  last_message_at timestamptz default now(),
  unread_by uuid[] default '{}',
  created_at timestamptz not null default now()
);
alter table public.chats enable row level security;
create policy "Participants can view chats" on public.chats for select using (auth.uid() = any(participants));
create policy "Participants can insert chats" on public.chats for insert with check (auth.uid() = any(participants));
create policy "Participants can update chats" on public.chats for update using (auth.uid() = any(participants));
create index chats_last_message_at_idx on public.chats(last_message_at desc);

-- messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  text text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "Participants can view messages" on public.messages for select using (
  exists (select 1 from public.chats c where c.id = chat_id and auth.uid() = any(c.participants))
);
create policy "Participants can insert messages" on public.messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from public.chats c where c.id = chat_id and auth.uid() = any(c.participants))
);
create index messages_chat_created_idx on public.messages(chat_id, created_at);

-- realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.chats;
