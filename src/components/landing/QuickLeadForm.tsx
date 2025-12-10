import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Mail, MapPin, Wallet, ArrowRight, ArrowLeft, CheckCircle, Loader2, User, Phone, XCircle } from 'lucide-react';
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

const permisOptions = [
  { value: 'Suisse', label: 'Nationalité Suisse' },
  { value: 'C', label: 'Permis C' },
  { value: 'B', label: 'Permis B' },
  { value: 'Autre', label: 'Autre permis' },
];

type FormStep = 'info' | 'search' | 'qualification' | 'garant';

export function QuickLeadForm() {
  const [step, setStep] = useState<FormStep>('info');
  
  // Step 1 - Personal info
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  
  // Step 2 - Search criteria
  const [localite, setLocalite] = useState('');
  const [budget, setBudget] = useState('');
  
  // Step 3 - Qualification
  const [statutEmploi, setStatutEmploi] = useState<string>('');
  const [permisNationalite, setPermisNationalite] = useState('');
  const [poursuites, setPoursuites] = useState<string>('');
  const [aGarant, setAGarant] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<'qualified' | 'not_qualified' | null>(null);

  const isStep1Valid = prenom.trim() && nom.trim() && email.trim() && telephone.trim();
  const isStep3Valid = statutEmploi && permisNationalite && poursuites !== '';

  const calculateQualification = () => {
    const isSalarie = statutEmploi === 'salarie';
    const hasValidPermis = ['B', 'C', 'Suisse'].includes(permisNationalite);
    const hasPoursuites = poursuites === 'oui';
    const hasGarant = aGarant === 'oui';
    
    return isSalarie && hasValidPermis && (!hasPoursuites || (hasPoursuites && hasGarant));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const isQualified = calculateQualification();
    
    try {
      const { error } = await supabase
        .from('leads')
        .insert({
          email,
          prenom: prenom.trim(),
          nom: nom.trim(),
          telephone: telephone.trim(),
          localite: localite || null,
          budget: budget || null,
          statut_emploi: statutEmploi,
          permis_nationalite: permisNationalite,
          poursuites: poursuites === 'oui',
          a_garant: aGarant === 'oui',
          is_qualified: isQualified,
          source: 'landing_quickform'
        });

      if (error) throw error;

      // Send email notification (fire and forget)
      supabase.functions.invoke('notify-new-lead', {
        body: { 
          email, 
          prenom: prenom.trim(),
          nom: nom.trim(),
          telephone: telephone.trim(),
          localite: localite || null, 
          budget: budget || null,
          statut_emploi: statutEmploi,
          permis_nationalite: permisNationalite,
          poursuites: poursuites === 'oui',
          a_garant: aGarant === 'oui',
          is_qualified: isQualified
        }
      }).catch((err) => console.error('Email notification error:', err));

      setSubmitResult(isQualified ? 'qualified' : 'not_qualified');
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 'info' && isStep1Valid) {
      setStep('search');
    } else if (step === 'search') {
      setStep('qualification');
    } else if (step === 'qualification' && isStep3Valid) {
      if (poursuites === 'oui') {
        setStep('garant');
      } else {
        handleSubmit();
      }
    } else if (step === 'garant' && aGarant !== '') {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step === 'search') setStep('info');
    else if (step === 'qualification') setStep('search');
    else if (step === 'garant') setStep('qualification');
  };

  if (submitResult === 'qualified') {
    return (
      <section className="py-8 md:py-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4 animate-fade-in">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2 animate-fade-in">
              Félicitations {prenom} ! 🎉
            </h3>
            <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '100ms' }}>
              Ton profil est qualifié ! Notre équipe analyse ta demande et te contactera sous 24h avec une sélection personnalisée de biens correspondant à tes critères.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (submitResult === 'not_qualified') {
    return (
      <section className="py-8 md:py-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 mb-4 animate-fade-in">
              <XCircle className="h-8 w-8 text-orange-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2 animate-fade-in">
              Merci pour ton intérêt, {prenom}
            </h3>
            <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '100ms' }}>
              Malheureusement, ton profil ne correspond pas à nos critères actuels pour bénéficier de notre service de shortlist. Pour être éligible, il faut être salarié(e), avoir un permis B, C ou la nationalité suisse, et ne pas avoir de poursuites (sauf si tu as un garant solvable).
            </p>
            <p className="text-muted-foreground mt-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
              N'hésite pas à nous recontacter si ta situation évolue !
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 md:py-12 bg-gradient-to-b from-primary/5 to-background relative overflow-hidden">
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
            {/* Progress indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {['info', 'search', 'qualification'].map((s, i) => (
                <div 
                  key={s}
                  className={`h-2 w-12 rounded-full transition-colors ${
                    ['info', 'search', 'qualification', 'garant'].indexOf(step) >= i 
                      ? 'bg-primary' 
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Step 1: Personal Info */}
          {step === 'info' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Prénom *"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    className="pl-10 h-12 bg-background/80 border-border/50 focus:border-primary"
                    required
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Nom *"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="pl-10 h-12 bg-background/80 border-border/50 focus:border-primary"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-background/80 border-border/50 focus:border-primary"
                    required
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Téléphone *"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="pl-10 h-12 bg-background/80 border-border/50 focus:border-primary"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Search Criteria */}
          {step === 'search' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
            </div>
          )}

          {/* Step 3: Qualification */}
          {step === 'qualification' && (
            <div className="space-y-6 animate-fade-in">
              {/* Employment status */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Es-tu salarié(e) ? *</Label>
                <RadioGroup value={statutEmploi} onValueChange={setStatutEmploi} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="salarie" id="salarie" />
                    <Label htmlFor="salarie" className="cursor-pointer">Oui, salarié(e)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="autre" id="autre" />
                    <Label htmlFor="autre" className="cursor-pointer">Non</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Permit/Nationality */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Quel est ton permis ou nationalité ? *</Label>
                <Select value={permisNationalite} onValueChange={setPermisNationalite}>
                  <SelectTrigger className="h-12 bg-background/80 border-border/50 focus:border-primary">
                    <SelectValue placeholder="Sélectionne ton permis/nationalité" />
                  </SelectTrigger>
                  <SelectContent>
                    {permisOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Poursuites */}
              <div className="space-y-3">
                <Label className="text-base font-medium">As-tu des poursuites ou actes de défaut de bien ? *</Label>
                <RadioGroup value={poursuites} onValueChange={setPoursuites} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non" id="poursuites-non" />
                    <Label htmlFor="poursuites-non" className="cursor-pointer">Non</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="oui" id="poursuites-oui" />
                    <Label htmlFor="poursuites-oui" className="cursor-pointer">Oui</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Step 4: Garant (only if poursuites = oui) */}
          {step === 'garant' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Tu as indiqué avoir des poursuites ou actes de défaut de bien. Pour pouvoir bénéficier de notre service, il te faut un garant solvable.
                </p>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-medium">As-tu un garant solvable ? *</Label>
                <RadioGroup value={aGarant} onValueChange={setAGarant} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="oui" id="garant-oui" />
                    <Label htmlFor="garant-oui" className="cursor-pointer">Oui</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non" id="garant-non" />
                    <Label htmlFor="garant-non" className="cursor-pointer">Non</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            {step !== 'info' ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            ) : (
              <div />
            )}
            
            <Button
              type="button"
              size="lg"
              disabled={
                isSubmitting || 
                (step === 'info' && !isStep1Valid) ||
                (step === 'qualification' && !isStep3Valid) ||
                (step === 'garant' && aGarant === '')
              }
              onClick={handleNext}
              className="group px-8 py-6 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : step === 'qualification' && poursuites !== 'oui' ? (
                <>
                  Recevoir ma shortlist
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              ) : step === 'garant' ? (
                <>
                  Recevoir ma shortlist
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>

          {/* Trust micro-copy */}
          <p className="text-center text-xs text-muted-foreground mt-4 animate-fade-in">
            🔒 Tes données restent confidentielles • Pas de spam
          </p>
        </div>
      </div>
    </section>
  );
}
