## Objectif

Afficher dans l’email une **accroche dorée longue et complète**, et non plus seulement la phrase courte `preview_text`.

## Constat

Actuellement, l’email est construit ainsi :
- `preview_text` = phrase courte dorée
- le reste du texte que tu vois dans la notification iPhone vient d’autres blocs séparés de l’email (`top bar`, badge premium, slogan, sous-titre)

Donc la notification donne l’impression d’un seul texte continu, mais dans l’email ce contenu est réparti sur plusieurs lignes et styles différents.

## Solution proposée

1. **Créer une vraie accroche longue dédiée** pour la campagne `location`.
   - Cette accroche contiendra le texte complet que tu veux voir en doré dans le corps de l’email.
2. **Afficher cette accroche longue sous le titre principal** à la place de la petite phrase actuelle.
3. **Conserver le teaser caché pour la notification** afin que l’aperçu iPhone continue de bien fonctionner.
4. **Redéployer la fonction** `send-followup-campaign`.
5. **Tester un envoi** depuis `/admin/campagnes-suivi`.

## Détail technique

Je ferai l’un de ces deux choix à l’implémentation :

### Option la plus propre
Ajouter un champ dédié du type `hero_teaser` / `golden_teaser` pour les campagnes, afin de séparer :
- le texte d’aperçu caché (notification)
- le texte long doré visible dans l’email

### Option plus rapide
Réutiliser `preview_text` mais en y mettant directement le texte complet, puis ajuster le rendu pour éviter une mauvaise duplication.

## Résultat attendu

Sous le titre **"Tu cherches un appartement ?"**, on verra une **accroche dorée complète**, correspondant à ce que tu veux vraiment mettre en avant, et pas seulement la première phrase.