

## Utiliser le template DOCX pour la génération de brochures de vente

### Contexte

Le template DOCX uploadé est une brochure luxe "Dossier Off-Market" avec :
- Page 1 : Cover (header doré IMMO-RAMA, photo, localisation, prix, tableau KPIs 6 cases)
- Page 2 : Executive Summary (description, photo, stats surface/parcelle/chauffage/CECB)
- Pages 3-4 : Visuels (photos pleine page)
- Page 5 : Lecture Investissement (KPIs prix/m2, statut, typologie) + Potentiel
- Pages 6+ : Plans architecturaux, annexes (police ECA, registre foncier, CECB)

Le PDF actuel généré avec pdf-lib est basique (texte noir sur fond blanc). Il faut le remplacer par une génération DOCX basée sur ce template.

### Approche technique

**Stratégie : Template DOCX avec placeholders + remplacement XML dans l'Edge Function**

1. **Préparer le template** : Modifier le DOCX pour remplacer les données spécifiques (Lausanne, CHF 5'199'000, etc.) par des placeholders : `{{NOM_BIEN}}`, `{{PRIX}}`, `{{SURFACE}}`, etc.
2. **Stocker le template** dans un bucket Supabase Storage `brochure-templates`
3. **Edge Function** : Télécharge le template, décompresse le ZIP (DOCX = ZIP), remplace les placeholders dans `word/document.xml`, recompresse, retourne le DOCX en base64

### Placeholders dans le template

| Placeholder | Donnée |
|---|---|
| `{{LOCALISATION}}` | ville + quartier |
| `{{DESCRIPTION_COURTE}}` | "Immeuble de rendement avec fort potentiel..." |
| `{{PRIX}}` | CHF formaté |
| `{{NB_LOGEMENTS}}` | nombre de logements |
| `{{SURFACE_HABITABLE}}` | surface totale |
| `{{VOLUME_ECA}}` | volume ECA si dispo |
| `{{STATUT}}` | Libre / Loué |
| `{{CECB}}` | classe énergétique |
| `{{POTENTIEL}}` | potentiel de transformation |
| `{{EXECUTIVE_SUMMARY}}` | description commerciale longue |
| `{{SURFACE_PARCELLE}}` | surface parcelle |
| `{{CHAUFFAGE}}` | type chauffage |
| `{{PRIX_M2}}` | prix / m2 calculé |
| `{{PRIX_M3}}` | prix / m3 si volume dispo |
| `{{TYPOLOGIE}}` | type de bien |
| `{{NB_LEVIERS}}` | création de valeur |

### Fichiers modifiés / créés

| Fichier | Action |
|---|---|
| Migration SQL | Créer bucket `brochure-templates` (privé) |
| Template DOCX | Préparer avec placeholders, uploader dans le bucket via l'Edge Function ou manuellement |
| `supabase/functions/generate-brochure-pdf/index.ts` | Réécrire : télécharger template depuis storage, dézipper avec JSZip, remplacer placeholders dans document.xml, rezipper, retourner en base64 DOCX |
| `src/components/biens-vente/GenerateDocumentsSection.tsx` | Changer le nom du bouton "Générer Brochure DOCX", adapter le download (MIME type `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, extension `.docx`) |

### Limites Edge Function

- La manipulation ZIP/XML est légère (le template fait ~2-3 Mo max)
- JSZip est disponible via esm.sh en Deno
- Les photos du bien ne seront PAS intégrées dynamiquement dans le DOCX (trop lourd pour l'Edge Function) — les placeholders photos resteront ceux du template ou seront des pages vides à remplir manuellement
- Alternative : si on veut les photos dynamiques, on peut les récupérer depuis le storage et les injecter dans le ZIP mais c'est risqué pour la mémoire

### Etapes d'implémentation

1. Copier le DOCX template dans le projet, le modifier pour y mettre les placeholders
2. Créer le bucket storage + uploader le template
3. Réécrire l'edge function avec JSZip
4. Adapter le frontend pour télécharger un .docx au lieu d'un .pdf

