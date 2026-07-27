
# Relance de recherche pour un client existant (relogé)

## Objectif
Permettre à l'admin, depuis la fiche d'un client dont le statut est `reloge` (ou `inactif`/`stoppe`), de **relancer une nouvelle recherche de 90 jours** sans recréer le compte, avec régénération de la facture d'acompte CHF 300.– et remise à zéro du compteur de jours.

## Où l'ajouter
- Fiche client admin : `src/pages/admin/ClientDetail.tsx` — nouveau bouton **"🔄 Relancer une nouvelle recherche"** visible uniquement si `statut ∈ { reloge, inactif, stoppe, suspendu }` ET `journey_type ≠ purchase_search` (locataire).
- Confirmation via `AlertDialog` rappelant : nouveau cycle de 90 jours + nouvelle facture CHF 300.– envoyée par email.

## Comportement (une seule action)
Au clic → appel d'une nouvelle Edge Function `relance-recherche-client` (SECURITY DEFINER côté SQL RPC OK aussi, mais on garde Edge pour orchestrer AbaNinja + email).

Actions séquentielles dans la fonction :
1. **Reset du mandat** sur `clients` :
   - `statut = 'actif'`
   - `mandat_date_signature = now()` (source de vérité utilisée par `getMandatDates` → remet le compteur à 0/90)
   - `date_ajout = now()` (fallback)
   - `mandate_pause_days = 0`, `mandate_paused_at = null`
   - `cancellation_requested_at = null`, `cancellation_reason = null`
   - `refund_status = null`
   - Incrémenter un compteur `relance_count` (nouveau, voir schéma) et poser `derniere_relance_at = now()`.
2. **Facture CHF 300.–** : réutiliser `useAbaNinjaInvoice` / edge existante `create-abaninja-invoice` avec `montant = 300`, libellé "Relance recherche – nouveau mandat 90 jours".
3. **Email client** : template branded via `notify.logisorama.ch` — "Votre nouvelle recherche est active pour 90 jours" + lien facture + lien dashboard.
4. **Notification in-app** au client et à l'agent assigné.
5. **Historique** : insérer une ligne dans `mandate_audit_logs` (event `relance_recherche`).

## Schéma DB (petite migration)
Sur `public.clients` :
- `relance_count int not null default 0`
- `derniere_relance_at timestamptz`

Aucun changement RLS (la fonction Edge utilise le service_role).

## UI détails
- Bouton dans le bloc "Mandat" de la fiche client, à côté de "Renouveler".
- Après succès : toast `"Nouvelle recherche lancée — facture envoyée"` + refetch du client, le tracker 90 jours repart à J1.
- Bloqué si un `refund_status = 'pending'` existe : afficher un message "Terminer le remboursement en cours avant de relancer".

## Points techniques
- La logique 90 jours est déjà pilotée par `mandat_date_signature` dans `src/utils/mandatDates.ts` — remettre cette date à `now()` suffit à réinitialiser le compteur, aucun changement de la lib n'est nécessaire.
- AbaNinja : réutiliser le même flow que l'onboarding initial (montant paramétrable), pas de nouveau connecteur.
- Pas d'impact sur les autres parcours (achat / relouer / vente).

## Hors périmètre
- Pas de refonte du statut `reloge` ailleurs.
- Pas de self-service côté client (uniquement admin dans un premier temps — à confirmer si on l'ouvre aussi à l'agent assigné).

## Question rapide avant build
Le bouton doit-il être **admin uniquement**, ou également accessible à l'**agent assigné** du client ?
