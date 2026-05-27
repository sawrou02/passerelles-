-- 1. Table
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX idx_blocked_users_blocker ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked ON public.blocked_users(blocked_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own blocks"
  ON public.blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users create own blocks"
  ON public.blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users delete own blocks"
  ON public.blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

-- 2. Helper functions
CREATE OR REPLACE FUNCTION public.is_blocked_by(_blocker uuid, _blocked uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE blocker_id = _blocker AND blocked_id = _blocked
  );
$$;

-- 3. Restrictive policies enforcing blocks

-- Messages: a blocked user cannot send to the blocker (any chat participant who blocked sender)
CREATE POLICY "No messages to blockers"
  ON public.messages AS RESTRICTIVE FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1
      FROM public.chats c, public.blocked_users b
      WHERE c.id = messages.chat_id
        AND b.blocker_id = ANY (c.participants)
        AND b.blocker_id <> auth.uid()
        AND b.blocked_id = auth.uid()
    )
  );

-- Book requests: cannot request a book from someone who blocked you
CREATE POLICY "No requests to blockers"
  ON public.book_requests AS RESTRICTIVE FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1
      FROM public.books bk
      JOIN public.blocked_users b ON b.blocker_id = bk.seller_id
      WHERE bk.id = book_requests.book_id
        AND b.blocked_id = auth.uid()
    )
  );

-- Reviews: cannot review a seller who blocked you
CREATE POLICY "No reviews from blocked"
  ON public.reviews AS RESTRICTIVE FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE blocker_id = reviews.seller_id
        AND blocked_id = auth.uid()
    )
  );

-- Profiles: a blocked authenticated user cannot view the blocker's profile
CREATE POLICY "Blocked cannot view profile"
  ON public.profiles AS RESTRICTIVE FOR SELECT
  TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE blocker_id = profiles.id
        AND blocked_id = auth.uid()
    )
  );