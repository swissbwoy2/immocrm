## 🎯 Objectif

Remplacer l'affichage automatique des **coordonnées bancaires (IBAN)** par un **choix de mode de paiement** lors de la création du compte / signature du mandat. Le client coche une option :

- ✅ **Payer par TWINT** (instantané) → affiche le numéro `079 483 91 99` avec mention obligatoire `Prénom NOM – Acompte mandat`
- ✅ **Recevoir ma facture QR** (par email) → indique simplement que la facture QR sera envoyée par email

⚠️ **Note comptable** : la facture QR AbaNinja est générée automatiquement dans tous les cas (pour la comptabilité et la conformité). Le choix du client influence uniquement **ce qu'on lui montre** comme instructions de paiement.

---

## 📋 Modifications

### 1. UI — Sélecteur de mode de paiement (formulaire mandat)

**`src/components/mandat/MandatRecapitulatif.tsx`** (étape récap avant signature)
- Remplacer le bloc statique "Coordonnées bancaires" (l. 318-345) par un composant de choix avec 2 cartes cliquables :
  - 📱 **TWINT instantané** (recommandé)
  - 🧾 **Facture QR par email**
- Persister le choix dans le state du formulaire (`payment_method: 'twint' | 'qr_invoice'`).
- Si TWINT sélectionné → afficher la box jaune avec `079 483 91 99` + mention `[Prénom] [Nom] – Acompte mandat`.
- Si Facture QR → afficher message court : "Vous recevrez votre facture QR par email sous quelques minutes. Payable depuis votre app bancaire."

**`src/components/mandat/CGVContent.tsx`** (l. 85-105 et 201-225)
- Retirer les 2 blocs "Informations bancaires" statiques avec IBAN.
- Les remplacer par une mention neutre : "Le mode de paiement (TWINT ou facture QR) sera choisi lors de la finalisation du mandat."

### 2. Persistance du choix

**Migration DB** : ajouter une colonne `payment_method` (text, nullable, default `'qr_invoice'`) sur la table `demandes_mandat` (et/ou `clients` selon où le récap est sauvegardé — à confirmer en lecture du schéma juste avant migration).

**Edge function `mandate-submit-signature`** (et/ou `mandate-update-draft`) : accepter et persister `payment_method` envoyé depuis le front.

### 3. Emails de confirmation

**`supabase/functions/send-mandat-confirmation/index.ts`** (l. 100-120)
- Lire `payment_method` du client.
- Si `twint` → afficher box jaune TWINT avec `079 483 91 99` + mention `Prénom NOM – Acompte mandat`.
- Si `qr_invoice` → afficher box bleue : "Votre facture QR vient d'être envoyée à votre adresse email. Vous pouvez la régler depuis votre app bancaire."

**`supabase/functions/send-mandat-pdf/index.ts`** (l. 380-395 PDF + l. 840-850 HTML email)
- Même logique conditionnelle pour la section paiement du PDF récapitulatif et du HTML d'accompagnement.

### 4. PDF du mandat complet

**`supabase/functions/generate-full-mandat-pdf/index.ts`** (l. 706-735)
- Remplacer la section `INFORMATIONS BANCAIRES POUR L'ACTIVATION` par une section neutre : `MODALITES DE PAIEMENT DE L'ACOMPTE`.
- Mentionner les **2 options disponibles** (TWINT `079 483 91 99` OU facture QR par email) sans privilégier l'une, puisque le PDF du mandat est un document légal qui doit refléter les options offertes.
- Encodage : conserver ASCII strict (pas de `'`, `é`, `à` directs sans les fonctions `cleanText` existantes — cf. mémoire PDF sanitization U+202F/U+00A0).

### 5. Factures officielles (intactes)

❌ **Ne PAS toucher** :
- `create-abaninja-invoice/index.ts`
- `create-final-invoice/index.ts`
- `resend-abaninja-invoice/index.ts`
- `abaninja-webhook/index.ts`

→ La facture QR AbaNinja reste émise systématiquement (obligation comptable suisse). Seul l'affichage côté client est conditionnel.

---

## 🧪 Validation après implémentation

1. Création d'un compte avec choix **TWINT** → email reçu affiche box TWINT, PDF récap aussi.
2. Création d'un compte avec choix **Facture QR** → email reçu mentionne "facture QR par email", pas de TWINT.
3. Dans les 2 cas → la facture QR AbaNinja est bien créée en arrière-plan (vérification logs `create-abaninja-invoice`).
4. PDF du mandat complet → présente les 2 options de paiement de manière neutre.

---

## 📁 Fichiers modifiés

- `src/components/mandat/MandatRecapitulatif.tsx`
- `src/components/mandat/CGVContent.tsx`
- `supabase/functions/send-mandat-confirmation/index.ts`
- `supabase/functions/send-mandat-pdf/index.ts`
- `supabase/functions/generate-full-mandat-pdf/index.ts`
- `supabase/functions/mandate-submit-signature/index.ts` (persistance)
- Migration SQL : `payment_method` sur `demandes_mandat`

Confirmes-tu ce plan ?