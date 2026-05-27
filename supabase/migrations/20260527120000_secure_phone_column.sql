-- Finding #2 (audit sécurité) : la colonne profiles.phone était lisible par
-- tous via la policy "Profiles are viewable by everyone" USING (true), malgré
-- la colonne phone_visible. Risque : énumération de numéros, doxxing, SIM swap.
--
-- Stratégie : retirer le droit SELECT sur la colonne `phone` aux rôles anon
-- et authenticated, et exposer le numéro uniquement via deux RPC SECURITY
-- DEFINER qui appliquent les règles d'accès :
--   - get_my_phone()         : le propriétaire récupère son propre numéro
--   - get_user_phone(_uid)   : un autre user récupère le numéro si phone_visible
--                              (ou si admin / si self)

-- 1) Bloquer l'accès direct à la colonne phone
REVOKE SELECT (phone) ON public.profiles FROM anon, authenticated;

-- 2) RPC : récupère son propre numéro (utilisé par profile.tsx, PhoneVerifyGate)
CREATE OR REPLACE FUNCTION public.get_my_phone()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT phone FROM public.profiles WHERE id = auth.uid());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_phone() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_phone() TO authenticated;

-- 3) RPC : récupère le numéro d'un autre user — uniquement si phone_visible,
--    ou si admin, ou si self.
CREATE OR REPLACE FUNCTION public.get_user_phone(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone   text;
  v_visible boolean;
  v_caller  uuid := auth.uid();
BEGIN
  IF _user_id IS NULL OR v_caller IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT phone, phone_visible
    INTO v_phone, v_visible
    FROM public.profiles
   WHERE id = _user_id;

  IF v_phone IS NULL THEN
    RETURN NULL;
  END IF;

  -- Le propriétaire voit toujours son numéro
  IF v_caller = _user_id THEN
    RETURN v_phone;
  END IF;

  -- L'admin voit tout
  IF internal.has_role(v_caller, 'admin'::app_role) THEN
    RETURN v_phone;
  END IF;

  -- Sinon, uniquement si l'utilisateur l'a rendu visible
  IF v_visible THEN
    RETURN v_phone;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_phone(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_user_phone(uuid) TO authenticated;
