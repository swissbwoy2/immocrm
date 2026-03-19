

## Upgrade du template email marketing — Style DreamHome immobilier

### Ce qui change

Le template email actuel est trop simple. Il faut le transformer en un email marketing complet inspiré du style "DreamHome" (screenshots Stripo), avec :

1. **Plus de texte engageant** — sections narratives entre les blocs visuels
2. **Section "Extraits d'offres"** — 3 faux listings immobiliers stylisés (images placeholder depuis Unsplash, prix, localité, pièces, surface) avec boutons "Voir l'offre"
3. **Signature personnelle** — photo de Christ Ramazani (hébergée depuis `src/assets/team/christ-ramazani.png`, uploadée sur un CDN public ou encodée en base64) avec nom, titre "Fondateur & CEO", téléphone, email, réseaux sociaux

### Structure du nouvel email

```text
┌─────────────────────────────────────┐
│  GRADIENT HEADER — Logisorama       │
│  + numéro de tel + "Mon compte"     │
├─────────────────────────────────────┤
│  {prenom}, tu as déjà trouvé        │
│  ton futur logement ? 🤔            │
│                                     │
│  Paragraphe engageant (marché       │
│  tendu, taux vacance <1%, etc.)     │
├─────────────────────────────────────┤
│  3 blocs stats (1100+ | 95% | 48h) │
├─────────────────────────────────────┤
│  "Comment ça marche" — 3 étapes     │
│  icônes : Chercher → Visiter →     │
│  Emménager                          │
├─────────────────────────────────────┤
│  Ce qu'on fait pour toi (4 points)  │
├─────────────────────────────────────┤
│  CTA : Activer ma recherche →       │
├─────────────────────────────────────┤
│  "Offres déjà envoyées à nos        │
│   clients cette semaine"            │
│  ┌──────────┐ ┌──────────┐         │
│  │ 📸 Photo │ │ 📸 Photo │         │
│  │ CHF 1800 │ │ CHF 2200 │         │
│  │ Lausanne │ │ Genève   │         │
│  │ 3.5p 75m²│ │ 4.5p 90m²│         │
│  │[Voir off.]│ │[Voir off.]│        │
│  └──────────┘ └──────────┘         │
├─────────────────────────────────────┤
│  CTA secondaire : Voir plus →      │
├─────────────────────────────────────┤
│  ⭐⭐⭐⭐⭐ Avis Google              │
├─────────────────────────────────────┤
│  SIGNATURE AGENT                    │
│  ┌──────┐ Christ Ramazani           │
│  │ 📸   │ Fondateur & CEO           │
│  │photo │ +41 XX XXX XX XX          │
│  └──────┘ christ@immo-rama.ch       │
│           🔗 LinkedIn Instagram     │
├─────────────────────────────────────┤
│  Footer Immo-rama.ch • Crissier     │
│  STOP désinscription                │
└─────────────────────────────────────┘
```

### Fichiers modifiés

| Fichier | Action |
|---|---|
| `supabase/functions/send-lead-relance/index.ts` | Remplacement complet du template HTML `generateMarketingEmail()` avec le nouveau design enrichi |
| `src/pages/admin/Leads.tsx` | Mise à jour de l'aperçu dans le dialog de relance pour refléter le nouveau design |

### Détails techniques

- **Images des offres** : URLs Unsplash libres de droits pour les photos d'appartements (pas besoin d'upload)
- **Photo Christ Ramazani** : Le fichier existe dans `src/assets/team/christ-ramazani.png`. Pour l'email HTML, il faut une URL publique — on utilisera un placeholder ou une URL hébergée sur le domaine public (logisorama.ch ou immo-rama.ch). On mettra une URL placeholder configurable.
- **Offres fictives réalistes** : 2-3 listings avec des prix en CHF, localités suisses romandes (Lausanne, Genève, Morges), surfaces et pièces réalistes
- **Le template reste responsive** avec des tables HTML compatibles tous clients email

