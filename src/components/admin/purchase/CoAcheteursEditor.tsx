import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Users, Pencil } from 'lucide-react';
import { toast } from 'sonner';

export interface CoAcheteur {
  id?: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  date_naissance?: string;
  nationalite?: string;
  type_permis?: string;
  etat_civil?: string;
  lien?: string; // conjoint, parent, partenaire, autre
  revenu_annuel?: number | null;
  fonds_propres?: number | null;
}

interface Props {
  value: CoAcheteur[];
  onSave: (next: CoAcheteur[]) => Promise<void>;
  readOnly?: boolean;
  title?: string;
}

export function CoAcheteursEditor({ value, onSave, readOnly, title = 'Co-acheteurs / co-propriétaires' }: Props) {
  const list = Array.isArray(value) ? value : [];
  return (
    <Card className="border-primary/20">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> {title}</h3>
          {!readOnly && (
            <CoAcheteurDialog
              onSubmit={async (co) => { await onSave([...list, { ...co, id: crypto.randomUUID() }]); toast.success('Co-acheteur ajouté'); }}
              trigger={<Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />Ajouter</Button>}
            />
          )}
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun co-acheteur enregistré.</p>
        ) : (
          <div className="space-y-2">
            {list.map((co, idx) => (
              <div key={co.id || idx} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{co.prenom} {co.nom} {co.lien && <Badge variant="outline" className="ml-2">{co.lien}</Badge>}</div>
                  <div className="text-xs text-muted-foreground truncate">{co.email || '—'}{co.telephone ? ` · ${co.telephone}` : ''}{co.etat_civil ? ` · ${co.etat_civil}` : ''}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    Revenu annuel : <span className="font-medium text-foreground">{co.revenu_annuel ? `CHF ${Number(co.revenu_annuel).toLocaleString('fr-CH')}` : '—'}</span>
                    {' · '}Fonds propres : <span className="font-medium text-foreground">{co.fonds_propres ? `CHF ${Number(co.fonds_propres).toLocaleString('fr-CH')}` : '—'}</span>
                  </div>
                </div>
                {!readOnly && (
                  <div className="flex gap-1 shrink-0">
                    <CoAcheteurDialog
                      initial={co}
                      onSubmit={async (next) => {
                        const newList = list.map((x, i) => (i === idx ? { ...next, id: co.id || crypto.randomUUID() } : x));
                        await onSave(newList); toast.success('Mis à jour');
                      }}
                      trigger={<Button size="sm" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button>}
                    />
                    <Button size="sm" variant="ghost" onClick={async () => {
                      const newList = list.filter((_, i) => i !== idx);
                      await onSave(newList);
                      toast.success('Co-acheteur supprimé');
                    }}><Trash2 className="h-3.5 w-3.5 text-red-600" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CoAcheteurDialog({ initial, onSubmit, trigger }: { initial?: CoAcheteur; onSubmit: (co: CoAcheteur) => Promise<void>; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [c, setC] = useState<CoAcheteur>(initial || {});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof CoAcheteur) => (e: any) => setC((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setC(initial || {}); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? 'Modifier le co-acheteur' : 'Ajouter un co-acheteur'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
          <Field label="Prénom"><Input value={c.prenom || ''} onChange={set('prenom')} /></Field>
          <Field label="Nom"><Input value={c.nom || ''} onChange={set('nom')} /></Field>
          <Field label="Email"><Input type="email" value={c.email || ''} onChange={set('email')} /></Field>
          <Field label="Téléphone"><Input value={c.telephone || ''} onChange={set('telephone')} /></Field>
          <Field label="Date de naissance"><Input type="date" value={c.date_naissance || ''} onChange={set('date_naissance')} /></Field>
          <Field label="Nationalité"><Input value={c.nationalite || ''} onChange={set('nationalite')} /></Field>
          <Field label="État civil"><Input value={c.etat_civil || ''} onChange={set('etat_civil')} placeholder="Célibataire, Marié(e)…" /></Field>
          <Field label="Type de permis"><Input value={c.type_permis || ''} onChange={set('type_permis')} /></Field>
          <Field label="Lien (conjoint, parent, partenaire…)"><Input value={c.lien || ''} onChange={set('lien')} /></Field>
          <Field label="Revenu annuel (CHF)"><Input type="number" value={c.revenu_annuel ?? ''} onChange={(e) => setC((p) => ({ ...p, revenu_annuel: e.target.value === '' ? null : Number(e.target.value) }))} /></Field>
          <Field label="Fonds propres (CHF)"><Input type="number" value={c.fonds_propres ?? ''} onChange={(e) => setC((p) => ({ ...p, fonds_propres: e.target.value === '' ? null : Number(e.target.value) }))} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button className="bg-gradient-to-r from-primary to-primary/80" disabled={saving} onClick={async () => {
            setSaving(true);
            try { await onSubmit(c); setOpen(false); }
            catch (e: any) { toast.error(e?.message || 'Erreur'); }
            finally { setSaving(false); }
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
