## Objectif

Refondre **/rendez-vous** (page `RendezVousBureau.tsx`) avec exactement la même direction visuelle que **/rendez-vous-propriétaire** (fond `#0e0c0a`, or `#d4a857`, serif élégant, badges, CTA doré), tout en gardant **intacte** la mécanique de réservation ferme déjà en place (créneaux 30 min temps réel, ICS, notif admin, anti-doublon).

L'objectif unique de la page : **faire prendre un RDV gratuit au bureau de Crissier** pour discuter d'un projet — location, achat, rénovation ou vente.

## Ce qui change (UI / contenu)

1. **Hero noir/or plein écran**
   - Badge `🎯 RDV GRATUIT · BUREAU CRISSIER · SANS ENGAGEMENT`
   - H1 serif : *« Discutons de votre projet — au bureau, autour d'un café »*
   - Sous-titre : 30 min en tête-à-tête avec un conseiller Logisorama. Location, achat, rénovation ou vente — on vous oriente clairement, sans blabla.
   - 3 chips de réassurance : `✓ 100% gratuit` · `✓ Sans engagement` · `✓ Réponse immédiate`

2. **Sélecteur de type de projet (nouveau, obligatoire)**
   - 4 grosses cartes cliquables avec icône + libellé :
     - 🔑 **Louer** un logement
     - 🏡 **Acheter** un bien
     - 🛠 **Rénover** mon bien
     - 💰 **Vendre** mon bien
   - La carte sélectionnée passe en or (`#d4a857`), comme les jours/horaires de la page propriétaire.
   - Valeur stockée dans le state et envoyée dans `notes_admin`, le lead, et la notif admin.

3. **Picker jour + matin/après-midi + créneaux 30 min**
   - Même logique que l'actuel `RendezVousBureau` (`generateSlotsForDay`, `getAvailableDays`, `getDayPart`, slots pris en realtime via `get_available_phone_slots`).
   - Restylé en cartes noir/or (jours scrollables horizontalement, onglets Matin/Après-midi dorés, grille de créneaux avec créneaux pris barrés et opacité réduite).

4. **Formulaire coordonnées**
   - Prénom, Nom, Email, Téléphone, Message (facultatif).
   - Inputs `dark-input` (mêmes styles CSS injectés que sur la page propriétaire).
   - Bouton CTA : gradient or `from-[#d4a857] to-[#b8893d]`, gros, plein largeur :
     *« 📍 Confirmer mon RDV gratuit au bureau »*
   - Sous le bouton, ligne de réassurance : `Clock` Réponse immédiate · `Lock` Données sécurisées · `ShieldCheck` Sans engagement.

5. **Écran de confirmation**
   - Carte centrée noir/or avec `CheckCircle2` doré.
   - *« Votre RDV est confirmé »* + date/heure + adresse bureau + bouton itinéraire Google Maps.
   - Mention de l'email de confirmation + invitation calendrier (ICS) envoyé automatiquement.

6. **SEO / `<title>`**
   - `Réservez votre RDV gratuit au bureau Logisorama Crissier — Location, achat, rénovation, vente`
   - Meta description orientée conversion.

## Ce qui NE change PAS (backend)

- Table `lead_phone_appointments` + RPC `get_available_phone_slots`.
- Insertion lead dans `leads` (UTM trackés via `useUTMParams`).
- Edge functions `send-calendar-invite` (ICS au prospect + agenda interne) et `notify-admin-new-phone-appointment`.
- Anti-doublon créneau (code 23505).
- Realtime channel sur `lead_phone_appointments`.

## Ce qui est ajouté côté data

- Nouveau champ `type_projet` (`location` | `achat` | `renovation` | `vente`) :
  - injecté dans `notes_admin` du RDV (ligne `Type de projet: …`)
  - mappé sur `leads.type_recherche` quand pertinent (`location`, `achat`/`vente`) et copié dans `leads.notes`
  - passé dans le body de `notify-admin-new-phone-appointment` (en tant que metadata, l'edge function l'affichera si présent — sinon ignoré, pas de breaking change requis sur l'edge function existante)

Pas de migration de schéma, pas de nouvelle table, pas de nouveau secret.

## Fichiers touchés

- `src/pages/RendezVousBureau.tsx` — refonte complète (UI + ajout `type_projet`)
- Aucun autre fichier modifié.

## Détails techniques

- On garde `phoneSlots.ts`, `useUTMParams`, et toutes les invocations edge functions à l'identique.
- Bouton de soumission désactivé tant que `type_projet` + créneau + champs requis ne sont pas remplis.
- Tokens couleur en dur (hex) assumés ici car la page partage volontairement la palette « luxury » isolée de `/rendez-vous-propriétaire` (cf. mémoire *Seller Landing Page Isolation*), pas le design system principal.
- Style `dark-input` réinjecté localement comme sur la page propriétaire pour conserver l'isolation.

## Hors scope

- Pas de modification de `/rendez-vous-propriétaire`.
- Pas de modification des edge functions ni de la table.
- Pas de changement du widget WhatsApp, ni de la nav publique.
