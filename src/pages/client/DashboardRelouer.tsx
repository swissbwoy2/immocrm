import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Key, MapPin, Camera, FileText, Calendar, Building2, Loader2, CheckCircle2, AlertCircle, Clock,
  Phone, Mail, User, Sparkles, Users, ArrowRight, ShieldCheck, KeyRound, Home, Hash, Layers,
} from 'lucide-react';
import { RelouerUploader } from '@/components/relouer/RelouerUploader';
import { RelouerSlotsManager } from '@/components/relouer/RelouerSlotsManager';
import { RelouerTimeline } from '@/components/relouer/RelouerTimeline';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { PremiumDashboardHeader, PremiumKPICard, PremiumAgentCard } from '@/components/premium';
import { QuickTileXL } from '@/components/client/dashboard/QuickTileXL';
import { DashboardAdBanner } from '@/components/client/dashboard/DashboardAdBanner';

const STATUS_HELP: Record<string, { label: string; tone: string; bgTone: string }> = {
  new_request:           { label: 'Nouvelle demande reçue', tone: 'text-blue-700',    bgTone: 'bg-blue-50 border-blue-200' },
  to_qualify:            { label: 'En cours de qualification par l\'équipe', tone: 'text-amber-700', bgTone: 'bg-amber-50 border-amber-200' },
  missing_information:   { label: 'Informations à compléter', tone: 'text-amber-700', bgTone: 'bg-amber-50 border-amber-200' },
  waiting_documents:     { label: 'Documents en attente de votre part', tone: 'text-amber-700', bgTone: 'bg-amber-50 border-amber-200' },
  waiting_photos:        { label: 'Photos en attente', tone: 'text-amber-700', bgTone: 'bg-amber-50 border-amber-200' },
  ready_to_publish:      { label: 'Dossier prêt à publier', tone: 'text-emerald-700', bgTone: 'bg-emerald-50 border-emerald-200' },
  published:             { label: 'Annonce publiée — visites possibles', tone: 'text-emerald-700', bgTone: 'bg-emerald-50 border-emerald-200' },
  visits_scheduled:      { label: 'Visites programmées', tone: 'text-indigo-700', bgTone: 'bg-indigo-50 border-indigo-200' },
  applications_received: { label: 'Candidatures reçues', tone: 'text-indigo-700', bgTone: 'bg-indigo-50 border-indigo-200' },
  sent_to_agency:        { label: 'Dossier transmis à la régie', tone: 'text-purple-700', bgTone: 'bg-purple-50 border-purple-200' },
  rented:                { label: 'Logement reloué — félicitations !', tone: 'text-emerald-800', bgTone: 'bg-emerald-100 border-emerald-300' },
  cancelled:             { label: 'Dossier annulé', tone: 'text-zinc-700', bgTone: 'bg-zinc-50 border-zinc-200' },
  archived:              { label: 'Dossier archivé', tone: 'text-zinc-700', bgTone: 'bg-zinc-50 border-zinc-200' },
};

const PROGRESS_STEPS = [
  { key: 'infos',        label: 'Informations logement',   check: (r: any) => !!(r.property_type && r.rooms && r.property_street) },
  { key: 'agency',       label: 'Contact régie',           check: (r: any) => !!(r.agency_name || r.agency_email) },
  { key: 'visit',        label: 'Contact pour les visites', check: (r: any) => !!(r.visit_contact_name || r.visit_contact_phone) },
  { key: 'photos',       label: 'Photos ajoutées',         check: (_: any, ctx: any) => ctx.photos > 0 },
  { key: 'docs',         label: 'Documents ajoutés',       check: (_: any, ctx: any) => ctx.docs > 0 },
  { key: 'slots',        label: 'Créneaux proposés',       check: (_: any, ctx: any) => ctx.slots > 0 },
  { key: 'validation',   label: 'Validation Immo-Rama',    check: (r: any) => ['ready_to_publish','published','visits_scheduled','applications_received','sent_to_agency','rented'].includes(r.status) },
  { key: 'published',    label: 'Annonce publiée',         check: (r: any) => ['published','visits_scheduled','applications_received','sent_to_agency','rented'].includes(r.status) },
  { key: 'visiting',     label: 'Visites en cours',        check: (r: any) => ['visits_scheduled','applications_received','sent_to_agency','rented'].includes(r.status) },
  { key: 'applications', label: 'Candidatures reçues',     check: (r: any, ctx: any) => ctx.candidates > 0 || ['applications_received','sent_to_agency','rented'].includes(r.status) },
  { key: 'sent',         label: 'Dossier transmis régie',  check: (r: any) => ['sent_to_agency','rented'].includes(r.status) },
  { key: 'rented',       label: 'Logement reloué',         check: (r: any) => r.status === 'rented' },
];

export default function DashboardRelouer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [r, setR] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [photosCount, setPhotosCount] = useState(0);
  const [docsCount, setDocsCount] = useState(0);
  const [slotsCount, setSlotsCount] = useState(0);
  const [candidatesCount, setCandidatesCount] = useState(0);
  const [photosValidated, setPhotosValidated] = useState(0);
  const [docsValidated, setDocsValidated] = useState(0);
  const [activeSlots, setActiveSlots] = useState(0);

  useEffect(() => {
    document.title = 'Mon logement à relouer | Logisorama';
    if (user) load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    const { data: prof } = await supabase.from('profiles').select('prenom, nom, email').eq('id', user!.id).maybeSingle();
    setProfile(prof);

    const { data: req } = await supabase
      .from('relouer_requests')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setR(req);

    if (req) {
      const [ph, dc, sl, cd] = await Promise.all([
        supabase.from('relouer_photos').select('status').eq('request_id', req.id),
        supabase.from('relouer_documents').select('status').eq('request_id', req.id),
        supabase.from('relouer_visit_slots').select('status').eq('request_id', req.id),
        supabase.from('relouer_candidates').select('id').eq('request_id', req.id),
      ]);
      const photos = ph.data || [];
      const docs = dc.data || [];
      const slots = sl.data || [];
      setPhotosCount(photos.length);
      setDocsCount(docs.length);
      setSlotsCount(slots.length);
      setCandidatesCount((cd.data || []).length);
      setPhotosValidated(photos.filter((p: any) => p.status === 'validated').length);
      setDocsValidated(docs.filter((d: any) => d.status === 'validated').length);
      setActiveSlots(slots.filter((s: any) => ['proposed', 'confirmed'].includes(s.status)).length);

      if (req.assigned_agent_id) {
        const { data: a } = await supabase
          .from('agents')
          .select('id, user_id, profile:profiles!agents_user_id_fkey(prenom, nom, email, telephone, avatar_url)')
          .eq('id', req.assigned_agent_id)
          .maybeSingle();
        if (a) setAgent({
          prenom: (a.profile as any)?.prenom, nom: (a.profile as any)?.nom,
          email: (a.profile as any)?.email, telephone: (a.profile as any)?.telephone,
          avatar_url: (a.profile as any)?.avatar_url,
        });
      } else { setAgent(null); }
    }
    setLoading(false);
  };

  const save = async (patch: any) => {
    if (!r) return;
    const { error } = await supabase.from('relouer_requests').update(patch).eq('id', r.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Enregistré');
    setR({ ...r, ...patch });
  };

  const ctx = { photos: photosCount, docs: docsCount, slots: slotsCount, candidates: candidatesCount };
  const stepsDone = useMemo(
    () => r ? PROGRESS_STEPS.filter((s) => s.check(r, ctx)).length : 0,
    [r, ctx],
  );
  const progressPct = Math.round((stepsDone / PROGRESS_STEPS.length) * 100);

  const nextAction = useMemo(() => {
    if (!r) return null;
    if (!r.property_type || !r.property_street) return 'Compléter les informations du logement';
    if (!r.agency_name && !r.agency_email) return 'Renseigner le contact de la régie';
    if (photosCount === 0) return 'Ajouter des photos de votre logement';
    if (docsCount === 0) return 'Ajouter le bail et la lettre de résiliation';
    if (slotsCount === 0) return 'Proposer des créneaux de visite';
    if (r.status === 'to_qualify' || r.status === 'missing_information') return 'L\'équipe Immo-Rama vérifie votre dossier';
    if (r.status === 'ready_to_publish') return 'Votre dossier est prêt — publication imminente';
    return 'Votre dossier suit son cours';
  }, [r, photosCount, docsCount, slotsCount]);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (!r) {
    return (
      <div className="flex-1 overflow-y-auto">
        <PremiumPageShellV2>
          <DashboardAdBanner />
          <PremiumDashboardHeader userName={profile?.prenom} parcoursType="relocation" headingBadge="Client reloueur" />
          <Card className="p-8 text-center">
            <Key className="h-10 w-10 text-primary mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Aucun dossier Relouer</h2>
            <p className="text-sm text-muted-foreground">
              Aucune demande « Relouer mon appartement » n'est encore associée à votre compte.
            </p>
          </Card>
        </PremiumPageShellV2>
      </div>
    );
  }

  const help = STATUS_HELP[r.status] || { label: r.status, tone: 'text-zinc-700', bgTone: 'bg-zinc-50 border-zinc-200' };
  const initials = (profile?.prenom?.[0] || '?') + (profile?.nom?.[0] || '');
  const fullName = `${profile?.prenom || ''} ${profile?.nom || ''}`.trim() || 'Client reloueur';
  const address = [r.property_street, r.property_zip, r.property_city].filter(Boolean).join(', ');

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="flex-1 overflow-y-auto">
    <PremiumPageShellV2>
      {/* Bannière : tout en haut de l'accueil */}
      <DashboardAdBanner />
      {/* EN-TÊTE — même habillage que le dashboard client */}
      <PremiumDashboardHeader
        userName={profile?.prenom}
        parcoursType="relocation"
        headingBadge="Client reloueur"
        subtitle={`${address || 'Adresse à compléter'}${nextAction ? ` — Prochaine étape : ${nextAction}` : ''}`}
      />

      {/* ACCÈS RAPIDES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 items-stretch">
        <QuickTileXL index={0} icon={Camera} title="Photos" subtitle={`${photosCount} ajoutée(s)`} onClick={() => scrollTo('section-photos')} />
        <QuickTileXL index={1} icon={FileText} title="Documents" subtitle={`${docsCount} ajouté(s)`} onClick={() => scrollTo('section-docs')} />
        <QuickTileXL index={2} icon={Calendar} title="Créneaux" subtitle={`${activeSlots} actif(s)`} onClick={() => scrollTo('section-slots')} />
        <QuickTileXL index={3} icon={MessageSquare} title="Messagerie" subtitle="Écrire à l'équipe" onClick={() => navigate('/client/messagerie')} />
      </div>

      {/* CONSEILLER */}
      {agent ? (
        <PremiumAgentCard
          agent={{ prenom: agent.prenom || '', nom: agent.nom || '', email: agent.email || '', telephone: agent.telephone || undefined }}
          onMessage={() => navigate('/client/messagerie')}
        />
      ) : (
        <Card className="p-4 text-sm text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Un conseiller vous sera bientôt assigné
        </Card>
      )}

      {/* BANDEAU D'ÉTAT */}
      <Card className={`p-5 border ${help.bgTone}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Sparkles className={`h-5 w-5 ${help.tone}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={`font-semibold ${help.tone}`}>{help.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Votre dossier de relocation est suivi par notre équipe. Ce bandeau évolue au fil des étapes.
            </div>
          </div>
        </div>
      </Card>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 items-stretch">
        <PremiumKPICard title="Progression" value={`${progressPct}%`} subtitle={`${stepsDone}/${PROGRESS_STEPS.length} étapes`} icon={Sparkles} />
        <PremiumKPICard title="Photos" value={photosCount} subtitle={`${photosValidated} validée(s)`} icon={Camera} variant="success" onClick={() => scrollTo('section-photos')} />
        <PremiumKPICard title="Documents" value={docsCount} subtitle={`${docsValidated} validé(s)`} icon={FileText} variant="success" onClick={() => scrollTo('section-docs')} />
        <PremiumKPICard title="Créneaux" value={activeSlots} subtitle="actif(s)" icon={Calendar} onClick={() => scrollTo('section-slots')} />
        <PremiumKPICard title="Candidatures" value={candidatesCount} subtitle="reçue(s)" icon={Users} />
        <PremiumKPICard title="Statut" value={help.label.split('—')[0].trim()} icon={CheckCircle2} variant="warning" />
      </div>

      {/* PROGRESSION DOSSIER */}
      <Card className="p-6 border-border">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Progression de votre relocation
          </h2>
          <Badge variant="outline" className="border-primary/30 text-primary">{progressPct}% complété</Badge>
        </div>
        <Progress value={progressPct} className="h-2 mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {PROGRESS_STEPS.map((s) => {
            const done = s.check(r, ctx);
            return (
              <div key={s.key} className={`flex items-center gap-2 p-3 rounded-xl border transition ${done ? 'bg-emerald-50/40 border-emerald-100' : 'bg-muted/30 border-border'}`}>
                {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" /> : <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                <span className={`text-sm ${done ? 'text-emerald-900 font-medium' : 'text-muted-foreground'}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* CONTENU 2 COL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* LOGEMENT */}
          <Section id="section-logement" title="Votre logement à relouer" icon={Home}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Type de bien" v={r.property_type} k="property_type" onSave={save} icon={Building2} />
              <Field label="Nombre de pièces" v={r.rooms} k="rooms" type="number" step="0.5" onSave={save} icon={Layers} />
              <Field label="Surface (m²)" v={r.surface} k="surface" type="number" onSave={save} />
              <Field label="Étage" v={r.floor} k="floor" type="number" onSave={save} />
              <Field label="Rue et numéro" v={r.property_street} k="property_street" onSave={save} icon={MapPin} />
              <Field label="NPA" v={r.property_zip} k="property_zip" onSave={save} icon={Hash} />
              <Field label="Commune" v={r.property_city} k="property_city" onSave={save} />
              <Field label="Canton" v={r.property_canton} k="property_canton" onSave={save} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <BoolBadge label="Ascenseur" v={r.has_elevator} k="has_elevator" onSave={save} />
              <BoolBadge label="Balcon" v={r.has_balcony} k="has_balcony" onSave={save} />
              <BoolBadge label="Terrasse" v={r.has_terrace} k="has_terrace" onSave={save} />
              <BoolBadge label="Jardin" v={r.has_garden} k="has_garden" onSave={save} />
              <BoolBadge label="Cave" v={r.has_cellar} k="has_cellar" onSave={save} />
              <BoolBadge label="Parking int." v={r.has_indoor_parking} k="has_indoor_parking" onSave={save} />
              <BoolBadge label="Meublé" v={r.furnished} k="furnished" onSave={save} />
              <BoolBadge label="Animaux OK" v={r.pets_allowed} k="pets_allowed" onSave={save} />
            </div>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground">Description du logement</label>
              <Textarea defaultValue={r.description || ''} onBlur={(e) => save({ description: e.target.value })} rows={3} />
            </div>
          </Section>

          {/* CONDITIONS */}
          <Section title="Conditions de location" icon={KeyRound}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Loyer net (CHF)" v={r.rent_net} k="rent_net" type="number" onSave={save} />
              <Field label="Charges (CHF)" v={r.charges} k="charges" type="number" onSave={save} />
              <Field label="Loyer brut (CHF)" v={r.rent_gross} k="rent_gross" type="number" onSave={save} />
              <Field label="Garantie (CHF)" v={r.guarantee_amount} k="guarantee_amount" type="number" onSave={save} />
              <Field label="Disponible dès le" v={r.availability_date} k="availability_date" type="date" onSave={save} />
              <Field label="Fin du bail actuel" v={r.current_lease_end_date} k="current_lease_end_date" type="date" onSave={save} />
            </div>
            {(!r.rent_net || !r.availability_date) && (
              <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Pensez à renseigner le loyer net et la date de disponibilité pour faciliter la diffusion.
              </div>
            )}
          </Section>

          {/* CONTACT RÉGIE */}
          <Section title="Contact régie" icon={Building2}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Nom de la régie" v={r.agency_name} k="agency_name" onSave={save} />
              <Field label="Personne de contact" v={r.agency_contact_name} k="agency_contact_name" onSave={save} />
              <Field label="Email régie" v={r.agency_email} k="agency_email" type="email" onSave={save} />
              <Field label="Téléphone régie" v={r.agency_phone} k="agency_phone" onSave={save} />
              <Field label="Adresse régie" v={r.agency_address} k="agency_address" onSave={save} />
              <Field label="Référence bail" v={r.lease_reference} k="lease_reference" onSave={save} />
            </div>
          </Section>

          {/* CONTACT VISITE */}
          <Section title="Contact pour les visites" icon={Calendar}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SelectField
                label="Qui gère les visites"
                v={r.visit_contact_type} k="visit_contact_type" onSave={save}
                options={['Moi-même', 'Régie', 'Coursier Immo-Rama', 'Conseiller Immo-Rama']}
              />
              <Field label="Nom du contact" v={r.visit_contact_name} k="visit_contact_name" onSave={save} />
              <Field label="Téléphone" v={r.visit_contact_phone} k="visit_contact_phone" onSave={save} />
              <Field label="Email" v={r.visit_contact_email} k="visit_contact_email" type="email" onSave={save} />
            </div>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground">Instructions d'accès (digicode, étage, etc.)</label>
              <Textarea defaultValue={r.visit_instructions || ''} onBlur={(e) => save({ visit_instructions: e.target.value })} rows={2} />
            </div>
          </Section>

          {/* PHOTOS */}
          <Section id="section-photos" title="Photos du logement" icon={Camera}>
            <RelouerUploader requestId={r.id} kind="photos" />
          </Section>

          {/* DOCUMENTS */}
          <Section id="section-docs" title="Documents du dossier" icon={FileText}>
            <RelouerUploader requestId={r.id} kind="documents" />
          </Section>

          {/* CRÉNEAUX */}
          <Section id="section-slots" title="Créneaux de visite" icon={Calendar}>
            <RelouerSlotsManager requestId={r.id} mode="client" />
          </Section>

          {/* CANDIDATURES */}
          <Section title="Candidatures et profils intéressés" icon={Users}>
            {candidatesCount === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border border-dashed rounded-xl text-center">
                Aucune candidature pour le moment. Les profils validés par votre conseiller apparaîtront ici.
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-900">
                {candidatesCount} candidature(s) en cours d'examen par l'équipe Immo-Rama. Les détails vous seront transmis après validation.
              </div>
            )}
          </Section>
        </div>

        {/* SIDEBAR DROITE */}
        <div className="space-y-6">
          <Section title="Historique du dossier" icon={Clock}>
            <RelouerTimeline requestId={r.id} limit={20} />
          </Section>
        </div>
      </div>
    </PremiumPageShellV2>
    </div>
  );
}

/* === UI Helpers === */

function Section({ id, title, icon: Icon, children }: { id?: string; title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card id={id} className="p-6 scroll-mt-20 transition hover:shadow-md">
      <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-foreground">
        <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h3>
      {children}
    </Card>
  );
}

function Field({ label, v, k, type = 'text', step, onSave, icon: Icon }: any) {
  return (
    <div>
      <label className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </label>
      <Input
        defaultValue={v ?? ''}
        type={type}
        step={step}
        className="mt-1"
        onBlur={(e) => {
          const newVal = type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value;
          if (newVal !== v) onSave({ [k]: newVal });
        }}
      />
    </div>
  );
}

function SelectField({ label, v, k, options, onSave }: any) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Select value={v || ''} onValueChange={(val) => onSave({ [k]: val })}>
        <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir…" /></SelectTrigger>
        <SelectContent>{options.map((o: string) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function BoolBadge({ label, v, k, onSave }: { label: string; v: any; k: string; onSave: (p: any) => void }) {
  const on = !!v;
  return (
    <button
      type="button"
      onClick={() => onSave({ [k]: !on })}
      className={`px-3 py-2 rounded-xl border text-xs font-medium transition text-left ${on ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'}`}
    >
      <div className="flex items-center gap-1.5">
        {on ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
        {label}
      </div>
    </button>
  );
}
