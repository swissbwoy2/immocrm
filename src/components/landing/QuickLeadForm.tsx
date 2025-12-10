import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MapPin, Wallet, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const budgetOptions = [
  { value: '< 1500', label: 'Moins de 1\'500 CHF' },
  { value: '1500-2000', label: '1\'500 - 2\'000 CHF' },
  { value: '2000-2500', label: '2\'000 - 2\'500 CHF' },
  { value: '2500-3000', label: '2\'500 - 3\'000 CHF' },
  { value: '3000-4000', label: '3\'000 - 4\'000 CHF' },
  { value: '> 4000', label: 'Plus de 4\'000 CHF' },
];

export function QuickLeadForm() {
  const [email, setEmail] = useState('');
  const [localite, setLocalite] = useState('');
  const [budget, setBudget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          email,
          localite: localite || null,
          budget: budget || null,
          source: 'landing_quickform'
        });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success('Merci ! Nous vous contacterons très bientôt.');
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <section className="py-8 md:py-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4 animate-fade-in">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2 animate-fade-in">
              Merci pour ta demande ! 🎉
            </h3>
            <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '100ms' }}>
              Notre équipe analyse ton profil et te contactera sous 24h avec une première sélection de biens.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-primary/5 to-background relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08)_0%,transparent_50%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 animate-fade-in">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              Reçois une shortlist personnalisée 📬
            </h3>
            <p className="text-sm text-muted-foreground">
              Gratuit • Sans engagement • Réponse sous 24h
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Ton email *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-background/80 border-border/50 focus:border-primary"
                  required
                />
              </div>

              {/* Localité */}
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="text"
                  placeholder="Localité souhaitée"
                  value={localite}
                  onChange={(e) => setLocalite(e.target.value)}
                  className="pl-10 h-12 bg-background/80 border-border/50 focus:border-primary"
                />
              </div>

              {/* Budget */}
              <div className="relative">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Select value={budget} onValueChange={setBudget}>
                  <SelectTrigger className="pl-10 h-12 bg-background/80 border-border/50 focus:border-primary">
                    <SelectValue placeholder="Budget mensuel" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit button */}
            <div className="flex justify-center">
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="group px-8 py-6 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    Recevoir ma shortlist gratuite
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Trust micro-copy */}
          <p className="text-center text-xs text-muted-foreground mt-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            🔒 Tes données restent confidentielles • Pas de spam
          </p>
        </div>
      </div>
    </section>
  );
}
