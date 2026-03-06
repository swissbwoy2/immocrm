

## Confirmation des 3 garde-fous techniques — Phase 1 Mandat v3

### 1. INSERT anon encadrés sur `mandate_related_parties` et `mandate_documents`

Les policies RLS INSERT pour ces tables seront conditionnées par la vérification que le `mandate_id` référencé existe ET n'est pas encore signé (`signed_at IS NULL`). Cela empêche un utilisateur anonyme de rattacher des données à un mandat arbitraire déjà finalisé.

```sql
-- mandate_related_parties : INSERT only if mandate exists and is unsigned
CREATE POLICY "Anon can insert related parties for unsigned mandates"
ON mandate_related_parties FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM mandates
    WHERE id = mandate_id
    AND signed_at IS NULL
  )
);

-- mandate_documents : same logic
CREATE POLICY "Anon can insert documents for unsigned mandates"
ON mandate_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM mandates
    WHERE id = mandate_id
    AND signed_at IS NULL
  )
);
```

Un utilisateur anonyme ne peut donc insérer que pour un mandat non signé qu'il connaît par son UUID (non devinable).

### 2. Bucket `mandates-private` totalement sécurisé

- Bucket créé en mode **privé** (pas de lecture publique)
- Aucune policy SELECT/INSERT publique sur le storage
- Les fichiers sont accessibles uniquement via **signed URLs** générées côté backend (edge function avec `service_role`)
- L'INSERT storage sera autorisé uniquement via une policy liée au `mandate_id` dans le chemin du fichier, vérifiant que le mandat existe et n'est pas signé
- Aucun fichier ne sera jamais exposé publiquement

### 3. Edge function `mandate-get-status` — tokens invalidés refusés

```typescript
// Dans mandate-get-status
if (mandate.token_invalidated_at !== null) {
  return new Response(
    JSON.stringify({ success: false, error: 'Token invalidé' }),
    { status: 403 }
  );
}
```

La fonction retourne uniquement : statut du mandat, dates clés, et logs filtrés (`is_client_visible = true`). Aucune donnée sensible (IP, hash, données financières internes, logs admin) n'est exposée.

---

### Résumé de l'implémentation Phase 1

**Migration SQL** — 8 tables, 2 fonctions SECURITY DEFINER, trigger auto-activation, texte contractuel v3, 2 buckets privés, RLS strictes avec garde-fous anon

**Edge functions** (3) :
- `mandate-submit-signature` — signature, hash, IP côté serveur, email de confirmation
- `mandate-get-status` — lecture par token avec refus des tokens invalidés

**Frontend** — 14 fichiers :
- `MandatV3.tsx` — stepper 7 étapes
- 7 composants d'étape + `ContractTextDisplay` + `useMandateAudit` + `types.ts`
- `MandatV3Suivi.tsx` — page de suivi par token
- Route ajoutée dans `App.tsx`

Prêt à implémenter.

