-- Finding #3 (audit sécurité, partie 1/2) : durcissement de la config des
-- buckets storage. Côté client, publish.tsx valide file.size < 5MB et
-- file.type via accept="image/*", mais ces deux contrôles sont contournables
-- (extension renommée, MIME spoofé via curl/Postman, etc.).
--
-- Cette migration applique les mêmes limites au niveau du bucket Supabase
-- Storage, qui sont enforced server-side au moment du upload :
--   - file_size_limit       : taille max acceptée
--   - allowed_mime_types    : MIME types acceptés (vérifié sur Content-Type
--                             du upload, donc partiellement spoofable mais
--                             bloque la majorité des cas)
--
-- ⚠️ Reste à faire (PR séparée) : validation magic bytes via edge function
-- pour bloquer un .exe renommé en .jpg avec Content-Type forgé.

-- book-images : 5 MB max, formats image standards
UPDATE storage.buckets
   SET file_size_limit    = 5242880, -- 5 * 1024 * 1024
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'book-images';

-- avatars : 2 MB max (correspond à la limite client dans profile.tsx)
UPDATE storage.buckets
   SET file_size_limit    = 2097152, -- 2 * 1024 * 1024
       allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
 WHERE id = 'avatars';
