## Objectif
Remplacer le contenu texte de l'email de la **campagne de suivi recherche location** (fonction `send-followup-campaign`, renderer `renderLocationEmail`) par une version ultra orientée conversion du message fourni — tout en gardant le design premium actuel (hero doré, CTAs, footer, preheader, tracking, désinscription).

## Fichier touché
- `supabase/functions/send-followup-campaign/index.ts` → bloc `renderLocationEmail` (lignes ~172-201) : greeting + intro + bullets + section "Option recommandée" + section "Alt online".

Le hero, le bandeau social proof ★, le logo, la signature, le footer et les CTAs (boutons "Prendre RDV" + lien `nouveau-mandat`) restent inchangés. Aucune autre fonction, aucun autre fichier, aucune migration.

## Nouveau contenu (version conversion)

Texte de base utilisateur :
> Bonjour 👋 / Merci pour l'intérêt… / il vous suffit de vous rendre sur logisorama.ch / vous y trouverez toutes les modalités / nous restons à disposition / Cordialement, L'équipe Immo-rama.ch

Version réécrite ultra-conversion (gardera le tutoiement de la campagne actuelle pour cohérence avec le reste de l'email — confirme si tu veux du vouvoiement) :

```
Bonjour {prenom} 👋

Merci infiniment pour l'intérêt que tu portes à nos services — c'est déjà 
un excellent premier pas vers ton futur appartement.

👉 Pour profiter pleinement de notre accompagnement premium et activer 
ta recherche dès aujourd'hui, une seule étape : rends-toi sur 
logisorama.ch. En moins de 2 minutes, ton dossier est lancé et 
notre équipe se met immédiatement en chasse pour toi.

Sur le site, tu trouveras également toutes nos modalités, nos tarifs 
transparents et les témoignages de centaines de locataires que nous 
avons déjà relogés en Suisse romande.

⏰ Chaque jour compte sur le marché locatif romand — les meilleurs 
biens partent en quelques heures. Plus tôt ton dossier est activé, 
plus vite nous pouvons agir.

Et bien évidemment, si tu as la moindre question, notre équipe reste 
entièrement à ta disposition — réponds simplement à cet email, 
nous te répondrons personnellement.

Au plaisir de te faire visiter ton prochain chez-toi très bientôt 🔑

Cordialement,
L'équipe Immo-rama.ch
```

## Structure du nouveau bloc HTML (remplace lignes ~172-201)
1. **Greeting** : `Bonjour {prenom} 👋` (fallback `Bonjour 👋`).
2. **Paragraphe remerciement** ton chaleureux + accroche conversion.
3. **Bloc CTA mis en avant** : paragraphe "👉 une seule étape" + bouton `ctaPrimary(LOCATION_CTA_RDV_HERO_URL, 'Activer ma recherche maintenant')`.
4. **Paragraphe modalités/preuve sociale** : renvoi au site + ton "centaines de locataires relogés".
5. **Bloc urgence** ⏰ (déclencheur de conversion clé sur le marché romand).
6. **Paragraphe disponibilité** "réponds à cet email".
7. **Closing line** : "Au plaisir de te faire visiter ton prochain chez-toi 🔑".
8. **Signature** : `Cordialement, L'équipe Immo-rama.ch`.

On supprime les bullets ✅, la section "Option recommandée" et "Tu préfères aller plus vite" pour coller strictement au message demandé. Le second CTA inline vers `nouveau-mandat` est conservé sous la signature (ou retiré si tu préfères un seul CTA — à confirmer).

## Points à confirmer
1. **Tutoiement vs vouvoiement** : ton message d'origine est en "vous", la campagne actuelle tutoie. Je garde le **tu** (plus convertissant + cohérent avec le reste de l'email) sauf si tu veux du "vous".
2. **Un seul CTA ou deux** : je propose **1 CTA principal** "Activer ma recherche maintenant" + garder le lien texte vers `nouveau-mandat` en bas. Dis si tu veux uniquement le bouton.
3. **Label du bouton** : "Activer ma recherche maintenant" — OK ou tu préfères "Lancer ma recherche en 2 min" / autre ?

Dès validation, j'applique l'édit dans le seul fichier `send-followup-campaign/index.ts` et je redéploie la fonction.
