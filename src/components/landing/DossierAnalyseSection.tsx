import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  FileSearch,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ClipboardCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchType } from '@/contexts/SearchTypeContext';
import { useUTMParams } from '@/hooks/useUTMParams';
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

  // Step state
  const [step, setStep] = useState<Step>('qualification');

  // Qualification - Location
  const [statutEmploi, setStatutEmploi] = useState('salarie');
  const [permisNationalite, setPermisNationalite] = useState('');
  const [confirmNoPoursuites, setConfirmNoPoursuites] = useState(true);

  // Qualification - Achat
  const [accordBancaire, setAccordBancaire] = useState('');
  const [apportPersonnel, setApportPersonnel] = useState('');
  const [typeBien, setTypeBien] = useState('');

  // Coordonnées
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [localite, setLocalite] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Validation
  const isQualificationValidLocation = statutEmploi && permisNationalite;
  const isQualificationValidAchat = accordBancaire && apportPersonnel;
  const isQualificationValid = isAchat
    ? isQualificationValidAchat
    : isQualificationValidLocation;
  const isCoordonneesValid =
    prenom.trim() && nom.trim() && email.trim() && telephone.trim() && !!selectedSlot;

  const handleAnalyser = () => {
    if (isQualificationValid) {
      setStep('coordonnees');
    }
  };

  const handleSubmit = async () => {
    if (!isCoordonneesValid || !selectedSlot) return;
    setIsSubmitting(true);

    let createdApptId: string | null = null;
    try {
      // 1. Réserver le créneau téléphonique d'abord (gestion conflit)
      // Pas de .select() : RLS SELECT anonyme bloque RETURNING. On génère l'id côté client.
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

      // 2. Créer le lead — id généré côté client, pas de .select() pour éviter 42501 RLS
      const leadId = crypto.randomUUID();
      const { error } = await supabase.from('leads').insert({
        id: leadId,
        email: email.trim(),
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: telephone.trim(),
        localite: localite.trim() || null,
        statut_emploi: isAchat ? null : statutEmploi,
        permis_nationalite: isAchat ? null : permisNationalite,
        poursuites: isAchat ? null : !confirmNoPoursuites,
        a_garant: false,
        is_qualified: true,
        source: 'landing_analyse_dossier',
        type_recherche: isAchat ? 'achat' : 'location',
        accord_bancaire: isAchat ? accordBancaire === 'oui' : null,
        apport_personnel: isAchat ? apportPersonnel : null,
        type_bien: isAchat ? typeBien : null,
        utm_source: utmParams.utm_source,
        utm_medium: utmParams.utm_medium,
        utm_campaign: utmParams.utm_campaign,
        utm_content: utmParams.utm_content,
        utm_term: utmParams.utm_term,
      });

      if (error) throw error;

      // Lier l'appointment au lead créé
      await supabase
        .from('lead_phone_appointments')
        .update({ lead_id: leadId })
        .eq('id', apptId);

      // Fire-and-forget email notification
      supabase.functions
        .invoke('notify-new-lead', {
          body: {
            email: email.trim(),
            prenom: prenom.trim(),
            nom: nom.trim(),
            telephone: telephone.trim(),
            localite: localite.trim() || null,
            statut_emploi: isAchat ? null : statutEmploi,
            permis_nationalite: isAchat ? null : permisNationalite,
            poursuites: isAchat ? null : !confirmNoPoursuites,
            is_qualified: true,
            type_recherche: isAchat ? 'achat' : 'location',
            utm_source: utmParams.utm_source,
            utm_medium: utmParams.utm_medium,
            utm_campaign: utmParams.utm_campaign,
          },
        })
        .catch((err) => console.error('Notification error:', err));

      // Meta Pixel
      if ((window as any).fbq) {
        (window as any).fbq('track', 'Lead');
        console.log('[Meta Pixel] Lead fired on analyse dossier submission');
      }

      setStep('submitted');
    } catch (error) {
      console.error('Error submitting analyse dossier:', error);
      toast.error('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------- SUCCESS STATE ---------------
  if (step === 'submitted') {
    return (
      <section
        id="analyse-dossier"
        className="py-12 md:py-16 bg-gradient-to-b from-muted/30 to-background"
      >
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              Merci {prenom} ! 🎉
            </h3>
            <p className="text-muted-foreground">
              Un expert va analyser ton dossier et te contacter sous 24h pour un
              rendez-vous personnalisé.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="analyse-dossier"
      className="py-12 md:py-16 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,hsl(var(--primary)/0.06)_0%,transparent_60%)]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
              <FileSearch className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Analyse gratuite de ton dossier 📋
            </h2>
            <p className="text-muted-foreground">
              Nos experts te disent ce qui joue et ce qui ne joue pas
            </p>
          </div>

          {/* Type selector if no searchType */}
          {!searchType && (
            <div className="flex justify-center gap-3 mb-8 animate-fade-in">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 max-w-[200px]"
                onClick={() => setSearchType('location')}
              >
                🏠 Location
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1 max-w-[200px]"
                onClick={() => setSearchType('achat')}
              >
                🏡 Achat
              </Button>
            </div>
          )}

          {searchType && (
            <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-6 md:p-8 animate-fade-in">
              {/* Progress */}
              <div className="flex justify-center gap-2 mb-6">
                {['qualification', 'coordonnees'].map((s, i) => (
                  <div
                    key={s}
                    className={`h-2 w-20 rounded-full transition-colors ${
                      (step === 'qualification' && i === 0) ||
                      step === 'coordonnees'
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* STEP 1: Qualification */}
              {step === 'qualification' && (
                <div className="space-y-5 animate-fade-in">
                  <p className="text-sm font-medium text-center text-muted-foreground mb-2">
                    {isAchat
                      ? 'Réponds à ces questions pour ton projet d\'achat'
                      : 'Réponds à ces questions pour ton dossier de location'}
                  </p>

                  {/* LOCATION questions */}
                  {!isAchat && (
                    <>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">
                          Es-tu salarié(e) ?
                        </Label>
                        <RadioGroup
                          value={statutEmploi}
                          onValueChange={setStatutEmploi}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="salarie" id="analyse-salarie" />
                            <Label htmlFor="analyse-salarie" className="cursor-pointer">
                              Oui, salarié(e)
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="autre" id="analyse-autre" />
                            <Label htmlFor="analyse-autre" className="cursor-pointer">
                              Non
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base font-medium">
                          Quel est ton permis ou nationalité ?
                        </Label>
                        <Select
                          value={permisNationalite}
                          onValueChange={setPermisNationalite}
                        >
                          <SelectTrigger className="h-12 bg-background/80 border-border/50 focus:border-primary">
                            <SelectValue placeholder="Sélectionne ton permis/nationalité" />
                          </SelectTrigger>
                          <SelectContent>
                            {permisOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3 p-4 rounded-xl bg-success/5 border border-success/20">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="analyse-no-poursuites"
                            checked={confirmNoPoursuites}
                            onCheckedChange={(checked) =>
                              setConfirmNoPoursuites(checked as boolean)
                            }
                            className="mt-1"
                          />
                          <div className="space-y-1">
                            <Label
                              htmlFor="analyse-no-poursuites"
                              className="text-base font-medium cursor-pointer flex items-center gap-2"
                            >
                              <ShieldCheck className="h-4 w-4 text-success" />
                              Je confirme n'avoir aucune poursuite
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Ni actes de défaut de bien en cours
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ACHAT questions */}
                  {isAchat && (
                    <>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">
                          As-tu obtenu un accord de principe bancaire ?
                        </Label>
                        <RadioGroup
                          value={accordBancaire}
                          onValueChange={setAccordBancaire}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="oui" id="analyse-accord-oui" />
                            <Label htmlFor="analyse-accord-oui" className="cursor-pointer">
                              Oui
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="non" id="analyse-accord-non" />
                            <Label htmlFor="analyse-accord-non" className="cursor-pointer">
                              Non / Pas encore
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base font-medium">
                          Quel est ton apport personnel disponible ?
                        </Label>
                        <Select
                          value={apportPersonnel}
                          onValueChange={setApportPersonnel}
                        >
                          <SelectTrigger className="h-12 bg-background/80 border-border/50 focus:border-primary">
                            <SelectValue placeholder="Sélectionne ton apport" />
                          </SelectTrigger>
                          <SelectContent>
                            {apportOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base font-medium">
                          Quel type de bien recherches-tu ?
                        </Label>
                        <Select value={typeBien} onValueChange={setTypeBien}>
                          <SelectTrigger className="h-12 bg-background/80 border-border/50 focus:border-primary">
                            <SelectValue placeholder="Sélectionne le type de bien" />
                          </SelectTrigger>
                          <SelectContent>
                            {typeBienOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* CTA */}
                  <Button
                    size="lg"
                    className="w-full text-base font-semibold shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all"
                    onClick={handleAnalyser}
                    disabled={!isQualificationValid}
                  >
                    <ClipboardCheck className="mr-2 h-5 w-5" />
                    Analyser mon dossier
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              )}

              {/* STEP 2: Coordonnées */}
              {step === 'coordonnees' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="text-center mb-2">
                    <p className="text-sm font-medium text-primary">
                      ✅ Informations reçues !
                    </p>
                    <p className="text-muted-foreground text-sm mt-1">
                      Nos experts analysent ton dossier et te recontactent pour
                      un rendez-vous personnalisé
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        Prénom *
                      </Label>
                      <Input
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        placeholder="Ton prénom"
                        className="h-12 bg-background/80 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        Nom *
                      </Label>
                      <Input
                        value={nom}
                        onChange={(e) => setNom(e.target.value)}
                        placeholder="Ton nom"
                        className="h-12 bg-background/80 border-border/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      Email *
                    </Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ton@email.ch"
                      className="h-12 bg-background/80 border-border/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      Téléphone *
                    </Label>
                    <Input
                      type="tel"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="+41 79 000 00 00"
                      className="h-12 bg-background/80 border-border/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      Localité souhaitée
                    </Label>
                    <Input
                      value={localite}
                      onChange={(e) => setLocalite(e.target.value)}
                      placeholder="Ex: Lausanne, Genève..."
                      className="h-12 bg-background/80 border-border/50"
                    />
                  </div>

                  {/* Étape obligatoire : créneau téléphonique */}
                  <div className="pt-4 border-t border-border/40">
                    <PhoneSlotPicker selected={selectedSlot} onSelect={setSelectedSlot} />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-shrink-0"
                      onClick={() => setStep('qualification')}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 text-base font-semibold shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all"
                      onClick={handleSubmit}
                      disabled={!isCoordonneesValid || isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          Envoyer pour analyse
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
