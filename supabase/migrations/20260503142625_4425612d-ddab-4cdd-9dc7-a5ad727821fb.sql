-- Add delivery option to books
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS can_deliver boolean NOT NULL DEFAULT false;

-- Reviews table (buyer reviews seller)
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  reviewer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  chat_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seller_id, reviewer_id, chat_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND auth.uid() <> seller_id
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = reviews.chat_id
      AND auth.uid() = ANY(c.participants)
      AND seller_id = ANY(c.participants)
    )
  );

CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE USING (auth.uid() = reviewer_id);

CREATE INDEX IF NOT EXISTS idx_reviews_seller ON public.reviews(seller_id);

-- Search history table
CREATE TABLE IF NOT EXISTS public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  query text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own search history"
  ON public.search_history FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own search history"
  ON public.search_history FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own search history"
  ON public.search_history FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_search_history_user ON public.search_history(user_id, created_at DESC);