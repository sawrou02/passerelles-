-- Finding #7 (audit sécurité) : aucune contrainte UNIQUE sur profiles.phone.
-- Un utilisateur peut renseigner le numéro de téléphone d'une autre
-- personne dans son propre profil. Combiné au finding #2 (phone visible
-- via phone_visible = true ou via les RPCs), cela permet l'usurpation
-- d'identité commerciale : un attaquant déclare avoir le numéro d'un
-- vendeur connu pour détourner les contacts d'acheteurs.
--
-- Solution : partial UNIQUE INDEX (la version PostgreSQL d'une UNIQUE
-- constraint avec WHERE). Ne s'applique pas aux NULL pour ne pas bloquer
-- les profils sans téléphone renseigné.
--
-- ⚠️ Cette migration ÉCHOUERA en prod s'il existe déjà des doublons sur
-- profiles.phone. Avant `supabase db push`, exécuter sur la prod :
--
--   SELECT phone, count(*) FROM public.profiles
--    WHERE phone IS NOT NULL
--    GROUP BY phone HAVING count(*) > 1;
--
-- Si des doublons existent, contacter manuellement les users concernés
-- ou écraser le doublon le plus récent à NULL avant d'appliquer.

CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_phone
  ON public.profiles (phone)
  WHERE phone IS NOT NULL;
