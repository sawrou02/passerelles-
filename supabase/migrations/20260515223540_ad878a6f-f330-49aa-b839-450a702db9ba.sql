-- reports: add reported_id and chat_id, make book_id nullable
ALTER TABLE public.reports ALTER COLUMN book_id DROP NOT NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS reported_id uuid;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS chat_id uuid;

-- profiles: extra moderation flags
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0;

-- chats: per-user delete/archive booleans
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS deleted_by_user1 boolean NOT NULL DEFAULT false;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS deleted_by_user2 boolean NOT NULL DEFAULT false;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS archived_by_user1 boolean NOT NULL DEFAULT false;
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS archived_by_user2 boolean NOT NULL DEFAULT false;

-- global_notifications table
CREATE TABLE IF NOT EXISTS public.global_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  message text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.global_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view global notifications"
ON public.global_notifications FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can create global notifications"
ON public.global_notifications FOR INSERT
TO authenticated
WITH CHECK (internal.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = created_by);

CREATE POLICY "Admins can delete global notifications"
ON public.global_notifications FOR DELETE
TO authenticated
USING (internal.has_role(auth.uid(), 'admin'::app_role));