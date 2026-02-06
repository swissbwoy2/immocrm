

# Afficher les contacts et infos completes pour le coursier

## Probleme identifie

La base de donnees montre que pour cette visite :
- Les champs `concierge_nom`, `concierge_tel`, `locataire_nom`, `locataire_tel` sont **vides** dans l'offre
- Le **client** associe a la visite (Sahlu Amanuel, +41 78 943 00 62) existe bien dans la base, mais la requete ne le charge pas
- Le coursier ne sait donc pas **qui il doit rencontrer** ni **comment le contacter**

## Solution

### 1. Ajouter des politiques RLS pour permettre aux coursiers d'acceder aux infos clients

Les coursiers n'ont actuellement aucun droit de lecture sur les tables `clients` et `profiles`. Il faut ajouter des politiques SELECT limitees aux missions du coursier.

**Table `clients`** :
```sql
CREATE POLICY "Coursiers peuvent voir clients de leurs missions"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM visites v
      WHERE v.client_id = clients.id
      AND (
        v.statut_coursier = 'en_attente'
        OR (v.coursier_id IN (
          SELECT c.id FROM coursiers c WHERE c.user_id = auth.uid()
        ))
      )
    )
    AND EXISTS (SELECT 1 FROM coursiers c WHERE c.user_id = auth.uid())
  );
```

**Table `profiles`** :
```sql
CREATE POLICY "Coursiers peuvent voir profils clients de leurs missions"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients cl
      JOIN visites v ON v.client_id = cl.id
      WHERE cl.user_id = profiles.id
      AND (
        v.statut_coursier = 'en_attente'
        OR (v.coursier_id IN (
          SELECT c.id FROM coursiers c WHERE c.user_id = auth.uid()
        ))
      )
    )
    AND EXISTS (SELECT 1 FROM coursiers c WHERE c.user_id = auth.uid())
  );
```

### 2. Modifier la requete dans Missions.tsx

Ajouter la jointure vers `clients` et `profiles` pour charger les infos du client :

**Avant :**
```typescript
.select('*, offres(*)')
```

**Apres :**
```typescript
.select('*, offres(*), clients!client_id(id, user_id, profiles:user_id(prenom, nom, email, telephone))')
```

### 3. Ajouter la section "Contact de la visite" dans le dialog

Apres la section "Informations d'acces", ajouter un bloc affichant :
- Nom et prenom du client
- Numero de telephone (cliquable)
- Email (cliquable)

Ce bloc s'affichera toujours car le client est toujours associe a la visite, contrairement aux champs concierge/locataire qui sont optionnels.

### 4. Afficher aussi les notes de la visite

Le champ `notes` de la table `visites` (instructions speciales pour la visite) sera affiche dans le dialog meme s'il est vide, pour que le coursier ait toutes les informations necessaires.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| Migration SQL | 2 politiques RLS (clients + profiles pour coursiers) |
| `src/pages/coursier/Missions.tsx` | Jointure client + affichage contact + notes |

## Resultat attendu

Le coursier verra dans les details de la mission :
- Adresse et date/heure
- Details du bien (pieces, surface, prix, etage, description)
- **Contact de la visite** : nom, telephone cliquable, email du client
- Informations d'acces (code immeuble, concierge, locataire) si renseignees
- Notes de la visite si presentes
- Remuneration
