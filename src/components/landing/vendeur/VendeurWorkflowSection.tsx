import { ClipboardList, Cpu, Users, FileCheck, Handshake, ArrowRight } from 'lucide-react';

const steps = [
  {
    icon: ClipboardList,
    number: '01',
    title: 'Inscription gratuite',
    description: 'Décrivez votre bien en quelques minutes. Aucun engagement, aucun frais.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Cpu,
    number: '02',
    title: 'Matching IA',
    description: 'Notre intelligence artificielle identifie les acheteurs dont les critères correspondent à votre bien.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: Users,
    number: '03',
    title: 'Présentation ciblée',
    description: 'Votre bien est présenté uniquement aux acheteurs qualifiés et intéressés.',
    color: 'from-primary to-accent',
  },
  {
    icon: FileCheck,
    number: '04',
    title: 'Offres d\'achat',
    description: 'Recevez des offres d\'acheteurs sérieux, prêts à passer à l\'action.',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: Handshake,
    number: '05',
    title: 'Signature',
    description: 'Vendez au prix que VOUS avez fixé. 0% de commission pour vous.',
    color: 'from-emerald-500 to-emerald-600',
  },
];

export function VendeurWorkflowSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <ArrowRight className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Processus Simplifié</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            5 étapes vers
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              une vente réussie
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Un processus clair, transparent et efficace. 
            Nous nous occupons de tout, vous gardez le contrôle.
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-6xl mx-auto">
          {/* Desktop view */}
          <div className="hidden lg:block relative">
            {/* Connection line */}
            <div className="absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-primary to-emerald-500 opacity-30" />
            
            <div className="grid grid-cols-5 gap-6">
              {steps.map((step, index) => (
                <div 
                  key={index}
                  className="relative group animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Step card */}
                  <div className="relative z-10 p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
                    {/* Number badge */}
                    <div className={`absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                      <span className="text-white text-sm font-bold">{step.number}</span>
                    </div>

                    {/* Icon */}
                    <div className={`w-16 h-16 mb-4 rounded-xl bg-gradient-to-br ${step.color} bg-opacity-10 flex items-center justify-center`}>
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>

                    <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>

                  {/* Arrow to next step */}
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-24 -right-3 z-20">
                      <ArrowRight className="w-6 h-6 text-primary/50" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile/Tablet view */}
          <div className="lg:hidden space-y-6">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="relative flex gap-4 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Left side - number and line */}
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                    <span className="text-white font-bold">{step.number}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gradient-to-b from-primary/50 to-transparent my-2" />
                  )}
                </div>

                {/* Right side - content */}
                <div className="flex-1 p-6 rounded-2xl bg-card border border-border/50 mb-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${step.color} bg-opacity-10 flex items-center justify-center`}>
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold">{step.title}</h3>
                  </div>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <a 
            href="#formulaire-vendeur"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-xl shadow-primary/25"
          >
            Commencer maintenant
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className="mt-4 text-sm text-muted-foreground">
            Inscription gratuite • Sans engagement • Résultats en 24h
          </p>
        </div>
      </div>
    </section>
  );
}
