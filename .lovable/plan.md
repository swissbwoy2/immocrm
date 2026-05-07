## Finalisation déploiement WhatsApp — 17 templates

**Note 17 vs 12** : la migration précédente a inséré les 12 nouveaux templates. Les 5 autres (`logisorama_new_offer`, `logisorama_visit_reminder_24h`, `logisorama_mandate_expiring_30d`, `logisorama_agent_message`, `hello_world`) étaient déjà câblés ou ignorés. Je vais **vérifier le registry et compléter** pour bien avoir les 17 (incluant `hello_world` même si ignoré côté code, pour cohérence du dashboard).

### 1. Vérification & complétion registry (17/17)
Migration SQL pour :
- INSERT idempotent (`ON CONFLICT DO UPDATE`) des 5 templates manquants/legacy avec leur `language` exact (FR/EN) tel que validé Meta
- Re-check du `language` des 12 déjà insérés pour matcher la capture Meta (notamment ceux passés en `English` par erreur — on garde tel quel côté DB puisque c'est ce que Meta accepte)

### 2. Patch UI admin "Activer client" → invoke `wa-send-welcome`
Trois endroits identifiés :
- `src/pages/admin/DemandesActivation.tsx` (l.270) — flow principal d'activation après import CSV/paiement
- `src/pages/admin/Clients.tsx` — changement statut → `actif` (l.291)
- `src/pages/admin/ClientDetail.tsx` — bouton "Réactiver" (l.1292)

Patch : après tout passage `statut = 'actif'` confirmé, fire-and-forget :
```ts
supabase.functions.invoke('wa-send-welcome', { body: { client_id }}).catch(console.error);
```
(non-bloquant, l'edge function gère elle-même les cas "pas de téléphone WhatsApp")

### 3. Vérification secrets
✅ Tous présents : `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ADMIN_PHONE`. Rien à demander.

### 4. Tests manuels via `curl_edge_functions`
Sur un client de test (à choisir parmi les clients actifs avec un téléphone WhatsApp valide) :
1. `wa-send-welcome` → vérifie réception sur le mobile client + log Edge
2. `wa-send-proposition-visite` avec une visite test (statut=proposee)
3. Simuler webhook bouton `visit_propose_yes` → vérifier que **agent + admin (`+41764839199`)** reçoivent la notif #4
4. `wa-send-google-review` → vérifier que le bouton URL pointe bien vers `https://g.page/r/CQJCKNAJlouGEAE/review`

Je te remonterai les logs et les `message_id` Meta pour validation finale.

### Sur ta question "EN au lieu de FR sans faire exprès"
**Aucun problème** : Meta valide la langue déclarée, indépendamment du contenu. Le `language` côté DB doit juste **matcher exactement** ce que Meta a accepté (sinon erreur 132001 "template not found"). Mon registry colle 1:1 avec ta capture, donc les envois passeront.

### Livraison
Une seule passe : migration registry + 3 patches UI + tests curl. Pas de nouvelles edge functions à créer (les 8 sont déjà déployées).