# Clarification toast import — 5 leads sur 130

## Diagnostic

Le filtre `Logisorama + Qualifié` fonctionne **correctement** sur ton CSV `leads (8).csv` :

| Formulaire + Étape | Lignes | Filtre |
|---|---|---|
| Logisorama futur · Qualifié | 66 | ✅ passe |
| LOGISORAMA5.0 · Qualifié | 22 | ✅ passe |
| LOGISORAMA 2.0 · Qualifié | 5 | ✅ passe |
| Logisorama futur · Mail envoyé | 23 | ❌ rejeté (étape) |
| Autres (RENOV IA, vendeurs, NEW ACHETEUR…) | 14 | ❌ rejeté (formulaire) |

**93 leads valides** sont envoyés à `import-leads-csv`. Vérification DB : sur 17 emails du CSV échantillonnés, les 17 sont déjà dans `meta_leads` (11 importés aujourd'hui par tes essais précédents).

→ Les "5 importés" sont les **5 vrais nouveaux**. Les ~88 autres sont en `duplicates` (déjà en base depuis tes imports précédents). Tout fonctionne, mais le toast actuel rend ça illisible.

## Plan : améliorer la lisibilité du toast

Aucune modif du filtre métier. Juste rendre le résultat compréhensible.

### Fichier : `src/pages/admin/CampagnesSuivi.tsx`

Modifier le toast `success` (ligne 353-355) pour distinguer clairement :

```ts
toast.success(
  `Import terminé : ${data.inserted} nouveau(x) lead(s) ajouté(s)`,
  {
    description: 
      `📊 Sur ${lines.length - 1} lignes du CSV :\n` +
      `• ✅ ${data.inserted} nouveaux importés\n` +
      `• 🔁 ${data.duplicates} doublons (déjà en base)\n` +
      `• 🚫 ${rejectedFormulaire} rejetés (formulaire ≠ Logisorama)\n` +
      `• 🚫 ${rejectedEtape} rejetés (étape ≠ Qualifié)\n` +
      `• ⚠️ ${data.errors || 0} erreurs`,
    duration: 10000,
  }
);
```

### Résultat attendu pour ton CSV actuel

```
Import terminé : 5 nouveau(x) lead(s) ajouté(s)
📊 Sur 130 lignes du CSV :
• ✅ 5 nouveaux importés
• 🔁 88 doublons (déjà en base)
• 🚫 14 rejetés (formulaire ≠ Logisorama)
• 🚫 23 rejetés (étape ≠ Qualifié)
• ⚠️ 0 erreurs
```

→ Tu comprendras immédiatement que les 88 sont déjà dans ta base et seront relancés par les campagnes existantes. Pas besoin de les ré-importer.

## Hors scope

- Aucun changement à la logique de filtre (Logisorama + Qualifié reste strict comme demandé).
- Aucun changement à la fonction edge `import-leads-csv`.
- Aucun changement schéma DB.
