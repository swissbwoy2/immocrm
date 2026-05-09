# Refonte email "Campagne de suivi — Location"

Aligner le contenu de l'email Location sur le message WhatsApp fourni, mot pour mot. On garde l'écrin visuel (dark gold, logo, footer légal, tracking, désinscription, CTA bulletproof) mais on remplace le texte du corps.

## Texte cible (gardé à 100%)

**Sujet** : `Ton futur appartement t'attend !!!`
**Préheader** : `🏠 Tu cherches un appartement en Suisse romande ?`

**Corps** (avec `{{first_name}}` injecté à la place de "V-Yael", fallback `Bonjour,` si vide) :
```
Bonjour {{first_name}},

🏠 Tu cherches un appartement en Suisse romande ?

Bonne nouvelle : notre équipe peut analyser gratuitement ta recherche et ton dossier à nos bureaux de Crissier.

En 30 minutes, un expert Logisorama t'aide à :
✅ vérifier si ton dossier est assez solide
✅ clarifier tes critères de recherche
✅ cibler les bons logements selon ta situation
✅ augmenter tes chances auprès des régies

⭐ Plus de 500 locataires ont déjà été accompagnés.

📍 Option recommandée :
réserve ton rendez-vous gratuit à nos bureaux de Crissier (VD).

💻 Tu préfères aller plus vite ?
tu peux aussi activer ta recherche en ligne en 2 minutes ! Clique ICI 👉 logisorama.ch/nouveau-mandat

Logisorama.ch By Immo-rama.ch
```

**CTA principal** : `Prendre rendez-vous gratuitement` → `LOCATION_CTA_RDV_HERO_URL` (RDV existant).
**Lien secondaire inline** ("Clique ICI") → `https://logisorama.ch/nouveau-mandat` (avec UTM `utm_source=campagne_suivi&utm_medium=email&utm_campaign=location&utm_content=cta_activation_inline`).

## Changements techniques (1 seul fichier)

`supabase/functions/send-followup-campaign/index.ts` :

1. `buildLocationSubject()` → renvoie `Ton futur appartement t'attend !!!` (plus de personnalisation prénom dans le sujet).
2. `LOCATION_PREHEADER` → `🏠 Tu cherches un appartement en Suisse romande ?`.
3. `renderLocationEmail()` réécrit :
   - Hero : badge "👑 Service premium…" conservé, logo conservé, H1 = `Ton futur appartement t'attend !!!`, sous-titre = phrase "Bonne nouvelle…".
   - Bloc bullets avec les 4 ✅ exacts (cases vertes/checks dorés conservés visuellement, mais libellés mis à jour).
   - Ligne sociale : `⭐ Plus de 500 locataires ont déjà été accompagnés.`
   - Bloc "📍 Option recommandée" + CTA principal `Prendre rendez-vous gratuitement`.
   - Bloc "💻 Tu préfères aller plus vite ?" avec lien inline `Clique ICI 👉 logisorama.ch/nouveau-mandat` (texte cliquable, sans gros bouton secondaire).
   - Signature : `Logisorama.ch By Immo-rama.ch`.
4. Suppression des sections devenues hors-script : trust cards (3 colonnes), bloc "Avis Google vérifiés", second CTA RDV final, signature manuscrite "À très vite". Footer légal (IDE + désinscription) **conservé**.
5. Aucun changement DB, aucun changement aux autres campagnes (`renderEmail` standard inchangé), aucun changement WhatsApp.

## Hors scope
- WhatsApp template (déjà conforme).
- Texte des autres campagnes (vente, etc.).
- Tracking pixel / liens UTM existants : conservés tels quels.

## Déploiement
Redeploy de l'edge function `send-followup-campaign` après modification.
