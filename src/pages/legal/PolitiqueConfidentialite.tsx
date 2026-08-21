import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = '21 août 2026';

const PRESTATAIRES: { nom: string; fonction: string; donnees: string }[] = [
  { nom: 'Supabase', fonction: 'Base de données, authentification, stockage', donnees: 'Compte, dossier, documents, données applicatives' },
  { nom: 'Lovable Cloud', fonction: 'Hébergement / infrastructure applicative', donnees: 'Données techniques et applicatives selon architecture' },
  { nom: 'Resend', fonction: "Envoi d'e-mails", donnees: 'E-mail, nom, contenu des communications nécessaires' },
  { nom: 'AbaNinja', fonction: 'Facturation / comptabilité', donnees: 'Identité, coordonnées, factures et paiements' },
  { nom: 'LiveKit Cloud', fonction: 'Appels audio/vidéo, live', donnees: 'Identifiants de session, métadonnées, flux audio/vidéo' },
  { nom: 'Apple APNs', fonction: 'Notifications iOS', donnees: 'Jeton push et contenu limité de notification' },
  { nom: 'Google FCM', fonction: 'Notifications Android', donnees: 'Jeton push et contenu limité de notification' },
  { nom: 'Google Maps / Places', fonction: 'Cartographie, adresses, géocodage', donnees: 'Requêtes géographiques et données techniques' },
  { nom: 'Google / Gemini (si activé)', fonction: 'Fonctions IA', donnees: 'Données nécessaires à la fonction concernée' },
  { nom: 'Meta', fonction: 'Publicité / mesure', donnees: 'Identifiants et données marketing selon consentement/configuration' },
  { nom: 'Google Ads', fonction: 'Publicité / mesure', donnees: 'Identifiants et données marketing' },
  { nom: 'TikTok', fonction: 'Publicité / mesure', donnees: 'Identifiants et données marketing' },
  { nom: 'WhatsApp Business', fonction: 'Communication demandée', donnees: 'Numéro, identité et contenu des échanges' },
];

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
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>
        <div className="text-xs text-muted-foreground mb-6 flex gap-3">
          <span className="text-primary font-semibold">FR</span>
          <Link to="/en/privacy-policy" className="hover:text-primary">EN</Link>
          <Link to="/de/datenschutz" className="hover:text-primary">DE</Link>
        </div>

        <div className="flex items-start gap-3 mb-6">
          <ShieldCheck className="h-8 w-8 text-primary shrink-0 mt-1" />
          <div>
            <h1 className="text-4xl font-bold">Politique de confidentialité</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Fondée sur la LPD et l'OPDo ; RGPD uniquement lorsqu'il est effectivement applicable — Dernière mise à jour : {LAST_UPDATE}
            </p>
          </div>
        </div>

        <section className="space-y-8 text-base leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold mb-3">1. Responsable du traitement</h2>
            <p>
              Immo-rama.ch — entreprise individuelle Christ Ramazani, Chemin de l'Esparcette 5, 1023 Crissier (VD), Suisse, IDE CHE-442.303.796, agit comme responsable du traitement.
            </p>
            <ul className="mt-3 space-y-1">
              <li>Contact : <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a></li>
              <li>Téléphone : <a href="tel:+41216342839" className="text-primary hover:underline">+41 21 634 28 39</a></li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Champ d'application et droit applicable</h2>
            <p>
              La présente politique s'applique au site Logisorama.ch, aux applications, espaces clients, annonceurs et professionnels ainsi qu'aux prestations connexes exploitées par Immo-rama.ch. Elle est fondée sur la LPD et son ordonnance. Le RGPD n'est appliqué que lorsqu'un traitement relève effectivement de son champ territorial ou matériel.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Catégories de données traitées</h2>
            <p>
              Selon la prestation, peuvent être traitées : identité, coordonnées et authentification ; critères immobiliers ; situation personnelle, professionnelle et financière ; composition du ménage ; informations relatives aux garants et co-candidats ; pièces d'identité, permis, fiches de salaire, contrats de travail et extraits des poursuites ; documents de candidature ; messages ; visites et communications ; facturation et paiements ; journaux techniques, adresse IP, sécurité ; identifiants de notifications ; choix relatifs aux cookies et au marketing. Les données de tiers ne doivent être transmises qu'après information de ceux-ci et lorsqu'une base suffisante existe.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Finalités</h2>
            <p>
              Les traitements ont pour finalités l'exploitation et la sécurité de la plateforme, la création et la gestion des comptes, l'exécution des mandats, la constitution et la transmission des dossiers demandés, le matching, l'organisation des visites, les communications, la facturation, la prévention de la fraude, le respect d'obligations légales, l'établissement et la défense de droits, l'amélioration du service et, lorsque les conditions sont remplies, les activités de mesure et de marketing.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Justification, consentements et transparence</h2>
            <p>
              Sous la LPD, tout traitement respecte les principes de licéité, bonne foi, proportionnalité, finalité, reconnaissabilité et sécurité. Les traitements nécessaires à la prestation ne sont pas artificiellement soumis à un consentement global. Un consentement spécifique, libre et révocable est sollicité lorsqu'il est requis ou approprié, notamment pour certains usages facultatifs, enregistrements et opérations marketing. Le retrait n'affecte pas la licéité des traitements antérieurs.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Matching, profilage et décisions automatisées</h2>
            <p>
              Les systèmes peuvent rapprocher les critères d'un Utilisateur avec des annonces et établir des suggestions. À la date de la présente politique, aucune décision produisant des effets juridiques ou affectant significativement une personne n'est adoptée exclusivement par un système automatisé. Si une telle décision devait être introduite, les personnes seraient informées conformément à l'art. 21 LPD et pourraient demander qu'elle soit revue par une personne physique.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Destinataires</h2>
            <p>
              Les données peuvent être communiquées, selon le service demandé et dans la mesure nécessaire, aux régies, propriétaires, bailleurs, vendeurs, agents, professionnels impliqués dans une transaction, prestataires techniques, fournisseurs de paiement ou de facturation, services de communication et autorités compétentes. Aucune vente de dossiers de candidature n'est effectuée.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Sous-traitants et transferts internationaux</h2>
            <p>
              Les sous-traitants sont sélectionnés et encadrés contractuellement conformément à l'art. 9 LPD. Pour tout traitement à l'étranger, Immo-rama.ch vérifie le pays, le niveau de protection, le rôle du destinataire et, lorsque nécessaire, met en œuvre une garantie appropriée, notamment une certification reconnue, des clauses contractuelles types adaptées au droit suisse ou une exception légale documentée. Les informations disponibles sont communiquées sur demande.
            </p>
            <h3 className="text-lg font-semibold mt-4 mb-2">Registre synthétique des prestataires techniques</h3>
            <div className="mt-1 overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left font-semibold p-3">Prestataire</th>
                    <th className="text-left font-semibold p-3">Fonction</th>
                    <th className="text-left font-semibold p-3">Données susceptibles d'être traitées</th>
                  </tr>
                </thead>
                <tbody>
                  {PRESTATAIRES.map((p) => (
                    <tr key={p.nom} className="border-t align-top">
                      <td className="p-3 font-medium whitespace-nowrap">{p.nom}</td>
                      <td className="p-3 text-muted-foreground">{p.fonction}</td>
                      <td className="p-3 text-muted-foreground">{p.donnees}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4">
              La synchronisation entre Immo-rama.ch et Logisorama.ch s'effectue au sein de la même entreprise (Immo-rama.ch, Christ Ramazani), qui reste le même responsable de traitement utilisant plusieurs systèmes ; il ne s'agit pas d'un transfert à un sous-traitant tiers.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">9. Sécurité</h2>
            <p>
              Des mesures techniques et organisationnelles adaptées au risque sont appliquées conformément à l'art. 8 LPD et à l'OPDo : contrôle des accès, authentification, journalisation, sauvegardes, gestion des droits, chiffrement lorsque approprié, cloisonnement, gestion des vulnérabilités, procédures d'incident et obligations de confidentialité. Aucun dispositif ne garantit toutefois une sécurité absolue.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">10. Durées de conservation</h2>
            <p>
              Les données sont conservées pendant la durée nécessaire à la finalité, au contrat, à la preuve ou à une obligation légale. Sauf nécessité documentée contraire, les pièces opérationnelles sensibles d'un dossier de candidature sont supprimées ou anonymisées au plus tard 90 jours après la fin du service. Les données contractuelles et comptables soumises à l'art. 958f CO peuvent être conservées dix ans. Les litiges, blocages probatoires et obligations d'autorité peuvent justifier une conservation limitée plus longue.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">11. Droits des personnes</h2>
            <p>
              Toute personne concernée peut exercer les droits prévus par la LPD, notamment l'accès aux données selon les art. 25 ss LPD, la rectification, la remise ou transmission selon l'art. 28 LPD lorsque ses conditions sont remplies, ainsi que demander la suppression ou s'opposer à un traitement lorsqu'aucun motif prépondérant ne justifie sa poursuite. Les demandes sont adressées à info@immo-rama.ch ; une vérification proportionnée de l'identité peut être requise.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">12. Analyse d'impact</h2>
            <p>
              Lorsqu'un traitement envisagé est susceptible d'entraîner un risque élevé pour la personnalité ou les droits fondamentaux, Immo-rama.ch réalise préalablement une analyse d'impact conformément à l'art. 22 LPD et consulte le PFPDT lorsque les conditions légales l'exigent.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">13. Violations de la sécurité des données</h2>
            <p>
              Toute violation est documentée et traitée selon une procédure d'incident. Lorsqu'elle est susceptible d'entraîner un risque élevé pour la personnalité ou les droits fondamentaux, elle est annoncée au PFPDT dans les meilleurs délais conformément à l'art. 24 LPD ; les personnes concernées sont informées lorsque cela est nécessaire à leur protection ou exigé par le PFPDT.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">14. Cookies, mesure d'audience et marketing</h2>
            <p>
              Les technologies strictement nécessaires peuvent être utilisées pour fournir et sécuriser le service. Les outils d'analyse ou de publicité, notamment Meta Pixel, Google Ads ou TikTok Pixel, ne sont activés que conformément aux choix enregistrés et au droit applicable. Une interface de gestion permet d'accepter, refuser ou personnaliser les catégories non essentielles et de modifier ultérieurement les préférences.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">15. Modifications et contact</h2>
            <p>
              La politique peut être adaptée lorsque les traitements, prestataires ou exigences légales évoluent. La version en vigueur et sa date sont publiées. Toute question ou demande relative à la protection des données peut être adressée à info@immo-rama.ch.
            </p>
          </div>
        </section>

        <div className="mt-12 text-sm text-muted-foreground flex flex-wrap gap-4">
          <Link to="/mentions-legales" className="text-primary hover:underline">
            Mentions légales
          </Link>
          <Link to="/conditions-generales" className="text-primary hover:underline">
            Conditions Générales d'Utilisation
          </Link>
        </div>
      </div>
    </main>
  );
}
