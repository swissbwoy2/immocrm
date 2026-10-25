import type { LegalConsent } from '@/components/mandat-v3/types';
import { ACHAT_CONTRACT_TEXT, isPurchaseMandat, legalCheckboxesFor } from './achat/achatMandat';

/**
 * Mandat de recherche — LOCATION, version juridiquement révisée.
 * Source : « Mandat_Location_..._Revu.docx » (90 jours, reconduction 90 jours,
 * dénonciation du 75e au 90e jour, activation CHF 300 imputée sur la commission d'un mois de loyer brut).
 */
export const LOCATION_CONTRACT_TEXT = `MANDAT DE RECHERCHE EXCLUSIF
Logement ou local commercial — Location

Mandataire : Immo-Rama, Chemin du Bochet 12, 1024 Ecublens (VD)

1. Objet et portée du mandat

Le Mandant charge Immo-Rama de rechercher et de lui présenter des logements ou locaux commerciaux destinés à la location conformément aux critères déclarés. L'exclusivité est limitée aux objets et bailleurs effectivement présentés par écrit par Immo-Rama pendant la durée du mandat. Elle n'interdit pas au Mandant d'effectuer ses propres recherches ; aucune commission n'est due pour un objet obtenu sans lien causal avec l'activité d'Immo-Rama.

2. Dispositions du mandat

2.1. Mission du courtier
Immo-Rama transmet au Mandant les informations utiles, prend contact avec les offreurs ou gérances lorsque cela est nécessaire et peut organiser les visites. Il exécute sa mission avec diligence et fidélité, sans garantir qu'un bail sera conclu. Les critères guident la recherche sans constituer une obligation de résultat.

2.2. Naissance et montant de la commission
La commission, équivalente à un mois de loyer brut comprenant les charges convenues, plus la TVA au taux légal uniquement si elle est effectivement due, naît exclusivement lorsqu'un contrat de bail juridiquement valable est conclu entre le Mandant et un bailleur et que cette conclusion résulte de l'indication ou de la négociation d'Immo-Rama. Une décision d'attribution, une réservation, la transmission d'un dossier ou un accord de principe ne suffit pas. Le montant d'activation de CHF 300 est imputé sur la commission ; en l'absence de commission, son acquisition ou son remboursement est exclusivement régi par le point 2.7. La commission minimale est de CHF 500, sous réserve des règles impératives et du pouvoir judiciaire de réduction lorsqu'il est applicable.

2.3. Contrats ultérieurs
Une commission relative à un autre objet ou à un contrat ultérieur avec le même bailleur n'est due que si ce contrat est conclu pendant le mandat ou dans les trois mois suivant sa fin et résulte causalement d'une indication ou d'une négociation documentée d'Immo-Rama. Le Mandant l'annonce dans les cinq jours suivant sa conclusion. Une simple identité de bailleur ne suffit pas.

2.4. Fin ou abandon du bail
Une commission valablement acquise lors de la conclusion du bail n'est pas remboursée lorsque le Mandant renonce ensuite au bail ou le résilie, sauf inexécution imputable à Immo-Rama, accord écrit contraire ou disposition légale impérative.

2.5. Informations et vérifications
Immo-Rama peut demander les justificatifs objectivement nécessaires à l'étude et à la présentation du dossier. Tout contact avec l'employeur ou tout contrôle de solvabilité requiert une information préalable et l'accord spécifique du Mandant, et doit respecter les principes de finalité, proportionnalité, sécurité et transparence de la LPD.

2.6. Confidentialité
Le Mandant traite confidentiellement les informations non publiques reçues d'Immo-Rama. En cas de transmission fautive à un tiers, il ne répond que du dommage direct, prévisible, prouvé et causalement lié à cette violation. Une commission prétendument perdue n'est indemnisable que si toutes les conditions légales de son acquisition sont établies.

2.7. Durée, résiliation et reconduction tacite
Le mandat est conclu pour une période initiale de 90 jours à compter de son activation. À défaut de dénonciation ordinaire valablement notifiée dans le délai prévu ci-après, il est reconduit tacitement, à chaque échéance, pour une nouvelle période de 90 jours, sans perception d'un nouveau montant d'activation. Chaque partie conserve néanmoins le droit impératif de révoquer ou de répudier le mandat avec effet immédiat en tout temps, conformément à l'art. 404 CO. Si Immo-Rama met fin au mandat avec effet immédiat avant l'échéance de la période en cours, les CHF 300 sont intégralement remboursés au Mandant dans les 30 jours suivant la fin du mandat. Si le Mandant met lui-même fin au mandat avec effet immédiat au cours d'une période de 90 jours, que cette résiliation intervienne notamment une semaine, 15 jours ou 70 jours après l'activation ou la reconduction, les CHF 300 demeurent acquis à Immo-Rama. Les parties reconnaissent que ce montant rémunère forfaitairement les prestations accomplies et les moyens engagés dès l'activation du dossier, notamment son ouverture administrative, l'analyse et la vérification des informations et justificatifs, le paramétrage des critères de recherche, la sélection initiale des offres, les recherches, prises de contact, suivis et démarches déjà entrepris, ainsi que le temps de travail et la disponibilité mobilisés par l'agence. Cette conservation ne constitue ni une interdiction de résilier ni une peine conventionnelle et aucune somme supplémentaire n'est due du seul fait de la résiliation, sous réserve d'un dommage distinct établi conformément à l'art. 404 al. 2 CO. Le Mandant qui ne souhaite pas la reconduction peut dénoncer ordinairement le mandat au plus tôt à compter du 75e jour de la période en cours et jusqu'à son 90e jour inclus, soit par écrit, soit directement dans l'application Logisorama.ch. Cette dénonciation produit effet au terme de la période en cours. Lorsqu'elle est exercée dans ce délai, que le mandat atteint normalement son échéance sans conclusion d'un bail et que les CHF 300 n'ont pas été imputés sur une commission, le Mandant peut simultanément en demander le remboursement ; celui-ci intervient dans les 30 jours suivant l'échéance. Une déclaration adressée avant le 75e jour qui exige une cessation immédiate est traitée comme une résiliation anticipée du Mandant et entraîne la conservation des CHF 300. À défaut de dénonciation ordinaire entre le 75e et le 90e jour inclus, le mandat est automatiquement reconduit pour 90 jours et le Mandant doit attendre la période de dénonciation précédant la prochaine échéance pour mettre fin au mandat par voie ordinaire, sans préjudice de son droit de résiliation immédiate en tout temps aux conséquences prévues ci-dessus.

2.8. Attribution par la gérance
L'annonce par une gérance de son intention d'attribuer un logement ne rend aucune commission exigible. La commission n'est due qu'aux conditions cumulatives du point 2.2, après conclusion juridiquement valable du bail.

2.9. Responsabilité et position d'Immo-Rama
Immo-Rama vérifie avec la diligence raisonnablement exigible les informations qu'il transmet, tout en restant tributaire des données des offreurs. Il ne répond pas des actes des bailleurs ou gérances qui ne sont pas ses auxiliaires. Aucune exclusion ne s'applique au dol, à la faute grave, à la violation d'une obligation essentielle imputable à Immo-Rama ni aux responsabilités qui ne peuvent être exclues selon le droit impératif.

2.10. Protection des données
Immo-Rama traite les données nécessaires à l'exécution du mandat et peut transmettre aux bailleurs et gérances les seules données nécessaires à une candidature déterminée. Le Mandant est informé de l'identité du responsable du traitement, des finalités, destinataires, durées de conservation et éventuels transferts à l'étranger. Les communications commerciales reposent sur un consentement séparé, facultatif et révocable, sans effet sur l'exécution du mandat.

2.11. Droit applicable et for
Le mandat est soumis au droit suisse, notamment aux art. 394 ss et 412 ss CO. Les fors impératifs sont expressément réservés. Lorsque le Mandant agit à des fins privées, il peut saisir le tribunal de son domicile ou celui du siège d'Immo-Rama conformément à l'art. 32 CPC et ne renonce pas par avance à ce droit. Pour les autres rapports et sous réserve du droit impératif, le for est au siège d'Immo-Rama dans le canton de Vaud.

3. Modalités de paiement du montant d'activation

Le montant d'activation est de CHF 300. Le dossier est activé après son encaissement. Le paiement peut intervenir par facture QR ou par TWINT au numéro communiqué sur la facture officielle. La facture identifie la raison sociale du bénéficiaire et rappelle les conditions d'imputation, d'acquisition et de remboursement prévues au point 2.7.

4. Signature et validation

Le Mandant reconnaît avoir reçu le présent mandat complet avant sa signature et déclare comprendre ses dispositions. Toute modification requiert un écrit accepté par les deux parties.`;

/** Texte intégral du mandat du parcours choisi (achat ou location). */
export const contractTextFor = (journey: string | null | undefined, typeRecherche?: string | null): string =>
  isPurchaseMandat(journey, typeRecherche) ? ACHAT_CONTRACT_TEXT : LOCATION_CONTRACT_TEXT;

export const contractTitleFor = (journey: string | null | undefined, typeRecherche?: string | null): string =>
  isPurchaseMandat(journey, typeRecherche)
    ? "Mandat de recherche immobilière — Achat"
    : 'Mandat de recherche exclusif — Location';

/** Dispositions approuvées, avec leur horodatage, pour le PDF et l'archive. */
export const acceptedConsentsFor = (
  data: Record<string, any>,
): { key: string; title: string; question: string; cta: string; accepted_at: string | null }[] => {
  const list: LegalConsent[] = legalCheckboxesFor(data?.journey, data?.type_recherche);
  const at: Record<string, string> = data?.legal_consents_at || {};
  return list
    .filter((cb) => data?.[cb.key] === true)
    .map((cb) => ({ key: cb.key, title: cb.title, question: cb.question, cta: cb.cta, accepted_at: at[cb.key] ?? null }));
};
