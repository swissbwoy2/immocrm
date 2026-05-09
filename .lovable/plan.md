## Objectif
Corriger automatiquement les numéros suisses mal formatés (`+410xxxxxxxx` → `+41xxxxxxxx`) qui font échouer les envois WhatsApp avec l'erreur Meta `131026 Message undeliverable`, puis relancer la campagne sur les leads concernés.

## Périmètre

### 1. Normalisation renforcée du téléphone (Edge Functions)
Dans les fonctions `send-followup-whatsapp` et `send-whatsapp-notification` (et idéalement un helper partagé), améliorer `normalizePhoneE164` :
- Si le numéro commence par `+410` suivi de 9 ou 10 chiffres → retirer le `0` parasite après `+41`.
- Garder le reste de la logique existante (00 → +, 0 → +41, etc.).
- Re-valider la longueur après correction (numéro CH = `+41` + 9 chiffres).

### 2. Nettoyage one-shot des leads existants
Mettre à jour `meta_leads.phone_e164` pour tous les leads où la valeur match `^\+410\d{9,10}$` afin que :
- Les futures campagnes (WhatsApp + Email + autres) utilisent le bon numéro.
- L'affichage Inbox / Logs soit cohérent.

### 3. Relance automatique des 18 échecs
Sur la page Campagnes de suivi → onglet WhatsApp, ajouter un bouton **"Réessayer les échecs (18)"** qui :
- Identifie les leads avec uniquement des logs `failed` pour `template_key=location_rdv_activation_v2` (ceux qui n'ont jamais reçu).
- Force le flag `allowResend=true` sur le `send-followup-whatsapp` existant pour ce sous-ensemble.
- Affiche le compteur en temps réel.

## Détails techniques

**Regex de correction** :
```ts
// +410 suivi de 9-10 chiffres → on enlève le 0 après +41
if (/^\+410\d{9,10}$/.test(p)) {
  p = "+41" + p.slice(4);
}
```

**Migration data** (insert tool, pas de schema change) :
```sql
UPDATE meta_leads
SET phone_e164 = '+41' || substring(phone_e164 from 5)
WHERE phone_e164 ~ '^\+410\d{9,10}$';
```

**Bouton relance** : nouvelle query côté UI qui calcule la liste `failed_only` puis appelle `send-followup-whatsapp` avec `mode=send`, `allowResend=true` et la liste des `lead_ids` (toujours par batch de 3 max, via la même boucle qui a fonctionné pour les 188).

## Hors périmètre
- Pas de changement du template Meta.
- Pas de changement du quota.
- Pas de modification de la logique d'envoi email (Resend).
- Pas de migration de schéma DB.

## Résultat attendu
- Numéros `+410xxx` automatiquement corrigés à l'avenir (zéro maintenance).
- 7 leads suisses récupérés sur les 18 (ceux dont le seul problème était le `0` parasite).
- Bouton réutilisable pour relancer les échecs après n'importe quelle campagne.