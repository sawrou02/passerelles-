
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE INDEX idx_follows_following ON public.follows(following_id);
CREATE INDEX idx_follows_follower ON public.follows(follower_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows viewable by everyone"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users create own follows"
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users delete own follows"
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Block: prevent following someone who blocked you
CREATE POLICY "No follow if blocked"
  ON public.follows AS RESTRICTIVE FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM public.blocked_users
      WHERE blocker_id = follows.following_id AND blocked_id = auth.uid()
    )
  );
