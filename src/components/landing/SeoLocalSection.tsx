import { Link } from 'react-router-dom';
import { MapPin, GraduationCap, Building2, Users, Briefcase, Home } from 'lucide-react';

const zones = [
  {
    icon: MapPin,
    title: 'Lausanne & Ouest lausannois',
    text: 'Lausanne, Crissier, Renens, Prilly, Ecublens, Bussigny, Chavannes-près-Renens, Saint-Sulpice et les communes voisines.',
  },
  {
    icon: GraduationCap,
    title: 'Zones étudiantes UNIL · EPFL',
    text: "Logement étudiant à Ecublens, Chavannes-près-Renens, Saint-Sulpice, Renens et Lausanne pour les étudiants de l'UNIL et de l'EPFL.",
  },
  {
    icon: Home,
    title: 'Lavaux & Riviera',
    text: 'Pully, Lutry, Cully, Vevey, La Tour-de-Peilz, Montreux, Clarens, Saint-Légier, Blonay et Villeneuve.',
  },
  {
    icon: Building2,
    title: 'La Côte & Morges',
    text: 'Morges, Saint-Prex, Aubonne, Rolle, Gland, Nyon, Prangins, Coppet et les villages viticoles de La Côte.',
  },
  {
    icon: Users,
    title: 'Genève & Grand Genève',
    text: 'Genève, Carouge, Lancy, Onex, Meyrin, Vernier, Grand-Saconnex, Chêne-Bougeries, Versoix et les communes voisines.',
  },
  {
    icon: Briefcase,
    title: 'Autres cantons romands',
    text: 'Fribourg, Bulle, Romont, Neuchâtel, La Chaux-de-Fonds, Sion, Sierre, Martigny, Monthey, Delémont et Porrentruy.',
  },
];

export function SeoLocalSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-10 md:mb-14">
            <p className="text-xs sm:text-sm tracking-widest uppercase text-primary font-medium mb-3">
              Notre savoir-faire local
            </p>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Recherche d'appartement à Lausanne, Genève et en Suisse romande
            </h2>
            <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
              Logisorama by Immo-rama.ch accompagne les locataires solvables, les familles, les jeunes
              actifs, les étudiants et les entreprises dans leur recherche de logement sur l'ensemble
              de l'Arc lémanique.
            </p>
          </header>

          <article className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-foreground/90 leading-relaxed text-[15px] md:text-base">
            <section>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                Un agent immobilier personnel pour trouver votre logement
              </h3>
              <p>
                Trouver un appartement à louer à Lausanne, à Genève ou dans une commune comme Crissier,
                Renens, Prilly, Pully, Morges ou Nyon demande du temps, de la méthode et un vrai
                réseau. C'est exactement le rôle de notre agence de relocation. Votre agent immobilier
                personnel analyse votre dossier, définit vos critères et active chaque jour les
                régies, propriétaires et plateformes pour vous proposer uniquement les biens
                pertinents. Vous gagnez du temps, vous évitez les visites inutiles et vous concentrez
                votre énergie sur les candidatures qui ont le plus de chances d'aboutir.
              </p>
              <p>
                Pour démarrer, vous pouvez{' '}
                <Link to="/nouveau-mandat" className="text-primary font-semibold hover:underline">
                  activer votre recherche en ligne
                </Link>{' '}
                ou réserver un rendez-vous d'analyse gratuit à notre bureau de Crissier.
              </p>
            </section>

            <section>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                Appartement à louer, maison à louer ou bien immobilier à vendre
              </h3>
              <p>
                Que vous cherchiez un appartement à louer à Lausanne, une maison à louer sur La Côte,
                un logement étudiant proche de l'UNIL ou de l'EPFL, ou un appartement à vendre sur la
                Riviera, notre approche reste la même : un cahier des charges clair, une sélection
                rigoureuse, un suivi régulier. Pour l'achat immobilier, nous accompagnons également la
                recherche d'un immeuble à vendre, d'un attique ou d'un bien off-market que les
                portails publics ne diffusent pas. Notre rôle est d'aller chercher le bien qui
                correspond vraiment à votre projet.
              </p>
              <p>
                Si vous souhaitez vendre un bien, ce service est géré directement par notre agence
                Immo-rama.ch. Si vous êtes locataire sortant, Logisorama peut aussi vous aider à
                trouver un repreneur solvable :{' '}
                <a
                  href="https://immo-rama.ch/vendre-mon-bien"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-semibold hover:underline"
                >
                  vendre mon bien
                </a>{' '}
                {' '}ou{' '}
                <Link to="/relouer-mon-appartement" className="text-primary font-semibold hover:underline">
                  organiser une reprise de bail
                </Link>
                .
              </p>
            </section>

            <section>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                Relocation pour étudiants UNIL & EPFL, expatriés et entreprises
              </h3>
              <p>
                Logisorama accompagne plusieurs profils. Les étudiants de l'UNIL et de l'EPFL qui
                cherchent un logement à Lausanne, Ecublens, Chavannes-près-Renens ou Saint-Sulpice
                bénéficient d'un service adapté au budget étudiant et au calendrier académique. Les
                expatriés et cadres en mobilité professionnelle profitent d'un accompagnement complet,
                souvent à distance, pour préparer leur arrivée à Lausanne ou à Genève. Les entreprises
                et services RH peuvent nous mandater pour reloger un collaborateur, avec un reporting
                clair et un délai cible. Les familles, jeunes actifs et indépendants représentent
                également une part importante des dossiers que nous traitons chaque mois.
              </p>
            </section>

            <section>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                Une agence immobilière basée à Crissier, proche de Lausanne
              </h3>
              <p>
                Notre bureau se trouve au Chemin de l'Esparcette 5, à 1023 Crissier, à quelques
                minutes du centre de Lausanne, de Renens, Prilly et Ecublens. Cette implantation nous
                permet de bien connaître le tissu local : les régies de l'Ouest lausannois, les
                spécificités de chaque commune, les quartiers les plus demandés, les périodes de
                vacance et les attentes réelles des bailleurs. Cette connaissance locale fait la
                différence quand il s'agit de présenter un dossier qui inspire confiance et de
                positionner votre candidature au bon moment.
              </p>
            </section>

            <section>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                Pourquoi choisir Logisorama by Immo-rama.ch
              </h3>
              <p>
                Logisorama n'est pas un site d'annonces. C'est un service d'accompagnement humain et
                professionnel pour les personnes solvables qui veulent reprendre le contrôle de leur
                recherche immobilière. Nous ne promettons pas de résultat magique : la décision finale
                appartient toujours à la régie ou au propriétaire. Mais nous maximisons vos chances
                grâce à un dossier soigné, une stratégie de candidature claire et une réactivité
                quotidienne. À l'issue du mandat, si aucun bien n'a été trouvé, votre acompte vous
                est intégralement remboursé.
              </p>
              <p className="text-sm text-muted-foreground">
                Pour en savoir plus, consultez nos{' '}
                <Link to="/mentions-legales" className="text-primary hover:underline">
                  mentions légales
                </Link>{' '}
                et notre{' '}
                <Link to="/politique-confidentialite" className="text-primary hover:underline">
                  politique de confidentialité
                </Link>
                .
              </p>
            </section>
          </article>

          <section className="mt-14 md:mt-20">
            <header className="text-center mb-8">
              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-3">
                Nous accompagnons votre recherche de logement en Suisse romande
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Six zones de couverture principales pour un accompagnement local, précis et humain.
              </p>
            </header>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {zones.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl p-5 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                    <h4 className="font-bold text-foreground text-base">{title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
