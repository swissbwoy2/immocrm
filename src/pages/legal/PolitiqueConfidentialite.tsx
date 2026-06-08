import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = '8 juin 2026';

export default function PolitiqueConfidentialite() {
  useEffect(() => {
    document.title = 'Politique de confidentialité — Logisorama by Immo-rama.ch';
    const desc =
      "Politique de confidentialité alignée sur la LPD suisse révisée et le RGPD lorsque applicable — Logisorama by Immo-rama.ch.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', desc);
    else {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = desc;
      document.head.appendChild(m);
    }
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>

        <div className="flex items-start gap-3 mb-6">
          <ShieldCheck className="h-8 w-8 text-primary shrink-0 mt-1" />
          <div>
            <h1 className="text-4xl font-bold">Politique de confidentialité</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Alignée sur la LPD suisse révisée (entrée en vigueur le 1<sup>er</sup> septembre 2023)
              et sur le RGPD lorsque celui-ci est applicable aux personnes situées dans l'Union
              européenne — Dernière mise à jour : {LAST_UPDATE}
            </p>
          </div>
        </div>

        <p className="mb-8 text-base leading-relaxed">
          Chez Logisorama, la protection de vos données personnelles est une priorité.
          Cette politique explique <strong>quelles données nous collectons, pourquoi nous
          les collectons, comment nous les utilisons et quels sont vos droits</strong>.
          Elle détaille en particulier la raison pour laquelle nous demandons certains
          documents confidentiels (fiche de salaire, extrait de poursuites, pièce
          d'identité, permis de séjour, contrat de travail), indispensables à la
          constitution d'un dossier locataire recevable auprès des régies, propriétaires
          et bailleurs suisses.
        </p>

        <section className="space-y-10 text-base leading-relaxed">
          {/* 1 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">1. Responsable du traitement</h2>
            <p>
              Conformément à l'art. 5 let. j nLPD, le responsable du traitement est :
            </p>
            <ul className="mt-3 space-y-1">
              <li><strong>Immo-rama.ch</strong> — entreprise individuelle</li>
              <li>Titulaire et personne de contact : <strong>Christ Ramazani</strong></li>
              <li>Chemin de l'Esparcette 5, 1023 Crissier, Suisse</li>
              <li>IDE : CHE-442.303.796</li>
              <li>Email : <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a></li>
            </ul>
            <p className="mt-3">
              Pour toute question relative à vos données personnelles, contactez
              directement Christ Ramazani à l'adresse ci-dessus.
            </p>
          </div>

          {/* 2 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Catégories de données collectées</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Données d'identité et de contact</strong> : nom, prénom, date de naissance, nationalité, état civil, adresse, téléphone, email.</li>
              <li><strong>Données contractuelles et financières</strong> : revenus, situation professionnelle, coordonnées bancaires (pour acompte / remboursement), historique des mandats.</li>
              <li>
                <strong>Documents confidentiels à haut niveau de protection</strong> :
                fiches de salaire, extrait du registre des poursuites, pièce d'identité,
                permis de séjour, contrat de travail, coordonnées bancaires, informations
                relatives au ménage.
              </li>
              <li><strong>Données de navigation</strong> : adresse IP, type d'appareil, cookies, identifiants publicitaires (Google Ads, Meta Pixel, TikTok Pixel — voir §11).</li>
              <li><strong>Données de communication</strong> : emails, messages WhatsApp, échanges via la messagerie interne.</li>
            </ul>
            <p className="mt-4">
              Certains de ces documents peuvent contenir ou révéler des données sensibles
              au sens de l'art. 5 let. c nLPD, notamment des informations liées aux
              poursuites, sanctions ou données relevant de la sphère intime. Nous
              appliquons par conséquent un niveau de sécurité renforcé à l'ensemble du
              dossier locataire.
            </p>
          </div>

          {/* 3 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Pourquoi nous collectons vos documents</h2>
            <p>
              Les régies immobilières, propriétaires et bailleurs suisses exigent un
              dossier complet avant toute attribution d'un logement. Sans ces documents,
              votre candidature est généralement écartée. Nous les collectons donc
              uniquement dans le but de constituer, vérifier et transmettre votre dossier
              en votre nom.
            </p>

            <div className="overflow-x-auto mt-5 border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Document</th>
                    <th className="p-3 font-semibold">Finalité</th>
                    <th className="p-3 font-semibold">Justification / base RGPD si applicable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3 align-top"><strong>Fiches de salaire</strong></td>
                    <td className="p-3 align-top">Prouver aux régies que vos revenus respectent les critères habituels de solvabilité, notamment la règle selon laquelle le loyer ne devrait généralement pas dépasser environ un tiers du revenu net du ménage.</td>
                    <td className="p-3 align-top">Nécessaire à l'exécution du mandat + consentement explicite pour transmission aux régies.</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>Extrait du registre des poursuites</strong></td>
                    <td className="p-3 align-top">Document demandé par les régies, propriétaires ou bailleurs afin d'évaluer la solvabilité du candidat et l'existence éventuelle de procédures de recouvrement.</td>
                    <td className="p-3 align-top">Nécessaire à l'exécution du mandat + intérêt prépondérant du bailleur.</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>Copie de la pièce d'identité / permis de séjour</strong></td>
                    <td className="p-3 align-top">Vérifier votre identité et, le cas échéant, votre situation de séjour, afin de constituer un dossier conforme aux exigences habituelles des régies, propriétaires et bailleurs suisses.</td>
                    <td className="p-3 align-top">Nécessaire à l'exécution du mandat + consentement explicite pour transmission aux régies.</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>Contrat de travail</strong></td>
                    <td className="p-3 align-top">Démontrer la stabilité de votre emploi, votre taux d'activité, votre type de contrat et, si nécessaire, votre situation professionnelle auprès des régies ou propriétaires.</td>
                    <td className="p-3 align-top">Nécessaire à l'exécution du mandat.</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>Coordonnées bancaires</strong></td>
                    <td className="p-3 align-top">Permettre l'encaissement de l'acompte de CHF 300.–, l'émission de documents comptables et, le cas échéant, le remboursement prévu par les conditions du mandat.</td>
                    <td className="p-3 align-top">Nécessaire à l'exécution contractuelle.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4">
              Vous restez libre de ne pas nous transmettre ces documents. Dans ce cas,
              nous pourrions ne pas être en mesure d'exécuter correctement le mandat de
              recherche, faute de pouvoir constituer un dossier locataire conforme aux
              exigences habituelles des régies, propriétaires et bailleurs suisses.
            </p>
          </div>

          {/* 4 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Destinataires et sous-traitants</h2>
            <p>Vos données peuvent être accessibles, selon les besoins du service, aux destinataires suivants :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>l'équipe interne d'Immo-rama.ch / Logisorama ;</li>
              <li>les agents mandatés intervenant dans le cadre de votre recherche ;</li>
              <li>les régies immobilières, propriétaires ou bailleurs auxquels votre dossier est transmis avec votre accord ;</li>
              <li>les prestataires techniques nécessaires au fonctionnement du service, soumis à des engagements contractuels de confidentialité et de sécurité.</li>
            </ul>

            <div className="overflow-x-auto mt-5 border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Prestataire</th>
                    <th className="p-3 font-semibold">Fonction</th>
                    <th className="p-3 font-semibold">Pays / région</th>
                    <th className="p-3 font-semibold">Données concernées</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3 align-top"><strong>Supabase</strong></td>
                    <td className="p-3 align-top">Hébergement de l'application, base de données, authentification et stockage sécurisé</td>
                    <td className="p-3 align-top">Union européenne ou autre région selon configuration</td>
                    <td className="p-3 align-top">Données de compte, dossier client, documents justificatifs, statuts de recherche</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>Resend</strong></td>
                    <td className="p-3 align-top">Envoi d'emails transactionnels et notifications</td>
                    <td className="p-3 align-top">À vérifier selon configuration contractuelle</td>
                    <td className="p-3 align-top">Adresse email, nom, contenu des notifications</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>AbaNinja</strong></td>
                    <td className="p-3 align-top">Facturation, comptabilité, suivi des paiements</td>
                    <td className="p-3 align-top">Suisse</td>
                    <td className="p-3 align-top">Données de facturation, acomptes, remboursements, informations contractuelles</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>Meta</strong></td>
                    <td className="p-3 align-top">Publicité, mesure de conversion, Meta Pixel, WhatsApp Business le cas échéant</td>
                    <td className="p-3 align-top">Suisse / UE / États-Unis selon les services</td>
                    <td className="p-3 align-top">Données marketing, identifiants publicitaires, messages WhatsApp si utilisés</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>Google</strong></td>
                    <td className="p-3 align-top">Publicité, analytics, consentement, outils de productivité ou stockage selon configuration</td>
                    <td className="p-3 align-top">Suisse / UE / États-Unis selon les services</td>
                    <td className="p-3 align-top">Données de navigation, statistiques, emails ou documents si utilisés via Google Workspace</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>TikTok</strong></td>
                    <td className="p-3 align-top">Pixel publicitaire et mesure de campagne</td>
                    <td className="p-3 align-top">UE / États-Unis / autres régions selon les services</td>
                    <td className="p-3 align-top">Identifiants publicitaires, données de navigation, événements de conversion</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>WhatsApp Business</strong></td>
                    <td className="p-3 align-top">Communication client, suivi opérationnel, échanges liés au mandat</td>
                    <td className="p-3 align-top">Suisse / UE / États-Unis selon les services Meta</td>
                    <td className="p-3 align-top">Messages, numéro de téléphone, contenu transmis volontairement par le client</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4">
              Nous veillons à limiter l'accès aux données au strict nécessaire et à
              sélectionner des prestataires offrant des garanties appropriées en matière
              de confidentialité, sécurité et protection des données.
            </p>
          </div>

          {/* 5 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Transferts internationaux de données</h2>
            <p>
              Lorsque des données sont transférées vers les États-Unis, nous vérifions si
              le prestataire est certifié au <strong>Swiss-U.S. Data Privacy Framework</strong>{' '}
              et/ou au <strong>EU-U.S. Data Privacy Framework</strong> lorsque le RGPD
              s'applique. À défaut, nous utilisons des Clauses contractuelles types
              reconnues par le PFPDT, complétées si nécessaire par des mesures techniques
              supplémentaires.
            </p>
            <p className="mt-3">
              Certains prestataires techniques ou publicitaires peuvent traiter des
              données depuis des pays ne disposant pas d'un niveau de protection
              équivalent à celui de la Suisse ou de l'Union européenne. Dans ce cas, nous
              mettons en place les garanties contractuelles, organisationnelles et
              techniques appropriées lorsque cela est requis.
            </p>
          </div>

          {/* 6 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Durée de conservation</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dossier client actif</strong> : pendant toute la durée du mandat.</li>
              <li><strong>Données comptables et contractuelles</strong> : 10 ans conformément aux obligations comptables applicables.</li>
              <li><strong>Données marketing et cookies</strong> : durée limitée selon les finalités et préférences de consentement.</li>
            </ul>
            <p className="mt-3">
              Les documents justificatifs du dossier locataire, notamment fiches de
              salaire, extrait de poursuites, pièce d'identité, permis de séjour et
              contrat de travail, sont supprimés ou anonymisés à la clôture du mandat,
              sauf obligation légale de conservation, litige en cours, contestation
              contractuelle, nécessité de preuve ou demande expresse de la personne
              concernée compatible avec la loi.
            </p>
            <p className="mt-3">
              Les sauvegardes techniques peuvent contenir temporairement certaines
              données pendant une durée limitée, avant écrasement automatique selon notre
              politique interne de sauvegarde.
            </p>
            <p className="mt-3">
              Nous appliquons le principe de minimisation : les données ne sont
              conservées que pendant la durée nécessaire aux finalités pour lesquelles
              elles ont été collectées, sous réserve des obligations légales ou des
              besoins légitimes de preuve.
            </p>
          </div>

          {/* 7 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Sécurité des données</h2>
            <p>
              Conformément à l'art. 8 nLPD, nous appliquons des mesures techniques et
              organisationnelles appropriées : chiffrement en transit, chiffrement au
              repos lorsque disponible, contrôle d'accès par rôle, stockage privé,
              journalisation des accès et sensibilisation des collaborateurs.
            </p>
            <p className="mt-3">
              Les documents justificatifs ne sont accessibles qu'aux personnes
              strictement autorisées. Leur accès est limité par rôle, journalisé et
              révoqué dès qu'il n'est plus nécessaire. Les documents sont transmis aux
              régies via lien sécurisé ou espace protégé lorsque cela est techniquement
              possible.
            </p>
            <p className="mt-3">
              Nous évitons de transmettre fiches de salaire, pièces d'identité ou
              extraits de poursuites via WhatsApp ou messagerie non sécurisée, sauf
              demande expresse de la personne concernée après information sur les
              risques.
            </p>
            <p className="mt-3">
              Aucune mesure de sécurité ne pouvant garantir un risque zéro, nous adaptons
              régulièrement nos pratiques afin de réduire les risques d'accès non
              autorisé, de perte, d'altération ou de divulgation accidentelle.
            </p>
          </div>

          {/* 8 — NEW */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Violation de données</h2>
            <p>
              En cas de violation de la sécurité susceptible d'entraîner un risque élevé
              pour les personnes concernées, nous analysons l'incident et, lorsque la loi
              l'exige conformément à l'art. 24 nLPD, informons le Préposé fédéral à la
              protection des données et à la transparence (PFPDT) dans les meilleurs
              délais, ainsi que les personnes concernées lorsque cela est nécessaire à
              leur protection.
            </p>
            <p className="mt-3">
              Nous conservons une documentation interne des incidents de sécurité afin
              d'évaluer les mesures correctives à prendre et d'améliorer continuellement
              la protection des données.
            </p>
          </div>

          {/* 9 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">9. Vos droits</h2>
            <p>Conformément aux art. 25 à 32 nLPD, vous disposez à tout moment des droits suivants :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Droit d'<strong>accès</strong> à vos données,</li>
              <li>Droit de <strong>rectification</strong> des données inexactes,</li>
              <li>Droit de <strong>suppression</strong> (« droit à l'oubli »),</li>
              <li>Droit d'<strong>opposition</strong> au traitement,</li>
              <li>Droit à la <strong>portabilité</strong> de vos données,</li>
              <li>Droit de <strong>retirer votre consentement</strong> à tout moment, sans effet rétroactif,</li>
              <li>Droit de saisir le <strong>PFPDT</strong> (autorité de contrôle suisse).</li>
            </ul>
            <p className="mt-3">
              Pour les personnes situées dans l'Union européenne, le RGPD peut s'appliquer
              lorsque nos services leur sont spécifiquement proposés ou lorsque leur
              comportement est suivi. Dans ce cas, nous appliquons les garanties RGPD :
              accès, rectification, effacement, opposition, limitation, portabilité et
              droit de ne pas faire l'objet d'une décision entièrement automatisée.
            </p>
            <p className="mt-3">
              Pour exercer ces droits, écrivez-nous à{' '}
              <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a>{' '}
              en justifiant votre identité. Nous répondons dans un délai maximal de 30 jours.
            </p>
          </div>

          {/* 10 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">10. Décisions individuelles automatisées</h2>
            <p>
              Conformément à l'art. 21 nLPD, nous vous informons que notre outil interne
              « AI-Relocation » effectue un pré-tri automatisé des opportunités de
              logement selon vos critères. Aucune décision contractuelle finale (envoi
              d'un dossier, signature d'un bail) n'est prise sans intervention humaine.
            </p>
            <p className="mt-3">
              L'outil AI-Relocation sert uniquement d'aide à l'organisation, au matching
              et au pré-tri interne. Il ne refuse pas automatiquement un client, ne
              décide pas seul de l'envoi d'un dossier et ne remplace pas l'analyse
              humaine d'un agent Logisorama / Immo-rama.ch.
            </p>
            <p className="mt-3">
              Vous pouvez à tout moment demander une revue manuelle d'une situation ou
              d'un résultat vous concernant.
            </p>
          </div>

          {/* 11 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">11. Cookies et traceurs publicitaires</h2>
            <p>
              Le site utilise des cookies fonctionnels nécessaires au fonctionnement du
              service et, sous réserve de votre consentement, des cookies analytiques et
              publicitaires, notamment Google Ads, Meta Pixel et TikTok Pixel.
            </p>
            <p className="mt-3">
              Le site fonctionne avec un système de gestion du consentement prévoyant un
              refus par défaut des cookies non essentiels. Le bouton « Refuser tout » doit
              être aussi visible et accessible que le bouton « Accepter tout ». Vous
              pouvez modifier vos préférences à tout moment depuis le bandeau ou le lien
              de gestion des cookies.
            </p>
            <p className="mt-3">
              Une Politique cookies détaillée, présentant les cookies par nom,
              fournisseur, finalité, durée, catégorie et pays de traitement, pourra être
              publiée dans une prochaine itération.
            </p>
            <p className="mt-3">
              À la date de dernière mise à jour de la présente politique, le site
              Logisorama n'utilise pas Google reCAPTCHA ni Typo3. Toute référence à ces
              outils provenant d'anciennes versions de pages légales doit être considérée
              comme obsolète et ne doit pas être reprise dans cette politique.
            </p>
          </div>

          {/* 12 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">12. Profilage marketing</h2>
            <p>
              Au sens de l'art. 5 let. f nLPD, nous pouvons procéder à une segmentation
              marketing des prospects, par exemple selon les statuts suivants : recherche
              en cours, dossier incomplet, candidature soumise, mandat actif ou mandat
              clôturé.
            </p>
            <p className="mt-3">
              Ce profilage vise uniquement à personnaliser nos communications, améliorer
              le suivi client et éviter l'envoi de messages non pertinents. Il ne produit
              aucun effet juridique à votre égard et ne vous exclut pas automatiquement
              d'un service.
            </p>
          </div>

          {/* 13 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">13. Autorité de contrôle</h2>
            <p>
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir le
              Préposé fédéral à la protection des données et à la transparence (PFPDT),
              Feldeggweg 1, 3003 Berne — <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.edoeb.admin.ch</a>.
            </p>
          </div>

          {/* 14 */}
          <div>
            <h2 className="text-2xl font-semibold mb-3">14. Modifications</h2>
            <p>
              Cette politique peut être mise à jour à tout moment pour refléter des
              évolutions légales, techniques ou organisationnelles. La date de dernière
              mise à jour figure en haut de page.
            </p>
            <p className="mt-3">
              En cas de modification importante, nous pouvons informer les utilisateurs
              par email, notification ou affichage visible sur le site.
            </p>
          </div>
        </section>

        <div className="mt-12 text-sm text-muted-foreground">
          <Link to="/mentions-legales" className="text-primary hover:underline">
            Consulter aussi les Mentions légales
          </Link>
        </div>
      </div>
    </main>
  );
}
