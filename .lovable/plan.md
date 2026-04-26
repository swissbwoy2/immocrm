## Diagnostic du problème

Le PDF que tu reçois (`Mandat_Haidara_Haidara_Hamidou_Mahamar.pdf`) est **un mandat simplifié obsolète** :
- ❌ Seulement 6 paragraphes génériques au lieu des **11 articles juridiques officiels** (location)
- ❌ Pas de CGV/RGPD assemblées
- ❌ Mentionne "durée de 6 mois" au lieu du contenu légal correct
- ❌ Format basique, pas le mandat conforme `mandat-legal-provisions-fidelity`

### Cause racine

Trois fonctions Edge écrivent toutes dans le bucket `mandat-contracts` :
| Fonction | Contenu | Statut |
|---|---|---|
| `generate-mandat-contract` | ❌ Ancien PDF simplifié 6 paragraphes | **Obsolète** (plus appelée mais a généré les anciens fichiers) |
| `generate-full-mandat-pdf` | ✅ 11 articles + CGV + signature | **Correcte** |
| `send-mandat-pdf` | ✅ 11 articles location / 5 articles achat | Correcte |

Sur la page **Admin > Mandats**, le bouton "Télécharger PDF" suit cette logique (`Mandats.tsx` lignes 234-276) :
1. **Priorité 1** : Si `client.mandat_pdf_url` existe → télécharge directement depuis le storage
2. **Priorité 2** (fallback) : Appelle `generate-full-mandat-pdf` pour régénérer

Comme **24 clients** ont un `mandat_pdf_url` pointant vers les anciens PDFs générés par `generate-mandat-contract`, la priorité 1 sert toujours le mauvais fichier. La bonne fonction n'est jamais appelée.

## Plan de correction

### 1. Modifier la logique de téléchargement dans `src/pages/admin/Mandats.tsx`

**Inverser la priorité** : toujours appeler `generate-full-mandat-pdf` (qui régénère depuis les données BDD à jour avec CGV + 11 articles), et n'utiliser le storage que comme fallback secondaire si la régénération échoue.

Avantages :
- Garantit que l'admin reçoit toujours la version officielle à jour
- Si les données client changent (signature, candidats, etc.), le PDF reflète l'état actuel
- La fonction `generate-full-mandat-pdf` upsert automatiquement le nouveau PDF dans le storage (ligne 940-941), donc le `mandat_pdf_url` sera mis à jour avec la bonne version

### 2. Nettoyer les anciens PDFs obsolètes (optionnel mais recommandé)

Migration SQL pour invalider les `mandat_pdf_url` actuels afin de forcer une régénération propre :
```sql
-- Vide les URLs des anciens PDFs pour forcer la régénération à la prochaine demande
UPDATE clients SET mandat_pdf_url = NULL WHERE mandat_pdf_url IS NOT NULL;
```

Cela force chaque téléchargement futur à passer par `generate-full-mandat-pdf` qui régénère et restocke le bon fichier.

### 3. Supprimer définitivement la fonction obsolète

Supprimer `supabase/functions/generate-mandat-contract/` (plus aucun appelant côté code, vérifié avec `rg`) pour éviter toute confusion future.

### 4. Faire la même correction côté client

Vérifier `src/pages/client/MonContrat.tsx` qui télécharge aussi depuis `mandat_pdf_url` — appliquer la même inversion (régénération en priorité).

## Résultat attendu

Après ces changements, le bouton "Télécharger PDF" depuis Admin > Mandats produira **systématiquement** un mandat conforme avec :
- ✅ 11 articles juridiques officiels (location) ou 5 articles (achat)
- ✅ CGV/RGPD assemblées
- ✅ Signature électronique
- ✅ Données candidats, documents, etc. à jour

## Fichiers impactés

- ✏️ `src/pages/admin/Mandats.tsx` — inverser la priorité de téléchargement
- ✏️ `src/pages/client/MonContrat.tsx` — même correction
- 🗑️ `supabase/functions/generate-mandat-contract/` — suppression
- ✏️ `supabase/config.toml` — retirer la config de la fonction supprimée
- 📦 Migration SQL — nullifier les `mandat_pdf_url` obsolètes