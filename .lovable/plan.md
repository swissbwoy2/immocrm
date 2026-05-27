# Auto-renouvellement J91 + gel de Marie

## 1. Email J91 — style "campagne de suivi"

L'envoi existe déjà dans `supabase/functions/mandate-expiry-reminders/index.ts` (bloc "Renouvellement automatique"). On reprend la **même structure HTML que les templates de campagne de suivi** (en-tête bleu, carte blanche, encarts colorés, footer Logisorama) et on précise le wording demandé :

- **Sujet** : `🔄 Votre mandat a été renouvelé automatiquement pour 90 jours`
- **Corps** :
  - "Votre mandat de recherche a été **renouvelé automatiquement pour une nouvelle période de 90 jours**, jusqu'au {date_fin}."
  - Encart rouge : "**Aucun remboursement n'est possible pendant cette période.**"
  - Encart bleu info : "Pour bénéficier d'un remboursement, vous devrez en faire la demande **pendant la fenêtre de remboursement de 10 jours, valable du 80ème au 90ème jour** de votre mandat. Un rappel automatique vous sera envoyé au 80ème jour."
  - "Sans action de votre part, le mandat se renouvelle automatiquement de 90 jours en 90 jours."
  - CTA : « Accéder à mon espace » → `/client/mon-contrat`

Aucun changement de logique de déclenchement — on garde le bloc `daysRemaining < 0` qui tourne dans le cron quotidien. Seulement le HTML et le sujet sont retravaillés.

## 2. Gel exceptionnel de Marie-Christ Esmel (cas déjà passé J93)

Client `774cf603-9fe0-47d7-8866-25b0c38b3aff`, signature 23/02, fin officielle 24/05, demande de remboursement envoyée le 27/05.

Action **manuelle one-shot** via l'outil d'insert :
- `clients.statut = 'stoppe'`
- `clients.date_changement_statut = now()`
- `mandate_renewal_actions` : log `{ action: 'admin_manual_stop', metadata: { reason: 'refund_post_expiry_exception' } }`
- Notification client : "Votre mandat est clôturé. Votre espace passe en mode gelé. Pour toute action, contactez un administrateur."

Résultat côté client : peut se connecter, mais le dashboard relocation reste en mode gelé (le `RelocationClientDashboard` détecte déjà `statut === 'stoppe'`). On vérifiera ce comportement après.

## 3. Règle structurelle J91+ → remboursement bloqué

Déjà en place depuis le dernier loop dans `supabase/functions/mandate-renewal-action/index.ts` et les boutons frontend (`MonContrat.tsx`, `ClientDetail.tsx`). Rien à refaire. Marie est un cas d'exception géré manuellement ci-dessus.

## Détails techniques

- Fichier modifié : `supabase/functions/mandate-expiry-reminders/index.ts` (HTML + sujet du bloc auto-renouvellement uniquement).
- Déploiement edge function nécessaire ensuite.
- Action data one-shot via `supabase--insert` pour Marie (UPDATE clients + INSERT log + INSERT notification).
- Aucune migration, aucun nouveau secret, aucun changement de schéma.

## Vérification

- Relire le HTML rendu (sandbox) pour s'assurer du style cohérent avec les autres mails de campagne.
- `SELECT statut FROM clients WHERE id = '774cf603-…'` → `stoppe`.
- Charger `/client/mon-contrat` côté Marie → mode gelé visible.
