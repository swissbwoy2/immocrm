import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ArrowLeft, Phone, Mail, MapPin, Key, Calendar, FileText, Camera, Users,
  Building2, Save, Plus, Trash2,
} from 'lucide-react';

const STATUSES = [
  'new_request','to_qualify','missing_information','waiting_documents',
  'waiting_photos','ready_to_publish','published','visits_scheduled',
  'applications_received','sent_to_agency','rented','cancelled','archived',
];

export default function AdminRelouerDetail() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [cands, setCands] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (id) load(); }, [id]);

  const load = async () => {
    const [req, ph, dc, sl, cd, nt, tl] = await Promise.all([
      supabase.from('relouer_requests').select('*').eq('id', id!).maybeSingle(),
      supabase.from('relouer_photos').select('*').eq('request_id', id!).order('display_order'),
      supabase.from('relouer_documents').select('*').eq('request_id', id!).order('created_at'),
      supabase.from('relouer_visit_slots').select('*').eq('request_id', id!).order('slot_start'),
      supabase.from('relouer_candidates').select('*').eq('request_id', id!).order('created_at', { ascending: false }),
      supabase.from('relouer_notes').select('*').eq('request_id', id!).order('created_at', { ascending: false }),
      supabase.from('relouer_timeline').select('*').eq('request_id', id!).order('created_at', { ascending: false }).limit(50),
    ]);
    setR(req.data);
    setPhotos(ph.data || []);
    setDocs(dc.data || []);
    setSlots(sl.data || []);
    setCands(cd.data || []);
    setNotes(nt.data || []);
    setTimeline(tl.data || []);
  };

  const save = async (patch: any) => {
    setSaving(true);
    const { error } = await supabase.from('relouer_requests').update(patch).eq('id', id!);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success('Enregistré'); setR({ ...r, ...patch }); }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('relouer_notes').insert({
      request_id: id!, body: newNote.trim(), author_id: user?.id || null,
    });
    if (error) toast.error(error.message);
    else { setNewNote(''); load(); }
  };

  if (!r) return <div className="p-8 text-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <Link to="/admin/relouer" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour aux dossiers Relouer
      </Link>

      {/* Bandeau */}
      <Card className="p-5 mb-4 bg-gradient-to-br from-sky-50 to-blue-50 border-sky-100">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-full bg-white text-sky-700 flex items-center justify-center font-semibold">
              {(r.prenom?.[0] || '?') + (r.nom?.[0] || '')}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-sky-700 font-semibold">Client reloueur</div>
              <div className="text-xl font-bold">{r.prenom} {r.nom}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {[r.property_street, r.property_zip, r.property_city].filter(Boolean).join(', ') || 'Adresse non renseignée'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {r.telephone && (
              <Button size="sm" variant="outline" asChild>
                <a href={`tel:${r.telephone}`}><Phone className="h-4 w-4 mr-1" /> Appeler</a>
              </Button>
            )}
            {r.email && (
              <Button size="sm" variant="outline" asChild>
                <a href={`mailto:${r.email}`}><Mail className="h-4 w-4 mr-1" /> Email</a>
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4 items-center">
          <div className="text-xs text-muted-foreground">Statut :</div>
          <Select value={r.status} onValueChange={(v) => save({ status: v })}>
            <SelectTrigger className="w-56 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-4">
          <Section title="Logement" icon={Building2}>
            <Grid>
              <Field label="Type" v={r.property_type} k="property_type" onSave={save} />
              <Field label="Pièces" v={r.rooms} k="rooms" type="number" onSave={save} />
              <Field label="Surface (m²)" v={r.surface} k="surface" type="number" onSave={save} />
              <Field label="Étage" v={r.floor} k="floor" type="number" onSave={save} />
              <Field label="Rue" v={r.property_street} k="property_street" onSave={save} />
              <Field label="NPA" v={r.property_zip} k="property_zip" onSave={save} />
              <Field label="Ville" v={r.property_city} k="property_city" onSave={save} />
              <Field label="Canton" v={r.property_canton} k="property_canton" onSave={save} />
            </Grid>
          </Section>

          <Section title="Conditions de location" icon={Key}>
            <Grid>
              <Field label="Loyer net" v={r.rent_net} k="rent_net" type="number" onSave={save} />
              <Field label="Charges" v={r.charges} k="charges" type="number" onSave={save} />
              <Field label="Garantie" v={r.guarantee_amount} k="guarantee_amount" type="number" onSave={save} />
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

          <Section title={`Candidats (${cands.length})`} icon={Users}>
            {cands.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucun candidat pour le moment.</div>
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

        {/* Sidebar */}
        <div className="space-y-4">
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

          <Section title={`Photos (${photos.length})`} icon={Camera}>
            <div className="text-xs text-muted-foreground">Upload via dashboard reloueur ou MVP à compléter.</div>
          </Section>

          <Section title={`Documents (${docs.length})`} icon={FileText}>
            <div className="text-xs text-muted-foreground">Upload via dashboard reloueur ou MVP à compléter.</div>
          </Section>

          <Section title={`Créneaux (${slots.length})`} icon={Calendar}>
            {slots.length === 0
              ? <div className="text-xs text-muted-foreground">Aucun créneau.</div>
              : slots.map((s) => (
                  <div key={s.id} className="text-sm py-1 border-b last:border-0">
                    {new Date(s.slot_start).toLocaleString('fr-CH')} — {s.status}
                  </div>
                ))}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card className="p-5">
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

function Field({ label, v, k, type = 'text', onSave }: { label: string; v: any; k: string; type?: string; onSave: (p: any) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input
        defaultValue={v ?? ''}
        type={type}
        onBlur={(e) => {
          const newVal = type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value;
          if (newVal !== v) onSave({ [k]: newVal });
        }}
      />
    </div>
  );
}
