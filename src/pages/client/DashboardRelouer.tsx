import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Key, MapPin, Camera, FileText, Calendar, Building2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const STATUS_HELP: Record<string, { label: string; tone: string }> = {
  new_request: { label: 'Nouvelle demande reçue', tone: 'text-blue-600' },
  to_qualify: { label: 'En cours de qualification par l\'équipe', tone: 'text-amber-600' },
  missing_information: { label: 'Informations manquantes', tone: 'text-amber-600' },
  waiting_documents: { label: 'Documents en attente de votre part', tone: 'text-amber-600' },
  waiting_photos: { label: 'Photos en attente', tone: 'text-amber-600' },
  ready_to_publish: { label: 'Prêt à publier', tone: 'text-emerald-600' },
  published: { label: 'Annonce publiée', tone: 'text-emerald-600' },
  visits_scheduled: { label: 'Visites programmées', tone: 'text-indigo-600' },
  applications_received: { label: 'Candidatures reçues', tone: 'text-indigo-600' },
  sent_to_agency: { label: 'Dossier transmis à la régie', tone: 'text-purple-600' },
  rented: { label: 'Reloué — bravo !', tone: 'text-emerald-700' },
  cancelled: { label: 'Dossier annulé', tone: 'text-zinc-600' },
  archived: { label: 'Dossier archivé', tone: 'text-zinc-600' },
};

export default function DashboardRelouer() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [r, setR] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [cands, setCands] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Mon logement à relouer | Logisorama';
    if (user) load();
  }, [user]);

  const load = async () => {
    setLoading(true);
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
        supabase.from('relouer_photos').select('*').eq('request_id', req.id).order('display_order'),
        supabase.from('relouer_documents').select('*').eq('request_id', req.id),
        supabase.from('relouer_visit_slots').select('*').eq('request_id', req.id).order('slot_start'),
        supabase.from('relouer_candidates').select('*').eq('request_id', req.id),
      ]);
      setPhotos(ph.data || []);
      setDocs(dc.data || []);
      setSlots(sl.data || []);
      setCands(cd.data || []);
    }
    setLoading(false);
  };

  const save = async (patch: any) => {
    setSaving(true);
    const { error } = await supabase.from('relouer_requests').update(patch).eq('id', r.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success('Enregistré'); setR({ ...r, ...patch }); }
  };

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-sky-600" /></div>;
  }

  if (!r) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
        <Card className="p-8">
          <Key className="h-10 w-10 text-sky-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold mb-2">Aucun dossier Relouer</h1>
          <p className="text-sm text-muted-foreground">
            Aucune demande "Relouer mon appartement" n'est encore associée à votre compte.
          </p>
        </Card>
      </div>
    );
  }

  const help = STATUS_HELP[r.status] || { label: r.status, tone: 'text-zinc-600' };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 p-6 mb-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-sm">
            <Key className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Mon logement à relouer</h1>
            <div className={`text-sm mt-0.5 ${help.tone}`}>{help.label}</div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
          <MapPin className="h-4 w-4" />
          {[r.property_street, r.property_zip, r.property_city].filter(Boolean).join(', ') || 'Adresse à compléter'}
        </div>
      </div>

      {/* Résumé cartes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <SummaryCard icon={Camera} label="Photos" value={photos.length} validated={photos.filter((p) => p.status === 'validated').length} />
        <SummaryCard icon={FileText} label="Documents" value={docs.length} validated={docs.filter((d) => d.status === 'validated').length} />
        <SummaryCard icon={Calendar} label="Créneaux" value={slots.length} />
        <SummaryCard icon={Building2} label="Candidatures" value={cands.length} />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <Section title="Informations du logement" icon={Building2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Type" v={r.property_type} k="property_type" onSave={save} />
            <Field label="Pièces" v={r.rooms} k="rooms" type="number" onSave={save} />
            <Field label="Surface (m²)" v={r.surface} k="surface" type="number" onSave={save} />
            <Field label="Étage" v={r.floor} k="floor" type="number" onSave={save} />
            <Field label="Loyer net (CHF)" v={r.rent_net} k="rent_net" type="number" onSave={save} />
            <Field label="Charges (CHF)" v={r.charges} k="charges" type="number" onSave={save} />
            <Field label="Disponible le" v={r.availability_date} k="availability_date" type="date" onSave={save} />
            <Field label="Fin du bail" v={r.current_lease_end_date} k="current_lease_end_date" type="date" onSave={save} />
          </div>
          <div className="mt-3">
            <label className="text-xs text-muted-foreground">Description</label>
            <Textarea defaultValue={r.description || ''} onBlur={(e) => save({ description: e.target.value })} rows={3} />
          </div>
        </Section>

        <Section title="Contact régie" icon={Building2}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nom régie" v={r.agency_name} k="agency_name" onSave={save} />
            <Field label="Personne contact" v={r.agency_contact_name} k="agency_contact_name" onSave={save} />
            <Field label="Email régie" v={r.agency_email} k="agency_email" onSave={save} />
            <Field label="Téléphone régie" v={r.agency_phone} k="agency_phone" onSave={save} />
          </div>
        </Section>

        <Section title="Contact pour les visites" icon={Calendar}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Nom du contact" v={r.visit_contact_name} k="visit_contact_name" onSave={save} />
            <Field label="Téléphone" v={r.visit_contact_phone} k="visit_contact_phone" onSave={save} />
            <Field label="Email" v={r.visit_contact_email} k="visit_contact_email" onSave={save} />
          </div>
          <div className="mt-3">
            <label className="text-xs text-muted-foreground">Instructions d'accès (digicode, étage, etc.)</label>
            <Textarea defaultValue={r.visit_instructions || ''} onBlur={(e) => save({ visit_instructions: e.target.value })} rows={2} />
          </div>
        </Section>

        <Section title="Photos" icon={Camera}>
          {photos.length === 0
            ? <div className="text-sm text-muted-foreground">Aucune photo. Contactez votre conseiller pour en ajouter.</div>
            : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {photos.map((p) => (
                  <div key={p.id} className="aspect-square rounded-lg bg-muted overflow-hidden relative">
                    {p.storage_path && (
                      <img src={p.storage_path.startsWith('http') ? p.storage_path : `/${p.storage_path}`} alt="" className="w-full h-full object-cover" />
                    )}
                    <Badge className="absolute top-1 right-1 text-[10px]">{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
        </Section>

        <Section title="Documents" icon={FileText}>
          {docs.length === 0
            ? <div className="text-sm text-muted-foreground">Aucun document.</div>
            : docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="text-sm font-medium">{d.document_type}</div>
                    <div className="text-xs text-muted-foreground">{d.filename}</div>
                  </div>
                  <Badge variant="outline">{d.status}</Badge>
                </div>
              ))}
        </Section>
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

function SummaryCard({ icon: Icon, label, value, validated }: { icon: any; label: string; value: number; validated?: number }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <Icon className="h-5 w-5 text-sky-600" />
      <div className="min-w-0">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-[11px] text-muted-foreground">
          {label}{validated != null && value > 0 && ` · ${validated} validé(s)`}
        </div>
      </div>
    </Card>
  );
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
