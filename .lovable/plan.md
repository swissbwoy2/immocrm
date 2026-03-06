

## Calcul automatique des commissions depuis les affaires conclues

### Contexte
Les agents sont payés a la commission (45% des affaires conclues). Le systeme doit calculer automatiquement le salaire brut d'un agent en recuperant ses transactions conclues du mois (bail signe, sous reserve de paiement).

La table `transactions` contient deja toutes les donnees necessaires : `agent_id`, `part_agent`, `commission_payee`, `statut` (`en_cours` ou `conclue`), `date_transaction`.

Le lien est : `employes.user_id` → `agents.user_id` → `agents.id` → `transactions.agent_id`.

### Modifications

**1. Migration SQL** — Ajouter a `fiches_salaire` :
- `mode_remuneration` (text, default `commission`) — commission / horaire / fixe / independant
- `montant_commissions` (numeric) — total commissions du mois
- `nombre_heures` (numeric) — heures travaillees (mode horaire)
- `taux_horaire_utilise` (numeric) — taux horaire applique
- `detail_commissions` (jsonb) — detail des transactions incluses (adresse, montant, date)

Ajouter a `employes` :
- `mode_remuneration` (text, default `commission`)

**2. FicheSalaireDialog.tsx** — Adapter dynamiquement selon le mode :
- **Commission** (defaut pour agents) : a la selection de l'employe, recuperer automatiquement les transactions conclues du mois via le chemin `employes.user_id` → `agents` → `transactions`. Afficher la liste des affaires avec adresse + montant `part_agent`. Le salaire brut = somme des `part_agent`. Les cotisations sociales s'appliquent normalement sur ce brut.
- **Horaire** (Carina / coursiers) : afficher champs heures + taux horaire. Brut = heures x taux.
- **Independant** : afficher les commissions mais sans cotisations sociales (decompte honoraires net).
- **Fixe** : comportement actuel (salaire mensuel).

**3. EmployeDialog.tsx** — Ajouter un selecteur "Mode de remuneration" (Commission / Horaire / Fixe / Independant). Pre-remplir `commission` pour les agents, `horaire` pour les coursiers.

**4. swissPayroll.ts** — Ajouter `mode_remuneration` a `SalaryInput`. Pour le mode `independant`, mettre toutes les cotisations a 0. Le brut est calcule en amont selon le mode.

**5. FichesSalaireList.tsx** — Afficher une colonne "Mode" avec badge (Commission / Horaire / Fixe / Independant).

**6. CoutEmployeurDashboard.tsx** — Afficher le mode dans le tableau. Les independants n'ont pas de charges employeur.

**7. FicheSalairePDFViewer.tsx** — Pour le mode commission, afficher le detail des affaires conclues sur le PDF. Pour les independants, generer un "Decompte d'honoraires" au lieu d'une fiche de salaire.

### Logique de recuperation des commissions
```text
employes (employe_id) 
  → employes.user_id 
  → agents.user_id (match) → agents.id 
  → transactions.agent_id 
  WHERE statut IN ('conclue', 'en_cours')
  AND date_transaction between debut_mois and fin_mois
  → SUM(part_agent) = salaire_brut du mois
```

Les transactions avec `commission_payee = false` sont marquees "sous reserve de paiement" sur la fiche.

### Fichiers concernes
- Migration SQL (nouvelles colonnes)
- `src/lib/swissPayroll.ts`
- `src/components/salaires/EmployeDialog.tsx`
- `src/components/salaires/FicheSalaireDialog.tsx`
- `src/components/salaires/FichesSalaireList.tsx`
- `src/components/salaires/CoutEmployeurDashboard.tsx`
- `src/components/salaires/FicheSalairePDFViewer.tsx`

