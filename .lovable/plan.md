

## Audit complet — Ce qui manque pour maximiser le chiffre d'affaires

Apres analyse du code, de la base de donnees, et des fonctionnalites existantes, voici les **5 leviers concrets** qui auraient le plus d'impact sur ton CA, classes par ROI potentiel.

---

### 1. Funnel de conversion complet (Lead → Mandat → Reloge)

**Probleme actuel** : La page Analytics ne montre que Leads vs Mandats. Aucune vue ne montre le parcours complet : Lead → Mandat signé → Client assigné → Offres envoyées → Candidatures → Bail signé → Clés remises. Tu ne vois pas **où tu perds des clients**.

**Solution** : Un dashboard "Funnel" visuel avec :
- Barre horizontale montrant chaque étape et le % de passage
- Identification des goulots d'étranglement (ex: 80% de leads mais seulement 30% signent le mandat)
- Temps moyen entre chaque étape
- Filtre par agent pour comparer les performances

---

### 2. Relances automatiques intelligentes

**Probleme actuel** : Les rappels existent pour les visites et signatures, mais **aucune relance automatique** pour :
- Leads non convertis après 48h (le lead refroidit)
- Clients inactifs depuis X jours (pas de reaction aux offres)
- Factures impayées (relance existe mais manuelle)
- Mandats expirés à renouveler

**Solution** : Un systeme de relances automatiques par email/notification :
- Lead non converti → email J+1, J+3, J+7 avec CTA vers le formulaire mandat
- Client sans réaction depuis 7 jours → notification à l'agent + email au client
- Mandat expirant dans 15 jours → alerte agent + email client renouvellement
- Cron job planifié qui tourne toutes les heures

---

### 3. Scoring et prioritisation des clients

**Probleme actuel** : Les agents voient tous les clients au même niveau. Pas de scoring pour savoir sur qui concentrer les efforts.

**Solution** : Score de "chaleur" client calculé automatiquement :
- Budget élevé = +points
- Réactions aux offres récentes = +points
- Documents complets = +points
- Dernière activité récente = +points
- Affichage visuel (🔥 chaud, ⚡ tiède, 🧊 froid) dans la liste clients
- Tri par score par défaut pour que l'agent travaille les clients les plus rentables en premier

---

### 4. Dashboard ROI par source marketing

**Probleme actuel** : Analytics montre les leads par source mais **pas le revenu généré par source**. Tu ne sais pas si Meta Ads rapporte plus que Google ou le bouche-à-oreille.

**Solution** : Tracker le parcours complet Lead → CA :
- Lier chaque transaction conclue à la source d'acquisition du client (UTM)
- Afficher : Coût d'acquisition par source vs revenu généré
- KPI : ROI par canal, coût par client relogé, revenu moyen par source
- Permettre de couper les canaux non rentables et doubler sur les meilleurs

---

### 5. Alertes de performance agent en temps réel

**Probleme actuel** : `StatistiquesAgents` existe mais c'est passif. Aucune alerte quand un agent sous-performe.

**Solution** : Système d'alertes automatiques admin :
- Agent avec 0 offres envoyées depuis 3 jours → alerte
- Taux de conversion offre→candidature < 5% → alerte
- Client non contacté depuis 7 jours → alerte
- Notification push + badge rouge dans le dashboard admin

---

### Recommandation d'implémentation

| Priorité | Levier | Impact CA estimé | Complexité |
|---|---|---|---|
| 🥇 | Relances automatiques | Très élevé (récupère les leads perdus) | Moyenne |
| 🥈 | Funnel de conversion | Élevé (identifie où agir) | Faible |
| 🥉 | Scoring clients | Élevé (optimise le temps agent) | Moyenne |
| 4 | ROI par source | Moyen (optimise les dépenses) | Faible |
| 5 | Alertes agent | Moyen (améliore la réactivité) | Faible |

**Par quoi veux-tu commencer ?**

