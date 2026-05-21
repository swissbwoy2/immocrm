# Mandat — Renouvellement automatique J+91 et bouton remboursement J80–J90

## Logique métier finale

- **Durée mandat** : 90 jours (inchangé).
- **J80 → J90** : fenêtre d'éligibilité au remboursement. Le client peut cliquer "Demander un remboursement" depuis son tableau de bord ou Mon dossier.
- **J91 sans action** : renouvellement automatique pour 90 jours. Le compteur repart à 0, le bouton remboursement redevient grisé jusqu'au prochain J80.
- **Exceptions** : si le client a déjà demandé l'arrêt / l'annulation, aucun renouvellement automatique (logique déjà en place).

## Communications

### J80 — nouvelle relance (email + notification native)
- Sujet : "Jour 80 : continuer votre recherche ou demander un remboursement ?"
- Boutons : "Continuer ma recherche" / "Demander mon remboursement" / "Mettre en pause".
- Notification in-app équivalente avec lien `/client/mon-contrat`.

### J91 — renouvellement automatique (email + notification)
- Sujet : "Votre mandat a été renouvelé automatiquement"
- Texte clé : « Votre mandat est renouvelé pour 90 jours. Aucun remboursement n'est possible sur cette période. Pour redevenir éligible, attendez 90 jours : un rappel vous sera envoyé au 80ème jour. »

## Bouton "Demander un remboursement"

Affiché dans :
1. `src/pages/client/Dashboard.tsx` — bloc mandat (nouveau).
2. `src/pages/client/MonContrat.tsx` — déjà présent, mise à jour du seuil 82 → 80.

États du bouton :
- **J0 → J79** : grisé, tooltip « Disponible à partir du 80ème jour (encore X jours) ».
- **J80 → J90** : actif, vert, déclenche le dialogue d'annulation avec remboursement.
- **J91+** : grisé après renouvellement auto (compteur remis à 0, donc à nouveau J0 → grisé). Tooltip explicite « Mandat renouvelé — nouvelle éligibilité au 80ème jour ».
- **Demande déjà envoyée** : badge "Demande enregistrée le …", bouton désactivé.

## Détails techniques

### Constantes à mettre à jour (82 → 80)
- `supabase/functions/mandate-expiry-reminders/index.ts` → `REFUND_ELIGIBILITY_DAY = 80`
- `supabase/functions/mandate-renewal-action/index.ts` → `REFUND_ELIGIBILITY_DAY = 80`
- `src/pages/client/MonContrat.tsx` → `REFUND_ELIGIBILITY_DAY = 80`

### Edge function `mandate-expiry-reminders`
- Ajouter une branche **J80 exactement** : envoi d'un email/notif dédié "fenêtre remboursement ouverte" (anti-doublon via `mandate_renewal_reminders_log` avec un canal distinct, p.ex. `refund_window_open`).
- Adapter l'email de renouvellement auto J91 : nouveau texte expliquant que le remboursement n'est plus possible avant 90 nouveaux jours.
- Notification in-app `mandate_auto_renewed` : mise à jour du message.

### Composant Dashboard client
- Nouveau petit bloc "Mandat" sous le résumé, affichant :
  - Jours écoulés / restants
  - Bouton "Demander un remboursement" (même handler que MonContrat, redirige vers `/client/mon-contrat?action=refund` pour réutiliser le dialogue existant — pas de duplication de logique).

### Pas de migration DB
La structure (`refund_status`, `refund_eligible`, `refund_requested_at`, `mandate_pause_days`, etc.) est déjà en place.

## Fichiers modifiés

1. `supabase/functions/mandate-expiry-reminders/index.ts` — seuil + branche J80 + email J91 mis à jour.
2. `supabase/functions/mandate-renewal-action/index.ts` — seuil 80.
3. `src/pages/client/MonContrat.tsx` — seuil 80, tooltips et libellés.
4. `src/pages/client/Dashboard.tsx` — nouveau bloc bouton remboursement (lien vers `/client/mon-contrat`).
