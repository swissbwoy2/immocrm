## Reformulation finale

Ajouter un **2ᵉ bouton CTA** dans l'email, libellé clair et sans ambiguïté :

> **« 📞 Réservez votre appel téléphonique gratuit (15 min) »**  
> Sous-titre : *« Un expert Logisorama analyse votre dossier en direct par téléphone »*

Le mot **téléphonique** doit apparaître explicitement pour éviter toute confusion (pas un RDV en agence, pas une visio — un appel).

## Bonne nouvelle : tout l'agenda existe déjà

Aucune migration, aucune nouvelle edge function. On réutilise :

| Élément | Existant |
|---|---|
| Table BDD | `lead_phone_appointments` (créneaux 15 min, status, prospect) |
| UI publique | `DossierAnalyseSection` + `PhoneSlotPicker` (ancre `#analyse-dossier`) |
| Calendrier admin | `src/pages/admin/Calendrier.tsx` (realtime branché) |
| Edge functions | `confirm-phone-appointment`, ICS, reminders 24h |

## Modifications

### Fichier unique : `supabase/functions/send-followup-campaign/index.ts`

Dans `renderEmail()`, ajouter sous le CTA principal existant :

```html
<!-- Séparateur élégant -->
<div style="margin: 28px 0 20px; text-align:center; color:#8a7560;
            font-size:12px; letter-spacing:3px;">— OU —</div>

<!-- 2e CTA — appel téléphonique explicite -->
<a href="https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign={campaignKey}&utm_content=cta_appel_tel#analyse-dossier"
   style="display:inline-block;padding:16px 28px;
          background:transparent;border:2px solid #b8893d;
          color:#d4a857;font-family:Georgia,serif;
          border-radius:6px;text-decoration:none;font-weight:600;
          font-size:15px;line-height:1.3;">
  📞 Réservez votre appel téléphonique gratuit (15 min)
</a>

<p style="font-size:13px;color:#a89380;margin:10px 0 0;
          font-style:italic;line-height:1.5;">
  Un expert Logisorama vous appelle au numéro de votre choix<br/>
  et analyse votre dossier en direct — c'est <strong>100 % gratuit</strong>.
</p>
```

### Points clés du wording

- **« appel téléphonique »** est dit dans le bouton ET répété dans le sous-titre.
- **« vous appelle »** précise que c'est l'expert qui compose le numéro (pas l'inverse).
- **« 100 % gratuit »** lève la friction.
- L'icône 📞 renforce visuellement.
- Le bouton est **identique pour les 4 campagnes** (Location / Vente / Rénovation / Achat).

### Lien deep-link

```
https://logisorama.ch/?utm_source=campagne_suivi
                     &utm_medium=email
                     &utm_campaign={location|vente|renovation|achat}
                     &utm_content=cta_appel_tel
                     #analyse-dossier
```

L'ancre `#analyse-dossier` scrolle automatiquement le visiteur sur le `PhoneSlotPicker` où il choisit son créneau 15 min. Le RDV apparaît instantanément dans `/admin/calendrier` (realtime).

### Aucune modif côté admin ni côté BDD

Tout le pipeline existe déjà :
1. Prospect clique → atterrit sur `#analyse-dossier`
2. Réserve un créneau → insertion dans `lead_phone_appointments`
3. RDV visible live dans le calendrier admin
4. ICS envoyé, reminder 24h envoyé automatiquement

## Récap

| Fichier | Action |
|---|---|
| `supabase/functions/send-followup-campaign/index.ts` | Ajout 2ᵉ CTA "appel téléphonique" + séparateur dans `renderEmail()` |
| Redéploiement | `send-followup-campaign` |

**1 fichier modifié. 0 migration. 0 nouvelle edge function.**

## Test après déploiement

1. Admin → Campagnes de suivi → bouton **"Test"**
2. Mail reçu sur `info@immo-rama.ch`
3. Cliquer sur **« 📞 Réservez votre appel téléphonique gratuit (15 min) »**
4. Atterrissage sur `logisorama.ch#analyse-dossier`
5. Sélection créneau → apparaît dans `/admin/calendrier`
