

## Plan — Intégrer OpenClaw comme agent IA dans le CRM

### Contexte
OpenClaw est un assistant IA qui doit gérer la recherche complète pour les clients assignés : recherche d'annonces, envoi d'offres, dépôt de candidatures (email/Flatfox), contact des régies. Seules les visites restent gérées par l'admin.

### Approche en 2 phases

#### Phase 1 — Créer le compte agent OpenClaw (immédiat, sans code)
Utiliser l'interface admin existante (`/admin/agents`) pour créer un agent :
- Prenom: OpenClaw
- Nom: Bot
- Email: une adresse email dédiée (ex: openclaw@votre-domaine.ch)
- Téléphone: celui de l'admin (pour les SMS de suivi)

OpenClaw pourra ensuite se connecter via l'interface web comme n'importe quel agent.

#### Phase 2 — API pour accès programmatique
Créer des edge functions sécurisées permettant à OpenClaw d'interagir avec le CRM via API (sans passer par l'interface web) :

1. **`openclaw-api`** — Edge function unique avec actions multiples :
   - `search_clients` : récupérer les clients assignés et leurs critères de recherche
   - `send_offer` : envoyer une offre à un client (créer dans `offres`)
   - `submit_candidature` : déposer une candidature (créer dans `candidatures`)
   - `send_email` : envoyer un email via le SMTP configuré (régies, Flatfox)
   - `get_client_criteria` : récupérer les critères de recherche d'un client
   - `log_activity` : noter les actions effectuées

2. **Authentification API** : OpenClaw s'authentifie avec son token JWT (login email/password), puis utilise ce token pour appeler les edge functions.

3. **Table `openclaw_activity_log`** : journaliser toutes les actions du bot pour traçabilité admin.

### Ce qui existe déjà et qu'OpenClaw peut utiliser
- Envoi d'offres (`offres` table + interface agent)
- Candidatures (`candidatures` table)
- Envoi d'emails SMTP (`send-smtp-email` edge function)
- Messagerie client-agent (`conversations` + `messages`)

### Ce qu'il faudra vérifier avant
- Quelle adresse email utiliser pour le compte OpenClaw ?
- OpenClaw a-t-il sa propre configuration SMTP ou utilise-t-il celle de l'admin ?
- Comment OpenClaw accède-t-il aux sites d'annonces ? (scraping via Firecrawl, API tierces ?)

### Recommandation
Commencer par la **Phase 1** : créer le compte agent manuellement depuis l'admin, assigner des clients à OpenClaw, et le laisser utiliser l'interface web. La Phase 2 (API) sera nécessaire uniquement quand OpenClaw aura besoin d'automatiser ses actions sans interface.

