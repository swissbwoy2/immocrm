## 🎯 Objectif

Renforcer le suivi de l'**extrait de poursuites** avec :
1. **Double seuil d'alerte** (2 mois = avertissement, 3 mois = expiré)
2. **Notifications multi-rôles** (client + agent assigné + admins)
3. **Extraction IA automatique** de la date d'émission depuis le PDF (plus de saisie manuelle)

---

## 📊 1. Base de données (migration)

Ajout sur `clients` :
- `extrait_poursuites_date_emission` (DATE, nullable)
- `extrait_poursuites_date_extraction_method` (TEXT : `'ai'` | `'manual'` | `'agent'`)
- `extrait_poursuites_document_id` (UUID, FK → `documents.id`, nullable) — lien vers le PDF source
- `extrait_poursuites_last_reminder_at` (TIMESTAMPTZ) — anti-spam 7 jours
- `extrait_poursuites_ai_confidence` (NUMERIC) — score de confiance IA (0-1)

**Pas besoin de colonne `date_expiration`** : calculée à la volée (`date_emission + 3 mois`) pour rester flexible.

---

## 🤖 2. Edge Function : `extract-poursuites-date` (NOUVEAU)

**But** : Lire un PDF d'extrait de poursuites et extraire la date d'émission via Lovable AI (Gemini 2.5 Flash, multimodal).

**Flow** :
1. Reçoit `document_id` (PDF dans le bucket `client-documents`)
2. Crée une signed URL (5 min) du PDF
3. Appelle Lovable AI Gateway avec `google/gemini-2.5-flash` en mode **vision** + tool calling structuré :
   ```json
   {
     "name": "extract_poursuites_data",
     "parameters": {
       "date_emission": "YYYY-MM-DD",
       "office_canton": "string",
       "nom_personne": "string",
       "confidence": "number 0-1"
     }
   }
   ```
4. Met à jour `clients.extrait_poursuites_date_emission` + `extraction_method = 'ai'` + `ai_confidence`
5. Retourne la date extraite + confiance pour confirmation utilisateur

**Sécurité** : verify_jwt activé, vérifie que l'utilisateur a accès au document (RLS via service role + check ownership).

---

## 🔔 3. Edge Function : `send-document-update-reminders` (REFONTE)

Logique remplacée :

```
Pour chaque client actif (statut in actif/en_recherche/en_attente) :
  date_emission = client.extrait_poursuites_date_emission
  
  SI date_emission IS NULL :
    → Notif "URGENT : Renseignez la date de votre extrait" 
       (cooldown 7j, à client + agent)
  
  SINON :
    age_mois = (now - date_emission) / 30
    
    SI age_mois >= 3 :
      → 🔴 Notif EXPIRÉ "Commandez un nouvel extrait IMMÉDIATEMENT"
         → client + agent + admins (cooldown 5j)
    
    SINON SI age_mois >= 2 :
      → 🟡 Notif AVERTISSEMENT "Certaines régies n'acceptent que < 2 mois.
         Anticipez et commandez un nouvel extrait."
         → client + agent (cooldown 7j)
```

Email avec lien direct **office des poursuites en ligne** (eSchKG / cantons romands).

---

## 🖥️ 4. Frontend

### A. `src/components/DocumentUpdateReminder.tsx` (refonte, côté client)
Remplace la simple confirmation par un widget intelligent :
- **Si pas de date** : Bouton **"📤 Uploader mon extrait (IA détecte la date)"** → ouvre dialog d'upload + appel `extract-poursuites-date` → affiche date détectée pour validation
- **Si date < 2 mois** : Badge vert ✅ "Valide jusqu'au JJ/MM/AAAA"
- **Si date 2-3 mois** : Badge orange 🟡 "Attention : certaines régies exigent < 2 mois — anticipez"
- **Si date > 3 mois** : Badge rouge 🔴 "EXPIRÉ — commandez un nouvel extrait" + lien vers eSchKG
- Bouton **"📅 Saisir manuellement"** en fallback

### B. `src/components/ExtractPoursuitesUploadDialog.tsx` (NOUVEAU)
Composant réutilisable :
1. Drag & drop PDF
2. Upload vers `client-documents/{client_id}/extrait_poursuites/`
3. Crée la ligne dans `documents` (type_document = `extrait_poursuites`)
4. Appelle `extract-poursuites-date` avec spinner "🤖 Lecture IA en cours..."
5. Affiche la date détectée + confiance → boutons **"✅ Confirmer"** / **"✏️ Corriger"**

### C. `src/pages/admin/ClientDetail.tsx` & `src/pages/agent/ClientDetail.tsx`
Dans la section documents du client :
- Nouvelle carte **"Extrait de poursuites"** avec :
  - Statut visuel (vert / orange / rouge)
  - Date d'émission + méthode (🤖 IA / ✍️ Manuel)
  - Bouton "Uploader pour extraction IA" (agent peut le faire pour le client)
  - Bouton "Modifier la date manuellement"

### D. `src/pages/admin/Dashboard.tsx` (alerte)
Widget "🔴 Extraits poursuites expirés" listant les clients concernés (clic → ClientDetail).

---

## 📧 5. Templates email (3 niveaux)

| Seuil | Sujet | Destinataires |
|---|---|---|
| 🟡 2 mois | "Anticipez : votre extrait approche les 2 mois" | Client + Agent |
| 🔴 3 mois | "URGENT : extrait de poursuites expiré" | Client + Agent + Admins |
| ❓ Inconnu | "Renseignez la date de votre extrait" | Client + Agent |

---

## 🗂️ Récap fichiers

**Créer** :
- `supabase/functions/extract-poursuites-date/index.ts`
- `src/components/ExtractPoursuitesUploadDialog.tsx`
- Migration SQL (5 nouvelles colonnes sur `clients`)

**Modifier** :
- `supabase/functions/send-document-update-reminders/index.ts` (logique 3 seuils + multi-destinataires)
- `src/components/DocumentUpdateReminder.tsx` (intégration upload IA)
- `src/pages/admin/ClientDetail.tsx` (carte extrait poursuites)
- `src/pages/agent/ClientDetail.tsx` (carte extrait poursuites)
- `src/pages/admin/Dashboard.tsx` (widget alertes)
- `supabase/config.toml` (déclarer la nouvelle fonction)

---

## ❓ À confirmer

**Question** : Pour l'extraction IA, j'utilise **Gemini 2.5 Flash** (multimodal, gratuit dans les quotas Lovable AI, lit les PDF directement). OK ou tu préfères Gemini 2.5 Pro (plus précis mais plus lent/coûteux) ?

Par défaut je pars sur **Flash** (suffisant pour lire une date sur un document officiel structuré).