

# Tracking Meta Pixel pour campagne Facebook Ads "Vente"

## Etat actuel

Le Meta Pixel (ID: `1270471197464641`) est deja installe dans `index.html` et fonctionne. Voici ce qui est deja en place :

- **PageView** : se declenche automatiquement a chaque chargement de page et navigation SPA (via `AppContent` dans `App.tsx`)
- **Lead** : se declenche dans `NouveauMandat.tsx` quand un client soumet son mandat complet (activation de recherche)
- **CompleteRegistration** : se declenche dans `Test24hActive.tsx` quand un lead qualifie demande un test 24h

## 2 problemes a corriger dans le code

### Probleme 1 : Le Lead est conditionne au consentement cookies

Dans `NouveauMandat.tsx` (ligne 382-383), le Lead ne se declenche que si `cookie-consent === 'accepted'`. Mais le pixel lui-meme est charge sans condition dans `index.html`. Resultat : si l'utilisateur n'a pas clique "Accepter" dans la banniere cookies, le Lead n'est jamais envoye alors que le pixel tourne deja.

**Correction** : Supprimer la condition `consent === 'accepted'` pour que le Lead se declenche systematiquement, comme le PageView.

### Probleme 2 : Le CompleteRegistration risque de ne pas s'envoyer (race condition)

Dans `Test24hActive.tsx`, le `setTimeout` de 2000ms est en competition avec le countdown de 3 secondes. Si la redirection se fait avant les 2 secondes, l'evenement est annule par le `clearTimeout`.

**Correction** : Envoyer le CompleteRegistration immediatement au mount du composant (sans `setTimeout`), tout en gardant le guard `sessionStorage` contre le double-tracking.

### Ajout : Lead sur le QuickLeadForm qualifie

Quand un lead qualifie soumet le formulaire rapide sur la landing page (`QuickLeadForm.tsx`), il est redirige vers `/test-24h-active`. C'est aussi une conversion importante. Ajouter un evenement `Lead` juste avant cette redirection.

## Modifications techniques

### 1. `src/pages/NouveauMandat.tsx` -- Supprimer la condition consent

Lignes 381-386 : retirer le check `localStorage.getItem('cookie-consent')` et garder uniquement le check `window.fbq` :

```text
// Avant (actuel)
const consent = localStorage.getItem('cookie-consent');
if (consent === 'accepted' && (window as any).fbq) {

// Apres (corrige)
if ((window as any).fbq) {
```

### 2. `src/pages/Test24hActive.tsx` -- Envoyer immediatement sans setTimeout

Remplacer le `useEffect` avec `setTimeout` par un envoi immediat au mount :

```text
useEffect(() => {
  if (!sessionStorage.getItem('meta_track_completeRegistration_test24h')) {
    if ((window as any).fbq) {
      (window as any).fbq('track', 'CompleteRegistration');
      console.log('[Test24hActive] Meta Pixel CompleteRegistration event sent');
    }
    sessionStorage.setItem('meta_track_completeRegistration_test24h', '1');
  }
}, []);
```

### 3. `src/components/landing/QuickLeadForm.tsx` -- Ajouter Lead sur soumission qualifiee

Juste avant `navigate('/test-24h-active')` (ligne 162), ajouter :

```text
if ((window as any).fbq) {
  (window as any).fbq('track', 'Lead');
  console.log('[Meta Pixel] Lead fired on qualified quick lead form submission');
}
```

## Fichiers modifies

| Fichier | Modification |
|---|---|
| `src/pages/NouveauMandat.tsx` | Suppression condition consent sur Lead |
| `src/pages/Test24hActive.tsx` | Envoi immediat du CompleteRegistration (sans setTimeout) |
| `src/components/landing/QuickLeadForm.tsx` | Ajout evenement Lead sur soumission qualifiee |

## Resume des evenements apres correction

| Evenement | Quand | Ou dans le code |
|---|---|---|
| PageView | Chaque page/navigation | `index.html` + `App.tsx` |
| Lead | Soumission mandat complet | `NouveauMandat.tsx` |
| Lead | Lead qualifie (test 24h) | `QuickLeadForm.tsx` |
| CompleteRegistration | Page test 24h active | `Test24hActive.tsx` |

---

## Guide : Configuration dans Facebook Ads Manager et Events Manager

### Etape 1 : Verifier le Pixel dans Events Manager

1. Aller sur [business.facebook.com](https://business.facebook.com)
2. Menu hamburger en haut a gauche > **Gestionnaire d'evenements** (Events Manager)
3. Selectionner le pixel **1270471197464641** dans la colonne de gauche
4. Onglet **Apercu** : vous devriez voir les evenements `PageView`, `Lead`, `CompleteRegistration` remonter en temps reel

### Etape 2 : Tester avec l'outil Test Events

1. Dans le Gestionnaire d'evenements, onglet **Tester des evenements** (Test Events)
2. Entrer l'URL du site (par exemple `https://immocrm.lovable.app`)
3. Cliquer sur **Ouvrir le site web** -- une fenetre s'ouvre
4. Naviguer sur le site, remplir le formulaire rapide ou le mandat complet
5. Les evenements apparaissent en temps reel dans l'onglet Test Events

### Etape 3 : Configurer la campagne dans Ads Manager

1. Aller dans **Gestionnaire de publicites** (Ads Manager)
2. Creer une nouvelle campagne > Objectif : **Leads** (ou **Conversions**)
3. Au niveau de l'**ensemble de publicites** :
   - Section **Evenement de conversion** : selectionner **Lead**
   - Cela indique a Facebook d'optimiser pour les personnes qui sont les plus susceptibles de soumettre un mandat ou un formulaire qualifie
4. Alternative : utiliser **CompleteRegistration** comme evenement de conversion si vous voulez optimiser specifiquement sur les demandes de test 24h

### Etape 4 : Verifier le domaine (recommande)

1. Dans Business Manager > **Parametres** > **Securite de la marque** > **Domaines**
2. Ajouter et verifier `immocrm.lovable.app` (ou votre domaine personnalise)
3. Cela permet a Facebook de mieux attribuer les conversions et d'eviter les blocages iOS

### Etape 5 : Configurer les evenements prioritaires (Aggregated Event Measurement)

1. Dans le Gestionnaire d'evenements > onglet **Mesure des evenements agreges**
2. Configurer et prioriser vos evenements dans l'ordre :
   - Priorite 1 : **Lead** (votre conversion principale)
   - Priorite 2 : **CompleteRegistration**
   - Priorite 3 : **PageView**
3. Cela est necessaire pour le tracking des utilisateurs iOS 14.5+ qui refusent le suivi

### Resume visuel du parcours de conversion

```text
Visiteur arrive sur la landing page
        |
        v
    [PageView]  <-- declenche automatiquement
        |
        v
  Remplit le formulaire rapide (QuickLeadForm)
        |
        +-- Lead qualifie ---------> [Lead] + redirection /test-24h-active
        |                                         |
        |                                         v
        |                              [CompleteRegistration]
        |
        +-- Non qualifie --> message "un agent va vous contacter"
        
        
  OU : Remplit le mandat complet (NouveauMandat)
        |
        v
    [Lead]  <-- declenche au succes de soumission
        |
        v
  /inscription-validee (confirmation)
```

