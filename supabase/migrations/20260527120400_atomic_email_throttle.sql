-- Finding #6 (audit sécurité) : race condition possible dans
-- supabase/functions/_shared/email.ts entre le SELECT count(...) qui
-- vérifie le cap quotidien (5 emails / user / jour) ou le cap par contexte
-- (1 email / chat / 30 min) et l'INSERT qui logge l'envoi. Deux edge
-- functions en parallèle peuvent toutes les deux passer le check puis
-- toutes les deux insérer, dépassant le cap.
--
-- Stratégie : RPC SECURITY DEFINER qui prend un advisory lock sur le
-- user_id, refait les checks et insère atomiquement dans la même
-- transaction. La fonction renvoie true si le log a été inséré (l'email
-- peut partir), false si le cap est atteint.
--
-- Le helper TypeScript `_shared/email.ts` sera mis à jour pour appeler
-- cette RPC au lieu de faire SELECT puis INSERT séparément.

CREATE OR REPLACE FUNCTION public.email_throttle_try_log(
  _user_id     uuid,
  _email_type  text,
  _context_id  text DEFAULT NULL,
  _per_context_window_minutes int DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_count int;
  v_ctx_count   int;
BEGIN
  -- Advisory lock pour sérialiser les appels concurrents sur le même user.
  -- Utilise hashtext pour faire tenir l'uuid dans un int8.
  PERFORM pg_advisory_xact_lock(hashtext(_user_id::text));

  -- Cap quotidien : 5 emails / user / 24h
  SELECT count(*) INTO v_daily_count
    FROM public.email_throttle
   WHERE user_id = _user_id
     AND sent_at >= now() - interval '24 hours';
  IF v_daily_count >= 5 THEN
    RETURN false;
  END IF;

  -- Cap par contexte : 1 email du même type / context / fenêtre
  IF _context_id IS NOT NULL AND _per_context_window_minutes IS NOT NULL THEN
    SELECT count(*) INTO v_ctx_count
      FROM public.email_throttle
     WHERE user_id    = _user_id
       AND email_type = _email_type
       AND context_id = _context_id
       AND sent_at    >= now() - make_interval(mins => _per_context_window_minutes);
    IF v_ctx_count >= 1 THEN
      RETURN false;
    END IF;
  END IF;

  -- Atomic insert (toujours dans la même transaction que les SELECT ci-dessus)
  INSERT INTO public.email_throttle (user_id, email_type, context_id)
       VALUES (_user_id, _email_type, _context_id);

  RETURN true;
END;
$$;

-- Seul service_role a besoin d'appeler cette RPC (depuis les edge functions)
REVOKE EXECUTE ON FUNCTION public.email_throttle_try_log(uuid, text, text, int)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_throttle_try_log(uuid, text, text, int)
  TO service_role;
