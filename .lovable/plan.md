## Diagnostic
- Les données de Carina existent bien en base : son compte agent est correct et son calendrier n’est pas vide.
- Le backend est sain ; je n’ai pas trouvé de panne backend générale ni d’erreur runtime bloquante.
- Le vrai problème semble être une **surcharge de chargement côté calendrier agent**.
- Aujourd’hui, pour Carina, la page charge encore environ :
  - **499** de ses visites récentes
  - **345** visites récentes supplémentaires via co-assignations
  - **845** visites visibles au total sur la fenêtre récente
  - **48** clients co-assignés
- Donc même après l’optimisation précédente, la page agent reste trop lourde et peut finir par afficher un calendrier vide, incomplet ou très lent.

## Plan
1. **Réduire le volume chargé par défaut dans `/agent/calendrier`**
   - Ne plus charger d’un coup tout le stock récent visible.
   - Charger d’abord une fenêtre centrée sur la vue active du calendrier (mois/semaine/jour), pas tout l’historique récent en une seule requête.

2. **Passer les détails journaliers en chargement à la demande**
   - Le panneau du jour ne doit récupérer que les événements/visites de la date sélectionnée.
   - On évite ainsi de transporter et transformer des centaines d’objets inutiles au premier rendu.

3. **Séparer “mes visites” et “co-assignées” dès le fetch**
   - Garder les co-assignations accessibles, mais ne pas les fusionner massivement au chargement initial.
   - Ajouter un filtre clair pour afficher :
     - Mes visites
     - Co-assignées
     - Toutes

4. **Alléger encore les requêtes et transformations**
   - Réduire les jointures au strict nécessaire pour la grille calendrier.
   - Conserver les données détaillées seulement au clic ou à l’ouverture du détail.
   - Éviter les enrichissements lourds sur l’ensemble du dataset tant qu’ils ne sont pas nécessaires.

5. **Valider avec le cas Carina**
   - Vérifier que la page calendrier charge normalement avec un gros volume.
   - Contrôler que Carina voit à nouveau ses rendez-vous, ses visites programmées et l’historique accessible via filtres/toggles.

## Détails techniques
- Fichier principal ciblé : `src/pages/agent/Calendrier.tsx`
- Composants à vérifier après refactor :
  - `src/components/calendar/EventManagerCalendar.tsx`
  - `src/components/calendar/PremiumAgentDayEvents.tsx`
- A priori, **pas de migration base de données nécessaire**.
- Le sujet ressemble à un problème de **stratégie de chargement frontend**, pas à un problème de droits d’accès.

## Résultat attendu
- Carina retrouve un calendrier qui s’ouvre normalement.
- Les données restent complètes, mais sont chargées intelligemment.
- La solution profite aussi aux autres agents à gros volume.