import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  MapPin,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Sun,
  Sunset,
  Clock,
  Lock,
  ShieldCheck,
  KeyRound,
  Home,
  Hammer,
  Banknote,
  Building2,
  PhoneCall,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useUTMParams } from '@/hooks/useUTMParams';
import {
  generateSlotsForDay,
  getAvailableDays,
  formatDayLabel,
  getDayPart,
  type Slot,
  type DayPart,
  OFFICE_ADDRESS,
  OFFICE_MAPS_URL,
} from '@/lib/phoneSlots';
import {
  qualifyLead,
  STATUT_LABELS,
  type StatutSuisse,
  type SituationPro,
  type PoursuitesStatut,
  type QualificationResult,
} from '@/utils/leadQualification';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUT_SUISSE_OPTIONS: StatutSuisse[] = [
  'Suisse',
  'Permis C',
  'Permis B',
  'Permis L',
  'Permis F',
  'Permis N',
  'Permis G',
  'Sans permis valable',
  'Autre',
];
const SITUATION_PRO_OPTIONS: SituationPro[] = [
  'CDI',
  'CDD',
  'Indépendant',
  'Apprenti / Étudiant',
  'Retraité',
  'Sans emploi',
  'Aide sociale',
  'AI',
  'Chômage',
  'Autre',
];
const POURSUITES_OPTIONS: PoursuitesStatut[] = [
  'Aucune',
  'En cours',
  'Actes de défaut de biens',
  'Je ne sais pas',
  "Pas encore d'extrait",
];
const NB_PIECES_OPTIONS = ['Studio', '1.5', '2', '2.5', '3', '3.5', '4', '4.5+'];

type ProjectType = 'location' | 'achat' | 'renovation' | 'vente';

const PROJECT_OPTIONS: {
  key: ProjectType;
  label: string;
  sub: string;
  icon: typeof KeyRound;
}[] = [
  { key: 'location', label: 'Louer', sub: 'un logement', icon: KeyRound },
  { key: 'achat', label: 'Acheter', sub: 'un bien', icon: Home },
  { key: 'renovation', label: 'Rénover', sub: 'mon bien', icon: Hammer },
  { key: 'vente', label: 'Vendre', sub: 'mon bien', icon: Banknote },
];

const PROJECT_LABELS: Record<ProjectType, string> = {
  location: 'Recherche de logement à louer',
  achat: 'Achat d\'un bien',
  renovation: 'Projet de rénovation',
  vente: 'Vente d\'un bien',
};

const DAY_PARTS: { key: DayPart; label: string; icon: typeof Sun; range: string }[] = [
  { key: 'matin', label: 'Matin', icon: Sun, range: '08h30 → 12h00' },
  { key: 'apres-midi', label: 'Après-midi', icon: Sunset, range: '13h30 → 16h00' },
];

export default function RendezVousBureau() {
  const utm = useUTMParams();
  const availableDays = useMemo(() => getAvailableDays(), []);
  const [date, setDate] = useState<Date>(availableDays[0]);
  const [activeDayPart, setActiveDayPart] = useState<DayPart>('matin');
  const [selected, setSelected] = useState<Slot | null>(null);
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [projet, setProjet] = useState<ProjectType | ''>('');
  const [appointmentType, setAppointmentType] = useState<'bureau' | 'telephonique'>('bureau');

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [doneStatus, setDoneStatus] = useState<'reserved' | 'manual'>('reserved');

  // --- Préqualification location (6 questions) ---
  const [statutSuisse, setStatutSuisse] = useState<StatutSuisse | ''>('');
  const [situationPro, setSituationPro] = useState<SituationPro | ''>('');
  const [poursuites, setPoursuites] = useState<PoursuitesStatut | ''>('');
  const [nbPieces, setNbPieces] = useState('');
  const [localiteRecherche, setLocaliteRecherche] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [revenuNet, setRevenuNet] = useState('');

  const isLocation = projet === 'location';

  const liveRatio = useMemo(() => {
    const b = parseFloat(budgetMax);
    const r = parseFloat(revenuNet);
    if (!b || !r || b <= 0) return null;
    return Math.round((r / b) * 10) / 10;
  }, [budgetMax, revenuNet]);

  const isQualificationValid =
    !isLocation ||
    (!!statutSuisse &&
      !!situationPro &&
      !!poursuites &&
      !!nbPieces &&
      localiteRecherche.trim().length >= 2 &&
      parseFloat(budgetMax) > 0 &&
      parseFloat(revenuNet) > 0);

  useEffect(() => {
    document.title =
      'RDV gratuit au bureau Logisorama Crissier — Location, achat, rénovation, vente';
    const meta = document.querySelector('meta[name="description"]');
    const prev = meta?.getAttribute('content') ?? null;
    if (meta)
      meta.setAttribute(
        'content',
        "Réservez 30 min gratuites au bureau Logisorama à Crissier. On parle de votre projet de location, achat, rénovation ou vente — confirmation immédiate.",
      );
    return () => {
      if (meta && prev !== null) meta.setAttribute('content', prev);
    };
  }, []);

  // Slots pris (realtime)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.rpc('get_available_phone_slots', {
        p_from: from,
        p_to: to,
      });
      if (!mounted) return;
      const set = new Set<string>();
      (data || []).forEach((row: any) => set.add(new Date(row.slot_start).toISOString()));
      setTaken(set);
    };
    load();
    const channel = supabase
      .channel('rdv-bureau-slots')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lead_phone_appointments' },
        () => load(),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const slots = useMemo(() => generateSlotsForDay(date), [date]);
  const filtered = useMemo(
    () => slots.filter((s) => getDayPart(s) === activeDayPart),
    [slots, activeDayPart],
  );

  const isCoordValid =
    prenom.trim().length >= 2 &&
    nom.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    telephone.trim().length >= 8;

  const qualification: QualificationResult | null = useMemo(() => {
    if (!isLocation || !isQualificationValid) return null;
    return qualifyLead({
      statutSuisse: statutSuisse as StatutSuisse,
      situationPro: situationPro as SituationPro,
      poursuites: poursuites as PoursuitesStatut,
      nbPieces,
      localite: localiteRecherche,
      budgetChf: parseFloat(budgetMax) || 0,
      revenuChf: parseFloat(revenuNet) || 0,
    });
  }, [isLocation, isQualificationValid, statutSuisse, situationPro, poursuites, nbPieces, localiteRecherche, budgetMax, revenuNet]);

  const isNonQualifie = qualification?.statut === 'non_qualifie';

  // Pour les non-qualifiés, on n'exige PAS de créneau (réservation manuelle)
  const isFormValid =
    !!projet &&
    isCoordValid &&
    isQualificationValid &&
    (isNonQualifie || !!selected);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !projet) return;
    if (!isNonQualifie && !selected) return;
    setSubmitting(true);

    try {
      const fullName = `${prenom.trim()} ${nom.trim()}`.trim();
      const projetLabel = PROJECT_LABELS[projet];

      // Champs préqualification (uniquement pour location)
      const quali = qualification;
      const qualifFields: Record<string, any> = isLocation && quali
        ? {
            statut_suisse: statutSuisse,
            situation_pro: situationPro,
            poursuites_statut: poursuites,
            nb_pieces: nbPieces,
            localite_recherche: localiteRecherche.trim(),
            budget_max_chf: parseFloat(budgetMax) || null,
            revenu_net_mensuel_chf: parseFloat(revenuNet) || null,
            ratio_revenu_loyer: quali.ratio,
            statut_qualification: quali.statut,
            risque_niveau: quali.risque,
            motif_qualification: quali.motif,
            resume_profil: quali.resume,
            recommandation_agent: quali.recommandation,
            poursuites: poursuites === 'En cours' || poursuites === 'Actes de défaut de biens',
            requires_manual_validation: quali.statut === 'non_qualifie',
          }
        : {};

      const notesParts = [
        `Type de RDV: ${appointmentType === 'bureau' ? 'Au bureau (Crissier)' : 'Téléphonique'}`,
        `Type de projet: ${projetLabel}`,
        quali ? `Préqualification: ${STATUT_LABELS[quali.statut]} (ratio ${quali.ratio}x — risque ${quali.risque})` : '',
        quali ? `Résumé: ${quali.resume}` : '',
        quali ? `Recommandation: ${quali.recommandation}` : '',
        message.trim() ? `Message client: ${message.trim()}` : '',
      ].filter(Boolean);
      const notes = notesParts.join('\n');

      // ---- Cas 1 : Non qualifié → AUCUN créneau réservé, validation manuelle ----
      if (isNonQualifie) {
        const leadId = crypto.randomUUID();
        const { error: leadErr } = await supabase.from('leads').insert({
          id: leadId,
          email: email.trim(),
          prenom: prenom.trim(),
          nom: nom.trim(),
          telephone: telephone.trim(),
          source: 'rdv_bureau_crissier',
          formulaire: 'rdv_bureau',
          type_recherche: 'location',
          is_qualified: false,
          notes,
          utm_source: utm.utm_source || 'direct',
          utm_medium: utm.utm_medium || 'rdv_bureau',
          utm_campaign: utm.utm_campaign || projet,
          utm_content: utm.utm_content,
          utm_term: utm.utm_term,
          ...qualifFields,
        } as any);
        if (leadErr) throw leadErr;

        supabase.functions
          .invoke('notify-admin-new-phone-appointment', {
            body: {
              appointment_id: null,
              lead_id: leadId,
              type_projet: projet,
              type_projet_label: projetLabel,
              appointment_type: 'manual_validation',
              qualification_statut: quali?.statut,
              qualification_motif: quali?.motif,
            },
          })
          .then(() => {}, () => {});

        setDoneStatus('manual');
        setDone(true);
        toast.success('Demande enregistrée. Notre équipe vous recontacte.');
        return;
      }

      // ---- Cas 2 : Qualifié / À vérifier / À réorienter → flux normal ----
      // Lead CRM créé AVANT le rendez-vous : le lien lead_id est posé dès l'insertion
      // (plus aucune mise à jour anonyme n'est autorisée sur les rendez-vous).
      const leadTypeRecherche: 'location' | 'vente' =
        projet === 'location' ? 'location' : 'vente';
      const leadId = crypto.randomUUID();
      await supabase.from('leads').insert({
        id: leadId,
        email: email.trim(),
        prenom: prenom.trim(),
        nom: nom.trim(),
        telephone: telephone.trim(),
        source: 'rdv_bureau_crissier',
        formulaire: 'rdv_bureau',
        type_recherche: leadTypeRecherche,
        is_qualified: true,
        notes,
        utm_source: utm.utm_source || 'direct',
        utm_medium: utm.utm_medium || 'rdv_bureau',
        utm_campaign: utm.utm_campaign || projet,
        utm_content: utm.utm_content,
        utm_term: utm.utm_term,
        ...qualifFields,
      } as any);

      const apptId = crypto.randomUUID();
      const { error: apptErr } = await supabase.from('lead_phone_appointments').insert({
        id: apptId,
        lead_id: leadId,
        prospect_email: email.trim(),
        prospect_phone: telephone.trim(),
        prospect_name: fullName,
        slot_start: selected!.start.toISOString(),
        slot_end: selected!.end.toISOString(),
        source_form: appointmentType === 'bureau' ? 'rdv_bureau_crissier' : 'rdv_telephonique',
        appointment_type: appointmentType,
        status: 'en_attente',
        notes_admin: notes,
      });

      if (apptErr) {
        if ((apptErr as any).code === '23505') {
          toast.error('Ce créneau vient d\'être réservé. Choisis-en un autre.');
          setSelected(null);
        } else {
          throw apptErr;
        }
        setSubmitting(false);
        return;
      }


      const isBureau = appointmentType === 'bureau';
      const projetLabelForAdmin = projetLabel;
      const locationProspect = isBureau ? OFFICE_ADDRESS : `Téléphone : ${telephone.trim()}`;

      // Notif admin (le prospect ne reçoit l'ICS qu'après validation manuelle de l'admin)
      supabase.functions
        .invoke('notify-admin-new-phone-appointment', {
          body: {
            appointment_id: apptId,
            type_projet: projet,
            type_projet_label: projetLabelForAdmin,
            appointment_type: appointmentType,
            qualification_statut: quali?.statut,
          },
        })
        .then(
          () => {},
          () => {},
        );

      // ICS calendrier interne (équipe seulement)
      supabase.functions
        .invoke('send-calendar-invite', {
          body: {
            title: isBureau
              ? `Nouveau RDV bureau (${projetLabel}) — ${fullName} [À CONFIRMER]`
              : `Nouveau RDV téléphonique (${projetLabel}) — ${fullName} [À CONFIRMER]`,
            description: `Type: ${isBureau ? 'Au bureau' : 'Téléphonique'}\nStatut: EN ATTENTE — à confirmer dans le calendrier admin\nProjet: ${projetLabel}\nEmail: ${email.trim()}\nTél: ${telephone.trim()}\nMessage: ${message.trim() || '—'}`,
            location: locationProspect,
            start_date: selected!.start.toISOString(),
            end_date: selected!.end.toISOString(),
            all_day: false,
            recipient_email: 'info@immo-rama.ch',
          },
        })
        .then(
          () => {},
          () => {},
        );

      setDoneStatus('reserved');
      setDone(true);
      toast.success('Demande de RDV enregistrée. Vous recevrez la confirmation par email.');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erreur lors de la réservation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const isManual = doneStatus === 'manual';
    return (
      <main className="min-h-screen bg-[#0e0c0a] text-[#f4ecd8] flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border border-[#b8893d]/40 bg-[#1c1814] p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <CheckCircle2 className="mx-auto h-14 w-14 text-[#d4a857]" />
          <h1 className="mt-4 font-serif text-2xl text-[#f4ecd8]">
            {isManual ? 'Demande reçue' : 'Demande de RDV enregistrée'}
          </h1>
          {isManual ? (
            <p className="mt-3 text-[#c9bfac]">
              Merci {prenom || ''}, notre équipe va analyser votre dossier et vous{' '}
              <strong className="text-[#d4a857]">recontacter sous 24h</strong> pour vous aider à
              structurer votre recherche (garant, ajustement du budget ou des localités…).
            </p>
          ) : (
            selected && (
              <p className="mt-3 text-[#c9bfac]">
                Créneau demandé : {formatDayLabel(selected.start)} à{' '}
                <strong className="text-[#d4a857]">{selected.label}</strong> (30 min).
              </p>
            )
          )}
          <div className="mt-5 rounded-xl border border-[#b8893d]/25 bg-[#0e0c0a]/60 p-4 text-sm space-y-2 text-left">
            {isManual ? (
              <p className="text-[#c9bfac]">
                Vous recevrez un appel ou un email pour organiser un échange adapté à votre
                situation. Aucun créneau n'a été pré-réservé pour l'instant.
              </p>
            ) : (
              <>
                <p className="text-[#c9bfac]">
                  Notre équipe valide votre créneau dans les meilleurs délais. Vous recevrez un{' '}
                  <strong className="text-[#d4a857]">email de confirmation avec l'invitation calendrier (.ics)</strong>{' '}
                  dès la validation.
                </p>
                {appointmentType === 'bureau' ? (
                  <div className="flex items-start gap-2 pt-2 border-t border-[#b8893d]/15">
                    <MapPin className="h-4 w-4 mt-0.5 text-[#d4a857] shrink-0" />
                    <span className="text-[#c9bfac]">Lieu prévu : {OFFICE_ADDRESS}</span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 pt-2 border-t border-[#b8893d]/15">
                    <PhoneCall className="h-4 w-4 mt-0.5 text-[#d4a857] shrink-0" />
                    <span className="text-[#c9bfac]">Nous vous appellerons au numéro indiqué.</span>
                  </div>
                )}
              </>
            )}
          </div>
          <p className="mt-4 text-xs text-[#8a7f6e]">
            {isManual ? 'Dossier transmis à notre équipe.' : 'En attente de validation par notre équipe.'}
          </p>
        </div>
      </main>
    );
  }


  return (
    <div className="min-h-screen bg-[#0e0c0a] text-[#f4ecd8]">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#b8893d]/20 bg-gradient-to-br from-[#0e0c0a] via-[#1c1814] to-[#0e0c0a]">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_10%,rgba(212,168,87,0.18),transparent_50%),radial-gradient(circle_at_80%_60%,rgba(184,137,61,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-3xl px-5 pt-12 pb-8 text-center">
          <span className="inline-block rounded-full border border-[#b8893d]/50 bg-[#b8893d]/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-[#e0c089]">
            🎯 RDV GRATUIT · BUREAU CRISSIER · SANS ENGAGEMENT
          </span>
          <h1 className="mt-5 font-serif text-3xl leading-tight md:text-4xl">
            Discutons de votre projet —{' '}
            <em className="not-italic text-[#d4a857]">au bureau, autour d'un café</em>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#c9bfac] md:text-base">
            30 minutes en tête-à-tête avec un conseiller Logisorama. Location, achat,
            rénovation ou vente — on vous oriente clairement, sans blabla.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {['✓ 100% gratuit', '✓ Sans engagement', '✓ Validation par notre équipe'].map((t) => (
              <span
                key={t}
                className="rounded-full border border-[#b8893d]/40 bg-[#b8893d]/10 px-3 py-1.5 text-xs font-bold text-[#d4a857]"
              >
                {t}
              </span>
            ))}
          </div>

          <p className="mt-6 inline-flex items-center gap-2 text-xs text-[#8a7f6e]">
            <MapPin className="h-3.5 w-3.5 text-[#d4a857]" />
            {OFFICE_ADDRESS}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-2xl px-5 py-10 space-y-5">
        {/* 1. Type de projet */}
        <div className="rounded-2xl border border-[#b8893d]/25 bg-[#1c1814] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <Label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#d4a857]">
            1. Votre projet
          </Label>
          <p className="mb-4 text-xs text-[#8a7f6e]">
            Pour qu'on prépare votre RDV avec le bon expert.
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {PROJECT_OPTIONS.map((p) => {
              const Icon = p.icon;
              const active = projet === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setProjet(p.key)}
                  className={cn(
                    'rounded-xl border px-3 py-4 text-center transition',
                    active
                      ? 'border-[#d4a857] bg-[#d4a857]/15 text-[#f4ecd8] shadow-[0_0_0_1px_rgba(212,168,87,0.5)]'
                      : 'border-[#b8893d]/25 bg-[#0e0c0a]/60 text-[#c9bfac] hover:border-[#d4a857]/60',
                  )}
                >
                  <Icon
                    className={cn(
                      'mx-auto h-6 w-6 mb-2',
                      active ? 'text-[#d4a857]' : 'text-[#b8893d]',
                    )}
                  />
                  <div className="text-sm font-semibold">{p.label}</div>
                  <div className="text-[11px] opacity-80">{p.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1bis. Préqualification express (uniquement location) */}
        {isLocation && (
          <div className="rounded-2xl border border-[#b8893d]/25 bg-[#1c1814] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] space-y-5">
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#d4a857]">
                Préqualification express
              </Label>
              <p className="text-xs text-[#8a7f6e]">
                6 questions rapides pour qu'on prépare votre rendez-vous avec les bonnes infos.
              </p>
            </div>

            {/* Partie 1 — Situation */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#c9bfac]">
                Partie 1 — Votre situation
              </p>

              <div>
                <Label className="mb-1.5 block text-xs text-[#c9bfac]">1. Statut en Suisse *</Label>
                <Select value={statutSuisse} onValueChange={(v) => setStatutSuisse(v as StatutSuisse)}>
                  <SelectTrigger className="dark-input-rdv h-11"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    {STATUT_SUISSE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs text-[#c9bfac]">2. Situation professionnelle *</Label>
                <Select value={situationPro} onValueChange={(v) => setSituationPro(v as SituationPro)}>
                  <SelectTrigger className="dark-input-rdv h-11"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    {SITUATION_PRO_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs text-[#c9bfac]">3. Poursuites / dettes *</Label>
                <Select value={poursuites} onValueChange={(v) => setPoursuites(v as PoursuitesStatut)}>
                  <SelectTrigger className="dark-input-rdv h-11"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    {POURSUITES_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Partie 2 — Recherche */}
            <div className="space-y-3 pt-3 border-t border-[#b8893d]/15">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#c9bfac]">
                Partie 2 — Votre recherche
              </p>

              <div>
                <Label className="mb-1.5 block text-xs text-[#c9bfac]">4. Type de logement *</Label>
                <Select value={nbPieces} onValueChange={setNbPieces}>
                  <SelectTrigger className="dark-input-rdv h-11"><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                  <SelectContent>
                    {NB_PIECES_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o === 'Studio' || o === '4.5+' ? o : `${o} pièces`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs text-[#c9bfac]">5. Localité ou région *</Label>
                <Input
                  value={localiteRecherche}
                  onChange={(e) => setLocaliteRecherche(e.target.value)}
                  placeholder="Lausanne, Renens, Morges, Nyon, Genève…"
                  className="dark-input-rdv"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 block text-xs text-[#c9bfac]">6a. Budget max charges comprises (CHF) *</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value)}
                    placeholder="2000"
                    className="dark-input-rdv"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs text-[#c9bfac]">6b. Revenu net mensuel ménage (CHF) *</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={revenuNet}
                    onChange={(e) => setRevenuNet(e.target.value)}
                    placeholder="6000"
                    className="dark-input-rdv"
                  />
                </div>
              </div>

              {liveRatio !== null && (
                <div
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs flex items-center justify-between',
                    liveRatio >= 3 && 'border-primary/40 bg-primary/10 text-primary',
                    liveRatio >= 2.5 && liveRatio < 3 && 'border-amber-500/40 bg-amber-500/10 text-amber-200',
                    liveRatio < 2.5 && 'border-rose-500/40 bg-rose-500/10 text-rose-200',
                  )}
                >
                  <span>Ratio revenu / loyer</span>
                  <strong>{liveRatio}x {liveRatio >= 3 ? '✓' : liveRatio >= 2.5 ? '~' : '⚠'}</strong>
                </div>
              )}
            </div>

            {qualification && isNonQualifie && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-3 text-xs text-rose-100">
                <p className="font-semibold">Dossier à analyser par notre équipe</p>
                <p className="mt-1 text-rose-200/90">
                  Vos informations seront transmises à un conseiller. Nous vous recontactons sous
                  24h pour vous proposer une stratégie adaptée (garant, ajustement du budget…).
                  Aucun créneau ne sera pré-réservé.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2. Type de RDV (masqué si dossier non qualifié) */}
        {!isNonQualifie && (
        <>
        <div className="rounded-2xl border border-[#b8893d]/25 bg-[#1c1814] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <Label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#d4a857]">
            2. Comment souhaitez-vous échanger ?
          </Label>
          <p className="mb-4 text-xs text-[#8a7f6e]">
            En personne dans nos bureaux ou par téléphone, au choix.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {([
              { key: 'bureau', label: 'Au bureau', sub: 'Crissier · café offert', Icon: Building2 },
              { key: 'telephonique', label: 'Téléphonique', sub: 'On vous appelle', Icon: PhoneCall },
            ] as const).map((opt) => {
              const Icon = opt.Icon;
              const active = appointmentType === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setAppointmentType(opt.key)}
                  className={cn(
                    'rounded-xl border px-3 py-4 text-center transition',
                    active
                      ? 'border-[#d4a857] bg-[#d4a857]/15 text-[#f4ecd8] shadow-[0_0_0_1px_rgba(212,168,87,0.5)]'
                      : 'border-[#b8893d]/25 bg-[#0e0c0a]/60 text-[#c9bfac] hover:border-[#d4a857]/60',
                  )}
                >
                  <Icon className={cn('mx-auto h-6 w-6 mb-2', active ? 'text-[#d4a857]' : 'text-[#b8893d]')} />
                  <div className="text-sm font-semibold">{opt.label}</div>
                  <div className="text-[11px] opacity-80">{opt.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Jour + créneau */}
        <div className="rounded-2xl border border-[#b8893d]/25 bg-[#1c1814] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <Label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#d4a857]">
            3. Choisissez votre créneau
          </Label>
          <p className="mb-4 text-xs text-[#8a7f6e]">
            Réservation ferme en temps réel. Les créneaux pris sont barrés.
          </p>

          {/* Jours */}
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#c9bfac]">
            Jour
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            {availableDays.map((d) => {
              const active = d.toDateString() === date.toDateString();
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    setDate(d);
                    setSelected(null);
                  }}
                  className={cn(
                    'shrink-0 rounded-lg px-3 py-2 text-sm border transition min-w-[88px]',
                    active
                      ? 'border-[#d4a857] bg-[#d4a857]/15 text-[#f4ecd8] shadow-[0_0_0_1px_rgba(212,168,87,0.5)]'
                      : 'border-[#b8893d]/25 bg-[#0e0c0a]/60 text-[#c9bfac] hover:border-[#d4a857]/60',
                  )}
                >
                  <div className="font-semibold capitalize">
                    {d.toLocaleDateString('fr-CH', { weekday: 'short' })}
                  </div>
                  <div className="text-xs opacity-80">
                    {d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' })}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Matin / Après-midi */}
          <div className="mt-4 flex gap-2">
            {DAY_PARTS.map((dp) => {
              const Icon = dp.icon;
              const active = activeDayPart === dp.key;
              return (
                <button
                  key={dp.key}
                  type="button"
                  onClick={() => setActiveDayPart(dp.key)}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-sm border transition flex items-center gap-2 justify-center',
                    active
                      ? 'border-[#d4a857] bg-[#d4a857]/15 text-[#f4ecd8] shadow-[0_0_0_1px_rgba(212,168,87,0.5)]'
                      : 'border-[#b8893d]/25 bg-[#0e0c0a]/60 text-[#c9bfac] hover:border-[#d4a857]/60',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{dp.label}</span>
                  <span className="text-[11px] opacity-70 hidden sm:inline">{dp.range}</span>
                </button>
              );
            })}
          </div>

          {/* Slots */}
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
            {filtered.map((slot) => {
              const isTaken = taken.has(slot.start.toISOString());
              const isSelected = selected?.start.getTime() === slot.start.getTime();
              return (
                <button
                  key={slot.key}
                  type="button"
                  disabled={isTaken}
                  onClick={() => setSelected(slot)}
                  className={cn(
                    'rounded-lg px-2 py-2 text-sm border transition',
                    isTaken &&
                      'bg-[#0e0c0a]/40 text-[#6b6253] line-through cursor-not-allowed opacity-60 border-[#b8893d]/15',
                    !isTaken &&
                      !isSelected &&
                      'border-[#b8893d]/25 bg-[#0e0c0a]/60 text-[#c9bfac] hover:border-[#d4a857]/60',
                    isSelected &&
                      'border-[#d4a857] bg-[#d4a857]/15 text-[#f4ecd8] scale-[1.02] shadow-[0_0_0_1px_rgba(212,168,87,0.5)]',
                  )}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        </div>
        </>
        )}

        {/* 4. Coordonnées + CTA */}
        {projet && (isNonQualifie || selected) && (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[#b8893d]/25 bg-[#1c1814] p-5 md:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.5)] space-y-4"
          >
            <div>
              <Label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#d4a857]">
                4. Vos coordonnées
              </Label>
              <p className="text-xs text-[#8a7f6e]">
                {selected ? (
                  <>
                    {appointmentType === 'bureau' ? 'RDV au bureau' : 'RDV téléphonique'} le{' '}
                    <strong className="text-[#f4ecd8]">{formatDayLabel(selected.start)}</strong>{' '}
                    à <strong className="text-[#f4ecd8]">{selected.label}</strong> · 30 min ·{' '}
                    {PROJECT_LABELS[projet]}
                  </>
                ) : (
                  <>Analyse personnalisée de votre dossier — {PROJECT_LABELS[projet]}</>
                )}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="prenom" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c9bfac]">
                  Prénom *
                </Label>
                <Input
                  id="prenom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="dark-input-rdv"
                  autoComplete="given-name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="nom" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c9bfac]">
                  Nom *
                </Label>
                <Input
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="dark-input-rdv"
                  autoComplete="family-name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c9bfac]">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="dark-input-rdv"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tel" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c9bfac]">
                  Téléphone *
                </Label>
                <Input
                  id="tel"
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="dark-input-rdv"
                  placeholder="+41 ..."
                  autoComplete="tel"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="msg" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#c9bfac]">
                  Message (facultatif)
                </Label>
                <Textarea
                  id="msg"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="dark-input-rdv min-h-24"
                  placeholder="Précisez votre projet, votre budget, vos besoins..."
                  rows={3}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={!isFormValid || submitting}
              className="w-full bg-gradient-to-r from-[#d4a857] to-[#b8893d] text-[#1c1814] font-bold text-base py-6 rounded-xl shadow-[0_10px_28px_rgba(184,137,61,0.45)] hover:opacity-95 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />{' '}
                  {isNonQualifie ? 'Envoi…' : 'Réservation...'}
                </>
              ) : isNonQualifie ? (
                '📩 Envoyer ma demande pour analyse manuelle'
              ) : appointmentType === 'bureau' ? (
                '🏢 Confirmer mon RDV gratuit au bureau'
              ) : (
                '📞 Confirmer mon RDV téléphonique gratuit'
              )}
            </Button>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[#8a7f6e]">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Confirmation immédiate
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Données sécurisées
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Sans engagement
              </span>
            </div>
          </form>
        )}

        {!projet && (
          <div className="rounded-2xl border border-dashed border-[#b8893d]/30 bg-[#1c1814]/60 p-5 text-center text-sm text-[#8a7f6e]">
            👆 Sélectionnez d'abord votre type de projet
          </div>
        )}
        {projet && isLocation && !isQualificationValid && (
          <div className="rounded-2xl border border-dashed border-[#b8893d]/30 bg-[#1c1814]/60 p-5 text-center text-sm text-[#8a7f6e]">
            👆 Complétez la préqualification pour continuer
          </div>
        )}
        {projet && (!isLocation || isQualificationValid) && !isNonQualifie && !selected && (
          <div className="rounded-2xl border border-dashed border-[#b8893d]/30 bg-[#1c1814]/60 p-5 text-center text-sm text-[#8a7f6e]">
            👆 Choisissez un créneau pour continuer
          </div>
        )}
      </section>

      <style>{`
        .dark-input-rdv {
          background: #0e0c0a !important;
          border: 1px solid rgba(184,137,61,0.25) !important;
          color: #f4ecd8 !important;
        }
        .dark-input-rdv::placeholder { color: #6b6253 !important; }
        .dark-input-rdv:focus-visible {
          border-color: #d4a857 !important;
          box-shadow: 0 0 0 2px rgba(212,168,87,0.25) !important;
          outline: none !important;
        }
      `}</style>
    </div>
  );
}
