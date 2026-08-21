import { CANDIDACY_LEGAL } from '@/config/candidacy-terms';

const S = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-1.5">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">{children}</div>
  </section>
);

/**
 * (B) Conditions détaillées du service de dépôt de candidature.
 * Affichées dans un panneau déroulant scrollable depuis la pop-up,
 * ou sur une page dédiée.
 */
export function CandidacyDetailedTerms() {
  const { raisonSociale, adressePostale, emailProtectionDonnees, commission, conservationJours } =
    CANDIDACY_LEGAL;

  return (
    <div className="space-y-4">
      <S title="1. Objet du service">
        <p>
          En demandant à Immo-rama.ch, par l'intermédiaire de Logisorama.ch, de déposer une candidature,
          l'utilisateur lui confie une mission de courtage et d'intermédiation visant à favoriser la conclusion
          d'un contrat de bail portant sur le logement sélectionné.
        </p>
        <p>
          Immo-rama.ch peut notamment préparer le dossier, vérifier sa complétude, le transmettre à la gérance ou
          au bailleur, répondre aux demandes relatives à la candidature et assurer son suivi.
        </p>
        <p>
          Cette autorisation ne comprend aucun pouvoir de signer un contrat de bail, une garantie, une
          reconnaissance de dette ou tout autre engagement contractuel au nom de l'utilisateur. Une procuration
          distincte serait nécessaire à cet effet.
        </p>
      </S>

      <S title="2. Commission de courtage">
        <p>
          Conformément aux art. 412 et 413 CO, si l'activité d'Immo-rama.ch aboutit à la conclusion du contrat de
          bail recherché, l'utilisateur doit une commission de courtage.
        </p>
        <p>La commission convenue est fixée à : {commission}.</p>
        <p>
          Le « loyer brut mensuel » correspond, pour les présentes conditions, au loyer net mensuel augmenté des
          charges mensuelles prévues au bail, à l'exclusion du dépôt de garantie et, sauf convention expresse
          contraire, d'une place de parc ou de toute prestation faisant l'objet d'un contrat distinct.
        </p>
        <p>
          La commission de succès devient due lorsque : (1) Immo-rama.ch est intervenue dans la démarche ayant
          conduit à la candidature ; et (2) cette intervention a contribué à l'obtention du logement ; et (3) un
          contrat de bail est effectivement conclu pour ce logement.
        </p>
        <p>
          Une candidature refusée ou n'aboutissant pas à la conclusion d'un bail ne donne pas lieu à cette
          commission de succès.
        </p>
        <p>
          Si Immo-rama.ch est assujettie à la TVA au moment où la commission devient exigible, la TVA au taux
          légal, si elle est due, est ajoutée à la commission.
        </p>
      </S>

      <S title="3. Responsable du traitement">
        <p>
          {raisonSociale} exploitant Immo-rama.ch et Logisorama.ch, {adressePostale}, {emailProtectionDonnees}.
        </p>
      </S>

      <S title="4. Données traitées">
        <p>
          Dans le cadre du service, Immo-rama.ch peut traiter les données nécessaires à la constitution et au suivi
          du dossier, notamment : identité et coordonnées ; pièce d'identité et permis de séjour ; situation
          professionnelle et employeur ; revenus et fiches de salaire ; extrait de l'Office des poursuites ;
          composition du ménage ; documents transmis volontairement par l'utilisateur ; échanges relatifs à la
          candidature ; informations techniques permettant de documenter le dépôt et l'acceptation des présentes
          conditions.
        </p>
        <p>
          Certains documents peuvent, selon leur contenu, comporter des données sensibles au sens de la LPD ou, à
          tout le moins, des informations personnelles financières particulièrement confidentielles.
        </p>
      </S>

      <S title="5. Finalités du traitement">
        <p>
          Les données sont traitées exclusivement dans la mesure nécessaire pour : constituer et contrôler le
          dossier de candidature ; déposer la candidature demandée ; transmettre les documents aux destinataires
          concernés ; communiquer avec la gérance ou le bailleur ; suivre l'évolution de la candidature ; fournir
          les prestations Logisorama.ch demandées par l'utilisateur ; établir et gérer la commission lorsque les
          conditions de succès sont réalisées ; assurer la sécurité du service et défendre d'éventuelles
          prétentions juridiques.
        </p>
        <p>
          Les données du dossier de candidature ne sont pas utilisées à des fins publicitaires étrangères à ce
          service sans information ou consentement distinct lorsque celui-ci est requis.
        </p>
      </S>

      <S title="6. Transmission à des tiers">
        <p>
          L'utilisateur autorise expressément Immo-rama.ch à communiquer les informations nécessaires à : la
          gérance responsable du logement ; le propriétaire ou bailleur ; leurs représentants autorisés ; les
          plateformes utilisées pour le dépôt de la candidature ; les prestataires techniques indispensables au
          fonctionnement du service, dans les limites prévues par la législation sur la protection des données.
        </p>
        <p>Seules les informations raisonnablement nécessaires à la candidature doivent être transmises.</p>
        <p>
          Après transmission, une gérance ou un bailleur peut traiter les données en qualité de responsable
          indépendant conformément à sa propre politique de protection des données.
        </p>
      </S>

      <S title="7. Consentement et liberté de choix">
        <p>L'utilisation du service de dépôt de candidature est volontaire.</p>
        <p>
          En demandant expressément le dépôt de son dossier et en acceptant les présentes conditions, l'utilisateur
          autorise Immo-rama.ch à effectuer les traitements et transmissions nécessaires à cette candidature.
        </p>
        <p>
          Lorsqu'un document contient des données sensibles et qu'un consentement est requis, l'acceptation des
          présentes conditions vaut consentement exprès pour les traitements précisément décrits ci-dessus.
        </p>
        <p>
          L'utilisateur peut retirer son autorisation pour les traitements futurs. Un tel retrait n'affecte pas les
          traitements déjà licitement effectués et peut empêcher Immo-rama.ch de poursuivre les candidatures
          nécessitant la transmission des données concernées.
        </p>
      </S>

      <S title="8. Conservation et sécurité">
        <p>
          Les documents constituant le dossier de candidature sont conservés uniquement aussi longtemps qu'ils sont
          nécessaires à la prestation.
        </p>
        <p>
          Ils sont supprimés ou anonymisés au plus tard {conservationJours} jours après la fin du service concerné,
          sauf lorsqu'une conservation plus longue est imposée par une obligation légale ou nécessaire à la
          constatation, à l'exercice ou à la défense de prétentions.
        </p>
        <p>
          Les éléments nécessaires à la preuve du contrat, à la facturation ou à la comptabilité peuvent être
          conservés séparément pendant les délais légaux applicables.
        </p>
        <p>
          Immo-rama.ch prend des mesures techniques et organisationnelles appropriées pour protéger les données
          contre l'accès non autorisé, la perte, l'altération ou la divulgation illicite.
        </p>
      </S>

      <S title="9. Droits de l'utilisateur">
        <p>
          Conformément à la LPD, l'utilisateur peut notamment : demander si des données le concernant sont traitées
          et exercer son droit d'accès ; demander la rectification de données inexactes ; demander, lorsque les
          conditions légales le permettent, leur suppression ou la cessation d'un traitement ; retirer pour
          l'avenir une autorisation ou un consentement donné.
        </p>
        <p>Les demandes peuvent être adressées à : {emailProtectionDonnees}.</p>
      </S>

      <S title="10. Attribution du logement">
        <p>
          Immo-rama.ch est tenue de fournir les prestations convenues avec diligence, mais ne garantit pas
          l'attribution d'un logement. Le choix du locataire et la conclusion du bail relèvent exclusivement de la
          gérance et/ou du bailleur.
        </p>
      </S>
    </div>
  );
}
