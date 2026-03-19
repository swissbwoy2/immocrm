

## Relance marketing graphique — Tous les leads non-clients

### Résumé

Créer un système de relance email marketing avec un template HTML professionnel (style newsletter graphique), incluant le texte demandé "Tu as déjà trouvé ton futur logement ?" comme accroche de réengagement. Bouton "⚡ Relancer tous" dans la page Leads + preview avant envoi.

---

### Template email marketing (contenu)

**Objet** : `{prenom}, tu as déjà trouvé ton futur logement ?`

**Structure visuelle** :
1. **Header gradient** bleu Immo-Rama + logo
2. **Accroche personnalisée** : "Bonjour {prenom}, tu as déjà trouvé ton futur logement ?" — ton direct et engageant
3. **Texte de relance** : "Si ce n'est pas encore fait, pas de panique. On a de bonnes nouvelles pour toi à {localite}."
4. **3 blocs stats visuels** : `1100+ offres` | `95% satisfaction` | `48h délai moyen`
5. **4 avantages** avec icônes checkmark stylisées
6. **CTA principal** : bouton gradient "Activer ma recherche →" vers `https://logisorama.ch/nouveau-mandat?utm_source=relance&utm_medium=email`
7. **Avis Google** : bloc étoiles + témoignage court
8. **Footer** : adresse Crissier + lien désinscription

---

### Implémentation technique

**1. Edge function `send-lead-relance/index.ts`** (nouveau)
- Reçoit `lead_ids: string[]` en body
- Récupère la config SMTP active depuis `email_configurations`
- Pour chaque lead : génère le HTML marketing personnalisé ({prenom}, {localite}, {budget})
- Envoie via SMTP (même pattern que `send-smtp-email`)
- Met à jour `contacted = true` dans la table `leads`
- Rate limiting : batch de 10, délai 1s entre chaque
- Auth : vérifie le token utilisateur

**2. `src/pages/admin/Leads.tsx`** (modifié)
- Bouton "⚡ Relancer tous les non-contactés" dans le header (à côté d'Exporter CSV)
- Dialog de confirmation avec : preview HTML de l'email + compteur de leads ciblés
- Bouton individuel "Relancer" par lead (icône Send)
- Toast de succès avec nombre d'emails envoyés
- Mutation qui appelle `send-lead-relance` via `supabase.functions.invoke()`

**3. Config TOML** : ajouter `[functions.send-lead-relance]` avec `verify_jwt = false`

