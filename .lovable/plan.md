
# Ajouter info@immo-rama.ch en copie cachée (BCC) sur les envois réels

## Diagnostic

J'ai inspecté la fonction `send-followup-campaign/index.ts` :
- **Le BCC vers `info@immo-rama.ch` n'est PAS implémenté** dans l'appel à l'API Resend (ligne 238).
- L'envoi se fait via : `body: JSON.stringify({ from, to: [to], subject, html })` — sans `bcc`.
- Conclusion : `info@immo-rama.ch` ne pouvait **jamais** recevoir de copie. Aucun mail n'a été perdu, simplement la fonctionnalité n'existait pas encore côté envoi réel (elle existe pour les "Tests" qui adressent directement le mail à `info@immo-rama.ch`).

## Correctif

Modifier `supabase/functions/send-followup-campaign/index.ts` :

1. Étendre la signature de `sendViaResend()` pour accepter un paramètre optionnel `bcc: string[]`.
2. Ajouter `bcc` au payload Resend uniquement s'il est fourni.
3. Dans la boucle d'envoi réel (ligne 435), passer `bcc: ['info@immo-rama.ch']` à chaque appel.
4. **Ne pas** ajouter de BCC pour les envois "Test" (déjà adressés directement à `info@immo-rama.ch` ligne 331 — sinon doublon).

### Snippet ciblé (envoi réel)

```ts
const result = await sendViaResend(
  lead.email,
  camp.subject,
  html,
  { bcc: ['info@immo-rama.ch'] }
);
```

## Effet

- **Chaque email réel** envoyé à un lead sera désormais reçu en copie cachée par `info@immo-rama.ch` → confirmation d'envoi/réception centralisée.
- Le destinataire ne voit pas le BCC (confidentialité préservée).
- Les emails « Test » continuent de fonctionner comme avant (envoyés directement à `info@immo-rama.ch`).

## Déploiement

Redéploiement automatique de l'Edge Function via `deploy_edge_functions(["send-followup-campaign"])`.

## Validation

Lancer un envoi réel sur un lead test (ex: votre propre adresse en lead) — vérifier que le mail arrive **à la fois** sur l'adresse du lead **et** sur `info@immo-rama.ch`.
