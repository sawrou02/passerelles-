
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS ban_reason text,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- Admin can update any profile (for moderation fields)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (internal.has_role(auth.uid(), 'admin'))
  WITH CHECK (internal.has_role(auth.uid(), 'admin'));

-- Helper: is the current user under sanction?
CREATE OR REPLACE FUNCTION public.is_user_sanctioned(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _uid
      AND (banned_at IS NOT NULL OR (suspended_until IS NOT NULL AND suspended_until > now()))
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_user_sanctioned(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_sanctioned(uuid) TO authenticated;

-- Block sanctioned users from creating content
CREATE POLICY "Sanctioned users cannot insert books"
  ON public.books AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (NOT public.is_user_sanctioned(auth.uid()));

CREATE POLICY "Sanctioned users cannot insert messages"
  ON public.messages AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (NOT public.is_user_sanctioned(auth.uid()));

CREATE POLICY "Sanctioned users cannot insert reviews"
  ON public.reviews AS RESTRICTIVE FOR INSERT
  TO authenticated
  WITH CHECK (NOT public.is_user_sanctioned(auth.uid()));

-- Global notification fan-out (admin only)
CREATE OR REPLACE FUNCTION public.send_global_notification(_message text, _link text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  inserted_count integer;
BEGIN
  IF NOT internal.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can send global notifications';
  END IF;
  IF _message IS NULL OR length(trim(_message)) = 0 THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;
  IF length(_message) > 500 THEN
    RAISE EXCEPTION 'Message too long (max 500 chars)';
  END IF;

  INSERT INTO public.notifications (user_id, type, message, link)
  SELECT p.id, 'global', _message, _link FROM public.profiles p;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.send_global_notification(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_global_notification(text, text) TO authenticated;

-- Notify user of moderation action
CREATE OR REPLACE FUNCTION public.notify_user_action(_user_id uuid, _message text, _link text DEFAULT NULL, _type text DEFAULT 'moderation')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT internal.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can notify users';
  END IF;
  INSERT INTO public.notifications (user_id, type, message, link)
  VALUES (_user_id, _type, _message, _link);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_user_action(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_user_action(uuid, text, text, text) TO authenticated;
