import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { annualToMonthly, monthlyToAnnual } from '@/lib/buyerProfile';


// ---------- Generic field grid ----------
export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

export function NumField({ label, value, onChange, suffix }: any) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
        {suffix && <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

export function TxtField({ label, value, onChange, type = 'text' }: any) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function AreaField({ label, value, onChange }: any) {
  return (
    <div className="md:col-span-2">
      <Label className="text-xs">{label}</Label>
      <Textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} rows={3} />
    </div>
  );
}

export function SelField({ label, value, onChange, options }: { label: string; value: any; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------- Financing Editor ----------
export function FinancingEditorDialog({ financing, onSave }: { financing: any; onSave: (patch: any) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>(financing || {});
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (v: any) => setF((p: any) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(financing || {}); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Pencil className="h-3.5 w-3.5 mr-1" />Modifier financement</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Financement & tenue des charges</DialogTitle></DialogHeader>

        <h3 className="font-semibold text-sm mt-2">Revenus</h3>
        <p className="text-xs text-muted-foreground -mt-1">
          Le revenu annuel est la référence bancaire. Le champ mensuel est synchronisé automatiquement (annuel ÷ 12).
        </p>
        <FieldGrid>
          <NumField
            label="Revenu annuel retenu"
            value={f.revenu_annuel_retenu}
            onChange={(v: number | null) => setF((p: any) => ({ ...p, revenu_annuel_retenu: v }))}
            suffix="CHF/an"
          />
          <NumField
            label="Revenu mensuel (dérivé)"
            value={f.revenu_annuel_retenu == null ? null : annualToMonthly(f.revenu_annuel_retenu)}
            onChange={(v: number | null) => setF((p: any) => ({ ...p, revenu_annuel_retenu: v == null ? null : monthlyToAnnual(v) }))}
            suffix="CHF/mois"
          />

          <NumField label="Bonus / commissions (moy. 3 ans)" value={f.bonus_3ans_moyenne} onChange={set('bonus_3ans_moyenne')} suffix="CHF" />
          <NumField label="Allocations familiales" value={f.allocations_familiales} onChange={set('allocations_familiales')} suffix="CHF" />
          <NumField label="Pensions reçues" value={f.pensions_recues} onChange={set('pensions_recues')} suffix="CHF" />
          <NumField label="Revenus locatifs" value={f.revenus_locatifs} onChange={set('revenus_locatifs')} suffix="CHF" />
          <NumField label="Rentes AVS / AI / LPP" value={f.rentes_avs_ai_lpp} onChange={set('rentes_avs_ai_lpp')} suffix="CHF" />
          <NumField label="Autres revenus" value={f.autres_revenus} onChange={set('autres_revenus')} suffix="CHF" />
        </FieldGrid>

        <h3 className="font-semibold text-sm mt-4">Fonds propres</h3>
        <FieldGrid>
          <NumField label="Cash" value={f.fonds_propres_cash} onChange={set('fonds_propres_cash')} suffix="CHF" />
          <NumField label="Épargne" value={f.fonds_propres_epargne} onChange={set('fonds_propres_epargne')} suffix="CHF" />
          <NumField label="3ᵉ pilier 3a" value={f.fonds_propres_3a} onChange={set('fonds_propres_3a')} suffix="CHF" />
          <NumField label="LPP" value={f.fonds_propres_lpp} onChange={set('fonds_propres_lpp')} suffix="CHF" />
          <NumField label="Libre passage" value={f.fonds_propres_libre_passage} onChange={set('fonds_propres_libre_passage')} suffix="CHF" />
          <NumField label="EPL disponible" value={f.montant_epl_disponible} onChange={set('montant_epl_disponible')} suffix="CHF" />
          <NumField label="Placements" value={f.placements} onChange={set('placements')} suffix="CHF" />
          <NumField label="Donation / avance hoirie" value={f.donation_avance_hoirie} onChange={set('donation_avance_hoirie')} suffix="CHF" />
        </FieldGrid>

        <h3 className="font-semibold text-sm mt-4">Engagements financiers (mensuels)</h3>
        <FieldGrid>
          <NumField label="Leasing" value={f.leasing_mensuel} onChange={set('leasing_mensuel')} suffix="CHF/mois" />
          <NumField label="Crédit privé" value={f.credit_prive_mensuel} onChange={set('credit_prive_mensuel')} suffix="CHF/mois" />
          <NumField label="Cartes de crédit" value={f.cartes_credit_mensuel} onChange={set('cartes_credit_mensuel')} suffix="CHF/mois" />
          <NumField label="Pensions versées (annuel)" value={f.pensions_versees} onChange={set('pensions_versees')} suffix="CHF/an" />
          <NumField label="Autres engagements (annuel)" value={f.autres_engagements} onChange={set('autres_engagements')} suffix="CHF/an" />
        </FieldGrid>

        <h3 className="font-semibold text-sm mt-4">Situation familiale & identité</h3>
        <FieldGrid>
          <TxtField label="Situation familiale" value={f.situation_familiale} onChange={set('situation_familiale')} />
          <NumField label="Nombre d'enfants" value={f.nombre_enfants} onChange={set('nombre_enfants')} />
          <TxtField label="Date de naissance" value={f.date_naissance} onChange={set('date_naissance')} type="date" />
          <TxtField label="Nationalité" value={f.nationalite} onChange={set('nationalite')} />
          <TxtField label="Type de permis" value={f.type_permis} onChange={set('type_permis')} />
        </FieldGrid>

        <h3 className="font-semibold text-sm mt-4">Cible & banque</h3>
        <FieldGrid>
          <NumField label="Prix cible" value={f.prix_cible} onChange={set('prix_cible')} suffix="CHF" />
          <NumField label="Budget cible" value={f.budget_cible} onChange={set('budget_cible')} suffix="CHF" />
          <TxtField label="Partenaire bancaire" value={f.partenaire_bancaire} onChange={set('partenaire_bancaire')} />
          <SelField label="Statut bancaire" value={f.statut_bancaire} onChange={set('statut_bancaire')} options={[
            { value: 'a_evaluer', label: 'À évaluer' },
            { value: 'en_analyse', label: 'En analyse' },
            { value: 'prevalidé', label: 'Prévalidé' },
            { value: 'valide', label: 'Validé' },
            { value: 'refuse', label: 'Refusé' },
            { value: 'bloqué', label: 'Bloqué' },
          ]} />
          <AreaField label="Commentaire interne" value={f.commentaire_interne} onChange={set('commentaire_interne')} />
        </FieldGrid>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button className="bg-gradient-to-r from-primary to-primary/80" disabled={saving} onClick={async () => {
            setSaving(true);
            try { await onSave(f); toast.success('Financement enregistré'); setOpen(false); }
            catch (e: any) { toast.error(e?.message || 'Erreur'); }
            finally { setSaving(false); }
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Property Editor ----------
export function PropertyEditorDialog({ initial, onSave, trigger }: { initial?: any; onSave: (row: any) => Promise<void>; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<any>(initial || {});
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (v: any) => setP((prev: any) => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setP(initial || {}); }}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />Ajouter un bien</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.id ? 'Modifier le bien' : 'Ajouter un bien'}</DialogTitle></DialogHeader>
        <FieldGrid>
          <TxtField label="Titre" value={p.titre} onChange={set('titre')} />
          <TxtField label="Adresse" value={p.adresse} onChange={set('adresse')} />
          <TxtField label="NPA" value={p.npa} onChange={set('npa')} />
          <TxtField label="Ville" value={p.ville} onChange={set('ville')} />
          <NumField label="Prix" value={p.prix} onChange={set('prix')} suffix="CHF" />
          <NumField label="Surface" value={p.surface} onChange={set('surface')} suffix="m²" />
          <NumField label="Nombre de pièces" value={p.pieces} onChange={set('pieces')} />
          <NumField label="Étage" value={p.etage} onChange={set('etage')} />
          <NumField label="Année construction" value={p.annee_construction} onChange={set('annee_construction')} />
          <TxtField label="Lien de l'annonce" value={p.lien_annonce} onChange={set('lien_annonce')} />
          <NumField label="Latitude" value={p.latitude} onChange={set('latitude')} />
          <NumField label="Longitude" value={p.longitude} onChange={set('longitude')} />
          <NumField label="Score Immo-Rama (0-100)" value={p.score_immorama} onChange={set('score_immorama')} />
          <SelField label="Statut" value={p.statut} onChange={set('statut')} options={[
            { value: 'a_analyser', label: 'À analyser' },
            { value: 'visite_planifiee', label: 'Visite planifiée' },
            { value: 'visite_effectuee', label: 'Visite effectuée' },
            { value: 'offre_recommandee', label: 'Offre recommandée' },
            { value: 'offre_envoyee', label: 'Offre envoyée' },
            { value: 'refuse', label: 'Écarté' },
          ]} />
          <TxtField label="Prochaine action" value={p.prochaine_action} onChange={set('prochaine_action')} />
          <AreaField label="Notes" value={p.notes} onChange={set('notes')} />
        </FieldGrid>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button disabled={saving} onClick={async () => {
            setSaving(true);
            try { await onSave(p); toast.success('Bien enregistré'); setOpen(false); }
            catch (e: any) { toast.error(e?.message || 'Erreur'); }
            finally { setSaving(false); }
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Visit Report Editor ----------
export function VisitReportEditorDialog({ initial, properties, onSave, trigger }: { initial?: any; properties: any[]; onSave: (row: any) => Promise<void>; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [r, setR] = useState<any>(initial || {});
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (v: any) => setR((prev: any) => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setR(initial || {}); }}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />Ajouter un rapport</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.id ? 'Modifier le rapport' : 'Nouveau rapport de visite'}</DialogTitle></DialogHeader>
        <FieldGrid>
          <SelField label="Bien visité" value={r.property_id} onChange={set('property_id')} options={properties.map((p) => ({ value: p.id, label: p.titre || p.adresse || 'Bien' }))} />
          <TxtField label="Adresse du bien (si non listé)" value={r.adresse_bien} onChange={set('adresse_bien')} />
          <TxtField label="Date de visite" value={r.date_visite} onChange={set('date_visite')} type="date" />
          <TxtField label="Courtier responsable" value={r.courtier_responsable} onChange={set('courtier_responsable')} />
          <AreaField label="État général" value={r.etat_general} onChange={set('etat_general')} />
          <AreaField label="Points forts" value={r.points_forts} onChange={set('points_forts')} />
          <AreaField label="Points faibles" value={r.points_faibles} onChange={set('points_faibles')} />
          <AreaField label="Risques visibles" value={r.risques} onChange={set('risques')} />
          <AreaField label="Documents manquants" value={r.documents_manquants} onChange={set('documents_manquants')} />
          <NumField label="Estimation prix" value={r.estimation_prix} onChange={set('estimation_prix')} suffix="CHF" />
          <AreaField label="Avis sur prix demandé" value={r.avis_prix} onChange={set('avis_prix')} />
          <AreaField label="Recommandation Immo-Rama" value={r.recommandation} onChange={set('recommandation')} />
          <SelField label="Statut" value={r.statut} onChange={set('statut')} options={[
            { value: 'a_analyser', label: 'À analyser' },
            { value: 'valide_contre_visite', label: 'Validé pour contre-visite' },
            { value: 'refuse', label: 'Refusé' },
            { value: 'offre_recommandee', label: 'Offre recommandée' },
          ]} />
        </FieldGrid>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button disabled={saving} onClick={async () => {
            setSaving(true);
            try { await onSave(r); toast.success('Rapport enregistré'); setOpen(false); }
            catch (e: any) { toast.error(e?.message || 'Erreur'); }
            finally { setSaving(false); }
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Negotiation Editor ----------
export function NegotiationEditorDialog({ initial, onSave, trigger }: { initial?: any; onSave: (row: any) => Promise<void>; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState<any>(initial || {});
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (v: any) => setN((prev: any) => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setN(initial || {}); }}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />Nouvelle offre</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Offre & négociation</DialogTitle></DialogHeader>
        <FieldGrid>
          <NumField label="Montant de l'offre" value={n.montant_offre} onChange={set('montant_offre')} suffix="CHF" />
          <NumField label="Contre-offre" value={n.contre_offre} onChange={set('contre_offre')} suffix="CHF" />
          <TxtField label="Date d'offre" value={n.date_offre} onChange={set('date_offre')} type="date" />
          <TxtField label="Date d'acceptation" value={n.date_acceptation} onChange={set('date_acceptation')} type="date" />
          <SelField label="Statut" value={n.statut} onChange={set('statut')} options={[
            { value: 'en_preparation', label: 'En préparation' },
            { value: 'envoyee', label: 'Envoyée' },
            { value: 'contre_offre', label: 'Contre-offre reçue' },
            { value: 'acceptee', label: 'Acceptée' },
            { value: 'refusee', label: 'Refusée' },
          ]} />
          <AreaField label="Notes négociation" value={n.notes} onChange={set('notes')} />
        </FieldGrid>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button disabled={saving} onClick={async () => {
            setSaving(true);
            try { await onSave(n); toast.success('Offre enregistrée'); setOpen(false); }
            catch (e: any) { toast.error(e?.message || 'Erreur'); }
            finally { setSaving(false); }
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Notary Editor ----------
export function NotaryEditorDialog({ initial, onSave }: { initial?: any; onSave: (row: any) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [no, setNo] = useState<any>(initial || {});
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (v: any) => setNo((prev: any) => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setNo(initial || {}); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Pencil className="h-3.5 w-3.5 mr-1" />Modifier notaire</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Étape notaire</DialogTitle></DialogHeader>
        <FieldGrid>
          <TxtField label="Notaire" value={no.notaire_nom} onChange={set('notaire_nom')} />
          <TxtField label="Email notaire" value={no.notaire_email} onChange={set('notaire_email')} />
          <TxtField label="Téléphone notaire" value={no.notaire_telephone} onChange={set('notaire_telephone')} />
          <TxtField label="Date RDV" value={no.date_rdv} onChange={set('date_rdv')} type="datetime-local" />
          <TxtField label="Date signature" value={no.date_signature} onChange={set('date_signature')} type="date" />
          <TxtField label="Date remise des clés" value={no.date_remise_cles} onChange={set('date_remise_cles')} type="date" />
          <SelField label="Statut" value={no.statut} onChange={set('statut')} options={[
            { value: 'a_planifier', label: 'À planifier' },
            { value: 'rdv_planifie', label: 'RDV planifié' },
            { value: 'signe', label: 'Acte signé' },
            { value: 'cles_remises', label: 'Clés remises' },
          ]} />
          <AreaField label="Notes" value={no.notes} onChange={set('notes')} />
        </FieldGrid>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button disabled={saving} onClick={async () => {
            setSaving(true);
            try { await onSave(no); toast.success('Notaire enregistré'); setOpen(false); }
            catch (e: any) { toast.error(e?.message || 'Erreur'); }
            finally { setSaving(false); }
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Project meta (mandat/acompte/notes) ----------
export function ProjectMetaEditorDialog({ project, onSave }: { project: any; onSave: (patch: any) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [p, setP] = useState<any>(project || {});
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (v: any) => setP((prev: any) => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setP(project || {}); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Pencil className="h-3.5 w-3.5 mr-1" />Mandat / acompte / notes</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Statut mandat, acompte & notes</DialogTitle></DialogHeader>
        <FieldGrid>
          <SelField label="Statut projet" value={p.statut} onChange={set('statut')} options={[
            { value: 'actif', label: 'Actif' },
            { value: 'en_pause', label: 'En pause' },
            { value: 'reussi', label: 'Réussi' },
            { value: 'cloture', label: 'Clôturé' },
            { value: 'annule', label: 'Annulé' },
          ]} />
          <SelField label="Statut mandat" value={p.statut_mandat} onChange={set('statut_mandat')} options={[
            { value: 'a_signer', label: 'À signer' }, { value: 'signe', label: 'Signé' }, { value: 'resilie', label: 'Résilié' },
          ]} />
          <SelField label="Statut acompte" value={p.statut_acompte} onChange={set('statut_acompte')} options={[
            { value: 'a_payer', label: 'À payer' }, { value: 'paye', label: 'Payé' }, { value: 'rembourse', label: 'Remboursé' },
          ]} />
          <NumField label="Montant mandat" value={p.montant_mandat} onChange={set('montant_mandat')} suffix="CHF" />
          <NumField label="Montant acompte" value={p.montant_acompte} onChange={set('montant_acompte')} suffix="CHF" />
          <TxtField label="Date signature mandat" value={p.date_signature_mandat} onChange={set('date_signature_mandat')} type="date" />
          <TxtField label="Date paiement acompte" value={p.date_paiement_acompte} onChange={set('date_paiement_acompte')} type="date" />
          <TxtField label="Date début progression" value={p.date_debut_progression} onChange={set('date_debut_progression')} type="date" />
          <AreaField label="Conditions de renouvellement" value={p.conditions_renouvellement} onChange={set('conditions_renouvellement')} />
          <AreaField label="Conditions de résiliation" value={p.conditions_resiliation} onChange={set('conditions_resiliation')} />
          <AreaField label="Conditions de remboursement" value={p.conditions_remboursement} onChange={set('conditions_remboursement')} />
          <AreaField label="Notes internes" value={p.notes_internes} onChange={set('notes_internes')} />
        </FieldGrid>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button disabled={saving} onClick={async () => {
            setSaving(true);
            try {
              const patch: any = {};
              ['statut','statut_mandat','statut_acompte','montant_mandat','montant_acompte',
               'date_signature_mandat','date_paiement_acompte','date_debut_progression',
               'conditions_renouvellement','conditions_resiliation','conditions_remboursement','notes_internes'
              ].forEach((k) => { patch[k] = p[k] ?? null; });
              await onSave(patch);
              toast.success('Projet mis à jour'); setOpen(false);
            } catch (e: any) { toast.error(e?.message || 'Erreur'); }
            finally { setSaving(false); }
          }}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { Trash2 };
