## Nouvelle page `/rendez-vous-proprietaire` + CTA vente

### 1. Route & page
- Ajouter `<Route path="/rendez-vous-proprietaire" element={<RendezVousProprietaire />} />` dans `src/App.tsx` (route publique, hors auth).
- Créer `src/pages/RendezVousProprietaire.tsx` : landing page premium isolée (même charte sombre/dorée que la campagne Vente — pas de header admin/agent), réutilisant les composants `Card`, `Input`, `Button` du design system.

### 2. Contenu de la page
- **Hero** : badge « Vente off-market · 100% confidentiel », titre « Demandez la visite de votre bien par un expert Logisorama », sous-titre rappelant les bénéfices (discrétion, vente rapide, acheteurs qualifiés).
- **Formulaire** unique (validation Zod, tous champs requis) :
  - Prénom, Nom
  - Email
  - Téléphone (validation format CH)
  - Adresse du bien (Google Places autocomplete — réutiliser `AddressAutocomplete` existant si dispo, sinon champ texte simple)
  - Code postal (auto-rempli si autocomplete, sinon manuel)
  - Type de bien (select : Appartement, Maison, Immeuble, Terrain, Autre)
  - Message libre (facultatif)
- **Trust block** : "Réponse sous 24h · Sans engagement · 100% confidentiel".
- Après envoi : écran de confirmation « Merci, un expert vous contactera sous 24h ».

### 3. Backend (insertion lead)
- Soumission insère dans `public.leads` (table existante) avec :
  - `source = 'vente_proprietaire'`
  - `campaign = 'rdv_visite_bien'`
  - champs nom/email/téléphone mappés
  - Adresse + NPA + type de bien stockés dans `notes` (ou colonnes dédiées si elles existent — à vérifier au moment du build).
- Tracking UTM : capter les `utm_*` depuis l'URL et les stocker.
- Notification : appeler l'edge function de notif lead existante (`notify-new-lead` ou équivalent) si présente.

*Aucune migration de schéma prévue* — on s'appuie sur `leads`. Si une colonne manque (`property_type`, `address`), la donnée ira dans `notes` formaté lisiblement.

### 4. CTA campagne « Vente » uniquement
- Dans `supabase/functions/send-followup-campaign/index.ts`, pour le bloc hero `campaign.campaign_key === 'vente'`, forcer `href` du bouton vers `https://logisorama.ch/rendez-vous-proprietaire` (avec UTM `?utm_source=campagne_suivi&utm_medium=email&utm_campaign=vente&utm_content=cta_rdv_proprietaire`), **sans toucher** au CTA des autres campagnes (location, etc.).
- Mettre à jour `email_followup_campaigns.cta_url` pour `campaign_key='vente'` → `https://logisorama.ch/rendez-vous-proprietaire`.
- Redéployer la fonction.

### 5. Hors scope
- Pas de calendrier de slots (différent du flux `/rendez-vous` bureau).
- Pas de modification des autres campagnes ni de la page `/rendez-vous` existante.