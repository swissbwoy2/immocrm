## Diagnostic réel sur le client Titan

J'ai inspecté la base et les logs. Trois bugs distincts expliquent ce que tu vois :

### Bug 1 — Welcome WhatsApp jamais reçu
Log Meta du 21:35 : `header: number of localizable_params (0) does not match the expected number of params (1)`.
Le template `welcome_activation` côté Meta attend **1 variable dans le header** (probablement `{{1}}` = prénom), mais `wa-send-welcome` envoie uniquement 2 variables dans le body. Aucun paramètre header n'est transmis → Meta refuse → status `failed`.

### Bug 2 — Offre invisible côté agent
La page `OffresEnvoyees.tsx` (ligne 385) filtre l'onglet « En cours » sur :
```
['interesse','visite_planifiee','visite_effectuee','candidature_deposee','demande_postulation']
```
Or l'offre Titan a `statut='envoyee'` (état initial juste après envoi). Tant qu'aucun statut n'évolue, l'offre n'apparaît dans **aucun** onglet → agent ne peut pas l'ouvrir.

### Bug 3 — Délégation visite impossible à confirmer
La visite `02ca033e…` a en base :
```
statut = 'a_deleguer'   est_deleguee = false   statut_coursier = NULL
```
Deux handlers se disputent le bouton « Déléguer » dans `whatsapp-webhook/index.ts` :
- `handleNewQRButtons` (ligne 619) fait correctement `est_deleguee=true, statut='deleguee', statut_coursier='a_assigner'`.
- `handleLifecycleButton` (ligne 250) fait juste `statut='a_deleguer'` sans toucher `est_deleguee` ni `statut_coursier`.
C'est le **legacy** qui a tourné → la visite n'apparaît dans aucun filtre de `Visites.tsx` (qui cherche `est_deleguee=true && statut='planifiee'` pour la file « à confirmer »), et aucun coursier ne peut être assigné car `statut_coursier` est NULL.

---

## Plan d'action (un seul lot)

### 1. `supabase/functions/wa-send-welcome/index.ts`
Ajouter un paramètre `header_params: [prenom]` dans l'appel à `send-whatsapp-notification` pour matcher le `{{1}}` du header Meta du template `welcome_activation`.

### 2. `supabase/functions/send-whatsapp-notification/index.ts`
Étendre le contrat d'entrée avec `header_params?: string[]`. Si fourni, ajouter un component `{ type: "header", parameters: [{ type:"text", text }] }` dans le payload Meta avant le body.

### 3. `supabase/functions/whatsapp-webhook/index.ts` — supprimer le legacy delegate
Dans `handleLifecycleButton` (ligne ~250) :
- Aligner la branche `isVisitDelegate` sur la même mise à jour que le nouveau handler : `{ est_deleguee: true, statut: 'deleguee', statut_coursier: 'a_assigner' }` (au lieu de `statut='a_deleguer'`).
Cela garantit la cohérence quel que soit le chemin emprunté.

### 4. `src/pages/agent/OffresEnvoyees.tsx`
Inclure `'envoyee'` (et par sécurité `'a_traiter'` si présent) dans la liste « En cours » ligne 385, pour que toute offre fraîchement envoyée soit visible et cliquable par l'agent dès l'envoi.

### 5. `src/pages/agent/Visites.tsx`
Ajouter une section / badge « Visites à déléguer » qui filtre `statut === 'deleguee' && statut_coursier === 'a_assigner'`, avec bouton « Assigner un coursier » (réutiliser le dialog existant `delegating to courier` ligne 914). Ainsi l'agent peut **confirmer la délégation** en assignant un coursier.

### 6. Réparer la donnée existante (data fix unique)
Mettre à jour la visite `02ca033e-ba30-4065-8131-ba22fbff492e` :
```
statut='deleguee', est_deleguee=true, statut_coursier='a_assigner'
```
pour que Titan apparaisse correctement dans la nouvelle file après déploiement.

### 7. Ré-envoyer le welcome à Titan
Une fois le bug 1 corrigé, relancer `wa-send-welcome` avec `client_id=849ab000-877f-41c2-9e70-6cee7a180950` pour qu'il reçoive enfin le message d'activation.

---

## Fichiers touchés
- `supabase/functions/wa-send-welcome/index.ts`
- `supabase/functions/send-whatsapp-notification/index.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- `src/pages/agent/OffresEnvoyees.tsx`
- `src/pages/agent/Visites.tsx`
- 1 INSERT/UPDATE data-fix (pas de migration de schéma)

## Validation
- Vérifier `whatsapp_notification_logs` : welcome `status='sent'` (plus de `failed`).
- Recharger `/agent/offres-envoyees` → l'offre Titan apparaît dans « En cours », clic ouvre la fiche.
- Recharger `/agent/visites` → la visite Titan apparaît dans « À déléguer », bouton « Assigner coursier » fonctionnel.