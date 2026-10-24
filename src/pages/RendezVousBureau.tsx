import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Banknote, Briefcase, Building2, CalendarDays, Hammer, Home, KeyRound, MapPin, PhoneCall, ShieldAlert, ShieldCheck, Sun, Sunset, Wallet,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUTMParams } from '@/hooks/useUTMParams';
import {
  AnswerChips, Choice, ChoiceList, DoneScreen, Field, FunnelBottomBar, FunnelHeader, FunnelIntro, FunnelMain, FunnelPage,
  Note, PrimaryButton, Question, StepTransition, TextArea, Tile, TrustLine, useFunnelSteps,
} from '@/components/funnel-ui/FunnelKit';
import officePhoto from '@/assets/b2b-team.jpg';
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
  const [search] = useSearchParams();
  const initialType = search.get('type');
  const [projet, setProjet] = useState<ProjectType | ''>(
    initialType === 'location' || initialType === 'achat' || initialType === 'renovation' || initialType === 'vente' ? initialType : '',
  );
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

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
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

  /* ---------- Parcours : une question par page ---------- */
  type StepKey = 'projet' | 'statut' | 'situation' | 'poursuites' | 'pieces' | 'localite' | 'budget' | 'mode' | 'creneau' | 'coord';
  const steps: StepKey[] = useMemo(() => {
    const s: StepKey[] = ['projet'];
    if (isLocation) s.push('statut', 'situation', 'poursuites', 'pieces', 'localite', 'budget');
    // Dossier non qualifié : pas de créneau, validation manuelle par l'équipe (règle inchangée).
    if (!isNonQualifie) s.push('mode', 'creneau');
    s.push('coord');
    return s;
  }, [isLocation, isNonQualifie]);
  const answered: Record<StepKey, boolean> = {
    projet: !!projet,
    statut: !!statutSuisse,
    situation: !!situationPro,
    poursuites: !!poursuites,
    pieces: !!nbPieces,
    localite: localiteRecherche.trim().length >= 2,
    budget: parseFloat(budgetMax) > 0 && parseFloat(revenuNet) > 0,
    mode: true,
    creneau: !!selected,
    coord: isCoordValid,
  };
  const missing = steps.findIndex((k) => !answered[k]);
  const { step, dir, go, pick } = useFunnelSteps(steps.length, missing === -1 ? steps.length - 1 : missing);
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const [tried, setTried] = useState(false);

  if (done) {
    const isManual = doneStatus === 'manual';
    return (
      <DoneScreen title={isManual ? 'Demande reçue' : 'Demande de rendez-vous enregistrée'}>
        {isManual ? (
          <>
            <p>
              Merci {prenom}, notre équipe analyse votre dossier et vous <strong className="font-semibold text-[#222222]">recontacte sous 24 h</strong> pour
              vous aider à structurer votre recherche (garant, ajustement du budget ou des localités…).
            </p>
            <Note>Aucun créneau n'a été pré-réservé pour l'instant. Vous recevrez un appel ou un e-mail pour organiser un échange adapté à votre situation.</Note>
          </>
        ) : (
          <>
            {selected && (
              <p>
                Créneau demandé : <strong className="font-semibold text-[#222222]">{formatDayLabel(selected.start)} à {selected.label}</strong> (30 min).
              </p>
            )}
            <p>
              Notre équipe valide votre créneau dans les meilleurs délais. Vous recevrez un e-mail de confirmation avec
              l'invitation calendrier (.ics) dès la validation.
            </p>
            <Note>
              {appointmentType === 'bureau' ? (
                <span className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 flex-none" /> Lieu prévu : {OFFICE_ADDRESS}{' '}
                  <a href={OFFICE_MAPS_URL} target="_blank" rel="noreferrer" className="cursor-pointer font-medium text-[#222222] underline">Itinéraire</a>
                </span>
              ) : (
                <span className="flex items-start gap-2"><PhoneCall className="mt-0.5 h-4 w-4 flex-none" /> Nous vous appellerons au numéro indiqué.</span>
              )}
            </Note>
          </>
        )}
        <p className="text-[14px] text-[#6a6a6a]">{isManual ? 'Dossier transmis à notre équipe.' : 'En attente de validation par notre équipe.'}</p>
      </DoneScreen>
    );
  }

  const ico = 'h-6 w-6';
  const next = (k: StepKey) => steps.indexOf(k) + 1;
  const pieceLabel = (o: string) => (o === 'Studio' || o === '4.5+' ? o : `${o} pièces`);

  const questions: Record<StepKey, { q: string; s?: string }> = {
    projet: { q: 'Quel est votre projet ?', s: "Pour qu'on prépare votre rendez-vous avec le bon expert." },
    statut: { q: 'Quel est votre statut en Suisse ?', s: 'Préqualification express, question 1 sur 6.' },
    situation: { q: 'Quelle est votre situation professionnelle ?', s: 'Question 2 sur 6.' },
    poursuites: { q: 'Avez-vous des poursuites ou des dettes ?', s: 'Question 3 sur 6.' },
    pieces: { q: 'Quel type de logement cherchez-vous ?', s: 'Question 4 sur 6.' },
    localite: { q: 'Dans quelle localité ou région ?', s: 'Question 5 sur 6.' },
    budget: { q: 'Votre budget et votre revenu', s: 'Question 6 sur 6. Le revenu net du ménage, par mois.' },
    mode: { q: 'Comment souhaitez-vous échanger ?', s: 'En personne dans nos bureaux ou par téléphone, au choix.' },
    creneau: { q: 'Choisissez votre créneau', s: 'Réservation en temps réel. Les créneaux pris sont barrés.' },
    coord: { q: 'Vos coordonnées', s: selected
      ? `${appointmentType === 'bureau' ? 'Rendez-vous au bureau' : 'Rendez-vous téléphonique'} le ${formatDayLabel(selected.start)} à ${selected.label}, 30 min.`
      : projet ? `Analyse personnalisée de votre dossier : ${PROJECT_LABELS[projet]}.` : undefined },
  };

  const onNext = () => {
    if (isLast) {
      setTried(true);
      if (isFormValid) handleSubmit();
      return;
    }
    if (answered[current]) go(step + 1);
  };

  const coordErrors = {
    prenom: prenom.trim().length < 2 ? 'Indiquez votre prénom.' : null,
    nom: nom.trim().length < 2 ? 'Indiquez votre nom.' : null,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Adresse e-mail invalide.' : null,
    telephone: telephone.trim().length < 8 ? 'Numéro de téléphone invalide.' : null,
  };

  const lastLabel = isNonQualifie
    ? 'Envoyer ma demande'
    : appointmentType === 'bureau' ? 'Confirmer mon RDV' : 'Confirmer mon appel';

  return (
    <FunnelPage>
      <FunnelHeader step={step} total={steps.length} />
      <FunnelMain>
        {step === 0 && (
          <FunnelIntro photo={officePhoto} alt="L'équipe Logisorama au bureau de Crissier"
            title="Un rendez-vous gratuit avec un conseiller"
            text="30 minutes au bureau de Crissier ou par téléphone. Location, achat, rénovation ou vente : on vous oriente clairement, sans engagement." />
        )}

        <StepTransition stepKey={current} dir={dir}>
          <Question {...questions[current]} />

          {current === 'projet' && (
            <ChoiceList>
              {PROJECT_OPTIONS.map((p, i) => (
                <Choice key={p.key} index={i} selected={projet === p.key}
                  onClick={() => pick(() => { setProjet(p.key); setSelected(null); }, 1)}
                  icon={<p.icon className={ico} strokeWidth={1.6} />} label={p.label} hint={p.sub.charAt(0).toUpperCase() + p.sub.slice(1)} />
              ))}
            </ChoiceList>
          )}

          {current === 'statut' && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {STATUT_SUISSE_OPTIONS.map((o, i) => (
                <Choice key={o} index={i} selected={statutSuisse === o} onClick={() => pick(() => setStatutSuisse(o), next('statut'))} label={o} />
              ))}
            </div>
          )}

          {current === 'situation' && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {SITUATION_PRO_OPTIONS.map((o, i) => (
                <Choice key={o} index={i} selected={situationPro === o} onClick={() => pick(() => setSituationPro(o), next('situation'))}
                  icon={<Briefcase className={ico} strokeWidth={1.6} />} label={o} />
              ))}
            </div>
          )}

          {current === 'poursuites' && (
            <ChoiceList>
              {POURSUITES_OPTIONS.map((o, i) => (
                <Choice key={o} index={i} selected={poursuites === o} onClick={() => pick(() => setPoursuites(o), next('poursuites'))}
                  icon={o === 'Aucune' ? <ShieldCheck className={ico} strokeWidth={1.6} /> : <ShieldAlert className={ico} strokeWidth={1.6} />} label={o} />
              ))}
            </ChoiceList>
          )}

          {current === 'pieces' && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {NB_PIECES_OPTIONS.map((o) => (
                <Tile key={o} selected={nbPieces === o} onClick={() => pick(() => setNbPieces(o), next('pieces'))}>{pieceLabel(o)}</Tile>
              ))}
            </div>
          )}

          {current === 'localite' && (
            <form className="mt-5" noValidate onSubmit={(e) => { e.preventDefault(); onNext(); }}>
              <Field id="rdv-localite" label="Localité ou région" value={localiteRecherche} onChange={setLocaliteRecherche} autoFocus
                placeholder="Lausanne, Renens, Morges, Nyon, Genève…" />
              <button type="submit" className="sr-only">Suivant</button>
            </form>
          )}

          {current === 'budget' && (
            <form className="mt-5 grid gap-3" noValidate onSubmit={(e) => { e.preventDefault(); onNext(); }}>
              <Field id="rdv-budget" label="Budget max, charges comprises" value={budgetMax} onChange={setBudgetMax} type="number" inputMode="numeric" min="0" suffix="CHF" autoFocus placeholder="2000" />
              <Field id="rdv-revenu" label="Revenu net mensuel du ménage" value={revenuNet} onChange={setRevenuNet} type="number" inputMode="numeric" min="0" suffix="CHF" placeholder="6000" />
              {liveRatio !== null && (
                <Note tone={liveRatio >= 3 ? 'ok' : liveRatio >= 2.5 ? 'neutral' : 'warn'}>
                  <span className="flex items-center justify-between gap-3">
                    <span>Ratio revenu / loyer</span>
                    <strong className="font-semibold">{liveRatio}×</strong>
                  </span>
                  <span className="mt-1 block text-[14px] opacity-80">Les régies demandent en général un revenu égal à 3 fois le loyer.</span>
                </Note>
              )}
              {qualification && isNonQualifie && (
                <Note tone="warn">
                  <strong className="font-semibold">Dossier à analyser par notre équipe.</strong> Vos informations seront transmises à un conseiller,
                  qui vous recontacte sous 24 h pour vous proposer une stratégie adaptée (garant, ajustement du budget…). Aucun créneau ne sera pré-réservé.
                </Note>
              )}
              <button type="submit" className="sr-only">Suivant</button>
            </form>
          )}

          {current === 'mode' && (
            <ChoiceList>
              <Choice index={0} selected={appointmentType === 'bureau'} onClick={() => pick(() => setAppointmentType('bureau'), next('mode'))}
                icon={<Building2 className={ico} strokeWidth={1.6} />} label="Au bureau" hint={`${OFFICE_ADDRESS} · café offert`} />
              <Choice index={1} selected={appointmentType === 'telephonique'} onClick={() => pick(() => setAppointmentType('telephonique'), next('mode'))}
                icon={<PhoneCall className={ico} strokeWidth={1.6} />} label="Par téléphone" hint="On vous appelle à l'heure choisie" />
            </ChoiceList>
          )}

          {current === 'creneau' && (
            <div className="mt-5">
              <p className="mb-2 text-[14px] font-semibold text-[#222222]">Jour</p>
              <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2">
                {availableDays.map((d) => {
                  const active = d.toDateString() === date.toDateString();
                  return (
                    <Tile key={d.toISOString()} selected={active} className="min-w-[84px] flex-none snap-start"
                      onClick={() => { setDate(d); setSelected(null); }}>
                      <span className="block capitalize">{d.toLocaleDateString('fr-CH', { weekday: 'short' })}</span>
                      <span className="block text-[13px] font-medium text-[#6a6a6a]">{d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short' })}</span>
                    </Tile>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {DAY_PARTS.map((dp) => (
                  <Tile key={dp.key} selected={activeDayPart === dp.key} onClick={() => setActiveDayPart(dp.key)}>
                    <span className="inline-flex items-center gap-2"><dp.icon className="h-4 w-4" />{dp.label}</span>
                    <span className="block text-[13px] font-medium text-[#6a6a6a]">{dp.range}</span>
                  </Tile>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {filtered.map((slot) => {
                  const isTaken = taken.has(slot.start.toISOString());
                  return (
                    <Tile key={slot.key} disabled={isTaken} strike={isTaken}
                      selected={selected?.start.getTime() === slot.start.getTime()}
                      onClick={() => pick(() => setSelected(slot), next('creneau'))}>
                      {slot.label}
                    </Tile>
                  );
                })}
              </div>
            </div>
          )}

          {current === 'coord' && (
            <form className="mt-5" noValidate onSubmit={(e) => { e.preventDefault(); onNext(); }}>
              <AnswerChips items={[
                { label: projet ? PROJECT_OPTIONS.find((p) => p.key === projet)?.label ?? '' : '', onClick: () => go(0), icon: projet === 'achat' ? Home : projet === 'vente' ? Banknote : projet === 'renovation' ? Hammer : KeyRound },
                ...(isLocation && budgetMax ? [{ label: `${budgetMax} CHF / mois`, onClick: () => go(steps.indexOf('budget')), icon: Wallet }] : []),
                ...(selected ? [{ label: `${selected.start.toLocaleDateString('fr-CH', { weekday: 'short', day: 'numeric', month: 'short' })} · ${selected.label}`, onClick: () => go(steps.indexOf('creneau')), icon: CalendarDays }] : []),
              ]} />
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field id="rdv-prenom" label="Prénom" value={prenom} onChange={setPrenom} autoComplete="given-name" autoFocus error={tried ? coordErrors.prenom : null} />
                  <Field id="rdv-nom" label="Nom" value={nom} onChange={setNom} autoComplete="family-name" error={tried ? coordErrors.nom : null} />
                </div>
                <Field id="rdv-email" label="E-mail" value={email} onChange={setEmail} type="email" inputMode="email" autoComplete="email" error={tried ? coordErrors.email : null} />
                <Field id="rdv-tel" label="Téléphone" value={telephone} onChange={setTelephone} type="tel" inputMode="tel" autoComplete="tel" placeholder="+41 …" error={tried ? coordErrors.telephone : null} />
                <TextArea id="rdv-msg" label="Message (facultatif)" value={message} onChange={setMessage} rows={3} placeholder="Précisez votre projet, votre budget, vos besoins…" />
              </div>
              <p className="mt-4 text-[13px] leading-[1.4] text-[#6a6a6a]">
                Gratuit et sans engagement. Vos données restent chez Logisorama.{' '}
                <a href="/politique-confidentialite" className="cursor-pointer font-medium text-[#222222] underline">Politique de confidentialité</a>
              </p>
              <button type="submit" className="sr-only">Envoyer</button>
            </form>
          )}
        </StepTransition>

        <TrustLine>
          <span>Bureau Logisorama · {OFFICE_ADDRESS}</span>
        </TrustLine>
      </FunnelMain>

      <FunnelBottomBar step={step} total={steps.length} onBack={() => go(step - 1)} onNext={onNext}
        nextDisabled={!isLast && !answered[current]} loading={submitting}
        nextLabel={isLast ? lastLabel : 'Suivant'} />
    </FunnelPage>
  );
}
