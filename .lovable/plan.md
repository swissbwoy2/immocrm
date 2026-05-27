# Deux corrections

## 1. Remboursement impossible après le jour 90 (mandat auto-renouvelé)

### Diagnostic
- Marie : mandat signé le 23 février, fin officielle le 24 mai (jour 90). Aujourd'hui 27 mai = **jour 93**.
- `REFUND_ELIGIBILITY_DAY = 80` mais **aucune borne supérieure** dans `supabase/functions/mandate-renewal-action/index.ts` (ligne 317-319) → on a pu accepter sa demande de remboursement alors que son mandat est techniquement auto-renouvelé.
- Règle métier : la fenêtre de remboursement est **jour 80 → jour 90 inclus**. À partir du jour 91, le mandat se renouvelle pour 90 jours et le remboursement n'est plus possible.

### Changements
**`supabase/functions/mandate-renewal-action/index.ts`**
- Ajouter borne haute : `refundEligible = ... && daysSinceSignature >= 80 && daysSinceSignature <= 90`.
- Si demande de remboursement au jour ≥ 91 → renvoyer une erreur claire : *« Votre mandat s'est automatiquement renouvelé le {date_fin}. La fenêtre de remboursement (jours 80 à 90) est close. Vous pourrez en faire la demande lors du prochain cycle, entre le {date+80j} et le {date+90j}. »*
- Idem pour `cancel` simple : autorisé à tout moment, mais le mail/copie staff précisera que le mandat continue jusqu'à la prochaine échéance (sans remboursement).

**Frontend client (dashboard relocation)**
- Localiser le bouton « Demander un remboursement » et le **désactiver** quand `daysSinceSignature > 90` (ou `< 80`), avec une infobulle expliquant la fenêtre.
- Mettre à jour le compte à rebours déjà affiché pour signaler clairement la fin de la fenêtre de remboursement à J90.

**Frontend admin (`ClientDetail.tsx`)**
- Même règle sur le bouton admin « Demander un remboursement pour ce client ».

### Cas Marie (rattrapage)
- Sa demande a déjà été enregistrée et l'email envoyé hier. **On ne touche pas** à son dossier : refund_status reste `pending`, mandat sera stoppé par le cron à J24 mai (déjà passé) au prochain run.

---

## 2. Calendrier de Carina inaccessible

### Diagnostic
- Carina a **832 visites** + 32 events + 45 clients co-assignés en base.
- `src/pages/agent/Calendrier.tsx` (lignes 166-185) charge **toutes les visites** avec jointures lourdes : `*, offres(*), clients(...), agents(...)` → payload ~plusieurs Mo, timeout probable.
- Pas de filtre de date : on charge tout l'historique depuis 2024.
- Même problème à venir pour les autres agents qui accumulent du volume.

### Changements
**`src/pages/agent/Calendrier.tsx`**
- Ajouter une **fenêtre temporelle glissante** sur les deux requêtes principales (`visites` et `calendar_events`) :
  - `gte('date_visite', today - 60 jours)` (passé visible)
  - `lte('date_visite', today + 365 jours)` (futur raisonnable)
- Bouton/toggle « Voir l'historique complet » qui supprime le filtre passé pour les rares cas où l'agent doit consulter une visite ancienne.
- Réduire la jointure : remplacer `offres(*)` par `offres(id, adresse, prix, pieces, surface, photos)` (seuls champs utilisés dans la vue calendrier).
- Garder `.limit(15000)` en sécurité.

**`src/pages/admin/` calendrier équivalent et `src/pages/coursier/Calendrier.tsx`**
- Appliquer le même filtre de fenêtre glissante par défaut (pour éviter que le problème se reproduise à mesure que les volumes grossissent).
- Le calendrier coursier n'a pas le souci (filtré par `coursier_id` + statuts), pas de changement requis là-bas.

### Vérification après build
- Charger `/agent/calendrier` en tant que Carina → temps de chargement < 2 s, toutes ses visites des 60 derniers jours + futures visibles.
- Activer le toggle « historique complet » → toutes les 832 visites se chargent.
- Tester `cancel_with_refund` sur Marie (jour 93) côté API → réponse d'erreur explicite avec dates du prochain cycle.
- Tester sur un client en jour 85 → demande acceptée comme aujourd'hui.

### Détails techniques
- Aucun changement de schéma.
- Aucune nouvelle fonction edge.
- Aucun nouveau secret.
