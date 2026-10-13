# File de préparation des postulations

Un clic client sur « Déposer ma candidature » appelle `request_postulation`. Cette fonction crée ou réutilise la candidature et un job `postulation_jobs`. Elle déclenche ensuite immédiatement `process-postulation-job`. Une reprise automatique, chaque minute, traite les jobs en attente ou en erreur arrivés à échéance. Rien n'est jamais envoyé à une régie : l'envoi final reste fait par un agent ou un admin.

## Secrets (optionnels)

| Nom | Rôle |
|---|---|
| `OPENAI_API_KEY` | Active la qualification par l'IA (Responses API, sortie JSON stricte). Sans cette clé, seule l'analyse calculée en code est utilisée. |
| `OPENAI_POSTULATION_MODEL` | Modèle utilisé. Par défaut : `gpt-5-mini`. |

Pour les ajouter : Lovable → Project Settings → Secrets → Add secret. Ne jamais mettre une vraie clé dans Git.

## Smoke test

1. Sans authentification, la fonction doit répondre 401 :
   `curl -s -o /dev/null -w "%{http_code}" -X POST https://<project>.supabase.co/functions/v1/process-postulation-job -H 'Content-Type: application/json' -d '{"mode":"sweep"}'`
2. En tant que client ayant une visite effectuée, cliquer sur « Déposer ma candidature ». Un nouveau clic ne doit créer ni nouvelle ligne `postulation_jobs`, ni nouvelle candidature, ni nouveau message. Le job passe à `ready` ou `blocked` en quelques secondes.
3. L'onglet Postulations (admin/agent) affiche alors le statut, la priorité, les éléments manquants et l'heure de la demande.

## Tests

- SQL (base jetable) : `bash tests/sql/run-postulation-jobs.sh drizzle/migrations/0027_postulation_jobs.sql`. Doit tourner sous un utilisateur non-root, car `initdb` refuse root.
- Logique déterministe : `deno test supabase/functions/process-postulation-job/logic_test.ts`
