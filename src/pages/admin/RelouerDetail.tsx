import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, Phone, Mail, MapPin, Key, Calendar, FileText, Camera, Users,
  Building2, Plus, UserCheck, History, MessageCircle, ArrowRight, Sparkles,
  CheckCircle2, Clock, Home, Layers, Hash, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RelouerUploader } from '@/components/relouer/RelouerUploader';
import { RelouerSlotsManager } from '@/components/relouer/RelouerSlotsManager';
import { RelouerTimeline } from '@/components/relouer/RelouerTimeline';

const STATUSES = [
  'new_request','to_qualify','missing_information','waiting_documents',
  'waiting_photos','ready_to_publish','published','visits_scheduled',
  'applications_received','sent_to_agency','rented','cancelled','archived',
];

const STATUS_META: Record<string, { label: string; tone: string; bg: string; banner: string }> = {
  new_request:           { label: 'Nouvelle demande',            tone: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',       banner: 'Nouvelle demande reçue — à qualifier' },
  to_qualify:            { label: 'Dossier à qualifier',         tone: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     banner: 'Le dossier doit être qualifié' },
  missing_information:   { label: 'Informations manquantes',     tone: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     banner: 'Des informations sont manquantes' },
  waiting_documents:     { label: 'Documents manquants',         tone: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200',   banner: 'Des documents sont nécessaires' },
  waiting_photos:        { label: 'Photos manquantes',           tone: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200',   banner: 'Des photos sont nécessaires' },
  ready_to_publish:      { label: 'Prêt à publier',              tone: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', banner: 'Le logement est prêt à être diffusé' },
  published:             { label: 'Publié',                      tone: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', banner: 'Annonce publiée — visites possibles' },
  visits_scheduled:      { label: 'Visites en cours',            tone: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200',   banner: 'Des visites sont en cours' },
  applications_received: { label: 'Candidatures reçues',         tone: 'text-indigo-700',  bg: 'bg-indigo-50 border-indigo-200',   banner: 'Des candidatures sont reçues' },
  sent_to_agency:        { label: 'Transmis régie',              tone: 'text-purple-700',  bg: 'bg-purple-50 border-purple-200',   banner: 'Dossier transmis à la régie' },
  rented:                { label: 'Reloué',                      tone: 'text-emerald-800', bg: 'bg-emerald-100 border-emerald-300',banner: 'Logement reloué — mission accomplie' },
  cancelled:             { label: 'Annulé',                      tone: 'text-zinc-700',    bg: 'bg-zinc-50 border-zinc-200',       banner: 'Dossier annulé' },
  archived:              { label: 'Archivé',                     tone: 'text-zinc-700',    bg: 'bg-zinc-50 border-zinc-200',       banner: 'Dossier archivé' },
};

const PROGRESS_STEPS = [
  { key: 'infos',        label: 'Informations logement',   check: (r: any) => !!(r.property_type && r.rooms && r.property_street) },
  { key: 'agency',       label: 'Contact régie',           check: (r: any) => !!(r.agency_name || r.agency_email) },
  { key: 'visit',        label: 'Contact visite',          check: (r: any) => !!(r.visit_contact_name || r.visit_contact_phone) },
  { key: 'photos',       label: 'Photos',                  check: (_: any, c: any) => c.photos > 0 },
  { key: 'docs',         label: 'Documents',               check: (_: any, c: any) => c.docs > 0 },
  { key: 'slots',        label: 'Créneaux',                check: (_: any, c: any) => c.slots > 0 },
  { key: 'validation',   label: 'Validation',              check: (r: any) => ['ready_to_publish','published','visits_scheduled','applications_received','sent_to_agency','rented'].includes(r.status) },
  { key: 'published',    label: 'Publication',             check: (r: any) => ['published','visits_scheduled','applications_received','sent_to_agency','rented'].includes(r.status) },
  { key: 'visiting',     label: 'Visites',                 check: (r: any) => ['visits_scheduled','applications_received','sent_to_agency','rented'].includes(r.status) },
  { key: 'applications', label: 'Candidatures',            check: (r: any, c: any) => c.candidates > 0 || ['applications_received','sent_to_agency','rented'].includes(r.status) },
  { key: 'sent',         label: 'Transmission régie',      check: (r: any) => ['sent_to_agency','rented'].includes(r.status) },
  { key: 'rented',       label: 'Reloué',                  check: (r: any) => r.status === 'rented' },
];

export default function AdminRelouerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [r, setR] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [cands, setCands] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [counts, setCounts] = useState({ photos: 0, docs: 0, slots: 0, candidates: 0 });
  const [newNote, setNewNote] = useState('');

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    const [req, ag, cd, nt, ph, dc, sl] = await Promise.all([
      supabase.from('relouer_requests').select('*').eq('id', id!).maybeSingle(),
      supabase.from('agents').select('id, user_id, profile:profiles!agents_user_id_fkey(prenom, nom, email)').eq('statut', 'actif'),
      supabase.from('relouer_candidates').select('*').eq('request_id', id!).order('created_at', { ascending: false }),
      supabase.from('relouer_notes').select('*').eq('request_id', id!).order('created_at', { ascending: false }),
      supabase.from('relouer_photos').select('id', { count: 'exact', head: true }).eq('request_id', id!),
      supabase.from('relouer_documents').select('id', { count: 'exact', head: true }).eq('request_id', id!),
      supabase.from('relouer_visit_slots').select('id, status').eq('request_id', id!),
    ]);
    setR(req.data);
    setAgents(ag.data || []);
    setCands(cd.data || []);
    setNotes(nt.data || []);
    setCounts({
      photos: ph.count || 0,
      docs: dc.count || 0,
      slots: (sl.data || []).filter((s: any) => ['proposed', 'confirmed'].includes(s.status)).length,
      candidates: (cd.data || []).length,
    });
  };

  const logEvent = async (event_type: string, payload: any = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('relouer_timeline').insert({ request_id: id!, event_type, payload, created_by: user?.id || null });
  };

  const save = async (patch: any, evt?: string) => {
    const { error } = await supabase.from('relouer_requests').update(patch).eq('id', id!);
    if (error) { toast.error(error.message); return; }
    if (evt) await logEvent(evt, patch);
    toast.success('Enregistré');
    setR({ ...r, ...patch });
  };

  const assignAgent = async (agentId: string) => {
    const value = agentId === '__none__' ? null : agentId;
    await save({ assigned_agent_id: value }, 'agent_assigned');
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('relouer_notes').insert({ request_id: id!, body: newNote.trim(), author_id: user?.id || null });
    if (error) toast.error(error.message);
    else { setNewNote(''); load(); }
  };

  const stepsDone = useMemo(() => r ? PROGRESS_STEPS.filter((s) => s.check(r, counts)).length : 0, [r, counts]);
  const progressPct = r ? Math.round((stepsDone / PROGRESS_STEPS.length) * 100) : 0;

  const nextAction = useMemo(() => {
    if (!r) return null;
    if (!r.assigned_agent_id) return 'Assigner un agent';
    if (!r.property_type || !r.property_street) return 'Compléter les informations du logement';
    if (!r.agency_name && !r.agency_email) return 'Renseigner la régie';
    if (counts.photos === 0) return 'Réclamer des photos';
    if (counts.docs === 0) return 'Réclamer le bail et la résiliation';
    if (counts.slots === 0) return 'Proposer des créneaux';
    if (r.status === 'to_qualify') return 'Qualifier le dossier';
    if (r.status === 'ready_to_publish') return 'Publier l\'annonce';
    return 'Suivre le dossier';
  }, [r, counts]);

  if (!r) return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;

  const currentAgent = agents.find((a) => a.id === r.assigned_agent_id);
  const agentLabel = currentAgent ? `${(currentAgent.profile as any)?.prenom || ''} ${(currentAgent.profile as any)?.nom || ''}`.trim() : null;
  const status = STATUS_META[r.status] || { label: r.status, tone: 'text-zinc-700', bg: 'bg-zinc-50 border-zinc-200', banner: r.status };
  const initials = (r.prenom?.[0] || '?') + (r.nom?.[0] || '');
  const address = [r.property_street, r.property_zip, r.property_city].filter(Boolean).join(', ');

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <Link to="/admin/clients?tab=reloueurs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour aux clients reloueurs
      </Link>

      {/* HEADER PREMIUM */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-6 md:p-8">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row gap-6 lg:items-start lg:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-md text-sky-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <Badge className="bg-sky-600 hover:bg-sky-600 text-white border-0 mb-2">
                <Key className="h-3 w-3 mr-1" /> Client reloueur
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{r.prenom} {r.nom}</h1>
              <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                <MapPin className="h-4 w-4" /> {address || 'Adresse à compléter'}
              </div>
              <div className={cn("text-sm font-medium mt-2", status.tone)}>{status.label}</div>
              {nextAction && (
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <ArrowRight className="h-3 w-3" /> Prochaine action : <span className="font-medium text-foreground">{nextAction}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2 justify-end">
              {r.email && (
                <Button size="sm" variant="outline" className="bg-white" asChild>
                  <a href={`mailto:${r.email}`}><Mail className="h-4 w-4 mr-1" /> Email</a>
                </Button>
              )}
              {r.telephone && (
                <>
                  <Button size="sm" variant="outline" className="bg-white" asChild>
                    <a href={`https://wa.me/${r.telephone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">
                      <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                    </a>
                  </Button>
                  <Button size="sm" className="bg-sky-600 hover:bg-sky-700" asChild>
                    <a href={`tel:${r.telephone}`}><Phone className="h-4 w-4 mr-1" /> Appeler</a>
                  </Button>
                </>
              )}
            </div>
            <div className="flex flex-wrap gap-2 items-center justify-end">
              <Select value={r.status} onValueChange={(v) => save({ status: v }, 'status_changed')}>
                <SelectTrigger className="w-52 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_META[s]?.label || s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={r.assigned_agent_id || '__none__'} onValueChange={assignAgent}>
                <SelectTrigger className="w-56 bg-white">
                  <UserCheck className="h-4 w-4 mr-1 text-sky-600" />
                  <SelectValue placeholder="Aucun agent assigné">{agentLabel || 'Aucun agent assigné'}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Aucun agent —</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {(a.profile as any)?.prenom} {(a.profile as any)?.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* BANDEAU STATUT */}
      <Card className={cn('p-5 border', status.bg)}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Sparkles className={cn('h-5 w-5', status.tone)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn('font-semibold', status.tone)}>{status.banner}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Le bandeau évolue au fil des étapes du dossier reloueur.
            </div>
          </div>
        </div>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        <Kpi icon={Sparkles}     label="Progression"  value={`${progressPct}%`} sub={`${stepsDone}/${PROGRESS_STEPS.length}`} color="text-sky-600" />
        <Kpi icon={Camera}       label="Photos"       value={counts.photos}      sub="reçues" color="text-emerald-600" />
        <Kpi icon={FileText}     label="Documents"    value={counts.docs}        sub="reçus"  color="text-emerald-600" />
        <Kpi icon={Calendar}     label="Créneaux"     value={counts.slots}       sub="actifs" color="text-indigo-600" />
        <Kpi icon={Users}        label="Candidatures" value={counts.candidates}  sub="reçues" color="text-indigo-600" />
        <Kpi icon={UserCheck}    label="Agent"        value={agentLabel ? '✓' : '—'} sub={agentLabel || 'Non assigné'} color={agentLabel ? 'text-emerald-600' : 'text-orange-600'} small />
        <Kpi icon={ArrowRight}   label="Prochaine"    value="→" sub={nextAction || '—'} color="text-amber-600" small />
      </div>

      {/* PROGRESSION 12 ÉTAPES */}
      <Card className="p-6 border-sky-100">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-sky-600" /> Progression du dossier reloueur
          </h2>
          <Badge variant="outline" className="border-sky-200 text-sky-700">{progressPct}% complété</Badge>
        </div>
        <Progress value={progressPct} className="h-2 mb-5" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {PROGRESS_STEPS.map((s) => {
            const done = s.check(r, counts);
            return (
              <div key={s.key} className={cn('flex items-center gap-2 p-3 rounded-xl border transition', done ? 'bg-emerald-50/50 border-emerald-100' : 'bg-muted/30 border-border')}>
                {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" /> : <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                <span className={cn('text-sm', done ? 'text-emerald-900 font-medium' : 'text-muted-foreground')}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* CONTENU 2 COL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section title="Client / locataire sortant" icon={UserCheck}>
            <Grid>
              <Field label="Prénom" v={r.prenom} k="prenom" onSave={save} />
              <Field label="Nom" v={r.nom} k="nom" onSave={save} />
              <Field label="Email" v={r.email} k="email" type="email" onSave={save} />
              <Field label="Téléphone" v={r.telephone} k="telephone" onSave={save} />
            </Grid>
          </Section>

          <Section title="Logement à relouer" icon={Home}>
            <Grid>
              <Field label="Type de bien" v={r.property_type} k="property_type" onSave={save} icon={Building2} />
              <Field label="Nombre de pièces" v={r.rooms} k="rooms" type="number" step="0.5" onSave={save} icon={Layers} />
              <Field label="Surface (m²)" v={r.surface} k="surface" type="number" onSave={save} />
              <Field label="Étage" v={r.floor} k="floor" type="number" onSave={save} />
              <Field label="Rue" v={r.property_street} k="property_street" onSave={save} icon={MapPin} />
              <Field label="NPA" v={r.property_zip} k="property_zip" onSave={save} icon={Hash} />
              <Field label="Commune" v={r.property_city} k="property_city" onSave={save} />
              <Field label="Canton" v={r.property_canton} k="property_canton" onSave={save} />
            </Grid>
          </Section>

          <Section title="Conditions de location" icon={Key}>
            <Grid>
              <Field label="Loyer net (CHF)" v={r.rent_net} k="rent_net" type="number" onSave={save} />
              <Field label="Charges (CHF)" v={r.charges} k="charges" type="number" onSave={save} />
              <Field label="Garantie (CHF)" v={r.guarantee_amount} k="guarantee_amount" type="number" onSave={save} />
              <Field label="Disponible le" v={r.availability_date} k="availability_date" type="date" onSave={save} />
              <Field label="Fin du bail" v={r.current_lease_end_date} k="current_lease_end_date" type="date" onSave={save} />
            </Grid>
          </Section>

          <Section title="Contact régie" icon={Building2}>
            <Grid>
              <Field label="Nom régie" v={r.agency_name} k="agency_name" onSave={save} />
              <Field label="Contact" v={r.agency_contact_name} k="agency_contact_name" onSave={save} />
              <Field label="Email régie" v={r.agency_email} k="agency_email" onSave={save} />
              <Field label="Tél régie" v={r.agency_phone} k="agency_phone" onSave={save} />
              <Field label="Référence bail" v={r.lease_reference} k="lease_reference" onSave={save} />
            </Grid>
          </Section>

          <Section title="Contact visite" icon={Calendar}>
            <Grid>
              <Field label="Type" v={r.visit_contact_type} k="visit_contact_type" onSave={save} />
              <Field label="Nom" v={r.visit_contact_name} k="visit_contact_name" onSave={save} />
              <Field label="Email" v={r.visit_contact_email} k="visit_contact_email" onSave={save} />
              <Field label="Téléphone" v={r.visit_contact_phone} k="visit_contact_phone" onSave={save} />
            </Grid>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground">Instructions d'accès</label>
              <Textarea defaultValue={r.visit_instructions || ''} onBlur={(e) => save({ visit_instructions: e.target.value })} />
            </div>
          </Section>

          <Section title="Photos du logement" icon={Camera}>
            <RelouerUploader requestId={r.id} kind="photos" />
          </Section>

          <Section title="Documents du dossier" icon={FileText}>
            <RelouerUploader requestId={r.id} kind="documents" />
          </Section>

          <Section title="Créneaux de visite" icon={Calendar}>
            <RelouerSlotsManager requestId={r.id} mode="admin" />
          </Section>

          <Section title={`Candidatures (${cands.length})`} icon={Users}>
            {cands.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucune candidature pour le moment.</div>
            ) : (
              <div className="space-y-2">
                {cands.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <div className="font-medium">{c.prenom} {c.nom}</div>
                      <div className="text-xs text-muted-foreground">{c.email} · {c.phone}</div>
                    </div>
                    <Badge>{c.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Notes internes" icon={FileText}>
            <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Note interne (non visible client)…" rows={3} />
            <Button size="sm" className="mt-2 w-full" onClick={addNote}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
            <div className="mt-4 space-y-2 max-h-64 overflow-auto">
              {notes.map((n) => (
                <div key={n.id} className="p-2 rounded bg-muted/40 text-sm">
                  <div className="whitespace-pre-wrap">{n.body}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString('fr-CH')}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Historique du dossier" icon={History}>
            <RelouerTimeline requestId={r.id} limit={40} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, color, small }: { icon: any; label: string; value: any; sub?: string; color?: string; small?: boolean }) {
  return (
    <Card className="p-3 bg-white border-sky-100">
      <div className={cn('flex items-center gap-1 text-[10px] uppercase tracking-wide', color || 'text-muted-foreground')}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={cn('font-bold mt-1 truncate', small ? 'text-sm' : 'text-xl')}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground truncate">{sub}</div>}
    </Card>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card className="p-5 border-sky-100">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-sky-600" /> {title}
      </h3>
      {children}
    </Card>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, v, k, type = 'text', step, onSave, icon: Icon }: { label: string; v: any; k: string; type?: string; step?: string; onSave: (p: any) => void; icon?: any }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </label>
      <Input
        defaultValue={v ?? ''}
        type={type}
        step={step}
        onBlur={(e) => {
          const newVal = type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value;
          if (newVal !== v) onSave({ [k]: newVal });
        }}
      />
    </div>
  );
}
