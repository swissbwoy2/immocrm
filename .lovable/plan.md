

# Plan d'implementation - 4 taches

## Tache 1 : Popup d'engagement mobile (anti-bounce)

### Concept
Un composant `EngagementPopup` qui s'affiche apres 5-8 secondes uniquement sur mobile. Le popup propose un message accrocheur avec deux options : remplir le formulaire rapide OU aller directement au mandat complet.

### Comportement
- S'affiche uniquement si `window.innerWidth < 768` (mobile)
- Delai : 5 secondes apres le chargement
- Ne s'affiche qu'une seule fois par session (flag `sessionStorage`)
- Ne s'affiche PAS si l'utilisateur a deja scroll au-dela du QuickLeadForm (signe d'engagement)
- Se ferme avec un bouton X ou un clic en dehors
- Utilise le composant Dialog de Radix UI (deja installe)

### Message accrocheur
- Titre : "Tu cherches un logement ?"
- Sous-titre : "Laisse-nous ta recherche, on s'occupe de tout. C'est gratuit."
- CTA primaire : "Commencer ma recherche" (ancre vers #quickform)
- CTA secondaire : "Remplir mon dossier complet" (lien vers /nouveau-mandat)

### Fichiers
| Fichier | Action |
|---------|--------|
| `src/components/landing/EngagementPopup.tsx` | Nouveau composant |
| `src/pages/Landing.tsx` | Ajout du composant |

---

## Tache 2 : Nettoyage de la base de donnees

Suppression du lead de test `test-utm@example.com` (ID: `eac9294b-a8b8-4d21-99a8-e9be84f17065`) via une migration SQL.

| Fichier | Action |
|---------|--------|
| Migration SQL | `DELETE FROM leads WHERE id = 'eac9294b-...'` |

---

## Tache 3 : Mini dashboard analytics dans l'admin

### Concept
Une nouvelle page admin `/admin/analytics` avec un tableau simple affichant par jour :
- Leads captures (depuis la table `leads`, par `created_at`)
- Mandats signes (depuis `demandes_mandat`, par `created_at`)
- Sources UTM (top sources)
- Taux de conversion leads -> mandats

### Implementation
- Creer une page `src/pages/admin/Analytics.tsx`
- Ajouter la route dans `App.tsx`
- Ajouter un lien dans le menu admin
- Utiliser Recharts (deja installe) pour un graphique simple leads/mandats par jour
- Tableau recapitulatif des UTM sources avec nombre de conversions
- Filtre par periode (reutiliser le composant `DateRangeFilter` existant)

### Donnees
Requetes directes sur les tables `leads` et `demandes_mandat` filtrees par date, groupees par jour. Pas besoin de nouvelle table.

| Fichier | Action |
|---------|--------|
| `src/pages/admin/Analytics.tsx` | Nouveau - page principale |
| `src/App.tsx` | Ajout route `/admin/analytics` |
| Navigation admin | Ajout lien dans le menu |

---

## Tache 4 : Optimisation performance mobile

### Actions concretes
1. **Lazy loading des sections de la landing page** : Les sections sous le fold (VideoSection, DossierAnalyseSection, FAQSection, CoverageSection, StatsSection, PartnersSection, ProptechSection, ApporteurSection) seront chargees en lazy avec `React.lazy` et `Suspense`
2. **Images** : Ajouter `loading="lazy"` sur les images qui ne sont pas dans le viewport initial
3. **Composants lourds** : Le `BudgetCalculatorSection` et `EntreprisesRHSection` sont des candidats au lazy loading car ils sont loin dans le scroll
4. **Reduction des imports initiaux** : Verifier que les sections en bas de page n'importent pas de grosses dependances au chargement

### Fichiers
| Fichier | Action |
|---------|--------|
| `src/pages/Landing.tsx` | Lazy loading des sections sous le fold |
| Composants d'images | Ajout `loading="lazy"` |

---

## Ordre d'implementation
1. Tache 2 (nettoyage DB) - rapide, une migration
2. Tache 1 (popup engagement) - impact direct sur conversion
3. Tache 3 (dashboard analytics) - autonomie de suivi
4. Tache 4 (optimisation mobile) - performance

