

## Plan: Finaliser les prochaines phases de l'Agent IA Relocation

### Etat actuel

Le module Agent IA Relocation dispose deja de:
- **Backend complet**: 2 edge functions (`ai-relocation-api` avec 7 endpoints, `ai-relocation-webhook` avec 6 event types)
- **9 tables DB**: `ai_agents`, `ai_agent_assignments`, `search_missions`, `property_results`, `property_result_scores`, `client_offer_messages`, `visit_requests`, `approval_requests`, `ai_agent_activity_logs`, `mission_execution_runs`
- **Interface admin 8 onglets**: Dashboard, Clients, Missions, Resultats, Offres, Visites, Validations, Journal
- **API REST**: Creation missions, ingestion resultats, preparation offres, demandes visites, logging

### Lacunes identifiees

Les fonctionnalites suivantes manquent pour que le workflow soit complet de bout en bout:

1. **Aucune action downstream apres approbation** - Quand un admin approuve une offre ou visite dans l'onglet Validations, le statut change mais rien ne se passe ensuite (pas d'envoi d'email, pas de creation de visite dans `visites`)
2. **Pas d'envoi reel des offres** - Le bouton "Approuver" met le status a `pret` mais n'envoie pas le message au client
3. **Pas de creation de visite reelle** - Les `visit_requests` ne creent jamais d'entree dans la table `visites` du CRM
4. **Pas de mise a jour des statuts property_results** - Quand une offre est envoyee ou une visite confirmee, le statut du bien (property_result) n'est pas mis a jour
5. **Pas de notification client** - Le client n'est jamais notifie des biens trouves par l'IA
6. **Mission auto-creation manquante** - Quand un client est assigne a l'agent IA, aucune mission de recherche n'est automatiquement creee

### Plan d'implementation

#### Phase 1: Workflow d'approbation complet (ApprovalsTab + OffersTab)

**Fichier: `src/components/admin/ai-relocation/OffersTab.tsx`**
- Ajouter un bouton "Envoyer" pour les offres au statut `pret`
- L'envoi appelle une nouvelle logique qui:
  - Recupere les infos du client (email, nom)
  - Recupere les details des biens lies (property_results)
  - Envoie un email au client via `send-smtp-email` avec la liste des biens
  - Met le statut de l'offre a `envoye`
  - Met a jour le statut des `property_results` lies a `envoye_au_client`
  - Cree une notification in-app pour le client

**Fichier: `src/components/admin/ai-relocation/ApprovalsTab.tsx`**
- Apres approbation d'une offre: mettre le statut de `client_offer_messages` a `pret`
- Apres approbation d'une visite: mettre le statut de `visit_requests` a `demande_prete`
- Apres rejet: mettre les statuts correspondants a `refuse`/`visite_refusee`

#### Phase 2: Creation de visites CRM depuis visit_requests

**Fichier: `src/components/admin/ai-relocation/VisitsTab.tsx`**
- Ajouter un bouton "Creer la visite" pour les demandes au statut `demande_prete` ou `visite_confirmee`
- La creation:
  - Insere une entree dans la table `visites` du CRM (avec adresse, client_id, agent_id, date)
  - Met a jour le statut de la `visit_request` a `visite_a_effectuer`
  - Met a jour le property_result a `visite_confirmee`
  - Le trigger existant `notify_on_new_visit` gere les notifications + ICS automatiquement

**Fichier: `src/components/admin/ai-relocation/VisitDetailDrawer.tsx`**
- Ajouter les champs pour saisir la date/heure de visite et l'agent humain assigne
- Ajouter le bouton de creation directe dans le drawer

#### Phase 3: Auto-creation de mission a l'assignation

**Fichier: `src/components/admin/ai-relocation/AssignmentDialog.tsx`**
- Apres creation d'une assignation, proposer de creer automatiquement une mission de recherche
- La mission est creee avec les criteres du client (via `buildCriteriaSnapshot` cote API)

#### Phase 4: Notification client des biens trouves

**Nouveau composant: `src/components/admin/ai-relocation/SendOfferDialog.tsx`**
- Dialog pour composer/previsualiser l'email avant envoi
- Selection des biens a inclure dans l'offre
- Preview du message avec les details des biens (adresse, loyer, pieces, images)
- Bouton d'envoi qui appelle `send-smtp-email`

#### Phase 5: Enrichir le Dashboard

**Fichier: `src/components/admin/ai-relocation/AgentIADashboard.tsx`**
- Ajouter un KPI "Offres envoyees" (vs total)
- Ajouter un KPI "Visites planifiees" (liens vers visites CRM)
- Ajouter les actions rapides: "Voir les biens en attente", "Offres a envoyer"

### Detail technique

```text
Workflow complet apres implementation:

[Agent IA externe] 
    → webhook results.found 
    → property_results (nouveau)
    → admin review (retenu/rejete)
    → offers/prepare via API
    → approval_request (si requis)
    → admin approuve → offre pret
    → admin envoie → email client + notif
    → client interesse → visit_request
    → admin confirme → visite CRM creee
    → trigger ICS + notifications auto
```

### Fichiers modifies/crees

| Fichier | Action |
|---|---|
| `src/components/admin/ai-relocation/ApprovalsTab.tsx` | Ajouter actions downstream post-approbation |
| `src/components/admin/ai-relocation/OffersTab.tsx` | Ajouter bouton envoi + logique email |
| `src/components/admin/ai-relocation/SendOfferDialog.tsx` | Nouveau - dialog composition email |
| `src/components/admin/ai-relocation/VisitsTab.tsx` | Ajouter creation visite CRM |
| `src/components/admin/ai-relocation/VisitDetailDrawer.tsx` | Ajouter formulaire date/agent + creation |
| `src/components/admin/ai-relocation/AssignmentDialog.tsx` | Auto-creation mission |
| `src/components/admin/ai-relocation/AgentIADashboard.tsx` | KPIs enrichis + actions rapides |

Aucune migration DB requise - toutes les tables necessaires existent deja.

