
-- 1. Profiles presence
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_online boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen timestamptz NOT NULL DEFAULT now();

-- 2. Books reservation
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS reserved_by uuid,
  ADD COLUMN IF NOT EXISTS reserved_at timestamptz;

-- 3. book_requests
CREATE TABLE IF NOT EXISTS public.book_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  requester_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, requester_id)
);
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own requests"
ON public.book_requests FOR SELECT
USING (auth.uid() = requester_id);

CREATE POLICY "Sellers view requests on their books"
ON public.book_requests FOR SELECT
USING (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_requests.book_id AND b.seller_id = auth.uid()));

CREATE POLICY "Users create own requests"
ON public.book_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Sellers update requests on their books"
ON public.book_requests FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_requests.book_id AND b.seller_id = auth.uid()));

CREATE POLICY "Users delete own requests"
ON public.book_requests FOR DELETE
USING (auth.uid() = requester_id);

-- 4. notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Allow inserts from authenticated users (sellers notifying others, system messages)
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. messages read receipts
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Allow chat participants to mark messages read
CREATE POLICY "Participants can update messages read state"
ON public.messages FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.chats c WHERE c.id = messages.chat_id AND auth.uid() = ANY (c.participants)));

-- 6. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.books;
ALTER PUBLICATION supabase_realtime ADD TABLE public.book_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_book_requests_book ON public.book_requests(book_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_chat_read ON public.messages(chat_id, read_at);
