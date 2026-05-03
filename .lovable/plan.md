## Mise à jour des credentials Google

Mettre à jour 3 secrets backend (aucun changement de code requis, les edge functions lisent déjà ces variables) :

1. **`GOOGLE_MAPS_API_KEY_WEB`** → `AIzaSyBdiH_-GxStqaNA_5IrdyFIg-zqs2gQs4w`
   - Utilisé par `get-google-maps-token` (autocomplete adresse, carte des visites, géolocalisation)

2. **`GOOGLE_CALENDAR_CLIENT_ID`** → `358940766617-le30kjv9d1qp8t3jqiupbck0e6cee4rn.apps.googleusercontent.com`

3. **`GOOGLE_CALENDAR_CLIENT_SECRET`** → `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`
   - Utilisés par `sync-google-calendar` et le flow OAuth

## Effets

- La nouvelle clé Maps sera prise en compte au prochain chargement (clear cache navigateur si besoin).
- Les utilisateurs déjà connectés à Google Calendar avec l'ancien client OAuth devront se **reconnecter** (refresh tokens invalidés par changement de client).
- Vérifier dans Google Cloud Console :
  - Restrictions HTTP referrers de la clé Maps : `*.lovable.app/*`, `*.lovableproject.com/*`, `https://logisorama.ch/*`
  - APIs activées : Maps JavaScript, Places, Geocoding, Routes, Geometry
  - Utilisateurs test ajoutés à l'écran de consentement OAuth Calendar

## Sécurité

Recommandation forte : régénérer ces credentials après mise à jour, car ils ont été partagés en clair dans le chat.
