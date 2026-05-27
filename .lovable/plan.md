## Objectif

Donner à l'admin un contrôle complet sur les utilisateurs depuis `/admin` → onglet Utilisateurs : avertir, suspendre, bannir, supprimer, vérifier, messager, débloquer — avec audit, sécurité et emails.

## 1. Base de données (migration)

**Nouvelle table `admin_actions`** (audit immuable)

- `admin_id`, `target_user_id`, `action` (warning|suspend|ban|unban|unsuspend|delete|verify|unverify|message), `reason`, `duration_days`, `note`, `created_at`
- RLS : seuls les admins SELECT/INSERT

**Ajouts à `profiles`**

- `warning_count integer default 0`
- `banned_by uuid` (admin)
- (`ban_reason`, `banned_at`, `suspended_until`, `suspension_reason`, `verified` existent déjà)

**Fonctions SQL `SECURITY DEFINER`** (toute action admin passe par là — garantit audit + protection anti-admin)

- `admin_warn_user(_target uuid, _reason text)` → notification + warning_count++ + log
- `admin_suspend_user(_target uuid, _days int, _reason text)` → check pas admin, set suspended_until, log
- `admin_unsuspend_user(_target uuid, _note text)` → reset, log
- `admin_ban_user(_target uuid, _reason text)` → check pas admin, set banned_at/by, log
- `admin_unban_user(_target uuid, _note text)` → reset, log
- `admin_set_verified(_target uuid, _value bool)` → log
- `admin_delete_user(_target uuid, _note text)` → check pas admin, supprime books/messages/favorites/reviews/follows/notifications/profile, log (avec target_user_id conservé)
- `admin_send_message(_target uuid, _text text)` → crée/récupère chat admin↔user, insère message signé "MyKutub Admin", log
- `get_user_admin_history(_target uuid)` → renvoie sanctions + signalements pour la fiche détaillée

Toutes : `RAISE EXCEPTION` si caller pas admin, ou si target est admin (sauf warn/message/verify).

## 2. Frontend — onglet "Utilisateurs" refondu

**Liste enrichie** (`src/routes/admin.tsx`)

- Avatar + display_name + ID court + date inscription
- Compteurs : annonces (count books WHERE seller_id), signalements reçus (count reports WHERE reported_id)
- Badges statut : 🟢 Actif / 🟡 Suspendu (jusqu'au …) / 🔴 Banni / ✅ Vérifié / ⚠️ N avertissements
- Recherche (existante) + filtres : Tous / Actifs / Suspendus / Bannis / Vérifiés
- Tri : date / signalements / activité
- Bouton **Actions ⋮** (DropdownMenu) par utilisateur

**Menu Actions ⋮** ouvre dialogs ciblés :

- Avertir → textarea raison
- Suspendre → select durée (1/3/7/30/90j) + raison (liste + Autre)
- Bannir → **double confirmation** + raison
- Supprimer → **triple confirmation** : checkbox irréversible + taper `SUPPRIMER`
- Envoyer un message → textarea → crée chat admin
- Vérifier / Retirer vérification → toggle
- Lever suspension / Débannir → note obligatoire
- Voir fiche détaillée → ouvre Sheet/Dialog

**Fiche détaillée utilisateur** (Sheet latéral)

- Infos profil complètes
- Liste annonces (lien vers /book/$id)
- Signalements reçus
- Historique sanctions admin (depuis `admin_actions`)
- Avis reçus / donnés
- Dernière connexion (`last_seen`)
- _Note : adresse IP non collectée — afficher "non disponible" pour respecter la vie privée; si vraiment souhaité, à ajouter ultérieurement avec consentement RGPD._

## 3. Sécurité

- Toutes les actions passent par RPC SECURITY DEFINER avec check `internal.has_role(auth.uid(), 'admin')`
- Impossible de bannir/supprimer un autre admin (check via `has_role`)
- Double confirmation bannissement, triple confirmation suppression côté UI ET RPC requiert un texte de confirmation
- Tous les appels écrivent dans `admin_actions`

## 4. Emails (réutilisation existant)

- `send-suspension-email` couvre déjà suspended/banned
- Étendre `send-admin-email` (déjà utilisé pour `verified`) pour `warning`, `unsuspended`, `unbanned`, `account_deleted`
- Notification in-app via `notify_user_action` pour chaque action

## 5. Détails techniques (section technique)

- Fichier principal modifié : `src/routes/admin.tsx` (extraction du tab Users en composant `<UsersTab />` pour lisibilité)
- Nouveau composant : `src/components/admin/UserActionsMenu.tsx`, `UserDetailSheet.tsx`
- Edge function `send-admin-email` : ajouter `kind: 'warning' | 'unsuspended' | 'unbanned' | 'account_deleted'`
- Stats dérivées calculées côté client à partir des données déjà chargées (books, reports) — pas de N+1

## Hors scope (à confirmer)

- Adresse IP : non trackée actuellement, je laisse "non disponible" sauf demande explicite.
