import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSearch, ArrowRight, ArrowLeft, CheckCircle, Loader2, User, Phone, Mail, MapPin, ShieldCheck, ClipboardCheck, Key, Home, Calendar, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { useUTMParams } from '@/hooks/useUTMParams';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { BorderBeam } from '@/components/public-site/magic/BorderBeam';
import { PhoneSlotPicker } from '@/components/landing/PhoneSlotPicker';
import type { Slot } from '@/lib/phoneSlots';
import heroCoupleKeys from '@/assets/hero-couple-keys.jpg';

const permisOptions = [
  { value: 'Suisse', label: 'Nationalité Suisse' },
  { value: 'C', label: 'Permis C (établissement)' },
  { value: 'B', label: 'Permis B (séjour)' },
  { value: 'G', label: 'Permis G (frontalier)' },
  { value: 'Autre', label: 'Autre permis' },
];

const typeBienOptions = [
  { value: 'appartement', label: 'Appartement' },
  { value: 'maison', label: 'Maison / Villa' },
  { value: 'immeuble', label: 'Immeuble de rendement' },
  { value: 'terrain', label: 'Terrain' },
];

const apportOptions = [
  { value: '< 100000', label: "Moins de 100'000 CHF" },
  { value: '100000-200000', label: "100'000 - 200'000 CHF" },
  { value: '200000-500000', label: "200'000 - 500'000 CHF" },
  { value: '> 500000', label: "Plus de 500'000 CHF" },
];

type Step = 'qualification' | 'coordonnees' | 'submitted';

export function DossierAnalyseSection() {
  const { searchType, isAchat, setSearchType } = useSearchType();
  const utmParams = useUTMParams();

  const [step, setStep] = useState<Step>('qualification');
  const [statutEmploi, setStatutEmploi] = useState('salarie');
  const [permisNationalite, setPermisNationalite] = useState('');
  const [confirmNoPoursuites, setConfirmNoPoursuites] = useState(true);
  const [accordBancaire, setAccordBancaire] = useState('');
  const [apportPersonnel, setApportPersonnel] = useState('');
  const [typeBien, setTypeBien] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [localite, setLocalite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const openForm = (type: 'location' | 'achat') => {
    setSearchType(type);
    setStep('qualification');
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const isQualificationValidLocation = statutEmploi && permisNationalite;
  const isQualificationValidAchat = accordBancaire && apportPersonnel;
  const isQualificationValid = isAchat ? isQualificationValidAchat : isQualificationValidLocation;
  const isCoordonneesValid = prenom.trim() && nom.trim() && email.trim() && telephone.trim() && !!selectedSlot;

  const handleAnalyser = () => {
    if (isQualificationValid) setStep('coordonnees');
  };

  const handleSubmit = async () => {
    if (!isCoordonneesValid || !selectedSlot) return;
    setIsSubmitting(true);
    let createdApptId: string | null = null;
    try {
      const apptId = crypto.randomUUID();
      const { error: apptErr } = await supabase
        .from('lead_phone_appointments')
        .insert({
          id: apptId,
          prospect_email: email.trim(),
          prospect_phone: telephone.trim(),
          prospect_name: `${prenom.trim()} ${nom.trim()}`.trim(),
          slot_start: selectedSlot.start.toISOString(),
          slot_end: selectedSlot.end.toISOString(),
          source_form: 'analyse_dossier',
        });

      if (apptErr) {
        if ((apptErr as any).code === '23505') {
          toast.error('Ce rendez-vous vient d\'être réservé. Choisis-en un autre.');
          setSelectedSlot(null);
        } else {
          throw apptErr;
        }
        setIsSubmitting(false);
        return;
      }
      createdApptId = apptId;

      let leadId = crypto.randomUUID();
      const leadPayload = {
        email: email.trim(), prenom: prenom.trim(), nom: nom.trim(), telephone: telephone.trim(),
        localite: localite.trim() || null, statut_emploi: isAchat ? null : statutEmploi,
        permis_nationalite: isAchat ? null : permisNationalite, poursuites: isAchat ? null : !confirmNoPoursuites,
        a_garant: false, is_qualified: true, source: 'landing_analyse_dossier',
        type_recherche: isAchat ? 'achat' : 'location',
        accord_bancaire: isAchat ? accordBancaire === 'oui' : null,
        apport_personnel: isAchat ? apportPersonnel : null, type_bien: isAchat ? typeBien : null,
        utm_source: utmParams.utm_source, utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign, utm_content: utmParams.utm_content, utm_term: utmParams.utm_term,
      };
      const { error } = await supabase.from('leads').insert({ id: leadId, ...leadPayload });
      if (error) {
        if ((error as any).code === '23505') {
          // Lead déjà existant pour ce formulaire — on récupère et on rafraîchit
          const { data: existing, error: selErr } = await supabase
            .from('leads')
            .select('id')
            .eq('email', email.trim())
            .eq('source', 'landing_analyse_dossier')
            .maybeSingle();
          if (selErr || !existing) throw error;
          leadId = (existing as any).id;
          await supabase.from('leads').update(leadPayload).eq('id', leadId);
        } else {
          throw error;
        }
      }

      await supabase
        .from('lead_phone_appointments')
        .update({ lead_id: leadId })
        .eq('id', apptId);

      supabase.functions.invoke('notify-new-lead', {
        body: {
          email: email.trim(), prenom: prenom.trim(), nom: nom.trim(), telephone: telephone.trim(),
          localite: localite.trim() || null, statut_emploi: isAchat ? null : statutEmploi,
          permis_nationalite: isAchat ? null : permisNationalite, poursuites: isAchat ? null : !confirmNoPoursuites,
          is_qualified: true, type_recherche: isAchat ? 'achat' : 'location',
          utm_source: utmParams.utm_source, utm_medium: utmParams.utm_medium, utm_campaign: utmParams.utm_campaign,
        },
      }).catch((err) => console.error('Notification error:', err));

      if ((window as any).fbq) {
        (window as any).fbq('track', 'Lead');
        console.log('[Meta Pixel] Lead fired on analyse dossier submission');
      }
      setStep('submitted');
    } catch (error) {
      console.error('Error submitting analyse dossier:', error);
      if (createdApptId) {
        await supabase
          .from('lead_phone_appointments')
          .update({ status: 'annule' })
          .eq('id', createdApptId)
          .then(undefined, () => {});
      }
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'submitted') {
    return (
      <section id="analyse-dossier" className="py-24 md:py-32 bg-gradient-to-b from-muted/30 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">Merci {prenom} ! 🎉</h3>
            <p className="text-muted-foreground">Un expert va analyser ton dossier et te contacter sous 24h pour un rendez-vous personnalisé.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="analyse-dossier" className="relative overflow-hidden bg-[hsl(30_15%_5%)]">
      {/* HERO conversion */}
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(38_45%_48%/0.12),transparent_55%),radial-gradient(ellipse_at_bottom_right,hsl(38_45%_48%/0.08),transparent_50%)]" />
        <div className="container mx-auto px-4 py-12 md:py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center max-w-7xl mx-auto">

            {/* Colonne texte */}
            <div className="flex flex-col gap-7 text-left animate-fade-in">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 w-fit px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                <span className="text-primary text-[10px] md:text-xs font-semibold tracking-[0.18em] uppercase">
                  Recherche d'appartement · Suisse Romande
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[hsl(40_30%_96%)] leading-[1.1]">
                  Nous aidons <span className="text-primary italic">nos clients</span> à trouver rapidement leur futur appartement en Suisse romande
                </h1>
                <p className="text-white/70 text-base md:text-lg max-w-xl leading-relaxed">
                  L'expertise Immo-rama.ch pour sécuriser ton dossier et emménager rapidement, partout en Suisse romande.
                </p>
              </div>

              {/* Trust cards translucides + gold blur */}
              <div className="relative grid sm:grid-cols-2 gap-4">
                <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full pointer-events-none" />
                <div className="relative p-4 rounded-xl bg-white/5 backdrop-blur-md border border-primary/20 shadow-lg">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Commission</p>
                  <p className="text-white text-lg font-semibold">1 mois de loyer brut</p>
                  <p className="text-white/70 text-xs mt-1">Acompte 300.- remboursé à 100% si échec après 3 mois</p>
                </div>
                <div className="relative p-4 rounded-xl bg-white/5 backdrop-blur-md border border-primary/20 shadow-lg">
                  <p className="text-primary text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Confiance</p>
                  <p className="text-white text-lg font-semibold">500+ familles</p>
                  <p className="text-white/60 text-xs mt-1">Accompagnées avec succès</p>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => openForm('location')}
                  className="group h-auto py-4 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.5)] hover:shadow-[0_10px_40px_-5px_hsl(var(--primary)/0.6)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                >
                  <Key className="h-5 w-5" />
                  <span className="text-base">Je cherche une location</span>
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => openForm('achat')}
                  className="group h-auto py-4 px-6 bg-transparent border border-primary/40 hover:border-primary/70 hover:bg-primary/5 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Home className="h-5 w-5 text-primary" />
                  <span className="text-base">Je veux acheter un bien</span>
                </Button>
              </div>

              {/* Bouton RDV gratuit */}
              <a
                href="/nouveau-mandat"
                className="group inline-flex items-center justify-center gap-2 h-auto py-3 px-5 bg-gradient-to-r from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 border border-primary/50 hover:border-primary text-primary font-semibold rounded-xl transition-all shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.4)] w-full sm:w-auto"
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-sm uppercase tracking-wide">Réserver mon RDV gratuit</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>

              <p className="text-white text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                Active ta recherche{' '}
                <a href="/nouveau-mandat" className="text-primary font-bold underline underline-offset-4 decoration-primary/60 hover:decoration-primary transition-colors">
                  MAINTENANT
                </a>{' '}
                et décroche ton bail.
              </p>
            </div>

            {/* Colonne image */}
            <div className="relative animate-fade-in" style={{ animationDelay: '120ms' }}>
              <div className="absolute -inset-6 bg-primary/15 blur-3xl rounded-full pointer-events-none" />
              <div className="relative overflow-hidden rounded-3xl border border-primary/20 shadow-2xl bg-card">
                <img
                  src={heroCoupleKeys}
                  alt="Couple heureux recevant les clés de leur appartement en Suisse romande grâce à Logisorama"
                  width={1024}
                  height={1024}
                  className="w-full aspect-[4/5] md:aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(30_15%_5%)] via-transparent to-transparent opacity-70" />

                {/* Floating card overlay */}
                <div className="absolute bottom-5 left-5 right-5 p-4 bg-black/40 backdrop-blur-md border border-primary/20 rounded-2xl flex items-center gap-4 shadow-xl">
                  <div className="flex -space-x-2">
                    <div className="w-9 h-9 rounded-full border-2 border-black bg-gradient-to-br from-primary/60 to-primary/30" />
                    <div className="w-9 h-9 rounded-full border-2 border-black bg-gradient-to-br from-primary/40 to-primary/20" />
                    <div className="w-9 h-9 rounded-full border-2 border-black bg-gradient-to-br from-primary/30 to-primary/10" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-0.5">RDV gratuit</p>
                    <p className="text-xs md:text-sm text-white/90 font-medium leading-tight">
                      Réserve ton rendez-vous avec nos experts
                    </p>
                  </div>
                </div>

                {/* Decorative gold line */}
                <div className="absolute top-6 left-6 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-primary/30">
                  <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Bureau de Crissier</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="bg-gradient-to-b from-[hsl(30_15%_8%)] to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--primary)/0.06)_0%,transparent_60%)]" />
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-3xl mx-auto">


          {searchType && (
            <>
              <h2 ref={formRef} className="text-center text-lg md:text-xl font-semibold text-[hsl(40_30%_96%)] mb-6 max-w-2xl mx-auto scroll-mt-24">
                <span className="text-primary font-bold">Étape 1</span> — Qualifie ton dossier en 30 secondes, puis choisis ton rendez-vous au bureau.
              </h2>
            <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl border border-[hsl(38_45%_48%/0.2)] shadow-lg p-6 md:p-8 overflow-hidden">
            <BorderBeam duration={10} />
              <div className="flex justify-center gap-2 mb-6">
                {['qualification', 'coordonnees'].map((s, i) => (
                  <div key={s} className={`h-2 w-20 rounded-full transition-colors ${(step === 'qualification' && i === 0) || step === 'coordonnees' ? 'bg-primary' : 'bg-muted'}`} />
                ))}
              </div>

              {step === 'qualification' && (
                <div className="space-y-5 animate-fade-in">
                  <p className="text-sm font-medium text-center text-white/70 mb-2">
                    {isAchat ? "Réponds à ces questions pour ton projet d'achat" : 'Réponds à ces questions pour ton dossier de location'}
                  </p>


                  {!isAchat && (
                    <>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Es-tu salarié(e) ?</Label>
                        <RadioGroup value={statutEmploi} onValueChange={setStatutEmploi} className="flex gap-4">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="salarie" id="ps-analyse-salarie" /><Label htmlFor="ps-analyse-salarie" className="cursor-pointer">Oui, salarié(e)</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="autre" id="ps-analyse-autre" /><Label htmlFor="ps-analyse-autre" className="cursor-pointer">Non</Label></div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Quel est ton permis ou nationalité ?</Label>
                        <Select value={permisNationalite} onValueChange={setPermisNationalite}>
                          <SelectTrigger className="h-14 bg-background/80 border-border/50 focus:border-primary"><SelectValue placeholder="Sélectionne ton permis/nationalité" /></SelectTrigger>
                          <SelectContent>{permisOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3 p-4 rounded-xl bg-success/5 border border-success/20">
                        <div className="flex items-start space-x-3">
                          <Checkbox id="ps-analyse-no-poursuites" checked={confirmNoPoursuites} onCheckedChange={(checked) => setConfirmNoPoursuites(checked as boolean)} className="mt-1" />
                          <div className="space-y-1">
                            <Label htmlFor="ps-analyse-no-poursuites" className="text-base font-medium cursor-pointer flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" />Je confirme n'avoir aucune poursuite</Label>
                            <p className="text-xs text-muted-foreground">Ni actes de défaut de bien en cours</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {isAchat && (
                    <>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">As-tu obtenu un accord de principe bancaire ?</Label>
                        <RadioGroup value={accordBancaire} onValueChange={setAccordBancaire} className="flex gap-4">
                          <div className="flex items-center space-x-2"><RadioGroupItem value="oui" id="ps-accord-oui" /><Label htmlFor="ps-accord-oui" className="cursor-pointer">Oui</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="non" id="ps-accord-non" /><Label htmlFor="ps-accord-non" className="cursor-pointer">Non / Pas encore</Label></div>
                        </RadioGroup>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Quel est ton apport personnel disponible ?</Label>
                        <Select value={apportPersonnel} onValueChange={setApportPersonnel}>
                          <SelectTrigger className="h-14 bg-background/80 border-border/50 focus:border-primary"><SelectValue placeholder="Sélectionne ton apport" /></SelectTrigger>
                          <SelectContent>{apportOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Quel type de bien recherches-tu ?</Label>
                        <Select value={typeBien} onValueChange={setTypeBien}>
                          <SelectTrigger className="h-14 bg-background/80 border-border/50 focus:border-primary"><SelectValue placeholder="Sélectionne le type de bien" /></SelectTrigger>
                          <SelectContent>{typeBienOptions.map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  <Button size="lg" className="w-full text-base font-semibold shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all" onClick={handleAnalyser} disabled={!isQualificationValid}>
                    <ClipboardCheck className="mr-2 h-5 w-5" />Analyser mon dossier<ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}

              {step === 'coordonnees' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="text-center mb-2">
                    <p className="text-sm font-medium text-primary">✅ Informations reçues !</p>
                    <p className="text-muted-foreground text-sm mt-1">Nos experts analysent ton dossier et te recontactent pour un rendez-vous personnalisé</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" />Prénom *</Label>
                      <Input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ton prénom" className="h-14 bg-background/80 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted-foreground" />Nom *</Label>
                      <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ton nom" className="h-14 bg-background/80 border-border/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground" />Email *</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.ch" className="h-14 bg-background/80 border-border/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />Téléphone *</Label>
                    <Input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+41 79 000 00 00" className="h-14 bg-background/80 border-border/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />Localité souhaitée</Label>
                    <Input value={localite} onChange={(e) => setLocalite(e.target.value)} placeholder="Ex: Lausanne, Genève..." className="h-14 bg-background/80 border-border/50" />
                  </div>
                  <div className="pt-4 border-t border-border/40">
                    <PhoneSlotPicker selected={selectedSlot} onSelect={setSelectedSlot} />
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" size="lg" className="flex-shrink-0" onClick={() => setStep('qualification')}><ArrowLeft className="h-4 w-4" /></Button>
                    <Button size="lg" className="flex-1 text-base font-semibold shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all" onClick={handleSubmit} disabled={!isCoordonneesValid || isSubmitting}>
                      {isSubmitting ? (<><Loader2 className="mr-2 h-5 w-5 animate-spin" />Envoi en cours...</>) : (<>Envoyer pour analyse<ArrowRight className="ml-2 h-5 w-5" /></>)}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            </>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}
