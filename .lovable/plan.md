## Contexte

Le CSV Meta (`leads_7.csv`) contient tous les leads mélangés. Tu veux n'importer **que** les prospects pertinents pour la **campagne Location** :

1. **Formulaire** contient "logisorama" (insensible à la casse — couvre "Logisorama futur", "LOGISORAMA 2.0", "LOGISORAMA5.0"…)
2. **ET** Étape = **"Qualifié"** (insensible à la casse / accents)
3. **ET** rattachement automatique à la campagne **Location** (pas de choix dans le dropdown)

Tout le reste est rejeté à l'import : "À évaluer", "Contacté", "Converti", formulaires "RENOV IA", "vendeurs vs Acheteurs"…

## Modifications

### 1. Parser CSV (`src/pages/admin/CampagnesSuivi.tsx`)

Dans `handleImport`, ajouter la détection de la colonne **Étape** et appliquer le double filtre :

```ts
const etapeIdx = headers.findIndex(
  (h) => h.includes("étape") || h.includes("etape") || h.includes("stage")
);

let rejectedFormulaire = 0;
let rejectedEtape = 0;

for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]); // gère virgules dans guillemets
  const formulaire = formulaireIdx >= 0 ? cols[formulaireIdx] || "" : "";
  const etape = etapeIdx >= 0 ? cols[etapeIdx] || "" : "";

  const isLogisorama = formulaire.toLowerCase().includes("logisorama");
  const normEtape = etape.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const isQualifie = normEtape === "qualifie";

  if (!isLogisorama) { rejectedFormulaire++; continue; }
  if (!isQualifie)   { rejectedEtape++;       continue; }

  parsed.push({ email, prenom, nom, telephone, source, formulaire, etape });
}
```

### 2. Forcer la campagne Location

- Dans le dialogue d'import, **supprimer le sélecteur de campagne** et le remplacer par un badge fixe :  
  *"Cible : campagne **Location** (rattachement automatique)"*
- Forcer `campaign_key: "location"` dans l'appel à `import-leads-csv`.

### 3. Toast de résultat enrichi

Remplacer le toast actuel par un récap clair :

```
✅ {data.inserted} leads importés vers Location
   {data.duplicates} doublons · {rejectedFormulaire} hors Logisorama · {rejectedEtape} non Qualifiés
```

Si `parsed.length === 0` → bloquer avec :  
*"Aucun lead conforme. Vérifie que le CSV contient bien des leads Logisorama avec étape Qualifié."*

### 4. Note explicative dans le dialogue d'import

Encart bleu visible au-dessus du sélecteur de fichier :

> **Filtre automatique — Campagne Location**  
> Seuls les leads dont le **Formulaire** contient "Logisorama" **et** dont l'**Étape** est **"Qualifié"** seront importés. Tous les autres (À évaluer, Contacté, Converti, RENOV IA, vendeurs/acheteurs…) sont automatiquement écartés.

### 5. Robustesse parser CSV

Le parser actuel `lines[i].split(",")` casse si une cellule contient une virgule entre guillemets. Ajouter un mini-parser CSV qui respecte les guillemets (utile pour les noms type `"Sousa, Mario"`).

## Résultat attendu sur ton fichier `leads_7.csv` (155 lignes)

Sur l'extrait visible (lignes 2-22) seraient importés vers **Location** :  
Fanny, Sanja Kitanova, Isabel Baquero, Manon Sarrat, Afo Meti, Roro VB, Malherbe Mireille, Zahra, Omaira Maritza Henchoz (≈ 9 leads).

Rejetés : tous les "À évaluer" / "Contacté" / "Converti", + Cindy Savart (RENOV IA), + Claudio Cecchet & paschoud (vendeurs/acheteurs).

## Ce qui ne change pas

- Module 100 % manuel : import → confirmation → envoi.
- Design email premium inchangé.
- Déduplication par email + index unique `(lead_id, campaign_id)` toujours actifs.
- Les autres campagnes (Vente, Rénovation, Achat) restent disponibles à l'envoi, mais l'**import CSV est verrouillé sur Location**.
