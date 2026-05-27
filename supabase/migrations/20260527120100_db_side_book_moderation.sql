-- Finding #4 (audit sécurité) : la modération de texte (checkForbidden) ne
-- tourne que côté client (src/lib/moderation.ts). Un utilisateur peut publier
-- du contenu interdit en appelant directement l'API REST de Supabase.
--
-- Stratégie :
--   - Table public.moderation_keywords gérée par les admins
--   - Fonction check_forbidden_text(_text) qui renvoie le 1er mot trouvé
--   - Trigger BEFORE INSERT OR UPDATE sur public.books qui rejette
--     une ligne dont title + description contient un mot interdit

CREATE TABLE IF NOT EXISTS public.moderation_keywords (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_moderation_keywords_lower
  ON public.moderation_keywords (lower(keyword));

ALTER TABLE public.moderation_keywords ENABLE ROW LEVEL SECURITY;

-- Lecture autorisée à tous les authentifiés (le client peut afficher la liste
-- pour pré-valider — mais la source de vérité reste le trigger DB)
DROP POLICY IF EXISTS "Anyone authenticated reads keywords" ON public.moderation_keywords;
CREATE POLICY "Anyone authenticated reads keywords"
  ON public.moderation_keywords FOR SELECT TO authenticated
  USING (true);

-- Écriture réservée aux admins
DROP POLICY IF EXISTS "Admins manage keywords" ON public.moderation_keywords;
CREATE POLICY "Admins manage keywords"
  ON public.moderation_keywords FOR ALL TO authenticated
  USING (internal.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (internal.has_role(auth.uid(), 'admin'::app_role));

-- Seed initial — synchronisé avec src/lib/moderation.ts
INSERT INTO public.moderation_keywords (keyword) VALUES
  -- Contenus non-islamiques / contraires à l'éthique
  ('alcool'), ('vin'), ('biere'), ('bière'), ('porc'), ('jambon'),
  ('tarot'), ('horoscope'), ('astrologie'), ('magie noire'), ('sorcellerie'),
  ('nudite'), ('nudité'), ('erotique'), ('érotique'), ('pornographie'), ('porno'),
  -- Discours de haine / takfir / fitna
  ('kafir'), ('kufr'), ('takfir'), ('mécréant traître'), ('mort aux'),
  ('haine'), ('raciste'), ('racisme'), ('nazi'),
  -- Polémiques excessives
  ('secte'), ('khawarij maudit'), ('rafidite chien'),
  -- Fraude / publicité commerciale
  ('arnaque'), ('ponzi'), ('crypto pump'), ('investissement garanti'),
  ('viagra'), ('cialis'), ('casino'), ('paris sportifs'), ('loterie'),
  ('contactez whatsapp +'), ('telegram t.me/')
ON CONFLICT (lower(keyword)) DO NOTHING;

-- Fonction de vérification — renvoie le 1er mot interdit trouvé, ou NULL.
CREATE OR REPLACE FUNCTION public.check_forbidden_text(_text text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_haystack text;
  v_kw       text;
BEGIN
  IF _text IS NULL OR length(trim(_text)) = 0 THEN
    RETURN NULL;
  END IF;
  v_haystack := lower(_text);
  FOR v_kw IN SELECT lower(keyword) FROM public.moderation_keywords LOOP
    IF position(v_kw IN v_haystack) > 0 THEN
      RETURN v_kw;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_forbidden_text(text) TO authenticated;

-- Trigger sur public.books — applique la modération à chaque INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.books_moderate_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offending text;
BEGIN
  v_offending := public.check_forbidden_text(
    coalesce(NEW.title, '') || ' ' || coalesce(NEW.description, '')
  );
  IF v_offending IS NOT NULL THEN
    RAISE EXCEPTION 'Contenu interdit détecté: %', v_offending
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_books_moderate ON public.books;
CREATE TRIGGER trg_books_moderate
  BEFORE INSERT OR UPDATE OF title, description
  ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.books_moderate_trigger();
