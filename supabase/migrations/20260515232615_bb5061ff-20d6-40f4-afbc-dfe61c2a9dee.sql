
-- 1. Table d'audit
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action text NOT NULL,
  reason text,
  duration_days integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON public.admin_actions(target_user_id, created_at DESC);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view admin_actions" ON public.admin_actions;
CREATE POLICY "Admins view admin_actions" ON public.admin_actions
  FOR SELECT TO authenticated
  USING (internal.has_role(auth.uid(), 'admin'::app_role));

-- 2. Colonnes profils
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS warning_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS banned_by uuid;

-- 3. Permettre aux admins d'INSÉRER des notifications pour tout utilisateur
DROP POLICY IF EXISTS "Admins insert notifications" ON public.notifications;
CREATE POLICY "Admins insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (internal.has_role(auth.uid(), 'admin'::app_role));

-- 4. Helpers
CREATE OR REPLACE FUNCTION public._require_admin()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT internal.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public._is_target_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT internal.has_role(_uid, 'admin'::app_role);
$$;

-- 5. Avertir
CREATE OR REPLACE FUNCTION public.admin_warn_user(_target uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  IF _reason IS NULL OR length(trim(_reason)) = 0 THEN RAISE EXCEPTION 'Raison requise'; END IF;

  UPDATE public.profiles SET warning_count = warning_count + 1 WHERE id = _target;
  INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (_target, 'moderation', '⚠️ Avertissement de la modération MyKutub : ' || _reason, '/profile');
  INSERT INTO public.admin_actions (admin_id, target_user_id, action, reason)
    VALUES (auth.uid(), _target, 'warning', _reason);
END;
$$;

-- 6. Suspendre
CREATE OR REPLACE FUNCTION public.admin_suspend_user(_target uuid, _days integer, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  IF public._is_target_admin(_target) THEN RAISE EXCEPTION 'Impossible de suspendre un autre admin'; END IF;
  IF _days NOT IN (1,3,7,30,90) THEN RAISE EXCEPTION 'Durée invalide'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 THEN RAISE EXCEPTION 'Raison requise'; END IF;

  UPDATE public.profiles
    SET suspended_until = now() + (_days || ' days')::interval,
        suspension_reason = _reason,
        is_suspended = true,
        banned_at = NULL, ban_reason = NULL, banned_by = NULL, is_banned = false
    WHERE id = _target;
  INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (_target, 'moderation', 'Votre compte est suspendu pendant ' || _days || ' jour(s). Raison : ' || _reason, '/profile');
  INSERT INTO public.admin_actions (admin_id, target_user_id, action, reason, duration_days)
    VALUES (auth.uid(), _target, 'suspend', _reason, _days);
END;
$$;

-- 7. Lever suspension
CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(_target uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  UPDATE public.profiles
    SET suspended_until = NULL, suspension_reason = NULL, is_suspended = false
    WHERE id = _target;
  INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (_target, 'moderation', 'Votre suspension a été levée. Bienvenue à nouveau sur MyKutub.', '/profile');
  INSERT INTO public.admin_actions (admin_id, target_user_id, action, note)
    VALUES (auth.uid(), _target, 'unsuspend', _note);
END;
$$;

-- 8. Bannir
CREATE OR REPLACE FUNCTION public.admin_ban_user(_target uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  IF public._is_target_admin(_target) THEN RAISE EXCEPTION 'Impossible de bannir un autre admin'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 THEN RAISE EXCEPTION 'Raison requise'; END IF;

  UPDATE public.profiles
    SET banned_at = now(), ban_reason = _reason, banned_by = auth.uid(), is_banned = true,
        suspended_until = NULL, suspension_reason = NULL, is_suspended = false
    WHERE id = _target;
  INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (_target, 'moderation', '🚫 Votre compte a été banni définitivement. Raison : ' || _reason, '/profile');
  INSERT INTO public.admin_actions (admin_id, target_user_id, action, reason)
    VALUES (auth.uid(), _target, 'ban', _reason);
END;
$$;

-- 9. Débannir
CREATE OR REPLACE FUNCTION public.admin_unban_user(_target uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  IF _note IS NULL OR length(trim(_note)) = 0 THEN RAISE EXCEPTION 'Note requise pour débannir'; END IF;
  UPDATE public.profiles
    SET banned_at = NULL, ban_reason = NULL, banned_by = NULL, is_banned = false
    WHERE id = _target;
  INSERT INTO public.notifications (user_id, type, message, link)
    VALUES (_target, 'moderation', '✅ Votre compte a été réactivé. Note de l''admin : ' || _note, '/profile');
  INSERT INTO public.admin_actions (admin_id, target_user_id, action, note)
    VALUES (auth.uid(), _target, 'unban', _note);
END;
$$;

-- 10. Vérifié
CREATE OR REPLACE FUNCTION public.admin_set_verified(_target uuid, _value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  UPDATE public.profiles SET verified = _value, is_verified = _value WHERE id = _target;
  INSERT INTO public.admin_actions (admin_id, target_user_id, action, note)
    VALUES (auth.uid(), _target, CASE WHEN _value THEN 'verify' ELSE 'unverify' END, NULL);
END;
$$;

-- 11. Supprimer compte
CREATE OR REPLACE FUNCTION public.admin_delete_user(_target uuid, _confirm text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public._require_admin();
  IF _confirm <> 'SUPPRIMER' THEN RAISE EXCEPTION 'Mot de confirmation invalide'; END IF;
  IF public._is_target_admin(_target) THEN RAISE EXCEPTION 'Impossible de supprimer un autre admin'; END IF;

  -- Audit AVANT suppression
  INSERT INTO public.admin_actions (admin_id, target_user_id, action, note)
    VALUES (auth.uid(), _target, 'delete', _note);

  DELETE FROM public.reviews WHERE reviewer_id = _target OR seller_id = _target;
  DELETE FROM public.favorites WHERE user_id = _target;
  DELETE FROM public.follows WHERE follower_id = _target OR following_id = _target;
  DELETE FROM public.book_requests WHERE requester_id = _target;
  DELETE FROM public.reports WHERE reporter_id = _target;
  DELETE FROM public.messages WHERE sender_id = _target;
  DELETE FROM public.books WHERE seller_id = _target;
  DELETE FROM public.notifications WHERE user_id = _target;
  DELETE FROM public.user_roles WHERE user_id = _target;
  DELETE FROM public.profiles WHERE id = _target;
END;
$$;

-- 12. Message admin direct
CREATE OR REPLACE FUNCTION public.admin_send_message(_target uuid, _text text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _admin uuid := auth.uid();
  _chat uuid;
BEGIN
  PERFORM public._require_admin();
  IF _text IS NULL OR length(trim(_text)) = 0 THEN RAISE EXCEPTION 'Message requis'; END IF;

  SELECT id INTO _chat FROM public.chats
   WHERE _admin = ANY(participants) AND _target = ANY(participants)
   LIMIT 1;
  IF _chat IS NULL THEN
    INSERT INTO public.chats (participants) VALUES (ARRAY[_admin, _target]) RETURNING id INTO _chat;
  END IF;

  INSERT INTO public.messages (chat_id, sender_id, sender_name, text)
    VALUES (_chat, _admin, '🛡️ MyKutub Admin', _text);

  UPDATE public.chats
    SET last_message = _text, last_message_at = now(),
        unread_by = ARRAY(SELECT DISTINCT unnest(coalesce(unread_by, '{}') || ARRAY[_target]))
    WHERE id = _chat;

  INSERT INTO public.admin_actions (admin_id, target_user_id, action, note)
    VALUES (_admin, _target, 'message', left(_text, 200));
  RETURN _chat;
END;
$$;
