import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSearch, ArrowRight, ArrowLeft, CheckCircle, Loader2, User, Phone, Mail, MapPin, ShieldCheck, ClipboardCheck, Key, Home, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { useUTMParams } from '@/hooks/useUTMParams';
import { ScrollReveal } from '@/components/public-site/animations/ScrollReveal';
import { BorderBeam } from '@/components/public-site/magic/BorderBeam';
import { CinematicHero } from '@/components/ui/cinematic-hero';
import { PhoneSlotPicker } from '@/components/landing/PhoneSlotPicker';
import type { Slot } from '@/lib/phoneSlots';

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
          toast.error('Ce créneau vient d\'être réservé. Choisis-en un autre.');
          setSelectedSlot(null);
        } else {
          throw apptErr;
        }
        setIsSubmitting(false);
        return;
      }
      createdApptId = apptId;

      const leadId = crypto.randomUUID();
      const { error } = await supabase.from('leads').insert({
        id: leadId,
        email: email.trim(), prenom: prenom.trim(), nom: nom.trim(), telephone: telephone.trim(),
        localite: localite.trim() || null, statut_emploi: isAchat ? null : statutEmploi,
        permis_nationalite: isAchat ? null : permisNationalite, poursuites: isAchat ? null : !confirmNoPoursuites,
        a_garant: false, is_qualified: true, source: 'landing_analyse_dossier',
        type_recherche: isAchat ? 'achat' : 'location',
        accord_bancaire: isAchat ? accordBancaire === 'oui' : null,
        apport_personnel: isAchat ? apportPersonnel : null, type_bien: isAchat ? typeBien : null,
        utm_source: utmParams.utm_source, utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign, utm_content: utmParams.utm_content, utm_term: utmParams.utm_term,
      });
      if (error) throw error;

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
    <section id="analyse-dossier" className="relative overflow-hidden">
      <CinematicHero
        brandName="Bureau de Crissier · Analyse gratuite"
        tagline1="Fais analyser ton dossier"
        tagline2="gratuitement avant tes candidatures"
        cardHeading="Analyse personnalisée de ton dossier"
        cardDescription="Nos experts te disent ce qui joue en ta faveur, ce qui bloque tes candidatures, comment l'améliorer et quels logements viser. Objectif : maximiser tes chances rapidement."
        metricValue="500+"
        metricLabel="familles accompagnées avec succès"
        ctaHeading="Réserve ton analyse gratuite"
        ctaDescription="30 min · Bureau de Crissier · Sans engagement"
      >
        <div className="text-xs text-[hsl(40_20%_50%)] border-t border-[hsl(38_45%_48%/0.15)] pt-3 mt-3">
          👇 Choisis ton projet ci-dessous
        </div>
      </CinematicHero>

      <div className="bg-gradient-to-b from-[hsl(30_15%_8%)] to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--primary)/0.06)_0%,transparent_60%)]" />
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-3xl mx-auto">

          {/* Phrase de conversion */}
          <p className="text-center text-base md:text-lg font-semibold text-foreground max-w-2xl mx-auto mb-6 animate-fade-in">
            Ne laisse plus ton dossier être refusé sans comprendre pourquoi.<br className="hidden sm:inline" />
            <span className="text-primary">Réserve ton analyse gratuite maintenant.</span>
          </p>

          {/* 2 gros CTA RDV bureau */}
          <div className="grid sm:grid-cols-2 gap-4 mb-3 animate-fade-in">
            <Button asChild size="lg" className="group h-auto py-5 md:py-6 flex-col gap-1 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] transition-all">
              <Link to="/rendez-vous?type=location">
                <span className="flex items-center gap-2 text-lg md:text-xl font-bold">
                  <Key className="h-5 w-5" />
                  Je cherche une location
                </span>
                <span className="text-sm font-medium opacity-90 flex items-center gap-1">
                  Réserver mon analyse gratuite
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="group h-auto py-5 md:py-6 flex-col gap-1 border-2 border-primary/40 hover:border-primary hover:bg-primary/5 shadow-lg hover:scale-[1.02] transition-all">
              <Link to="/rendez-vous?type=achat">
                <span className="flex items-center gap-2 text-lg md:text-xl font-bold text-foreground">
                  <Home className="h-5 w-5 text-primary" />
                  Je veux acheter un bien
                </span>
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Réserver mon analyse gratuite
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground mb-10">
            Choisis ton projet et réserve directement ton créneau au bureau.
          </p>

          {/* Séparateur parcours en ligne */}
          <div className="flex items-center gap-3 max-w-2xl mx-auto mb-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Ou en ligne</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <h2 className="text-center text-lg md:text-xl font-semibold text-foreground mb-6 max-w-2xl mx-auto">
            Préfères tout faire en ligne ? Réponds à quelques questions pour pré-qualifier ton dossier.
          </h2>

          {!searchType && (
            <div className="flex justify-center gap-3 mb-8 animate-fade-in">
              <Button variant="outline" size="lg" className="flex-1 max-w-[200px]" onClick={() => setSearchType('location')}>🏠 Location</Button>
              <Button variant="outline" size="lg" className="flex-1 max-w-[200px]" onClick={() => setSearchType('achat')}>🏡 Achat</Button>
            </div>
          )}

          {searchType && (
            <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl border border-[hsl(38_45%_48%/0.2)] shadow-lg p-6 md:p-8 overflow-hidden">
            <BorderBeam duration={10} />
              <div className="flex justify-center gap-2 mb-6">
                {['qualification', 'coordonnees'].map((s, i) => (
                  <div key={s} className={`h-2 w-20 rounded-full transition-colors ${(step === 'qualification' && i === 0) || step === 'coordonnees' ? 'bg-primary' : 'bg-muted'}`} />
                ))}
              </div>

              {step === 'qualification' && (
                <div className="space-y-5 animate-fade-in">
                  <p className="text-sm font-medium text-center text-muted-foreground mb-2">
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
          )}
        </div>
      </div>
      </div>
    </section>
  );
}
