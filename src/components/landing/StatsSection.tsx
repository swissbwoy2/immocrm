import { useEffect, useState } from 'react';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import { Users, Home, Star, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  clients: number;
  transactions: number;
  satisfaction: number;
  avgDays: number;
}

export function StatsSection() {
  const [stats, setStats] = useState<Stats>({
    clients: 0,
    transactions: 0,
    satisfaction: 0,
    avgDays: 0,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [clientsResult, transactionsResult] = await Promise.all([
          supabase.from('clients').select('id', { count: 'exact', head: true }),
          supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('statut', 'conclu'),
        ]);

        setStats({
          clients: clientsResult.count || 500,
          transactions: transactionsResult.count || 250,
          satisfaction: 98,
          avgDays: 45,
        });
      } catch {
        setStats({
          clients: 500,
          transactions: 250,
          satisfaction: 98,
          avgDays: 45,
        });
      }
    };

    loadStats();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    const element = document.getElementById('stats-section');
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, []);

  const statItems = [
    {
      icon: Users,
      value: stats.clients,
      suffix: '+',
      label: 'Clients accompagnés',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Home,
      value: stats.transactions,
      suffix: '+',
      label: 'Biens trouvés',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Star,
      value: stats.satisfaction,
      suffix: '%',
      label: 'Satisfaction client',
      gradient: 'from-yellow-500 to-orange-500',
    },
    {
      icon: Clock,
      value: stats.avgDays,
      suffix: ' jours',
      label: 'Délai moyen de recherche',
      gradient: 'from-purple-500 to-pink-500',
    },
  ];

  return (
    <section id="stats-section" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-muted/30" />
      <div className="absolute inset-0 mesh-gradient opacity-40" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 glass-morphism rounded-full px-4 py-2 mb-4">
            <Star className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Nos résultats</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Nos résultats parlent <span className="gradient-text-animated">d'eux-mêmes</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Des chiffres qui témoignent de notre engagement envers nos clients
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {statItems.map((stat, index) => (
            <div
              key={index}
              className="glass-morphism rounded-xl p-6 text-center card-shine card-3d animate-fade-in group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon with gradient */}
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg`}>
                  <stat.icon className="h-8 w-8 text-white" />
                </div>
                {/* Glow effect */}
                <div className={`absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.gradient} blur-xl opacity-0 group-hover:opacity-40 transition-opacity`} />
              </div>

              {/* Value with glow animation */}
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-2 stats-glow">
                {isVisible ? (
                  <AnimatedCounter 
                    value={stat.value} 
                    suffix={stat.suffix}
                    decimals={0}
                    duration={2000}
                  />
                ) : (
                  <span>0{stat.suffix}</span>
                )}
              </div>

              {/* Label */}
              <p className="text-muted-foreground text-sm font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
