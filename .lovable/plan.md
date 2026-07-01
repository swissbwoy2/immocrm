## Problème

Le hook `auth-email-hook` tourne à chaque invitation mais échoue systématiquement avec :
```
Could not find the function public.enqueue_email(payload, queue_name)
```

La queue pgmq `auth_emails`, la RPC `enqueue_email`, la table `email_send_log`, le worker `process-email-queue` et le cron associé n'existent pas ou sont incomplets dans le backend. **Aucun email d'invitation ne part depuis plusieurs jours** (Milena, Habibi, et probablement tous les autres invités récents).

## Correction

### 1. Réinstaller l'infrastructure d'email
- Exécuter `setup_email_infra` pour recréer :
  - Extension pgmq + queues `auth_emails` et `transactional_emails`
  - RPC `enqueue_email` (SECURITY DEFINER)
  - Tables `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens`
  - Edge Function `process-email-queue` + secret Vault
  - Job pg_cron (toutes les 5 s) qui appelle `process-email-queue`

### 2. Vérifier / redéployer les fonctions
- Redéployer `auth-email-hook` pour s'assurer qu'il pointe bien vers la nouvelle RPC
- Vérifier qu'aucune erreur n'apparaît dans les logs après relance

### 3. Renvoyer les invitations bloquées
- Renvoyer l'invitation à Habibi (`habibiadjmal@gmail.com`)
- Renvoyer l'invitation à Milena (`milena@mycable.ch`)
- Vérifier dans `email_send_log` que le statut passe à `sent`

### 4. Contrôle de bout en bout
- Regarder les logs `auth-email-hook` (plus d'erreur PGRST202)
- Regarder les logs `process-email-queue` (envoi Resend OK)
- Vérifier `email_send_log` : lignes `pending` → `sent`
- Confirmer réception chez Habibi (Gmail = test le plus fiable)

## Ce qui n'est PAS touché

- Aucun changement de design
- Aucune modification du domaine `notify.logisorama.ch` (déjà vérifié)
- Aucune modification des templates emails existants
- Aucun autre parcours (achat, location, reloueur) impacté

## Après validation

Une fois les invitations reçues côté Habibi, on saura définitivement que le problème global est réglé. Si Milena ne reçoit toujours rien alors qu'Habibi (Gmail) reçoit, ce sera confirmé comme un blocage spécifique `mycable.ch` — et on lui proposera de basculer sur une adresse alternative.
