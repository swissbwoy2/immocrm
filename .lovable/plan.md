## Correction : les CTA Location/Achat doivent ouvrir le formulaire (pas naviguer)

### Problème
Actuellement les 2 gros boutons "Je cherche une location" / "Je veux acheter un bien" naviguent vers `/rendez-vous?type=...` (autre page). Le bon parcours est : ces boutons doivent **ouvrir le formulaire qualification → coordonnées → créneau au bureau** déjà présent en dessous, sur la même page.

### Modifs — `src/components/public-site/sections/DossierAnalyseSection.tsx`

1. **Remplacer les 2 `<Button asChild><Link to="/rendez-vous?...">` par des `<Button onClick>`** :
   - Bouton Location : `onClick={() => { setSearchType('location'); scrollToForm(); }}`
   - Bouton Achat : `onClick={() => { setSearchType('achat'); scrollToForm(); }}`
   - Retirer l'import `Link` si plus utilisé ailleurs dans le fichier (sinon le garder).

2. **Ajouter un `ref` sur le bloc formulaire** (le `<div className="relative bg-card/50 ...">` à la ligne 246) et une fonction `scrollToForm()` qui fait `formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })` avec un petit `setTimeout(0)` pour laisser React monter le bloc si `searchType` était vide.

3. **Adapter le bloc "préfères tout faire en ligne"** : ce n'est plus un parcours secondaire — c'est LE parcours déclenché par les CTA. Reformuler le séparateur :
   - Retirer "Ou en ligne" / "Préfères tout faire en ligne ?…"
   - Remplacer par un titre dynamique affiché uniquement quand `searchType` est sélectionné : *"Étape 1 — Qualifie ton dossier en 30 secondes, puis choisis ton créneau au bureau."*
   - Si `searchType` est vide (utilisateur n'a pas cliqué un CTA), masquer complètement le bloc form (au lieu d'afficher les 2 boutons "Location/Achat" doublons).

4. **Sous-texte sous les CTA** : remplacer *"Choisis ton projet et réserve directement ton créneau au bureau."* par *"Choisis ton projet ci-dessous, puis bloque ton créneau au bureau de Crissier (étape finale du formulaire)."*

### Hors périmètre
- Pas de changement à `/rendez-vous` (`RendezVousBureau.tsx`) — la page existe toujours et reste accessible via le header / sticky mobile.
- Pas de changement au flux backend (insert `lead_phone_appointments` + `leads` + edge function `notify-new-lead`) — il fait déjà créneau bureau via `PhoneSlotPicker`.
- Pas de changement aux autres CTA (header, sticky mobile) — ils peuvent rester sur `/rendez-vous`.

### Résultat attendu
Clic sur "Je cherche une location" → la page **scrolle** vers le formulaire qui s'ouvre directement à l'étape qualification location → étape coordonnées → **étape finale = choix du créneau au bureau** dans la même section, sans changement de page.
