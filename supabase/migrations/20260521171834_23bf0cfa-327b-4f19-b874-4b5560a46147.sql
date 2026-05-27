
-- Phone verification
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.phone_verifications (
  user_id uuid PRIMARY KEY,
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
-- No client policies; only edge functions (service role) and SECURITY DEFINER RPCs touch it.

CREATE OR REPLACE FUNCTION public.verify_phone_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.phone_verifications%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO _row FROM public.phone_verifications WHERE user_id = auth.uid();
  IF _row.user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun code en attente. Demandez-en un nouveau.';
  END IF;
  IF _row.expires_at < now() THEN
    DELETE FROM public.phone_verifications WHERE user_id = auth.uid();
    RAISE EXCEPTION 'Code expiré. Demandez-en un nouveau.';
  END IF;
  IF _row.attempts >= 5 THEN
    DELETE FROM public.phone_verifications WHERE user_id = auth.uid();
    RAISE EXCEPTION 'Trop de tentatives. Demandez un nouveau code.';
  END IF;
  IF _row.code <> _code THEN
    UPDATE public.phone_verifications SET attempts = attempts + 1 WHERE user_id = auth.uid();
    RETURN false;
  END IF;
  UPDATE public.profiles
    SET phone = _row.phone, phone_verified = true, updated_at = now()
    WHERE id = auth.uid();
  DELETE FROM public.phone_verifications WHERE user_id = auth.uid();
  RETURN true;
END;
$$;
