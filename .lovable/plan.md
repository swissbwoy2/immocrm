
# Espace Coursier - Tableau de bord pour les visites deleguees

## Objectif
Creer un espace dedie aux coursiers ou l'agent peut deleguer une visite, le coursier l'accepte, effectue la visite et est remunere 5 CHF par visite. Le coursier a acces a toutes les informations de l'offre (adresse, code immeuble, contact concierge/locataire, etc.).

## Workflow

```text
+------------------+       +------------------+       +------------------+
|     AGENT        |       |    COURSIER      |       |     CLIENT       |
|                  |       |                  |       |                  |
| Visite deleguee  |       | Dashboard        |       | Recoit feedback  |
| par le client    +------>+ Missions dispo   +------>+ de la visite     |
|                  |       |                  |       |                  |
| Bouton "Deleguer | Accepte| Effectue visite  | Valide|                  |
| au coursier"     |       | + feedback/photos |       |                  |
+------------------+       +------------------+       +------------------+
                                    |
                                    v
                           Remunere 5.- CHF
```

---

## 1. Migration base de donnees

### A. Ajouter le role `coursier` a l'enum `app_role`
```sql
ALTER TYPE public.app_role ADD VALUE 'coursier';
```

### B. Creer la table `coursiers`
Similaire a la table `agents`, pour stocker les informations specifiques :
- `id` (UUID, PK)
- `user_id` (reference `auth.users`)
- `prenom`, `nom`, `telephone`, `email`
- `iban` (pour le paiement)
- `statut` (actif, inactif)
- `created_at`, `updated_at`

### C. Ajouter des colonnes a la table `visites`
- `coursier_id` (UUID, nullable, reference `coursiers.id`) : le coursier assigne
- `statut_coursier` (TEXT, nullable) : `'en_attente'`, `'accepte'`, `'refuse'`, `'termine'`
- `remuneration_coursier` (NUMERIC, defaut 5.00)
- `paye_coursier` (BOOLEAN, defaut false)
- `feedback_coursier` (TEXT, nullable) : compte-rendu du coursier

### D. Politiques RLS
- Les coursiers peuvent lire les visites ou `coursier_id` est leur ID, ou `statut_coursier = 'en_attente'` (pool de missions disponibles)
- Les coursiers peuvent mettre a jour les visites assignees a eux (accepter, ajouter feedback)
- Les agents et admins gardent un acces total

---

## 2. Authentification et navigation

### A. `src/contexts/AuthContext.tsx`
- Ajouter `'coursier'` au type `userRole`
- Gerer l'activation automatique au premier login (comme les agents)

### B. `src/components/ProtectedRoute.tsx`
- Ajouter `'coursier'` a la liste des roles valides

### C. `src/components/AppSidebar.tsx`
Ajouter un menu coursier :
- Tableau de bord (`/coursier`)
- Missions disponibles (`/coursier/missions`)
- Historique et gains (`/coursier/historique`)
- Parametres (`/coursier/parametres`)

### D. `src/App.tsx`
Ajouter les routes :
```text
/coursier          -> Dashboard
/coursier/missions -> Missions disponibles + mes missions
/coursier/historique -> Historique des visites + solde
/coursier/parametres -> Parametres du compte
```

---

## 3. Interface Agent - Bouton "Deleguer au coursier"

### Fichier : `src/pages/agent/Visites.tsx`
Pour chaque visite deleguee (`est_deleguee = true`), ajouter un bouton :
- **"Deleguer au coursier"** : passe `statut_coursier` a `'en_attente'` et rend la visite visible dans le pool des coursiers
- L'agent voit ensuite le statut de la mission (en attente / acceptee / terminee)

---

## 4. Dashboard Coursier (nouveau)

### Page principale : `src/pages/coursier/Dashboard.tsx`

**Section 1 - KPIs en haut**
- Nombre de missions completees ce mois
- Gains du mois (missions x 5.-)
- Gains totaux cumules
- Missions en cours

**Section 2 - Onglets**

#### Onglet "Missions disponibles"
Liste des visites ou `statut_coursier = 'en_attente'` :
- Adresse du bien
- Date de la visite
- Infos resumees (pieces, surface, prix)
- Bouton **"Accepter la mission (5.-)"**

#### Onglet "Mes missions"
Visites acceptees par le coursier connecte :
- Statut (accepte / termine)
- Toutes les infos de l'offre :
  - Adresse complete
  - Code immeuble
  - Contact concierge (nom + tel)
  - Contact locataire (nom + tel)
  - Nombre de pieces, surface, etage
  - Prix / loyer
  - Description
  - Lien annonce
  - Commentaires de l'agent
- Bouton **"Terminer la visite"** ouvrant un formulaire :
  - Feedback texte
  - Upload photos/videos
  - Note recommandation

#### Onglet "Historique"
Visites terminees avec :
- Recapitulatif des gains
- Detail par visite (date, adresse, statut paiement)

---

## 5. Administration des coursiers

### Page : `src/pages/admin/Coursiers.tsx`
- Liste de tous les coursiers
- Creation de nouveaux comptes coursiers (comme pour les agents)
- Suivi des missions et paiements
- Marquer les visites comme payees

---

## Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `supabase/migrations/xxxx_add_coursier_role.sql` | Migration DB |
| `src/pages/coursier/Dashboard.tsx` | Dashboard principal |
| `src/pages/coursier/Missions.tsx` | Missions dispo + mes missions |
| `src/pages/coursier/Historique.tsx` | Historique et gains |
| `src/pages/coursier/Parametres.tsx` | Parametres du compte |
| `src/pages/admin/Coursiers.tsx` | Gestion admin des coursiers |

## Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `src/contexts/AuthContext.tsx` | Ajouter role `coursier` |
| `src/components/ProtectedRoute.tsx` | Ajouter `coursier` aux roles valides |
| `src/components/AppSidebar.tsx` | Menu coursier |
| `src/App.tsx` | Routes `/coursier/*` et `/admin/coursiers` |
| `src/pages/agent/Visites.tsx` | Bouton "Deleguer au coursier" |
| `src/pages/Login.tsx` | Redirection `/coursier` apres login |

---

## Resume de la remuneration

| Element | Valeur |
|---------|--------|
| Remuneration par visite | 5.00 CHF |
| Declencheur | Visite marquee comme "terminee" |
| Suivi paiement | Colonne `paye_coursier` dans `visites` |
| Validation | Admin marque comme paye |
