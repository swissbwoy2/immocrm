## Objectif

Créer une page admin dédiée au suivi des extraits de poursuites de tous les clients, affichant :
- La **dernière date d'émission** extraite
- La **confiance IA** (%)
- La **méthode d'extraction** (`ai`, `ai_auto_scan`, `manual`, `agent`)
- Le **document source** (lien cliquable vers le PDF)
- Le **statut** (✅ valide / 🟡 > 2 mois / 🔴 expiré / ⚪ manquant)

## Implémentation

### 1. Nouvelle page : `src/pages/admin/SuiviExtraitsPoursuites.tsx`

Tableau premium (PremiumTable) avec :
- **Colonnes** : Client (nom + email) · Date d'émission · Âge (mois) · Statut (badge coloré) · Confiance · Méthode (badge) · Document source (icône PDF) · Dernier rappel · Actions
- **Filtres haut de page** : Tous / Manquant / Valide / Warning (>2 mois) / Expiré (>3 mois)
- **KPIs en tête** : 4 cartes (Total clients · Manquant · Warning · Expiré)
- **Recherche** par nom client
- **Bouton action** par ligne : « Relancer l'IA » (appelle `extract-poursuites-date` avec le `client_id`) + « Renvoyer rappel » (appelle `send-document-update-reminders`)
- **Tri** par défaut : expirés en premier, puis warning, puis manquant, puis valide

### 2. Source de données

Requête Supabase :
```sql
SELECT c.id, c.prenom, c.nom, c.email,
       c.extrait_poursuites_date_emission,
       c.extrait_poursuites_extraction_method,
       c.extrait_poursuites_ai_confidence,
       c.extrait_poursuites_document_id,
       c.extrait_poursuites_last_reminder_at,
       d.nom AS doc_nom, d.url AS doc_url
FROM clients c
LEFT JOIN documents d ON d.id = c.extrait_poursuites_document_id
WHERE c.statut = 'actif'
ORDER BY ...
```

Avec `.limit(15000)` (cf. mémoire `global-query-row-limit-increase`).

### 3. Routing & navigation

- **Route** : `/admin/suivi-extraits` (lazy import dans `src/App.tsx`, protégée `allowedRoles={['admin']}`)
- **Sidebar** : ajouter une entrée dans `src/components/AppSidebar.tsx` section admin → groupe « Documents/Conformité » avec icône `ShieldCheck` et chemin `/admin/suivi-extraits`

### 4. UX details

- Méthode `ai_auto_scan` → badge violet « IA Auto » avec icône `Sparkles`
- Méthode `ai` → badge bleu « IA » 
- Méthode `manual` → badge gris « Manuel »
- Méthode `agent` → badge orange « Agent »
- Confiance affichée en % avec barre de progression colorée (vert ≥80, jaune ≥50, rouge <50)
- Document source : icône `FileText` cliquable ouvrant le PDF dans un nouvel onglet via `createSignedUrl` (60 min)
- Format dates : `format(date, 'd MMM yyyy', { locale: fr })`, timezone Europe/Zurich

### 5. Aucune migration requise

Toutes les colonnes existent déjà sur `clients`. Pas de changement DB.

## Fichiers impactés

- ✏️ `src/App.tsx` (ajout lazy import + route)
- ✏️ `src/components/AppSidebar.tsx` (ajout entrée menu)
- ➕ `src/pages/admin/SuiviExtraitsPoursuites.tsx` (nouvelle page)

## Question

Je n'ai pas besoin de clarification : la page s'intégrera naturellement à la sidebar admin. Approuve pour lancer l'implémentation.
