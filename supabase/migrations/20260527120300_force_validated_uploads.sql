-- Finding #3 (audit sécurité, partie 2/2) : validation magic bytes des
-- uploads d'images via edge function `validate-book-image`.
--
-- Cette migration retire la possibilité pour les utilisateurs authentifiés
-- d'uploader directement vers le bucket book-images. Seule l'edge function
-- (service_role) peut désormais créer des objets — elle valide les magic
-- bytes (PNG/JPEG/WebP) AVANT de procéder à l'upload, ce qui bloque les
-- fichiers polyglot, .exe renommés en .jpg, etc.
--
-- Les policies UPDATE et DELETE restent inchangées : un user peut toujours
-- modifier/supprimer ses propres images existantes (mêmes contraintes
-- foldername[1] = auth.uid()).
--
-- ⚠️ La frontend (publish.tsx, modifier.$id.tsx, messages.$id.tsx) doit
-- avoir été mise à jour pour passer par supabase.functions.invoke
-- ("validate-book-image"). Sinon les uploads échoueront silencieusement.

DROP POLICY IF EXISTS "Users upload own book images" ON storage.objects;
