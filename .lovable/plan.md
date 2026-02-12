

# Carte interactive, Calendrier, Rappels coursier + Fix contact visite

## Bug fix : "Contact de la visite" affiche le client au lieu du vrai contact

**Probleme** : Dans le dialogue de mission (`src/pages/coursier/Missions.tsx`), la section "Contact de la visite" affiche les coordonnees du **client** (celui qui cherche un appartement), alors que le coursier a besoin des coordonnees du **concierge** ou **locataire actuel** (la personne a contacter sur place pour acceder au bien).

**Solution** : Remplacer la section "Contact de la visite" (lignes 419-447) pour afficher en priorite :
1. Le **concierge** (`offres.concierge_nom` / `offres.concierge_tel`) s'il existe
2. Le **locataire** (`offres.locataire_nom` / `offres.locataire_tel`) s'il existe
3. Si aucun contact n'est renseigne, afficher un message "Aucun contact specifique"

La section actuelle avec les infos du client sera renommee "Client" pour rester visible sans confusion.

---

## 1. Carte interactive des missions

**Nouveau fichier** : `src/pages/coursier/Carte.tsx`

Page avec vue split (liste compacte a gauche, carte Google Maps a droite) :
- Reutilisation du hook `useGoogleMapsLoader` deja present
- Marqueurs colores : vert (disponible), orange (accepte/en cours)
- Info-bulle au clic avec adresse, date, heure et bouton "Itineraire" (meme pattern que `AddressLink`)
- Geocodage des adresses pour positionner les marqueurs
- Fallback gracieux si Google Maps ne charge pas (pattern `AnnonceLocationMap`)
- Filtre rapide par statut (toutes / disponibles / mes missions)

## 2. Calendrier des missions

**Nouveau fichier** : `src/pages/coursier/Calendrier.tsx`

- Utilisation du composant `Calendar` (react-day-picker) deja installe
- Jours avec missions surlignees (badge colore)
- Clic sur un jour = liste des missions de ce jour avec heure, adresse, statut et lien de detail
- Vue mensuelle, navigation entre les mois
- Coherence visuelle avec `PremiumPageHeader`

## 3. Rappels e-mail pour les coursiers

**Fichier modifie** : `supabase/functions/send-visit-reminders/index.ts`

- Ajouter une requete pour recuperer les visites avec `statut_coursier = 'accepte'` et `coursier_id IS NOT NULL`
- Joindre la table `coursiers` pour obtenir le `user_id` du coursier
- Envoyer les memes rappels (veille, jour J, 3h, 1h, 30min) au coursier assigne
- Lien de notification vers `/coursier/missions`
- Le type de recipient passe a `'coursier'`

## 4. Navigation et routes

| Fichier | Modification |
|---------|-------------|
| `src/components/AppSidebar.tsx` | Ajout de "Carte" (icone Map) et "Calendrier" (icone Calendar) dans le menu coursier |
| `src/App.tsx` | Ajout des routes `/coursier/carte` et `/coursier/calendrier` |

## 5. Fix du contact (detail technique)

Dans `src/pages/coursier/Missions.tsx` :
- La section "Contact de la visite" (lignes ~419-447) utilisera `selectedMission.offres?.concierge_nom` et `selectedMission.offres?.concierge_tel` en priorite, puis `locataire_nom` / `locataire_tel` en fallback
- La section client existante sera renommee de "Contact de la visite" a "Client" avec l'icone User
- Les donnees sont deja chargees via le `select('*, offres(*), ...')`  de la requete existante

---

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| `src/pages/coursier/Carte.tsx` | Creer - Page carte interactive Google Maps |
| `src/pages/coursier/Calendrier.tsx` | Creer - Page calendrier des missions |
| `src/pages/coursier/Missions.tsx` | Modifier - Fix "Contact de la visite" (concierge/locataire au lieu du client) |
| `src/components/AppSidebar.tsx` | Modifier - Ajout liens Carte + Calendrier |
| `src/App.tsx` | Modifier - Ajout routes |
| `supabase/functions/send-visit-reminders/index.ts` | Modifier - Ajout rappels coursier |
