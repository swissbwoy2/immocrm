

## Creer l'agent IA actif dans la base

### Probleme
La table `ai_agents` est vide. La page `/admin/agent-ia` cherche un agent avec `status = 'active'` et affiche l'etat vide.

### Solution
Inserer un enregistrement d'agent IA actif via une migration SQL.

### Implementation

**Migration SQL** : Inserer un agent IA avec les valeurs par defaut :
```sql
INSERT INTO ai_agents (display_name, status, config)
VALUES ('Agent IA Relocation', 'active', '{"auto_search": true, "approval_required": true}'::jsonb);
```

Aucun changement frontend necessaire -- le code existant chargera automatiquement cet agent et affichera le dashboard complet avec les 8 onglets.

