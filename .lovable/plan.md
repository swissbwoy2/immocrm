

# Création de compte Coursier - Edge Function manquante

## Situation actuelle

L'interface d'administration pour les coursiers (`/admin/coursiers`) est deja en place avec un bouton **"Ajouter un coursier"** et un formulaire (prenom, nom, email, telephone). Cependant, le formulaire appelle une Edge Function `invite-user` qui **n'existe pas** dans le backend. C'est pour cela que la creation echoue.

## Solution

Creer une Edge Function `create-coursier` en suivant le meme modele que `create-agent`, puis mettre a jour le code du formulaire pour appeler cette nouvelle fonction.

## Etapes de la creation d'un compte coursier (workflow final)

1. L'admin va sur `/admin/coursiers`
2. Clique sur "Ajouter un coursier"
3. Remplit le formulaire (prenom, nom, email, telephone)
4. Le systeme envoie une invitation par email au coursier
5. Le coursier recoit l'email, clique sur le lien, arrive sur `/first-login` pour definir son mot de passe
6. A la prochaine connexion, le coursier est redirige vers `/coursier` (son tableau de bord)

## Modifications techniques

### 1. Creer l'Edge Function `create-coursier`

**Fichier** : `supabase/functions/create-coursier/index.ts`

La fonction effectuera les etapes suivantes dans l'ordre :
1. Inviter l'utilisateur via `supabase.auth.admin.inviteUserByEmail()` (envoie un email automatique)
2. Creer le profil dans la table `profiles` (prenom, nom, email, telephone)
3. Assigner le role `coursier` dans la table `user_roles`
4. Creer l'enregistrement dans la table `coursiers` (avec statut `en_attente`)

### 2. Mettre a jour le formulaire admin

**Fichier** : `src/pages/admin/Coursiers.tsx`

Changer l'appel de `invite-user` vers `create-coursier` et adapter les parametres envoyes.

**Avant :**
```typescript
await supabase.functions.invoke('invite-user', {
  body: { email, role: 'coursier', prenom, nom, telephone }
});
```

**Apres :**
```typescript
await supabase.functions.invoke('create-coursier', {
  body: { email, prenom, nom, telephone }
});
```

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| `supabase/functions/create-coursier/index.ts` | Creer (nouvelle Edge Function) |
| `src/pages/admin/Coursiers.tsx` | Modifier l'appel de la fonction (ligne 48) |

