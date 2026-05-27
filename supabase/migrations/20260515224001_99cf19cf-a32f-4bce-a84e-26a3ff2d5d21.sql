-- Email notification preferences
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_reservations boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_messages boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_followers boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_admin boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unsubscribed_all boolean NOT NULL DEFAULT false;

-- Email throttle log for anti-spam (1 msg email / chat / 30min, 5 emails / day / user)
CREATE TABLE IF NOT EXISTS public.email_throttle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email_type text NOT NULL,
  context_id text,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_throttle_user_sent ON public.email_throttle (user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_throttle_context ON public.email_throttle (user_id, email_type, context_id, sent_at DESC);

ALTER TABLE public.email_throttle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email throttle"
ON public.email_throttle FOR SELECT
TO authenticated
USING (auth.uid() = user_id);