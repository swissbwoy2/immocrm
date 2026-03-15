

## Plan: Recherche autonome sur les sites immobiliers suisses

### Situation actuelle

Le bouton "Run" (eclair) dans l'onglet Missions cree un `mission_execution_run` mais **ne fait aucune recherche reelle**. Il manque le moteur de scraping qui va chercher les annonces sur les portails immobiliers.

### Architecture proposee

```text
Admin clique "Run"
    → handleMissionsRun (edge function)
    → Construit les URLs de recherche par site (criteres client)
    → Firecrawl scrape chaque page de resultats
    → Gemini Flash extrait les annonces structurees du markdown
    → ingestResults() insere + score matching
    → Run mis a jour (completed, compteurs)
```

### Pre-requis: Connecter Firecrawl

Firecrawl est necessaire pour scraper les sites immobiliers. Il faut connecter le service via le connecteur Lovable.

### Implementation

#### 1. Connecter Firecrawl (connecteur)

Utiliser le connecteur Firecrawl pour obtenir la cle API injectee automatiquement dans les edge functions.

#### 2. Modifier `handleMissionsRun` dans `ai-relocation-api/index.ts`

Transformer la fonction pour qu'elle execute reellement la recherche:

**a) Construire les URLs de recherche** pour chaque portail selon les criteres client:

| Site | Pattern URL |
|---|---|
| immoscout24.ch | `/fr/immobilier/louer/lieu-{city}?nrf={rooms}&prf={budget}` |
| homegate.ch | `/fr/louer/immobilier/{city}/correspondant?ac={rooms}&ah={budget}` |
| flatfox.ch | `/fr/search/?city={city}&rooms_min={rooms}&price_max={budget}` |
| immobilier.ch | `/fr/annonces/louer?location={city}&rooms={rooms}&price_to={budget}` |
| acheter-louer.ch | `/fr/louer?location={city}&rooms={rooms}&maxprice={budget}` |

**b) Scraper avec Firecrawl** : Pour chaque URL, appeler l'API Firecrawl (`/v1/scrape`) en format markdown pour obtenir le contenu textuel des pages de resultats.

**c) Extraire les annonces avec Gemini Flash** : Envoyer le markdown a `google/gemini-2.5-flash` via Lovable AI pour extraire un JSON structure par annonce (titre, adresse, loyer, pieces, surface, lien, ID externe).

**d) Ingerer via `ingestResults()`** : Les annonces extraites passent par le pipeline existant (deduplication, scoring, insertion).

**e) Mettre a jour le run** : Statut `completed`, compteurs `results_found`, `results_new`, `duplicates_detected`.

#### 3. Gestion des erreurs et limites

- Timeout: scraper max 5 sites, 2 pages par site
- Chaque site dans un try/catch pour ne pas bloquer les autres
- Si Firecrawl echoue sur un site, log l'erreur et continue
- Run marque `failed` si tous les sites echouent

### Fichiers modifies

| Fichier | Action |
|---|---|
| `supabase/functions/ai-relocation-api/index.ts` | Enrichir `handleMissionsRun` avec scraping Firecrawl + extraction IA + ingestion |

### Etape prealable

Avant l'implementation, il faut **connecter Firecrawl** au projet pour que la cle API soit disponible dans les edge functions. Voulez-vous que je lance la connexion Firecrawl maintenant?

