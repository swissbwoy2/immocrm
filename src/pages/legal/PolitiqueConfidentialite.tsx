import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';

const LAST_UPDATE = '19 août 2026';

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
              Fondée sur la LPD suisse révisée et son ordonnance, et sur le RGPD lorsque celui-ci
              est applicable à un traitement déterminé — Dernière mise à jour : {LAST_UPDATE}
            </p>
          </div>
        </div>

        <section className="space-y-8 text-base leading-relaxed">
          <div>
            <h2 className="text-2xl font-semibold mb-3">1. Responsable du traitement</h2>
            <ul className="space-y-1">
              <li><strong>Immo-rama.ch — entreprise individuelle Christ Ramazani</strong></li>
              <li>Chemin de l'Esparcette 5, 1023 Crissier (VD), Suisse</li>
              <li>IDE : <strong>CHE-442.303.796</strong></li>
              <li>
                E-mail protection des données :{' '}
                <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline">info@immo-rama.ch</a>
              </li>
              <li>
                Téléphone :{' '}
                <a href="tel:+41216342839" className="text-primary hover:underline">+41 21 634 28 39</a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">2. Champ d'application</h2>
            <p>
              La présente politique s'applique à Logisorama.ch, à ses applications mobiles, aux
              espaces clients, annonceurs et professionnels ainsi qu'aux services associés
              exploités par Immo-rama.ch. Elle est fondée sur la Loi fédérale sur la protection des
              données (LPD) et son ordonnance. Lorsque le RGPD est applicable à un traitement
              déterminé, les droits et obligations supplémentaires du RGPD sont également
              respectés.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">3. Données traitées</h2>
            <p>
              Selon les services utilisés, nous pouvons traiter notamment : identité et
              coordonnées ; informations de compte ; critères immobiliers ; situation
              professionnelle et financière ; informations concernant le ménage ; données de
              garants et co-candidats ; pièces d'identité ou permis ; fiches de salaire ; contrats
              de travail ; extraits du registre des poursuites ; documents de candidature ;
              messages et communications ; informations relatives aux visites ; contenus audio ou
              vidéo lorsqu'une fonction correspondante est utilisée ; données de facturation et de
              paiement ; journaux techniques, adresse IP et données de sécurité ; identifiants de
              notifications ; données liées aux préférences marketing et aux cookies.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">4. Finalités</h2>
            <p>
              Exploiter Logisorama.ch ; créer et gérer les comptes ; exécuter les mandats ;
              constituer les dossiers ; proposer des biens ; effectuer des matchings ; organiser
              les visites ; déposer les candidatures demandées ; communiquer avec les régies,
              propriétaires et autres intervenants ; fournir la messagerie, les appels et les
              notifications ; gérer la facturation ; prévenir la fraude ; assurer la sécurité ;
              respecter les obligations légales ; établir ou défendre des droits ; améliorer la
              plateforme et, lorsque cela est autorisé, effectuer des opérations marketing.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">5. Consentement et autres motifs de traitement</h2>
            <p>
              Sous la LPD, l'exécution des traitements nécessaires au service n'est pas
              artificiellement présentée comme dépendant d'un consentement unique et révocable.
              Lorsque le traitement est nécessaire à l'exécution du service demandé ou repose sur
              un intérêt privé prépondérant compatible avec la LPD, nous le signalons de manière
              transparente. Un consentement distinct est demandé lorsqu'il est juridiquement
              nécessaire ou approprié, notamment pour certains traitements facultatifs,
              enregistrements ou activités marketing.
            </p>
            <p className="mt-3">
              <strong>Enregistrement audio ou vidéo :</strong> les appels et les live de visite ne
              font l'objet <strong>d'aucun enregistrement par défaut</strong> — la fonction
              d'enregistrement est désactivée. Si un enregistrement devait être activé à l'avenir,
              les participants en seraient clairement informés avant tout enregistrement.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">6. Intelligence artificielle et matching</h2>
            <p>
              Des systèmes automatisés peuvent comparer des critères de recherche à des annonces et
              proposer des opportunités. Lorsque l'outil ne fait qu'assister un collaborateur et
              qu'une décision pertinente reste effectivement prise par un humain, il n'est pas
              présenté comme une décision individuelle entièrement automatisée. Si ce
              fonctionnement change, la présente politique sera adaptée conformément notamment à
              l'art. 21 LPD.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">7. Destinataires</h2>
            <p>
              Régies immobilières, propriétaires, bailleurs, vendeurs, agents et autres
              destinataires d'une candidature demandée par l'utilisateur ; prestataires techniques ;
              prestataires de facturation ; fournisseurs de communications et de notifications ;
              autorités lorsque la loi l'exige.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">8. Prestataires techniques</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border">
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
              La synchronisation entre Immo-rama.ch et Logisorama.ch s'effectue au sein de la même
              entreprise (Immo-rama.ch, Christ Ramazani), qui reste le même responsable de
              traitement utilisant plusieurs systèmes ; il ne s'agit pas d'un transfert à un
              sous-traitant tiers.
            </p>
            <p className="mt-3">
              Pour chaque prestataire, le pays de traitement et le mécanisme de transfert
              (notamment le Swiss-U.S. Data Privacy Framework lorsque le prestataire américain est
              certifié, ou des clauses contractuelles types) sont documentés dans notre registre
              interne et vérifiés au cas par cas.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">9. Sécurité</h2>
            <p>
              Nous mettons en œuvre des mesures organisationnelles et techniques adaptées au risque
              (art. 8 LPD). L'accès aux données est limité aux personnes qui en ont besoin, compte
              tenu de la nature sensible des dossiers locatifs.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">10. Durée de conservation</h2>
            <p>
              Les données ne sont conservées que le temps nécessaire aux finalités poursuivies,
              sous réserve d'obligations légales, d'un litige, de la défense de droits ou d'un
              besoin de preuve. Les documents comptables et contractuels soumis à conservation
              peuvent devoir être conservés dix ans (art. 958f CO).
            </p>
            <p className="mt-3">
              Cette durée de dix ans ne s'applique <strong>pas</strong> automatiquement à
              l'ensemble d'un dossier locataire (pièces d'identité, fiches de salaire, extraits de
              poursuites) : pour ces documents opérationnels, une durée spécifique et plus courte
              est définie selon le besoin réel.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">11. Droits des personnes</h2>
            <p>
              Vous disposez d'un droit d'accès (art. 25 ss LPD), de rectification, de suppression
              lorsqu'aucun motif légitime ne justifie la conservation, d'opposition, de
              portabilité (art. 28 LPD) dans les situations prévues par la loi, ainsi que du droit
              de retirer un consentement sans effet rétroactif.
            </p>
            <p className="mt-3">
              Demandes à :{' '}
              <a href="mailto:info@immo-rama.ch" className="text-primary hover:underline font-semibold">
                info@immo-rama.ch
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">12. Analyse d'impact (AIPD)</h2>
            <p>
              Lorsqu'un traitement est susceptible d'entraîner un risque élevé pour la personnalité
              ou les droits fondamentaux, une analyse d'impact relative à la protection des données
              est effectuée conformément à l'art. 22 LPD.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">13. Violations de données</h2>
            <p>
              Lorsqu'une violation de la sécurité des données présente un risque élevé pour la
              personnalité ou les droits fondamentaux, elle est annoncée au Préposé fédéral à la
              protection des données et à la transparence (PFPDT) dans les meilleurs délais
              (art. 24 LPD).
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">14. Cookies et marketing</h2>
            <p>
              Nous utilisons les technologies nécessaires au fonctionnement du service et, selon
              les choix de l'utilisateur, des outils de mesure, d'analyse et de publicité (Meta
              Pixel, Google Ads, TikTok Pixel).
            </p>
            <p className="mt-3">
              Une plateforme de gestion du consentement (CMP) propose « Tout accepter », « Tout
              refuser » et « Personnaliser ». Les traceurs non essentiels sont refusés par défaut et
              aucun pixel publicitaire n'est déclenché avant le choix de l'utilisateur lorsqu'un
              consentement préalable est requis.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-3">15. Modifications</h2>
            <p>
              La présente politique peut être modifiée selon l'évolution des services, des
              prestataires et des exigences légales. La date de dernière mise à jour est affichée en
              haut de page.
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
