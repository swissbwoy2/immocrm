# Bug identifié — invite-client refuse les soumissions publiques depuis le 8 juin

## Diagnostic

Le formulaire `/nouveau-mandat` enchaîne 4 étapes : (1) insertion `demandes_mandat`, (2) notif admin, (3) envoi PDF, (4) **appel `invite-client` qui crée le compte + la ligne `clients`**.

Le 8 juin (commit `0778bd12`), un garde d'autorisation a été ajouté dans `invite-client`. Il accepte un appel public **uniquement si** `demandeMandat.id` est fourni ET correspond à une ligne `demandes_mandat` avec le même email :

```ts
if (!isAuthorized && demandeMandat?.id && email) {
  // match l'id + email avec la table demandes_mandat
}
if (!isAuthorized) return 401;
```

**MAIS** dans `src/pages/NouveauMandat.tsx` (lignes 331-375), l'objet `demandeMandat` envoyé à la fonction **n'inclut PAS le champ `id`** — l'insertion à la ligne 255-257 ne fait pas de `.select()` pour récupérer l'id généré. Résultat :

- `demandeMandat?.id` = `undefined`
- pas de match → `isAuthorized = false` → **401**
- compte client jamais créé, dossier invisible dans `admin/clients`

## Preuve

| Client | Soumission | Auth user créé ? | Client row |
|---|---|---|---|
| mimoza (26/05) | qr_invoice | ✅ | +5s |
| eltonedu (28/05) | qr_invoice | ✅ | +5s |
| arseneble (08/06 12:12) | twint | ✅ | +5s |
| fyfyramazani (10/06) | qr_invoice | ✅ | +5s |
| — **garde ajouté le 08/06 17:27** — | | | |
| bcvscpncept (15/06) | qr_invoice | ❌ | ❌ |
| faarahwarsame (16/06 11:27) | qr_invoice | ❌ | ❌ |
| mirsefinkdm (16/06 12:21) | qr_invoice | ❌ | ❌ |

Aucun `auth.users` n'existe pour ces 3 emails → confirme que `invite-client` n'a jamais créé le compte.

## Fix (1 fichier, 4 lignes)

`src/pages/NouveauMandat.tsx` :

1. À l'insertion `demandes_mandat`, ajouter `.select('id').single()` pour récupérer l'`id` de la ligne créée.
2. Passer ce `id` dans le payload `demandeMandat` envoyé à `invite-client` (et aussi à `send-mandat-pdf` pour rester cohérent).

```ts
const { data: inserted, error: insertError } = await supabase
  .from('demandes_mandat')
  .insert(insertData as any)
  .select('id')
  .single();
// ...
demandeMandat: {
  id: inserted?.id,         // ← AJOUT
  adresse: formData.adresse,
  ...
}
```

## Action manuelle après déploiement

Pour les 3 clients déjà soumis sans compte, depuis `admin/demandes-activation`, cliquer sur le bouton d'activation/invitation pour chacun — `invite-client` sera alors appelé avec le JWT admin (autorisation OK) et le dossier apparaîtra dans `admin/clients`.

**Aucune migration DB, aucun changement de RLS, aucun changement métier.** Seul `src/pages/NouveauMandat.tsx` est modifié.
