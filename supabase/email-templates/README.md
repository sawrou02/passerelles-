# Templates d'emails Supabase Auth — MyKutub

Templates HTML branded MyKutub en français pour les emails envoyés
automatiquement par Supabase lors de l'inscription, du changement
d'email, etc.

## Templates disponibles

| Fichier                | Quand est-il envoyé ? |
|------------------------|-----------------------|
| `confirm-signup.html`  | Quand un utilisateur s'inscrit avec email + mdp. C'est le mail "cliquez ici pour activer votre compte". |
| `reset-password.html`  | Quand un utilisateur demande "Mot de passe oublié" depuis la page de connexion. |
| `magic-link.html`      | Si tu actives la connexion sans mot de passe (par lien email). Pas utilisé actuellement mais prêt au cas où. |
| `email-change.html`    | Quand un utilisateur modifie son adresse email depuis ses paramètres. |

## Comment les installer

Les templates ne peuvent pas être déployés via `supabase db push` (ce
sont des réglages d'Auth, pas de DB). Il faut les coller à la main
**une seule fois** dans le dashboard Supabase :

1. Aller sur https://supabase.com/dashboard
2. Choisir le projet MyKutub
3. Menu de gauche → **Authentication** → **Email Templates**
4. Pour chaque template :
   - Sélectionner le template correspondant dans le menu déroulant
     en haut (ex : "Confirm signup")
   - Copier le contenu du fichier `.html` correspondant
   - Coller dans l'éditeur HTML
   - Mettre à jour le **Subject** (sujet) en français — voir suggestions
     ci-dessous
   - Cliquer **Save changes**

## Sujets recommandés (à coller dans le champ "Subject")

- Confirm signup → `Confirmez votre inscription sur MyKutub 📚`
- Reset password → `Réinitialisation de votre mot de passe MyKutub 🔐`
- Magic Link → `Votre lien de connexion MyKutub 🔗`
- Change Email Address → `Confirmez le changement d'email — MyKutub ✉️`

## Variables Supabase disponibles dans les templates

- `{{ .ConfirmationURL }}` — l'URL avec le token (utilisée dans les
  boutons "Confirmer / Réinitialiser / etc.")
- `{{ .Email }}` — l'adresse email du destinataire
- `{{ .SiteURL }}` — l'URL de base configurée dans Auth Settings

## ⚠️ Important : la délivrabilité

Modifier ces templates change le **contenu** des emails mais pas le
**service qui les envoie**.

Par défaut, Supabase utilise son propre SMTP qui :
- Est limité à environ 3-4 emails/heure en plan gratuit
- A souvent une mauvaise réputation chez Gmail / Outlook (spam)

Pour un site en production, configurer un SMTP personnalisé via
**Authentication → Settings → SMTP Settings** :

- Resend (recommandé, ~3000 emails/mois gratuits)
- Postmark, SendGrid, Mailgun, Amazon SES, etc.

Sans SMTP perso, les beaux templates partiront quand même dans les
spams ou ne partiront pas du tout.
