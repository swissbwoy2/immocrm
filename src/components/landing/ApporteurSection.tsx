import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Handshake, TrendingUp, Eye, CreditCard, ArrowRight, Users, Building2, Briefcase } from 'lucide-react';

const benefits = [
  {
    icon: TrendingUp,
    title: 'Jusqu\'à 500 CHF par client',
    description: 'Touche ta commission pour chaque personne relogée grâce à ta recommandation.',
  },
  {
    icon: Eye,
    title: 'Dashboard partenaire dédié',
    description: 'Suis tes leads, leurs statuts et tes paiements en temps réel depuis ton espace perso.',
  },
  {
    icon: CreditCard,
    title: 'Paiement sous 15 jours',
    description: 'Virement direct sur ton compte dès la signature du bail. Rapide et sans paperasse.',
  },
];

const targetProfiles = [
  { icon: Building2, label: 'Agents immobiliers' },
  { icon: Users, label: 'RH & Entreprises' },
  { icon: Briefcase, label: 'Courtiers & Conciergeries' },
  { icon: Handshake, label: 'Coachs emploi & Influenceurs' },
];

export function ApporteurSection() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Clean gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-background to-primary/[0.05]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left content */}
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 mb-6">
              <div className="bg-card/80 rounded-full px-5 py-2.5 border border-primary/20">
                <Handshake className="inline-block h-4 w-4 text-primary mr-2" />
                <span className="text-sm font-semibold text-primary">Programme partenaire</span>
              </div>
            </div>

            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Transforme ton réseau en <span className="text-primary">revenus passifs</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed max-w-lg">
              Tu connais quelqu'un qui galère à trouver un appart' ? 
              Envoie-le nous et touche ta commission. Simple comme bonjour.
            </p>

            {/* Target profiles */}
            <div className="mb-8">
              <p className="text-sm font-medium text-foreground mb-3">💡 Parfait pour :</p>
              <div className="flex flex-wrap gap-2">
                {targetProfiles.map((profile, index) => (
                  <div 
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/40 text-sm text-muted-foreground"
                  >
                    <profile.icon className="h-4 w-4" />
                    <span>{profile.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <Button asChild size="lg" className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
              <Link to="/login">
                <span>Devenir partenaire</span>
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>

          {/* Right content - Benefits */}
          <div className="space-y-6 md:space-y-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="relative rounded-2xl p-6 md:p-8 animate-fade-in group"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <div className="absolute inset-0 rounded-2xl border border-border/40 group-hover:border-primary/30 group-hover:shadow-lg transition-all duration-300 bg-card/80" />

                <div className="flex gap-5 md:gap-6 relative z-10">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 md:w-18 md:h-18 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-all duration-300 border border-primary/20 group-hover:border-primary/30">
                      <benefit.icon className="h-8 w-8 md:h-9 md:w-9 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>

                {/* Bottom accent */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
