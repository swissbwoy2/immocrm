## Objectif

**Admin → Campagnes de suivi** : importer un CSV de leads Facebook (en les rattachant à une campagne), prévisualiser l'email, envoyer un test à `info@immo-rama.ch`, puis déclencher manuellement l'envoi aux leads sélectionnés. Aucun envoi automatique, jamais.

---

## Vérifications faites

- ✅ `RESEND_API_KEY` + `RESEND_FROM_EMAIL` déjà configurés
- ✅ Routes CTA toutes présentes : `/nouveau-mandat`, `/vendre-mon-bien`, `/construire-renover`
- ✅ Table `meta_leads` + Edge `import-leads-csv` réutilisables

---

## Ajustements intégrés (vos 7 points)

1. **Nom du module** : "Campagnes de suivi" partout (route, menu, titres, code)
2. **DA premium Logisorama** : fond sombre `#0a0e1a`, accents dorés `#d4a857`, bleu nuit `#1e3a5f`, logo "Logisorama.ch by Immo-Rama.ch", boutons arrondis premium
3. **Désinscription visuelle + structure prête** : table `email_unsubscribes` créée dès maintenant + token `unsubscribe_token` par destinataire dans `lead_email_logs`. Le lien dans l'email pointe vers `/unsubscribe/:token` (page à activer plus tard) — affiché visuellement, non bloquant
4. **CTA confirmés** : routes existantes utilisées directement (pas de fallback nécessaire)
5. **Rattachement campagne dès l'import** : champ `default_campaign_key` ajouté au dialog d'import + colonne `campaign_key` sur `meta_leads`. Modifiable après import via action bulk dans la table
6. **Confirmation obligatoire** : AlertDialog systématique avec résumé exact `"Vous êtes sur le point d'envoyer la campagne {Nom} à {X} leads."`
7. **Zéro envoi automatique** : aucun trigger DB, aucun cron, aucun appel post-import. Bouton manuel uniquement, action admin explicite

---

## Plan d'implémentation

### 1. Migration DB

**`email_followup_campaigns`** (4 lignes seedées)
```
id uuid pk
campaign_key text unique         -- 'location' | 'vente' | 'renovation' | 'achat'
name text                        -- "Location – Recherche appartement"
subject, preview_text text
hero_title, hero_subtitle text
body_intro text                  -- supporte {{first_name}}
benefits jsonb                   -- ["Préciser vos critères", ...]
trust_text text
cta_label text
cta_url text                     -- route absolue logisorama.ch + UTM
signature text
status text default 'active'     -- draft | active | inactive
created_at, updated_at
```
Seed : Location/Vente/Rénovation actives + Achat en `draft` (à compléter).
RLS : SELECT/UPDATE admin only.

**Ajout sur `meta_leads`** :
```sql
ALTER TABLE meta_leads ADD COLUMN campaign_key text NULL;
CREATE INDEX ON meta_leads(campaign_key);
```

**`lead_email_logs`**
```
id, lead_id (→ meta_leads ON DELETE CASCADE),
campaign_id (→ email_followup_campaigns),
recipient_email, subject,
status text                      -- pending | sent | failed
sent_at timestamptz, error_message text,
provider_message_id text,
unsubscribe_token text unique,   -- prêt pour activation future
created_at timestamptz
```
+ Index unique : `(lead_id, campaign_id) WHERE status = 'sent'` → idempotence.
RLS : SELECT admin only.

**`email_unsubscribes`** (structure prête, non utilisée en V1)
```
id, email text unique, campaign_key text null,
unsubscribed_at timestamptz default now(),
source text                      -- 'link' | 'manual' | 'bounce'
```
RLS : INSERT public via edge function future, SELECT admin.

### 2. Edge Function `send-followup-campaign`

3 modes via body :

| mode | body | action |
|---|---|---|
| `preview` | `{ mode, campaignKey }` | renvoie HTML rendu (lead fictif) |
| `test` | `{ mode, campaignKey }` | envoie 1 email à `info@immo-rama.ch` |
| `send` | `{ mode, campaignKey, leadIds }` | boucle, dédup, log, envoie |

**Garde-fous** :
- Vérifie `has_role(auth.uid(), 'admin')` → 403 sinon
- Max 500 leads / invocation
- 200ms entre envois
- Skip si déjà `sent` pour `(lead_id, campaign_id)`
- Skip si email présent dans `email_unsubscribes` (préparation V2)
- Génère `unsubscribe_token` unique par envoi

### 3. Template HTML email premium

`renderEmail(campaign, lead, unsubscribeToken)` calé sur la home Logisorama :

```text
┌─ Header sombre ──────────────────────────────────┐
│  fond #0a0e1a                                    │
│  Logisorama.ch (doré #d4a857)  by Immo-Rama.ch  │
├─ Hero gradient ──────────────────────────────────┤
│  #1e3a5f → #0a0e1a                               │
│  Titre 28px doré                                 │
│  Sous-titre 15px gris clair                      │
│  [Bouton CTA doré arrondi 12px]                  │
├─ Bénéfices (cartes claires) ─────────────────────┤
│  fond #f9f7f1, ✓ doré, texte #1e3a5f             │
├─ Bloc confiance ─────────────────────────────────┤
├─ CTA final centré ───────────────────────────────┤
├─ Footer ─────────────────────────────────────────┤
│  Immo-Rama Sàrl • CHE-442.303.796                │
│  "Se désinscrire" → /unsubscribe/{token} (visuel)│
└──────────────────────────────────────────────────┘
```
Tables HTML 600px, inline-styles, MSO conditional pour Outlook, fonts web-safe.

### 4. Page admin `/admin/campagnes-suivi`

Route + entrée menu admin (groupe Marketing/Leads).

**3 onglets** :

**Onglet 1 — Campagnes** (par défaut)
- 4 cartes (Location, Vente, Rénovation actives + Achat draft)
- Stats 7j depuis `lead_email_logs`
- Boutons : **Aperçu** (Dialog iframe desktop/mobile 375px) • **Test** (POST `mode:'test'`) • **Envoyer aux leads** (→ onglet 2 pré-filtré)

**Onglet 2 — Leads & envoi**
- Filtres : campagne, source, période, "non encore envoyés"
- **Bouton "Importer CSV"** → dialog avec **select obligatoire "Campagne de suivi"** (Location/Vente/Rénovation/Achat/Aucune) → écrit `campaign_key` sur les nouveaux leads
- Action bulk "Rattacher à une campagne" pour modifier après import
- Table : checkbox, prénom/nom, email, tél, ville, **badge campagne**, statut email pour la campagne sélectionnée
- "Tout sélectionner non-envoyés"
- **Footer sticky** : récap leads sélectionnés
- **AlertDialog obligatoire** : `"Vous êtes sur le point d'envoyer la campagne Location à 128 leads. Cette action est irréversible."` [Annuler] [Confirmer l'envoi]
- Toast progress + résumé final (X envoyés / Y échecs / Z déjà envoyés / W désinscrits)

**Onglet 3 — Logs**
- 200 derniers logs : destinataire, campagne (badge), sujet, statut, date, erreur
- Filtres campagne / statut / période
- Export CSV

### 5. Refactor

Extraire le dialog d'import CSV depuis `src/pages/admin/MetaLeads.tsx` vers `src/components/admin/ImportLeadsCsvDialog.tsx` avec prop `defaultCampaignKey?` + select campagne intégré. `MetaLeads.tsx` continue de l'utiliser, la nouvelle page aussi. L'edge `import-leads-csv` accepte un nouveau champ optionnel `campaign_key`.

### 6. Routes CTA (vérifiées)

| Campagne | URL CTA |
|---|---|
| Location | `https://logisorama.ch/nouveau-mandat?utm_source=email&utm_medium=followup&utm_campaign=location` |
| Vente | `https://logisorama.ch/vendre-mon-bien?utm_source=email&utm_medium=followup&utm_campaign=vente` |
| Rénovation | `https://logisorama.ch/construire-renover?utm_source=email&utm_medium=followup&utm_campaign=renovation` |
| Achat (draft) | `https://logisorama.ch/?utm_source=email&utm_medium=followup&utm_campaign=achat` (placeholder) |

### 7. Mémoire

Ajouter `mem://features/email-followup-campaigns` :
- Module = import CSV manuel + rattachement campagne + envoi 100% contrôlé
- Zéro automatisme, zéro trigger, zéro cron
- Idempotence via index unique `lead_email_logs(lead_id, campaign_id) WHERE sent`
- Désinscription : structure prête (`email_unsubscribes` + token), activation V2

---

## Architecture

```text
Admin → Importer CSV (+ campagne) ──► [import-leads-csv] ──► meta_leads (campaign_key)
                                                                    │
Admin → onglet "Leads & envoi" → sélection ────────────────────────┤
                                                                    ▼
Admin → "Envoyer" → AlertDialog confirmation ──► [send-followup-campaign]
                                                       ├─► check lead_email_logs
                                                       ├─► check email_unsubscribes
                                                       ├─► render HTML premium
                                                       ├─► Resend API
                                                       └─► INSERT lead_email_logs
```

---

## Hors périmètre V1 (volontairement)

- ❌ Page `/unsubscribe/:token` fonctionnelle (structure prête, activation V2)
- ❌ Webhook Meta direct
- ❌ Éditeur visuel de templates (modifiable via SQL)
- ❌ Envoi planifié / cron
- ❌ A/B testing
- ❌ Tracking ouvertures / clics

---

## Résultat attendu

1. **Admin → Campagnes de suivi**
2. Onglet "Campagnes" → clic "Aperçu" → email rendu desktop/mobile
3. Clic "Test" → email reçu à `info@immo-rama.ch`
4. Onglet "Leads & envoi" → import CSV avec campagne "Location" → 128 leads rattachés
5. Sélection + clic "Envoyer" → AlertDialog `"...Location à 128 leads."` → Confirmer
6. Onglet "Logs" → suivi détaillé envoyés/échecs
7. Ajouter une campagne plus tard = 1 INSERT dans `email_followup_campaigns`
