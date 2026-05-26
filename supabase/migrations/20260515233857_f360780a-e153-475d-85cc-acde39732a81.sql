-- Charte communautaire: profile flags + settings + RPC
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS charte_accepted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS charte_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS charte_version text;

CREATE TABLE IF NOT EXISTS public.charte_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  current_version text NOT NULL DEFAULT 'v1.0',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.charte_settings (id, current_version)
  VALUES (1, 'v1.0')
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.charte_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Charte version readable by all" ON public.charte_settings;
CREATE POLICY "Charte version readable by all"
  ON public.charte_settings FOR SELECT
  USING (true);

-- RPC: user accepts current charter version
CREATE OR REPLACE FUNCTION public.accept_charte()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _v text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT current_version INTO _v FROM public.charte_settings WHERE id = 1;
  UPDATE public.profiles
    SET charte_accepted = true,
        charte_accepted_at = now(),
        charte_version = _v
    WHERE id = auth.uid();
END;
$$;

-- RPC: admin updates the charter version (forces re-acceptance)
CREATE OR REPLACE FUNCTION public.admin_set_charte_version(_version text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._require_admin();
  IF _version IS NULL OR length(trim(_version)) = 0 THEN
    RAISE EXCEPTION 'Version requise';
  END IF;
  UPDATE public.charte_settings
    SET current_version = _version, updated_at = now(), updated_by = auth.uid()
    WHERE id = 1;
END;
$$;
