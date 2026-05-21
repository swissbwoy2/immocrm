# Fix dépôt de candidature pour Victoria Martins (et tous les agents)

## Diagnostic

Ce qui faisait planter l'**ancienne** page : elle appelait `send-smtp-email` avant de créer la candidature. Victoria n'a aucune ligne dans `email_configurations` → l'envoi SMTP échouait → toast "Erreur" → aucune candidature créée.

La **nouvelle** page (que je viens de livrer) n'envoie plus d'email, donc ce blocage disparaît. RLS vérifiée pour Victoria :

- `candidatures` INSERT/UPDATE — policy "Agents multi peuvent gérer candidatures" via `client_agents`. Tous les 17 clients actifs de Victoria ont bien leur ligne `client_agents` ↔ `clients.agent_id`. OK.
- `offres` UPDATE (passage en `candidature_deposee`) — policy accepte agent principal **ou** co-agent. OK.
- `notifications` INSERT — `with check (true)`. OK.

Donc la nouvelle page devrait déjà fonctionner pour Victoria.

## Renforcement RLS (défensif)

La policy `candidatures` "Agents multi peuvent gérer candidatures" ne reconnaît que la table `client_agents`. Si jamais un client a un `clients.agent_id` mais pas la ligne `client_agents` (désync), l'agent principal serait bloqué — alors que les memories projet rappellent que les deux sources doivent rester en sync, mais ne sont pas garanties au niveau DB.

Pour s'aligner sur la policy `offres` UPDATE et la policy DELETE candidatures (qui acceptent déjà les deux sources), on remplace la policy par une version qui accepte aussi `clients.agent_id`.

### Migration

```sql
DROP POLICY "Agents multi peuvent gérer candidatures" ON public.candidatures;

CREATE POLICY "Agents (principal + co) peuvent gérer candidatures"
ON public.candidatures
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = candidatures.client_id AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM client_agents ca
    JOIN agents a ON a.id = ca.agent_id
    WHERE ca.client_id = candidatures.client_id AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.id = candidatures.client_id AND a.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM client_agents ca
    JOIN agents a ON a.id = ca.agent_id
    WHERE ca.client_id = candidatures.client_id AND a.user_id = auth.uid()
  )
);
```

Aucun changement de schéma, aucun changement de UI. Workflow inchangé.

## Détails techniques

- Aucune modif côté front nécessaire — la page `src/pages/agent/DeposerCandidature.tsx` refondue précédemment couvre le besoin.
- Pas de mise à jour des données existantes : la sync `clients.agent_id` ↔ `client_agents` reste recommandée mais n'est plus une condition bloquante pour le dépôt de candidature.
