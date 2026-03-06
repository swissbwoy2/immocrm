import { UserCheck, Search, FileCheck, Activity } from 'lucide-react';

const deliverables = [
  {
    icon: UserCheck,
    title: 'Un agent dédié',
    description: "Un interlocuteur unique qui connaît votre dossier, votre budget et vos contraintes.",
  },
  {
    icon: Search,
    title: 'Recherche active quotidienne',
    description: "Votre agent contacte les régies, scrute les annonces et active son réseau chaque jour.",
  },
  {
    icon: FileCheck,
    title: 'Dossier optimisé',
    description: "Nous préparons un dossier de candidature complet et professionnel pour maximiser vos chances.",
  },
  {
    icon: Activity,
    title: 'Suivi en temps réel',
    description: "Tableau de bord client avec visibilité sur chaque démarche, chaque offre et chaque retour de régie.",
  },
];

export function WhatYouGetSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-xs sm:text-sm tracking-widest uppercase text-primary font-medium mb-3">
            Ce que vous obtenez
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">
            Un accompagnement complet, de A à Z
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {deliverables.map((d, i) => (
            <div
              key={i}
              className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 space-y-3 hover:border-primary/30 transition-colors"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <d.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{d.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{d.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
