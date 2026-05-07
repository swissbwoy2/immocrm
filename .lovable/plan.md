
# Étape "Confirmer la visite effectuée" avant Postuler

## Compris ✅

Aujourd'hui, dès que l'agent OU le coursier marque la visite comme `effectuee` et envoie son compte-rendu, le client voit immédiatement les boutons **"Déposer ma candidature"** / **"Pas intéressé"**. Tu veux une étape intermédiaire : **le client doit d'abord confirmer "Oui j'ai bien fait la visite" / "Non je n'y suis pas allé"**, et seulement après il accède aux boutons Postuler / Pas intéressé.

Cette logique existe déjà côté visite **non déléguée** (template WhatsApp `post_visite_question` envoyé H+3). Il faut juste l'**adapter et l'unifier** pour la visite déléguée (où le client n'a pas physiquement fait la visite mais doit confirmer qu'il a bien lu/regardé le compte-rendu du coursier).

## Workflow cible

```text
Visite déléguée :
  Coursier upload compte-rendu (photos/vidéo/feedback)
        ↓
  visites.statut = 'effectuee'
        ↓
  Client ouvre /client/visites-deleguees
        ↓
  PremiumFeedbackCard affiche le compte-rendu
        ↓
  ÉTAPE NOUVELLE → Bandeau confirmation :
     "Avez-vous bien consulté le compte-rendu de votre visite ?"
     [✅ Oui, j'ai pris connaissance]   [❌ Pas encore]
        ↓ (si Oui)
  visites.client_confirme_visite = true
        ↓
  Boutons révélés : [Déposer ma candidature] [Pas intéressé]

Visite physique (non déléguée) :
  Agent marque visite effectuée → idem template WA H+3
  Côté app /client/visites : même bandeau confirmation
        ↓ (si Oui)
  Boutons Postuler / Pas intéressé révélés
```

## Côté WhatsApp

Aucun changement nécessaire. Le template `post_visite_question` existant pose déjà la question "voulez-vous postuler ?" — c'est le client qui répond via les boutons WA `post_visit_postuler` / `post_visit_refuser`. Le webhook (`handleLifecycleButton`) traite déjà ces réponses et met à jour la base.

**Une seule petite addition WA** : si le client clique "Postuler" via WhatsApp, on considère qu'il a implicitement confirmé avoir vu la visite → on set `client_confirme_visite = true` dans le webhook avant de créer la candidature.

## Changements techniques

### 1. Migration SQL (1 colonne)
```sql
ALTER TABLE visites
  ADD COLUMN IF NOT EXISTS client_confirme_visite_at timestamptz;
```
(On utilise un timestamp plutôt qu'un booléen — null = pas confirmé, valeur = confirmé à cette date.)

### 2. `PremiumFeedbackCard.tsx` (visite déléguée)
- Si `visite.client_confirme_visite_at IS NULL` : afficher le bandeau confirmation à la place des boutons Postuler/Pas intéressé
- Boutons : "✅ Oui, j'ai consulté" (set `client_confirme_visite_at = now()`) / "❌ Pas encore" (ferme le bandeau)
- Si confirmé → afficher les boutons Postuler / Pas intéressé existants (logique inchangée)

### 3. `src/pages/client/Visites.tsx` (visite physique)
Même bandeau confirmation pour les visites `effectuee` non déléguées, avec un wording adapté : "Avez-vous bien effectué cette visite ?"

### 4. `whatsapp-webhook/index.ts`
Dans `handleLifecycleButton`, branche `isPostulate` : avant de créer la candidature, ajouter
```ts
await supabase.from("visites")
  .update({ client_confirme_visite_at: new Date().toISOString() })
  .eq("id", visite.id);
```

### 5. `PremiumCandidatureTimeline.tsx`
Aucun changement (la timeline démarre après la candidature).

## Hors scope
- Pas de nouveau template Meta
- Pas de modification du cron `wa-send-post-visite`
- Pas de modification des autres triggers DB

## Question
Le wording du bandeau pour la **visite déléguée** :
- A) "Avez-vous bien consulté le compte-rendu de votre visite ?"
- B) "Confirmez-vous avoir pris connaissance de la visite réalisée par notre coursier ?"
- C) Autre formulation
