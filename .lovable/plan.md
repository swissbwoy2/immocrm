
# Compléter les dispositions du mandat de recherche - Location

## Analyse comparative : PDF complet vs code actuel

J'ai comparé article par article le contrat PDF fourni (le document de référence complet) avec ce qui est généré par l'application. Voici toutes les parties manquantes ou tronquées :

| Article | Texte manquant dans le code |
|---|---|
| **2.1** | "En l'absence de résiliation, par lettre recommandée, au moins 30 jours avant son échéance, le présent contrat est réputé renouvelé par reconduction tacite, à chaque fois pour 3 mois supplémentaires. En cas de non-renouvellement, la caution vous est restituée sous un délai de 30 jours." |
| **2.3** (nouveau) | Article entier manquant : "Le prolongement de contrat ou la conclusion de contrats ultérieurs sont possibles. Ils doivent toutefois être communiqués dans les 5 jours après conclusion de contrat à Immo-Rama et sont soumis à la commission d'agence. Des prolongements de contrat ou des contrats ultérieurs sont des contrats qui sont conclus entre le même chercheur ou la même entreprise pendant ou durant les trois mois qui suivent la fin du premier contrat pour le même objet ou un autre avec le même bailleur." |
| **2.4** (nouveau) | L'actuel 2.3 doit devenir 2.4 et être complété : "En cas de résiliation de contrat avant terme ou de renoncement au contrat de (sous)-location, la commission ne sera pas remboursée, ni entièrement, ni partiellement." |
| **3** | Fin manquante : "Après conclusion d'un contrat, les chercheurs sont tenus de communiquer à Immo-Rama l'adresse de leur future demeure ainsi que le nom et l'adresse du futur bailleur." |
| **4** | Fin manquante : ", en indiquant cette autre source. Au cas contraire, l'adresse sera estimée être fournie par Immo-Rama." |
| **5** | Fin manquante : "Les chercheurs autorisent explicitement Immo-Rama à demander des renseignements sur leur personne auprès de services de renseignements sur la solvabilité ainsi que de demander des références auprès de son employeur." |
| **6** | Fin manquante : "En cas où des informations seraient tout de même transmises à des tierces personnes, la personne responsable est tenue de supporter tout dommage qui pourrait en résulter, en particulier la commission qu'Immo-Rama aurait perdue par ce fait." |
| **7** | Fin manquante : "Un mandat de recherche peut être retiré à tout moment par les chercheurs ou annulé par Immo-Rama." |
| **8** | Version tronquée -- doit être : "...et que la gérance informe Immo-Rama de sa décision d'attribuer le logement à ce client, Immo-Rama aura droit à une commission équivalente à un mois de loyer du bien en location concerné." |
| **9** | Gros paragraphe manquant sur la responsabilité : "Immo-Rama ne peut assumer aucune responsabilité quant à l'exactitude des données concernant les offreurs et leurs offres de logement. (...) Immo-Rama peut assister les parties contractantes lors de la signature de contrat et répondre aux questions relatives à la conclusion de contrat. Toutefois, Immo-Rama n'assume aucune responsabilité pour les conséquences résultant de contrats défectueux ou de comportements fautifs de la part des parties contractantes. Ceci vaut également lorsque Immo-Rama a été directement impliqué dans les négociations de contrat." |
| **10** | Fin manquante : "En outre, Immo-Rama a le droit d'utiliser les données de contact pour des envois d'informations propres à la Société." |
| **11** | Version tronquée -- doit être : "Sauf indication contraire contenue dans le présent contrat, c'est le Code des obligations suisse (CO) qui fait foi." |

## Fichiers à modifier

| Fichier | Description |
|---|---|
| `src/components/mandat/CGVContent.tsx` | Dispositions affichées dans le formulaire (section location, lignes 117-226) |
| `supabase/functions/generate-full-mandat-pdf/index.ts` | PDF généré pour téléchargement (articles lignes 550-694) |
| `supabase/functions/send-mandat-pdf/index.ts` | PDF envoyé par email (articles lignes 506-635) |

## Détail des modifications

Pour chaque fichier, le texte de tous les articles 1 à 11 sera remplacé par la version complète du contrat PDF de référence. La numérotation sera corrigée (ajout de 2.3 et 2.4, renumérotation de l'ancien 2.3).

Aucune modification de base de données n'est nécessaire.
