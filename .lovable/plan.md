
# Plan : Améliorer le chargement Google Maps pour éviter le mode manuel

## Problème identifié

Le `useGoogleMapsLoader.ts` a un timeout de **5 secondes** qui inclut :
- Le temps d'appel à l'Edge Function `get-google-maps-token`
- Le temps de chargement du script Google Maps

Si ce délai est dépassé, le système passe en mode fallback (manuel), même si tout fonctionne normalement.

## Solution

### 1. Augmenter le timeout et améliorer la logique

| Avant | Après |
|-------|-------|
| `LOAD_TIMEOUT_MS = 5000` | `LOAD_TIMEOUT_MS = 15000` (15 secondes) |
| Timeout unique pour tout | Timeout séparé pour Edge Function et script |
| Pas de retry | Retry automatique si échec |

### 2. Modifications dans `src/hooks/useGoogleMapsLoader.ts`

```typescript
const LOAD_TIMEOUT_MS = 15000; // Augmenter à 15 secondes
const EDGE_FUNCTION_TIMEOUT_MS = 8000; // 8 secondes pour l'Edge Function

// Ajouter un timeout spécifique pour l'appel Edge Function
const fetchTokenWithTimeout = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT_MS);
  
  try {
    const { data, error } = await supabase.functions.invoke('get-google-maps-token', {
      // @ts-ignore - AbortController support
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (error) throw error;
    return data?.token;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};
```

### 3. Ajouter du logging pour le debug

```typescript
console.log('[GoogleMaps] Starting initialization...');
console.log('[GoogleMaps] Token retrieved, loading script...');
console.log('[GoogleMaps] Script loaded successfully');
// ou
console.warn('[GoogleMaps] Timeout reached after', LOAD_TIMEOUT_MS, 'ms - switching to fallback');
```

### 4. Améliorer la détection du script déjà chargé

Actuellement, le script peut être bloqué si Google Maps est déjà en cours de chargement ailleurs dans l'app. Améliorer la détection :

```typescript
// Vérifier si le script est déjà dans le DOM
const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
if (existingScript) {
  // Attendre que le script existant se charge
  await new Promise<void>((resolve) => {
    if (window.google?.maps) {
      resolve();
    } else {
      existingScript.addEventListener('load', () => resolve());
    }
  });
}
```

### 5. Ajouter un mécanisme de retry dans le composant

Dans `GoogleAddressAutocomplete.tsx`, ajouter un bouton pour relancer le chargement :

```typescript
{showFallbackMode && (
  <div className="flex items-center gap-2 mt-1">
    <p className="text-xs text-muted-foreground">
      Mode manuel - 
    </p>
    <button 
      type="button"
      onClick={() => window.location.reload()}
      className="text-xs text-primary underline"
    >
      Réessayer
    </button>
  </div>
)}
```

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useGoogleMapsLoader.ts` | Augmenter timeout, ajouter logs, améliorer détection script |
| `src/components/GoogleAddressAutocomplete.tsx` | Ajouter bouton retry en mode fallback |

## Résultat attendu

- Le chargement de Google Maps aura 15 secondes au lieu de 5
- Des logs dans la console permettront de diagnostiquer les problèmes
- En cas d'échec, l'utilisateur pourra cliquer sur "Réessayer"
- Le script existant sera correctement détecté pour éviter les conflits
