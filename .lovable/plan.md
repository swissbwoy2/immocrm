

# Integrer la video dans la page + Lead magnet "Analyse gratuite de ton dossier"

## 1. Video integree dans la page (remplace le popup)

Le popup video actuel (`WelcomeVideoPopup.tsx`) sera supprime et remplace par une section video integree directement dans le flux de la page. La video Instagram (Reel DUf-zVlDDDv) sera affichee entre `TeamSection` et `QuickLeadForm`.

**Nouvel ordre des sections :**

```text
HeroSection
SocialProofBar
TeamSection
VideoSection           <-- NOUVEAU (remplace le popup)
QuickLeadForm
GuaranteeSection
BenefitsSection
HowItWorks
DossierAnalyseSection  <-- NOUVEAU LEAD MAGNET
BudgetCalculatorSection
...
```

## 2. Lead magnet : "Analyse gratuite de ton dossier"

L'idee : le visiteur repond a quelques questions rapides sur son profil, puis pour recevoir l'analyse par un expert, il doit fournir ses coordonnees completes pour **prise de rendez-vous**. Ce sont les experts d'Immo-rama qui analysent le dossier, pas un outil automatique.

### Fonctionnement en 2 etapes

**Etape 1 - Questions de qualification :**
- Le visiteur choisit Location ou Achat (via le SearchTypeContext)
- **Location** : statut emploi, permis/nationalite, poursuites
- **Achat** : accord bancaire, apport personnel, type de bien

**Etape 2 - Coordonnees pour prise de rendez-vous :**
- Au clic sur "Analyser mon dossier", le formulaire demande les coordonnees completes :
  - Prenom (obligatoire)
  - Nom (obligatoire)
  - Email (obligatoire)
  - Telephone (obligatoire)
  - Localite souhaitee (optionnel)
- Un message clair indique : **"Nos experts analysent ton dossier et te recontactent pour un rendez-vous personnalise"**
- Les donnees sont enregistrees dans la table `leads` avec la source `landing_analyse_dossier`
- La notification email est envoyee via l'edge function `notify-new-lead`

### Apres soumission
- Message de confirmation : "Merci [prenom] ! Un expert va analyser ton dossier et te contacter sous 24h pour un rendez-vous."
- Meta Pixel Lead event pour le tracking

### Design
- Titre accrocheur : "Analyse gratuite de ton dossier"
- Sous-titre : "Nos experts te disent ce qui joue et ne joue pas"
- Fond degrade avec icone et badges visuels
- Bouton CTA : "Analyser mon dossier" puis "Envoyer pour analyse"

## Modifications techniques

### Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `src/components/landing/VideoSection.tsx` | Section video integree avec iframe Instagram Reel et titre |
| `src/components/landing/DossierAnalyseSection.tsx` | Lead magnet en 2 etapes : qualification + coordonnees completes pour RDV expert |

### Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `src/pages/Landing.tsx` | Supprimer WelcomeVideoPopup, importer VideoSection et DossierAnalyseSection, reorganiser l'ordre |

### Fichiers a supprimer

| Fichier | Raison |
|---------|--------|
| `src/components/landing/WelcomeVideoPopup.tsx` | Remplace par VideoSection integree dans la page |

### Base de donnees

Aucune modification necessaire. La table `leads` contient deja tous les champs necessaires (prenom, nom, email, telephone, localite, statut_emploi, permis_nationalite, poursuites, accord_bancaire, apport_personnel, type_bien, type_recherche, source, is_qualified). On utilisera simplement une source differente : `landing_analyse_dossier`.

