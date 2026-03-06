import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Rocket } from 'lucide-react';

const zoneOptions = [
  { value: 'Genève', label: 'Genève' },
  { value: 'Lausanne', label: 'Lausanne' },
  { value: 'Nyon', label: 'Nyon' },
  { value: 'Morges', label: 'Morges' },
  { value: 'Vevey-Montreux', label: 'Vevey / Montreux' },
  { value: 'Fribourg', label: 'Fribourg' },
  { value: 'Neuchâtel', label: 'Neuchâtel' },
  { value: 'Autre', label: 'Autre région' },
];

const budgetOptions = [
  { value: '< 1500', label: 'Moins de 1\'500 CHF' },
  { value: '1500-2000', label: '1\'500 - 2\'000 CHF' },
  { value: '2000-2500', label: '2\'000 - 2\'500 CHF' },
  { value: '2500-3000', label: '2\'500 - 3\'000 CHF' },
  { value: '3000-4000', label: '3\'000 - 4\'000 CHF' },
  { value: '> 4000', label: 'Plus de 4\'000 CHF' },
];

const permisOptions = [
  { value: 'Suisse', label: 'Nationalité Suisse' },
  { value: 'C', label: 'Permis C' },
  { value: 'B', label: 'Permis B' },
  { value: 'G', label: 'Permis G' },
  { value: 'Autre', label: 'Autre' },
];

export function PremiumHero() {
  const navigate = useNavigate();
  const [zone, setZone] = useState('');
  const [budget, setBudget] = useState('');
  const [permis, setPermis] = useState('');

  const handleSubmit = () => {
    // Only include non-empty params — URLSearchParams handles encoding
    const params = new URLSearchParams();
    if (zone) params.set('zone', zone);
    if (budget) params.set('budget', budget);
    if (permis) params.set('permis', permis);
    const qs = params.toString();
    navigate(`/nouveau-mandat${qs ? '?' + qs : ''}`);
  };

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.05)_0%,transparent_50%)]" />

      <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Eyebrow */}
          <p className="text-xs sm:text-sm tracking-widest uppercase text-primary font-medium">
            Recherche locative accompagnée en Suisse romande
          </p>

          {/* H1 */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
            Trouvez votre logement,{' '}
            <span className="text-primary">sans stress</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
            On cherche, on filtre, on négocie pour vous. Vous recevez uniquement des biens qui correspondent à vos critères.
          </p>

          {/* Social proof bar */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-muted-foreground">
            <span>+500 familles accompagnées</span>
            <span className="hidden sm:inline text-border">·</span>
            <span>4.8★ Google</span>
            <span className="hidden sm:inline text-border">·</span>
            <span>Réponse sous 24h</span>
            <span className="hidden sm:inline text-border">·</span>
            <span>90 jours ou remboursé</span>
          </div>

          {/* Mini-form — ultra lightweight: 3 selects + CTA */}
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 sm:p-6 shadow-lg shadow-primary/5 max-w-2xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger className="h-11 bg-background border-border/50">
                  <SelectValue placeholder="Zone" />
                </SelectTrigger>
                <SelectContent>
                  {zoneOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={budget} onValueChange={setBudget}>
                <SelectTrigger className="h-11 bg-background border-border/50">
                  <SelectValue placeholder="Budget" />
                </SelectTrigger>
                <SelectContent>
                  {budgetOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={permis} onValueChange={setPermis}>
                <SelectTrigger className="h-11 bg-background border-border/50">
                  <SelectValue placeholder="Permis" />
                </SelectTrigger>
                <SelectContent>
                  {permisOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleSubmit}
              size="lg"
              className="w-full shadow-md shadow-primary/20 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground font-semibold text-base"
            >
              <Rocket className="h-5 w-5 mr-2" />
              Activer ma recherche
            </Button>

            <p className="text-xs text-muted-foreground mt-3">
              Gratuit · Sans engagement · Réponse sous 24h
            </p>
          </div>

          {/* Offer block */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Acompte 300 CHF</span>
            <span className="text-border">·</span>
            <span>Commission uniquement en cas de succès</span>
            <span className="text-border">·</span>
            <span>Remboursement si échec</span>
          </div>
        </div>
      </div>
    </section>
  );
}
