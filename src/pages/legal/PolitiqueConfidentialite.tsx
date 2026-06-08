import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = '8 juin 2026';

export default function PolitiqueConfidentialite() {
  useEffect(() => {
    document.title = 'Politique de confidentialité — Logisorama by Immo-rama.ch';
    const desc =
      "Politique de confidentialité conforme à la nouvelle Loi fédérale sur la protection des données (nLPD) — Logisorama by Immo-rama.ch.";
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
              Conforme à la nLPD (entrée en vigueur le 1<sup>er</sup> septembre 2023) et au RGPD pour
              les personnes concernées au sein de l'UE — Dernière mise à jour : {LAST_UPDATE}
            </p>
          </div>
        </div>

        <p className="mb-8 text-base leading-relaxed">
          Chez Logisorama, la protection de vos données personnelles est une priorité.
          Cette politique explique <strong>quelles données nous collectons, pourquoi nous les
          collectons, comment nous les utilisons et quels sont vos droits</strong>. Elle
          détaille en particulier la raison pour laquelle nous demandons des documents
          sensibles (fiche de salaire, extrait de poursuites, pièce d'identité, permis de
          séjour), indispensables à la constitution d'un dossier locataire recevable
          auprès des régies suisses.
        </p>

        <section className="space-y-10 text-base leading-relaxed">
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

          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Catégories de données collectées</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Données d'identité et de contact</strong> : nom, prénom, date de naissance, nationalité, état civil, adresse, téléphone, email.</li>
              <li><strong>Données contractuelles et financières</strong> : revenus, situation professionnelle, coordonnées bancaires (pour acompte / remboursement), historique des mandats.</li>
              <li>
                <strong>Données sensibles au sens de l'art. 5 let. c nLPD</strong> :
                <ul className="list-[circle] pl-6 mt-2 space-y-1">
                  <li>fiches de salaire des 3 derniers mois,</li>
                  <li>extrait du registre des poursuites,</li>
                  <li>copie de la pièce d'identité ou du permis de séjour,</li>
                  <li>contrat de travail,</li>
                  <li>composition du ménage (enfants, garants, animaux).</li>
                </ul>
              </li>
              <li><strong>Données de navigation</strong> : adresse IP, type d'appareil, cookies, identifiants publicitaires (Google Ads, Meta Pixel, TikTok Pixel — voir §10).</li>
              <li><strong>Données de communication</strong> : emails, messages WhatsApp, échanges via la messagerie interne.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Pourquoi nous collectons vos documents sensibles</h2>
            <p>
              Les régies immobilières et propriétaires suisses exigent un dossier complet
              avant toute attribution d'un logement. Sans ces documents, votre
              candidature est <strong>systématiquement écartée</strong>. Nous les
              collectons donc <strong>uniquement</strong> dans le but de constituer,
              vérifier et transmettre votre dossier en votre nom. Le tableau ci-dessous
              détaille pour chaque document la finalité et la base légale au sens des
              art. 6, 30 et 31 nLPD.
            </p>

            <div className="overflow-x-auto mt-5 border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr className="text-left">
                    <th className="p-3 font-semibold">Document</th>
                    <th className="p-3 font-semibold">Finalité explicite</th>
                    <th className="p-3 font-semibold">Base légale (nLPD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3 align-top"><strong>Fiches de salaire</strong> (3 derniers mois)</td>
                    <td className="p-3 align-top">Prouver aux régies que vos revenus respectent la règle du tiers (loyer ≤ 1/3 du revenu net), critère imposé par la quasi-totalité des bailleurs suisses.</td>
                    <td className="p-3 align-top">Exécution du mandat de recherche (art. 31 al. 2 let. a) + consentement explicite (art. 6 al. 7).</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>Extrait du registre des poursuites</strong></td>
                    <td className="p-3 align-top">Document exigé par les régies pour vérifier votre solvabilité et l'absence de procédures de recouvrement en cours.</td>
                    <td className="p-3 align-top">Exécution contractuelle + intérêt légitime du bailleur destinataire.</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>Copie pièce d'identité / permis de séjour</strong></td>
                    <td className="p-3 align-top">Vérifier votre identité et votre droit de séjourner en Suisse, condition légale à la conclusion d'un bail.</td>
                    <td className="p-3 align-top">Obligation contractuelle + consentement explicite.</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>Contrat de travail</strong></td>
                    <td className="p-3 align-top">Démontrer la stabilité de votre emploi (CDI, période d'essai, taux d'activité) aux régies.</td>
                    <td className="p-3 align-top">Exécution du mandat.</td>
                  </tr>
                  <tr>
                    <td className="p-3 align-top"><strong>Coordonnées bancaires</strong></td>
                    <td className="p-3 align-top">Encaissement de l'acompte de 300 CHF, remboursement en cas d'échec après 3 mois.</td>
                    <td className="p-3 align-top">Exécution contractuelle.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4">
              <strong>Vous restez libre de ne pas nous transmettre ces documents.</strong>{' '}
              Dans ce cas, nous ne serons cependant pas en mesure d'exécuter le mandat de
              recherche, faute de pouvoir présenter un dossier conforme aux exigences des
              régies.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Destinataires des données</h2>
            <p>Vos données sont accessibles à :</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>L'équipe interne d'Immo-rama.ch (Christ Ramazani et agents mandatés),</li>
              <li>Les <strong>régies immobilières et propriétaires</strong> à qui votre dossier de candidature est transmis,</li>
              <li>Nos <strong>sous-traitants techniques</strong>, liés contractuellement et soumis à des engagements de confidentialité : Supabase (hébergement, UE), Resend (envoi d'emails), AbaNinja (facturation, Suisse), Meta, Google, TikTok et WhatsApp Business (marketing et messagerie sur consentement).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Transfert de données à l'étranger</h2>
            <p>
              Conformément aux art. 16-17 nLPD, certains sous-traitants (Meta, Google,
              TikTok) sont situés aux États-Unis. Ces transferts sont encadrés par le{' '}
              <em>EU-US Data Privacy Framework</em> et/ou des Clauses contractuelles types
              reconnues par le Préposé fédéral à la protection des données et à la
              transparence (PFPDT).
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Durée de conservation</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dossier client actif</strong> : pendant toute la durée du mandat.</li>
              <li><strong>Documents sensibles (salaire, poursuites, ID)</strong> : supprimés à la clôture du mandat, sauf opposition motivée.</li>
              <li><strong>Données comptables et contractuelles</strong> : 10 ans (art. 958f CO).</li>
              <li><strong>Données marketing et cookies</strong> : 13 mois maximum.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Sécurité des données</h2>
            <p>
              Conformément à l'art. 8 nLPD, nous appliquons des mesures techniques et
              organisationnelles appropriées : chiffrement en transit (HTTPS) et au
              repos, contrôle d'accès par rôle (Row-Level Security), buckets de stockage
              privés, journalisation des accès, formation du personnel.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Vos droits</h2>
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
              Pour exercer ces droits, écrivez-nous à{' '}
              <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a>{' '}
              en justifiant votre identité. Nous répondons dans un délai maximal de 30 jours.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">9. Décisions individuelles automatisées</h2>
            <p>
              Conformément à l'art. 21 nLPD, nous vous informons que notre outil interne
              « AI-Relocation » effectue un pré-tri automatisé des opportunités de
              logement selon vos critères. Aucune décision contractuelle finale (envoi
              d'un dossier, signature d'un bail) n'est prise sans intervention humaine.
              Vous pouvez à tout moment demander une revue manuelle.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">10. Cookies et traceurs publicitaires</h2>
            <p>
              Le site utilise des cookies fonctionnels (essentiels au fonctionnement) et,
              sous réserve de votre consentement, des cookies analytiques et publicitaires
              (Google Ads, Meta Pixel, TikTok Pixel) opérant en <em>Consent Mode v2</em>{' '}
              avec consentement par défaut <strong>refusé</strong>. Vous pouvez ajuster
              vos préférences depuis le bandeau de consentement à tout moment.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">11. Profilage marketing</h2>
            <p>
              Au sens de l'art. 5 let. f nLPD, nous procédons à une segmentation marketing
              des prospects (par exemple : recherche en cours, candidature soumise, mandat
              actif) afin de personnaliser nos communications. Ce profilage ne produit
              aucun effet juridique à votre égard.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">12. Autorité de contrôle</h2>
            <p>
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir le
              Préposé fédéral à la protection des données et à la transparence (PFPDT),
              Feldeggweg 1, 3003 Berne — <a href="https://www.edoeb.admin.ch" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.edoeb.admin.ch</a>.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">13. Modifications</h2>
            <p>
              Cette politique peut être mise à jour à tout moment pour refléter des
              évolutions légales ou de service. La date de dernière mise à jour figure en
              haut de page.
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
