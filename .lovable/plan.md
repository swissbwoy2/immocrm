## Preuve par les timestamps (et pourquoi mon premier diagnostic était bon)

Vérification croisée DB + git :

| Heure (UTC) | Évènement |
|---|---|
| 11:27 | ✅ Abubakar Mohamed — demande créée |
| 12:21 | ✅ Mir Essiz — demande créée |
| **12:42** | 🚨 **Mon commit qui ajoute `.select('id').single()` sur `demandes_mandat`** |
| 19:03 | ❌ Saba Haile (Wint2 / winta-h@hotmail.com) — RLS error |

→ Abubakar et Mir sont passés **avant** ma modif. La cliente Wint2 a buté **après**. Le diagnostic tient.

Confirmation supplémentaire côté AbaNinja edge functions : pour `winta-h@hotmail.com`, `create-abaninja-client` puis `create-abaninja-invoice` ont tourné **2 fois avec succès** (R0418 + R0419) à 19:03 → l'étape AbaNinja est OK, c'est bien le `INSERT` final dans `demandes_mandat` qui a explosé. Le fichier `signup_attempts` ne contient rien parce qu'on n'a jamais loggé ce type d'échec.

## Le fix est déjà appliqué

`src/pages/NouveauMandat.tsx` génère maintenant l'UUID côté client et n'appelle plus `.select()` après l'insert (lignes 259-263). Wint2 et toute nouvelle soumission anon passeront.

## Filet de sécurité — pour ne **jamais** reperdre un client

Aujourd'hui, quand le `.insert()` final casse, on perd tout en silence : pas de ligne `demandes_mandat`, pas de `signup_attempts`, pas de notification admin. Seul AbaNinja garde une trace (la facture). Je propose 3 ajouts ciblés :

### 1. Logger TOUT échec d'inscription dans `signup_attempts`

Dans `NouveauMandat.tsx`, envelopper l'`insert` :

```ts
const { error: insertError } = await supabase
  .from('demandes_mandat')
  .insert(insertData as any);

if (insertError) {
  // ❗ filet de sécurité : on garde une trace même si l'insert RLS échoue
  await supabase.from('signup_attempts').insert({
    email: formData.email,
    first_name: formData.prenom,
    last_name: formData.nom,
    phone: formData.telephone,
    source: 'nouveau-mandat',
    parcours: formData.type_recherche,
    stage: 'demandes_mandat_insert_failed',
    error_message: insertError.message,
    user_agent: navigator.userAgent,
  });
  throw insertError;
}
```

Vérifier que la policy INSERT sur `signup_attempts` autorise `anon` (à valider, sinon ajouter une policy permissive : c'est une table de logs).

### 2. Notification admin immédiate sur échec

Même bloc `catch` → appel `create_notification` à l'admin avec lien `/admin/inscriptions-echouees`, message : « Échec inscription client X (winta-h@…) à l'étape Y, facture AbaNinja R0418 émise — à rattraper ».

### 3. Réparer rétroactivement les 3 clients orphelins déjà perdus

- `mirsefinkdm@gmail.com` (Mir Essiz)
- `faarahwarsame317@gmail.com` (Abubakar Mohamed)
- `bcvscpncept@gmail.com` (Jennifer Poncet)

Ces 3 lignes existent dans `demandes_mandat` mais sans compte auth ni ligne `clients` (le `invite-client` ne recevait pas d'`id`). Action : depuis `admin/demandes-activation`, lancer manuellement l'invitation pour chacun → `invite-client` créera leur compte + ligne `clients` et ils apparaîtront enfin dans `admin/clients`.

### 4. Récupérer Wint2 / Saba Haile manuellement

Sa demande n'est jamais arrivée en DB, mais les factures AbaNinja R0418/R0419 sont émises à son nom. Deux options :
- (a) Lui renvoyer le lien `/nouveau-mandat` pour qu'elle resoumette (le fix est en place).
- (b) Créer son compte directement via `admin/demandes-activation` en saisissant son email — `invite-client` enverra l'invitation.

## Aucun changement DB requis

Toutes les actions sont côté code client + actions admin manuelles. Pas de migration, pas de policy à modifier (sauf vérification rapide pour `anon` sur `signup_attempts`).
