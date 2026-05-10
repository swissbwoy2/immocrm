## Bug

Sur l'onglet WhatsApp de **Campagnes de suivi**, après chaque envoi (et au rafraîchissement), les mêmes leads (numéros / prénoms) réapparaissent dans la liste alors qu'ils ont bien été envoyés. Le filtre « masquer déjà envoyés » ne fonctionne plus.

## Cause racine

Dans `src/pages/admin/CampagnesSuivi.tsx`, fonction `loadWaAlreadySent` (≈ ligne 316) :

```ts
const locationLeadIds = leads.filter((l) => l.campaign_key === "location").map((l) => l.id);
await supabase
  .from("whatsapp_notification_logs")
  .select("context_ref")
  .eq("template_key", WA_TEMPLATE_KEY)
  .eq("status", "sent")
  .in("context_ref", locationLeadIds)   // ← tableau de plusieurs centaines d'UUID
  .limit(15000);
```

`loadLeads` charge jusqu'à 2000 leads. Le `.in("context_ref", [...])` pousse alors une URL PostgREST de plus de 8 KB → la requête échoue silencieusement (le code n'inspecte pas `error`). Résultat : `waAlreadySent` reste vide, le filtre `!waAlreadySent.has(l.id)` laisse tout passer, et les leads déjà contactés sont ré-affichés (et risquent même d'être renvoyés).

Bonus : si un jour le tab WhatsApp est ouvert sans passer par "Leads & envoi" (qui déclenche `loadLeads`), `leads.length === 0` et `loadWaAlreadySent` n'est jamais appelé non plus.

## Correctif proposé

1. Réécrire `loadWaAlreadySent` pour **ne plus utiliser `.in()`** : on interroge directement par `template_key` + `status = sent` (et facultativement `context_type = 'lead'`), puis on construit le `Set` côté client. Pagination via `fetchAllPaginated` / `range()` pour dépasser la limite de 1000 lignes.
2. Logger `error` côté toast si la requête échoue, pour ne plus louper ce genre de panne.
3. Garantir le déclenchement : appeler `loadLeads()` aussi quand l'utilisateur arrive sur le tab `whatsapp` (et pas seulement `leads`), pour que `waFilteredLeads` soit cohérent même en accès direct au tab.
4. Après `handleWaSend` / `handleWaRetryFailed`, on rappelle déjà `loadWaAlreadySent()` — on s'assure que cette nouvelle version se base sur le `template_key` et reflète bien les envois qui viennent d'être faits.

Aucune modification des Edge Functions n'est nécessaire ; le bug est purement frontend.

## Fichiers touchés

- `src/pages/admin/CampagnesSuivi.tsx` (≈ lignes 195-260, 316-330, 498-501)

## Validation

- Recharger l'onglet WhatsApp après un envoi → les leads envoyés disparaissent (filtre actif), réapparaissent uniquement si « Renvoyer aux leads déjà contactés » est coché.
- Vérifier dans la console qu'aucune erreur Supabase n'est levée et que `waAlreadySent.size` reflète bien les sends récents.
