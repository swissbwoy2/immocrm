
# Implementation -- Meta Ads Tracking Pages

## Objectif

Creer deux pages de tracking dediees a Meta Ads pour distinguer deux niveaux d'engagement :
- **Prospect qualifie** (mandat signe) : evenement `Lead` sur `/inscription-validee`
- **Prospect interesse** (formulaire rapide qualifie) : evenement `CompleteRegistration` sur `/test-24h-active`

Tous les ajustements demandes sont integres : `window.fbq(...)`, cles sessionStorage explicites, redirection conditionnelle, et cleanup des timers.

---

## Fichiers a creer (3)

### 1. `src/types/meta-pixel.d.ts`
Declaration TypeScript pour `window.fbq` (propriete optionnelle sur l'interface Window).

### 2. `src/pages/InscriptionValidee.tsx`
Page publique post-mandat :
- Icone CheckCircle + titre "Merci ! Votre demande a bien ete enregistree"
- Sous-titre : "Votre agent Logisorama va analyser votre recherche et vous contacter."
- Bouton "Acceder a mon espace" vers `/login`
- Compte a rebours visible de 5 secondes, puis redirection automatique vers `/login`
- Tracking Meta dans `useEffect` au mount avec guard anti-double :
  - Cle sessionStorage : `meta_track_lead_inscription_validee`
  - Appel : `window.fbq('track', 'Lead')`
- Cleanup `clearInterval` dans le return du `useEffect` du countdown

### 3. `src/pages/Test24hActive.tsx`
Page publique post-QuickLeadForm qualifie :
- Titre "Votre acces d'essai est active"
- Sous-titre : "Vous pouvez des maintenant decouvrir Logisorama. Un agent pourra vous accompagner si besoin."
- Bouton "Acceder a mon espace"
- Compte a rebours de 3 secondes
- Redirection conditionnelle via `useAuth` :
  - Utilisateur authentifie -> `/client`
  - Sinon -> `/login`
- Tracking Meta dans `useEffect` au mount avec guard anti-double :
  - Cle sessionStorage : `meta_track_completeRegistration_test24h`
  - Appel : `window.fbq('track', 'CompleteRegistration')`
- Cleanup `clearInterval` dans le return du `useEffect` du countdown

---

## Fichiers a modifier (3)

### 4. `src/pages/NouveauMandat.tsx` (ligne 381)

Remplacer :
```
navigate('/login', { state: { mandatSubmitted: true } });
```
Par :
```
navigate('/inscription-validee');
```

Le toast de succes reste identique.

### 5. `src/components/landing/QuickLeadForm.tsx` (ligne 157)

Ajouter `useNavigate` de `react-router-dom` aux imports (ligne 1) et instancier le hook dans le composant.

Apres la ligne 157 (`setSubmitResult(isQualified ? 'qualified' : 'not_qualified')`), ajouter une redirection conditionnelle :
```
if (isQualified) {
  navigate('/test-24h-active');
  return;
}
```

Le cas `not_qualified` continue d'afficher le message inline existant. Le bloc de rendu `submitResult === 'qualified'` (lignes 198-218) est conserve comme fallback visuel.

### 6. `src/App.tsx`

Ajouter deux lazy imports apres la ligne 34 :
```
const InscriptionValidee = lazy(() => import("./pages/InscriptionValidee"));
const Test24hActive = lazy(() => import("./pages/Test24hActive"));
```

Ajouter deux routes publiques avant la route catch-all `*` (avant la ligne 373) :
```
<Route path="/inscription-validee" element={<InscriptionValidee />} />
<Route path="/test-24h-active" element={<Test24hActive />} />
```

---

## Flux resultants

```text
MANDAT COMPLET :
/nouveau-mandat -> soumission
     |
     v
Toast "Demande envoyee avec succes !"
     |
     v
/inscription-validee (5 sec, window.fbq Lead, 1 seule fois)
     |
     v
/login

QUICKFORM QUALIFIE :
Landing #quickform -> soumission qualifiee
     |
     v
/test-24h-active (3 sec, window.fbq CompleteRegistration, 1 seule fois)
     |
     v
/client (si connecte) ou /login (sinon)
```

## Signal Meta Ads

| Action utilisateur | Page de tracking | Evenement Meta | Cle sessionStorage |
|---|---|---|---|
| Signature mandat complet | /inscription-validee | Lead | meta_track_lead_inscription_validee |
| Formulaire rapide qualifie | /test-24h-active | CompleteRegistration | meta_track_completeRegistration_test24h |

## Points techniques confirmes

- `window.fbq(...)` utilise partout (jamais `fbq(...)` direct)
- Cles sessionStorage uniques et explicites
- Route dashboard client confirmee : `/client`
- Cleanup des timers (clearInterval/clearTimeout) dans les useEffect
- Tracking declenche au mount avant le debut du countdown (pas de race condition)
- Guard `window.fbq` present : aucun risque d'erreur si pixel absent ou cookies refuses

## Resume des fichiers

| Fichier | Action |
|---|---|
| `src/types/meta-pixel.d.ts` | Nouveau |
| `src/pages/InscriptionValidee.tsx` | Nouveau |
| `src/pages/Test24hActive.tsx` | Nouveau |
| `src/pages/NouveauMandat.tsx` | Modification ligne 381 |
| `src/components/landing/QuickLeadForm.tsx` | Ajout navigate + redirection qualifie |
| `src/App.tsx` | Ajout 2 lazy imports + 2 routes publiques |
