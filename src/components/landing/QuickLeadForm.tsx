import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, MapPin, Wallet, ArrowRight, ArrowLeft, CheckCircle, Loader2, User, Phone, XCircle, Clock, ShieldCheck, Home, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { useUTMParams } from '@/hooks/useUTMParams';

// Budget options for RENTAL
const budgetOptionsLocation = [
  { value: '< 1500', label: 'Moins de 1\'500 CHF' },
  { value: '1500-2000', label: '1\'500 - 2\'000 CHF' },
  { value: '2000-2500', label: '2\'000 - 2\'500 CHF' },
  { value: '2500-3000', label: '2\'500 - 3\'000 CHF' },
  { value: '3000-4000', label: '3\'000 - 4\'000 CHF' },
  { value: '> 4000', label: 'Plus de 4\'000 CHF' },
];

// Budget options for PURCHASE
const budgetOptionsAchat = [
  { value: '< 500000', label: 'Moins de 500\'000 CHF' },
  { value: '500000-750000', label: '500\'000 - 750\'000 CHF' },
  { value: '750000-1000000', label: '750\'000 - 1\'000\'000 CHF' },
  { value: '1000000-1500000', label: '1\'000\'000 - 1\'500\'000 CHF' },
  { value: '1500000-2000000', label: '1\'500\'000 - 2\'000\'000 CHF' },
  { value: '> 2000000', label: 'Plus de 2\'000\'000 CHF' },
];

// Optimized order: qualified permits first
const permisOptions = [
  { value: 'Suisse', label: 'Nationalité Suisse' },
  { value: 'C', label: 'Permis C (établissement)' },
  { value: 'B', label: 'Permis B (séjour)' },
  { value: 'G', label: 'Permis G (frontalier)' },
  { value: 'Autre', label: 'Autre permis' },
];

// Property types for purchase
const typeBienOptions = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison', label: 'Maison / Villa' },
  { value: 'immeuble', label: 'Immeuble de rendement' },
  { value: 'terrain', label: 'Terrain' },
];

// Apport personnel options
const apportOptions = [
  { value: '< 100000', label: 'Moins de 100\'000 CHF' },
  { value: '100000-200000', label: '100\'000 - 200\'000 CHF' },
  { value: '200000-500000', label: '200\'000 - 500\'000 CHF' },
  { value: '> 500000', label: 'Plus de 500\'000 CHF' },
];

type FormStep = 'qualification' | 'info' | 'garant';

export function QuickLeadForm() {
  const navigate = useNavigate();
  const { searchType, isAchat } = useSearchType();
  const utmParams = useUTMParams();
  
  // Step order changed: qualification FIRST, then personal info
  const [step, setStep] = useState<FormStep>('qualification');
  
  // Step 1 - Qualification LOCATION
  const [statutEmploi, setStatutEmploi] = useState<string>('salarie');
  const [permisNationalite, setPermisNationalite] = useState('');
  const [confirmNoPoursuites, setConfirmNoPoursuites] = useState(true);
  const [aGarant, setAGarant] = useState<string>('');
  
  // Step 1 - Qualification ACHAT
  const [accordBancaire, setAccordBancaire] = useState<string>('');
  const [apportPersonnel, setApportPersonnel] = useState('');
  const [typeBien, setTypeBien] = useState('');
  
  // Step 2 - Personal info
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [localite, setLocalite] = useState('');
  const [budget, setBudget] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<'qualified' | 'not_qualified' | null>(null);

  // Validation for each step
  const isQualificationValidLocation = statutEmploi && permisNationalite;
  const isQualificationValidAchat = accordBancaire && apportPersonnel;
  const isQualificationValid = isAchat ? isQualificationValidAchat : isQualificationValidLocation;
  const isInfoValid = prenom.trim() && email.trim() && telephone.trim();

  const calculateQualification = () => {
    if (isAchat) {
      // For purchase: need bank agreement or significant apport
      const hasAccord = accordBancaire === 'oui';
      const hasGoodApport = ['200000-500000', '> 500000'].includes(apportPersonnel);
      return hasAccord || hasGoodApport;
    } else {
      // For rental
      const isSalarie = statutEmploi === 'salarie';
      const hasValidPermis = ['B', 'C', 'Suisse'].includes(permisNationalite);
      const hasPoursuites = !confirmNoPoursuites;
      const hasGarant = aGarant === 'oui';
      
      return isSalarie && hasValidPermis && (!hasPoursuites || (hasPoursuites && hasGarant));
    }
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
          nom: '',
          telephone: telephone.trim(),
          localite: localite || null,
          budget: budget || null,
          statut_emploi: isAchat ? null : statutEmploi,
          permis_nationalite: isAchat ? null : permisNationalite,
          poursuites: isAchat ? null : !confirmNoPoursuites,
          a_garant: isAchat ? null : (aGarant === 'oui'),
          is_qualified: isQualified,
          source: isAchat ? 'landing_quickform_achat' : 'landing_quickform',
          type_recherche: isAchat ? 'achat' : 'location',
          accord_bancaire: isAchat ? (accordBancaire === 'oui') : null,
          apport_personnel: isAchat ? apportPersonnel : null,
          type_bien: isAchat ? typeBien : null,
          utm_source: utmParams.utm_source,
          utm_medium: utmParams.utm_medium,
          utm_campaign: utmParams.utm_campaign,
          utm_content: utmParams.utm_content,
          utm_term: utmParams.utm_term,
        });

      if (error) throw error;

      // Send email notification (fire and forget)
      supabase.functions.invoke('notify-new-lead', {
        body: { 
          email, 
          prenom: prenom.trim(),
          nom: '',
          telephone: telephone.trim(),
          localite: localite || null, 
          budget: budget || null,
          statut_emploi: isAchat ? null : statutEmploi,
          permis_nationalite: isAchat ? null : permisNationalite,
          poursuites: isAchat ? null : !confirmNoPoursuites,
          a_garant: isAchat ? null : (aGarant === 'oui'),
          is_qualified: isQualified,
          type_recherche: isAchat ? 'achat' : 'location',
          utm_source: utmParams.utm_source,
          utm_medium: utmParams.utm_medium,
          utm_campaign: utmParams.utm_campaign,
        }
      }).catch((err) => console.error('Email notification error:', err));

      setSubmitResult(isQualified ? 'qualified' : 'not_qualified');

      if (isQualified) {
        // Meta Pixel Lead conversion -- fired on qualified quick lead form submission
        if ((window as any).fbq) {
          (window as any).fbq('track', 'Lead');
          console.log('[Meta Pixel] Lead fired on qualified quick lead form submission');
        }
        navigate('/test-24h-active');
        return;
      }
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 'qualification' && isQualificationValid) {
      if (!isAchat && !confirmNoPoursuites) {
        setStep('garant');
      } else {
        setStep('info');
      }
    } else if (step === 'garant') {
      if (aGarant === 'non') {
        setSubmitResult('not_qualified');
      } else if (aGarant === 'oui') {
        setStep('info');
      }
    } else if (step === 'info' && isInfoValid) {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step === 'info') {
      if (!isAchat && !confirmNoPoursuites) {
        setStep('garant');
      } else {
        setStep('qualification');
      }
    } else if (step === 'garant') {
      setStep('qualification');
    }
  };

  const budgetOptions = isAchat ? budgetOptionsAchat : budgetOptionsLocation;

  if (submitResult === 'qualified') {
    return (
      <section id="quickform" className="py-8 md:py-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4 animate-fade-in">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2 animate-fade-in">
              Félicitations {prenom} ! 🎉
            </h3>
            <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '100ms' }}>
              {isAchat 
                ? "Ton profil est qualifié ! Notre équipe analyse ta demande et te contactera sous 24h avec une sélection de biens correspondant à tes critères d'achat."
                : "Ton profil est qualifié ! Notre équipe analyse ta demande et te contactera sous 24h avec une sélection personnalisée de biens correspondant à tes critères."
              }
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (submitResult === 'not_qualified') {
    return (
      <section id="quickform" className="py-8 md:py-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/20 mb-4 animate-fade-in">
              <XCircle className="h-8 w-8 text-orange-500" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2 animate-fade-in">
              Merci pour ton intérêt{prenom ? `, ${prenom}` : ''}
            </h3>
            <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '100ms' }}>
              {isAchat 
                ? "Pour bénéficier de notre service d'accompagnement à l'achat, il faut avoir un accord de principe bancaire ou un apport personnel conséquent (200k+ CHF). N'hésite pas à nous recontacter quand tu auras ces éléments !"
                : "Malheureusement, ton profil ne correspond pas à nos critères actuels pour bénéficier de notre service de shortlist. Pour être éligible, il faut être salarié(e), avoir un permis B, C ou la nationalité suisse, et ne pas avoir de poursuites (sauf si tu as un garant solvable)."
              }
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
    <section id="quickform" className="py-8 md:py-12 bg-gradient-to-b from-primary/5 to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08)_0%,transparent_50%)]" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 animate-fade-in">
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              {isAchat ? 'Reçois ta sélection de biens à acheter 🏡' : 'Reçois ta shortlist personnalisée 📬'}
            </h3>
            <p className="text-sm text-muted-foreground">
              Gratuit • Sans engagement • Réponse sous 24h
            </p>
            
            {/* Time indicator */}
            <div className="inline-flex items-center gap-2 mt-3 text-xs text-primary bg-primary/10 rounded-full px-3 py-1.5">
              <Clock className="h-3 w-3" />
              <span>Réponds en 30 secondes</span>
            </div>
            
            {/* Progress indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {['qualification', 'info'].map((s, i) => {
                const stepIndex = step === 'garant' ? 0.5 : ['qualification', 'info'].indexOf(step);
                return (
                  <div 
                    key={s}
                    className={`h-2 w-16 rounded-full transition-colors ${
                      stepIndex >= i ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Step 1: Qualification LOCATION */}
          {step === 'qualification' && !isAchat && (
            <div className="space-y-5 animate-fade-in">
              {/* Employment status */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Es-tu salarié(e) ?</Label>
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
                <Label className="text-base font-medium">Quel est ton permis ou nationalité ?</Label>
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

              {/* Poursuites - POSITIVE FRAMING */}
              <div className="space-y-3 p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="no-poursuites" 
                    checked={confirmNoPoursuites}
                    onCheckedChange={(checked) => setConfirmNoPoursuites(checked as boolean)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label htmlFor="no-poursuites" className="text-base font-medium cursor-pointer flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-500" />
                      Je confirme n'avoir aucune poursuite
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ni actes de défaut de bien en cours
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Qualification ACHAT */}
          {step === 'qualification' && isAchat && (
            <div className="space-y-5 animate-fade-in">
              {/* Accord bancaire */}
              <div className="space-y-3">
                <Label className="text-base font-medium">As-tu obtenu un accord de principe bancaire ?</Label>
                <RadioGroup value={accordBancaire} onValueChange={setAccordBancaire} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="oui" id="accord-oui" />
                    <Label htmlFor="accord-oui" className="cursor-pointer">Oui</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="non" id="accord-non" />
                    <Label htmlFor="accord-non" className="cursor-pointer">Non / Pas encore</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Apport personnel */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Quel est ton apport personnel disponible ?</Label>
                <Select value={apportPersonnel} onValueChange={setApportPersonnel}>
                  <SelectTrigger className="h-12 bg-background/80 border-border/50 focus:border-primary">
                    <SelectValue placeholder="Sélectionne ton apport" />
                  </SelectTrigger>
                  <SelectContent>
                    {apportOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type de bien */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Quel type de bien recherches-tu ?</Label>
                <Select value={typeBien} onValueChange={setTypeBien}>
                  <SelectTrigger className="h-12 bg-background/80 border-border/50 focus:border-primary">
                    <SelectValue placeholder="Sélectionne le type de bien" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeBienOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.value === 'appartement' && <Building className="h-4 w-4" />}
                          {option.value === 'maison' && <Home className="h-4 w-4" />}
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Info box for achat */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">0% de commission pour l'acheteur</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      La commission est payée par le vendeur. Tu ne paies rien de plus que le prix du bien.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step Garant (only for location with poursuites) */}
          {step === 'garant' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Tu as indiqué avoir des poursuites ou actes de défaut de bien. Pour pouvoir bénéficier de notre service, il te faut un garant solvable.
                </p>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-medium">As-tu un garant solvable ?</Label>
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

          {/* Step 2: Personal Info */}
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
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="Téléphone * (pour te recontacter sous 24h)"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="pl-10 h-12 bg-background/80 border-border/50 focus:border-primary"
                  required
                />
              </div>
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
                      <SelectValue placeholder={isAchat ? "Budget d'achat" : "Budget mensuel"} />
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

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            {step !== 'qualification' ? (
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
                (step === 'qualification' && !isQualificationValid) ||
                (step === 'garant' && aGarant === '') ||
                (step === 'info' && !isInfoValid)
              }
              onClick={handleNext}
              className="group px-8 py-6 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Envoi en cours...
                </>
              ) : step === 'info' ? (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  {isAchat ? 'Recevoir ma sélection' : 'Recevoir ma shortlist'}
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>

          {/* Privacy notice */}
          <p className="text-xs text-center text-muted-foreground mt-4">
            🔒 Tes données sont protégées et ne seront jamais partagées.{' '}
            <a href="/politique-confidentialite" className="underline hover:text-foreground">
              Politique de confidentialité
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
