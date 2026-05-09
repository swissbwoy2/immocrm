# Plan v4 — Ajustements finaux Location

Ajouts par-dessus le plan v3 déjà validé (greeting, branding, anchors, renderer Location).

## 1. Scroll anti-header sticky — `src/index.css`

Ajouter une règle globale :

```css
#analyse-dossier,
#dossier-form {
  scroll-margin-top: 90px;
}
```

Le `useEffect` existant sur `Landing.tsx` (hash + retry `scrollIntoView`) reste inchangé — `scroll-margin-top` règle le décalage visuel sous le header sticky sans toucher au JS.

## 2. Sujet email Location — variable unique `finalSubject`

Dans `supabase/functions/send-followup-campaign/index.ts`, refactor du flow d'envoi :

- Calculer **une seule fois** par lead :
  ```ts
  const finalSubject = campaign.campaign_key === 'location'
    ? buildLocationSubject(firstName)
    : campaign.subject;
  ```
- Utiliser `finalSubject` partout :
  - payload Resend (`subject: finalSubject`)
  - mode preview (retour JSON `{ subject: finalSubject, html }`)
  - mode test interne (même payload Resend)
  - mode send réel
  - logs (`console.log('[send-followup]', { lead_id, finalSubject })`)
  - insertion `email_followup_sends` si la colonne sujet existe
- Supprimer toute référence résiduelle à `campaign.subject` dans le chemin d'envoi Location pour garantir qu'aucun fallback non-personnalisé ne fuite vers Resend.

## 3. CTAs email en table HTML (bulletproof Gmail / Apple Mail / Outlook)

Dans `renderLocationEmail`, remplacer les `<a>` stylés par des **bulletproof buttons** en table.

Patron CTA principal (RDV) :

```html
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;width:100%;max-width:320px;">
  <tr>
    <td align="center" bgcolor="#C9A961" style="border-radius:8px;background:#C9A961;mso-padding-alt:16px 24px;">
      <a href="..." target="_blank"
         style="display:block;padding:16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;line-height:1;color:#1a1a1a;text-decoration:none;border-radius:8px;">
        📍 Réserver mon RDV gratuit à Crissier
      </a>
    </td>
  </tr>
</table>
```

Patron CTA secondaire (Activation) — même structure, `max-width:260px`, fond transparent + bordure or, texte clair.

Règles appliquées :
- `<table role="presentation">` autour de chaque CTA (compat Outlook).
- Lien `display:block` + `padding` inline (pas de dépendance à une classe CSS).
- Tous les styles **inline** sur la `<td>` ET sur le `<a>`.
- `mso-padding-alt` pour Outlook desktop.
- `width:100%` + `max-width` sur la table : 100% mobile, contraint desktop, **sans dépendre uniquement d'une media query**.
- Media query conservée uniquement pour ajuster la taille de police, pas la lisibilité du bouton.

## Hors-périmètre

Aucun changement sur les 3 autres campagnes, ni sur `CampagnesSuivi.tsx`, ni sur la logique de sélection des leads.

## Vérifications post-implémentation

- `rg "campaign\.subject" supabase/functions/send-followup-campaign/index.ts` → seulement dans la branche non-Location.
- Preview Location avec lead `first_name=""` → subject = "On analyse ta recherche…", HTML "Bonjour,".
- Preview Location avec lead `first_name="V-Yael"` → subject = "V-Yael, on analyse…", HTML "Bonjour V-Yael,".
- Clic ancres `#analyse-dossier` et `#dossier-form` → section visible sous le header (pas masquée).
- Inspection HTML email → CTAs en `<table role="presentation">`, styles inline.
