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
--
-- ⚠️ Subtilité PostgreSQL : un REVOKE SELECT(col) n'écrase PAS un GRANT
-- SELECT table-level (Supabase grant SELECT à anon/authenticated par défaut
-- sur les tables publiques). Pour que le revoke colonne ait un effet, il
-- faut révoquer le SELECT table-level puis re-grant sur toutes les colonnes
-- SAUF phone.

-- 1) Drop le SELECT table-level (l'attribution de Supabase par défaut)
REVOKE SELECT ON public.profiles FROM anon, authenticated;

-- 2) Re-grant SELECT colonne par colonne, en excluant 'phone'.
--    NB : à compléter à chaque ajout de colonne future sur public.profiles.
GRANT SELECT (
  id, display_name, title, birthdate, created_at, updated_at, avatar_url,
  phone_visible, city, notify_email, notify_sms, notify_push, is_online,
  last_seen, suspended_until, suspension_reason, banned_at, ban_reason,
  verified, is_verified, is_suspended, is_banned, followers_count,
  notify_reservations, notify_messages, notify_followers, notify_admin,
  unsubscribed_all, warning_count, banned_by, charte_accepted,
  charte_accepted_at, charte_version, phone_verified
) ON public.profiles TO anon, authenticated;

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
