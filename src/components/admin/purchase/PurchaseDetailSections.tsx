import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Banknote, Home, Eye, Handshake, Scale, FileText, Sparkles, MapPin, ExternalLink, Layers, Square, Hash, Calendar, Trash2, CheckCircle2, XCircle, MessageSquare, AlertTriangle, TrendingUp, ListChecks } from 'lucide-react';
import { usePurchaseProject } from '@/hooks/usePurchaseProject';
import { ACHAT_STEPS, computeProgression, formatCHF } from '@/lib/purchaseFinancing';
import { AchatDocumentsSection } from '@/components/achat/AchatDocumentsSection';
import { FinancingEditorDialog, PropertyEditorDialog, VisitReportEditorDialog, NegotiationEditorDialog, NotaryEditorDialog, ProjectMetaEditorDialog } from './PurchaseEditors';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  userId?: string | null;
  mode: 'admin' | 'agent';
}

const STATUT_PROP: Record<string, { label: string; color: string }> = {
  a_analyser: { label: 'À analyser', color: 'bg-amber-100 text-amber-700' },
  visite_planifiee: { label: 'Visite planifiée', color: 'bg-sky-100 text-sky-700' },
  visite_effectuee: { label: 'Visite effectuée', color: 'bg-indigo-100 text-indigo-700' },
  offre_recommandee: { label: 'Offre recommandée', color: 'bg-emerald-100 text-emerald-700' },
  offre_envoyee: { label: 'Offre envoyée', color: 'bg-purple-100 text-purple-700' },
  refuse: { label: 'Écarté', color: 'bg-zinc-100 text-zinc-700' },
};

const STATUT_VISIT: Record<string, { label: string; color: string }> = {
  a_analyser: { label: 'À analyser', color: 'bg-amber-100 text-amber-700' },
  valide_contre_visite: { label: 'Contre-visite', color: 'bg-sky-100 text-sky-700' },
  refuse: { label: 'Refusé', color: 'bg-zinc-100 text-zinc-700' },
  offre_recommandee: { label: 'Offre recommandée', color: 'bg-emerald-100 text-emerald-700' },
};

export function PurchaseDetailSections({ clientId, userId, mode }: Props) {
  const h = usePurchaseProject({ clientId, userId });
  if (h.loading) return <Card className="p-6">Chargement du parcours achat…</Card>;
  if (!h.project) return null;

  const prog = computeProgression(h.project.date_debut_progression, h.project.duree_progression_jours || 60);
  const c = h.computed;
  const doneSteps = h.steps.filter((s) => s.statut === 'fait').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner */}
      <Card className="p-5 border-sky-200 bg-gradient-to-br from-sky-50 to-white">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-sky-600" />
              <h2 className="font-semibold text-lg">Parcours achat immobilier</h2>
              <Badge className="bg-sky-100 text-sky-700 border-0">{h.project.statut}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Jour {prog.jourActuel}/{prog.dureeJours} · {prog.jourRestant} jours restants · {doneSteps}/{h.steps.length} étapes complétées
            </p>
          </div>
          {mode === 'admin' && <ProjectMetaEditorDialog project={h.project} onSave={h.updateProject} />}
        </div>
        <Progress value={prog.pourcentage} className="h-2 mt-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
          <Kpi label="Mandat" value={h.project.statut_mandat || '—'} />
          <Kpi label="Acompte" value={h.project.statut_acompte || '—'} />
          <Kpi label="Mandat CHF" value={h.project.montant_mandat ? formatCHF(h.project.montant_mandat) : '—'} />
          <Kpi label="Acompte CHF" value={h.project.montant_acompte ? formatCHF(h.project.montant_acompte) : '—'} />
        </div>
      </Card>

      {/* Financement & tenue des charges */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2"><Banknote className="h-5 w-5 text-sky-600" />Analyse financement & tenue des charges</h3>
          <FinancingEditorDialog financing={h.financing} onSave={h.updateFinancing} />
        </div>
        {!h.financing && <p className="text-sm text-muted-foreground">Aucune donnée financement saisie pour l'instant.</p>}
        {h.financing && c && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Kpi label="Revenu net retenu" value={formatCHF(c.revenuNet)} />
            <Kpi label="Fonds propres totaux" value={formatCHF(c.fondsPropresTotal)} />
            <Kpi label="dont cash (durs)" value={formatCHF(c.fondsPropresCash)} />
            <Kpi label="Prix cible" value={c.prixCible ? formatCHF(c.prixCible) : '—'} />
            <Kpi label="Hypothèque" value={formatCHF(c.montantHypothecaire)} />
            <Kpi label="Charges annuelles" value={formatCHF(c.chargesAnnuelles)} />
            <Kpi label="Taux d'effort" value={`${c.tauxEffort.toFixed(1)} %`} />
            <Kpi label="Capacité d'achat max" value={formatCHF(c.capaciteAchatMax)} />
          </div>
        )}
        {c?.warnings && c.warnings.length > 0 && (
          <div className="mt-3 space-y-1">
            {c.warnings.map((w, i) => (
              <div key={i} className="text-xs flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                <AlertTriangle className="h-3.5 w-3.5" /> {w}
              </div>
            ))}
          </div>
        )}
        {h.financing?.statut_bancaire && (
          <Badge className="mt-3" variant="outline">Banque : {h.financing.statut_bancaire}{h.financing.partenaire_bancaire ? ` · ${h.financing.partenaire_bancaire}` : ''}</Badge>
        )}
      </Card>

      {/* Documents */}
      <DocumentsAdminBlock projectId={h.project.id} documents={h.documents} reload={h.reload} mode={mode} />

      {/* Properties */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2"><Home className="h-5 w-5 text-sky-600" />Biens sélectionnés ({h.properties.length})</h3>
          <PropertyEditorDialog onSave={h.upsertProperty} />
        </div>
        {h.properties.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucun bien sélectionné.</p>
        ) : (
          <div className="space-y-3">
            {h.properties.map((p) => {
              const s = STATUT_PROP[p.statut] || { label: p.statut || '—', color: 'bg-zinc-100 text-zinc-700' };
              return (
                <div key={p.id} className="rounded-xl border border-border bg-card/40 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold truncate">{p.titre || 'Bien sans titre'}</h4>
                        <Badge className={`border-0 text-xs ${s.color}`}>{s.label}</Badge>
                        {p.score_immorama != null && <Badge variant="outline" className="text-xs">Score {p.score_immorama}/100</Badge>}
                      </div>
                      {p.adresse && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1.5 mb-2">
                          <MapPin className="h-3.5 w-3.5" />
                          {[p.adresse, p.npa, p.ville].filter(Boolean).join(', ')}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {p.prix > 0 && <span className="font-semibold text-foreground">{formatCHF(p.prix)}</span>}
                        {p.pieces && <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {p.pieces} pcs</span>}
                        {p.surface && <span className="flex items-center gap-1"><Square className="h-3 w-3" /> {p.surface} m²</span>}
                        {p.etage != null && <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> Ét. {p.etage}</span>}
                        {p.annee_construction && <span>{p.annee_construction}</span>}
                      </div>
                      {p.prochaine_action && <div className="text-xs mt-2 text-sky-700">→ {p.prochaine_action}</div>}
                      {p.notes && <div className="text-xs mt-1 text-muted-foreground italic">{p.notes}</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      {p.lien_annonce && (
                        <a href={p.lien_annonce} target="_blank" rel="noreferrer" className="text-xs text-sky-700 hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> Annonce
                        </a>
                      )}
                      <PropertyEditorDialog initial={p} onSave={h.upsertProperty} trigger={<Button size="sm" variant="ghost">Modifier</Button>} />
                      <Button size="sm" variant="ghost" onClick={async () => { if (confirm('Supprimer ce bien ?')) await h.deleteProperty(p.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Visit reports */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2"><Eye className="h-5 w-5 text-sky-600" />Rapports de visite courtier ({h.visitReports.length})</h3>
          <VisitReportEditorDialog properties={h.properties} onSave={h.upsertVisitReport} />
        </div>
        {h.visitReports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucun rapport.</p>
        ) : (
          <div className="space-y-3">
            {h.visitReports.map((r) => {
              const s = STATUT_VISIT[r.statut] || { label: r.statut || '—', color: 'bg-zinc-100 text-zinc-700' };
              const prop = h.properties.find((pp) => pp.id === r.property_id);
              return (
                <div key={r.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="font-semibold text-sm">{prop?.titre || r.adresse_bien || 'Bien'}</div>
                    <div className="flex items-center gap-2">
                      <Badge className={`border-0 text-xs ${s.color}`}>{s.label}</Badge>
                      <VisitReportEditorDialog initial={r} properties={h.properties} onSave={h.upsertVisitReport} trigger={<Button size="sm" variant="ghost">Modifier</Button>} />
                      <Button size="sm" variant="ghost" onClick={async () => { if (confirm('Supprimer ?')) await h.deleteVisitReport(r.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  {r.date_visite && <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(r.date_visite).toLocaleDateString('fr-CH')}{r.courtier_responsable ? ` · ${r.courtier_responsable}` : ''}</div>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {r.points_forts && <Mini icon={CheckCircle2} color="text-emerald-600" label="Points forts" text={r.points_forts} />}
                    {r.points_faibles && <Mini icon={AlertTriangle} color="text-amber-600" label="Points faibles" text={r.points_faibles} />}
                    {r.risques && <Mini icon={AlertTriangle} color="text-red-600" label="Risques" text={r.risques} />}
                    {r.estimation_prix > 0 && <Mini icon={TrendingUp} color="text-sky-600" label="Estimation" text={formatCHF(r.estimation_prix)} />}
                    {r.recommandation && <Mini icon={MessageSquare} color="text-indigo-600" label="Recommandation" text={r.recommandation} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Negotiations */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2"><Handshake className="h-5 w-5 text-sky-600" />Offres & négociations ({h.negotiations.length})</h3>
          <NegotiationEditorDialog onSave={h.upsertNegotiation} />
        </div>
        {h.negotiations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Aucune offre.</p>
        ) : (
          <div className="space-y-2">
            {h.negotiations.map((n) => (
              <div key={n.id} className="rounded-xl border border-border p-4 flex items-center justify-between flex-wrap gap-2">
                <div className="text-sm">
                  <Badge variant="outline" className="mr-2">{n.statut}</Badge>
                  Offre {n.montant_offre ? formatCHF(n.montant_offre) : '—'}
                  {n.contre_offre ? ` → contre-offre ${formatCHF(n.contre_offre)}` : ''}
                  {n.date_offre && <span className="text-xs text-muted-foreground ml-2">le {new Date(n.date_offre).toLocaleDateString('fr-CH')}</span>}
                </div>
                <div className="flex gap-2">
                  <NegotiationEditorDialog initial={n} onSave={h.upsertNegotiation} trigger={<Button size="sm" variant="ghost">Modifier</Button>} />
                  <Button size="sm" variant="ghost" onClick={async () => { if (confirm('Supprimer ?')) await h.deleteNegotiation(n.id); }}>
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2"><Scale className="h-5 w-5 text-sky-600" />Étape notaire</h3>
          <NotaryEditorDialog initial={h.notary} onSave={h.upsertNotary} />
        </div>
        {!h.notary ? (
          <p className="text-sm text-muted-foreground text-center py-6">Étape non encore renseignée.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <Kpi label="Notaire" value={h.notary.notaire_nom || '—'} />
            <Kpi label="Statut" value={h.notary.statut || '—'} />
            <Kpi label="RDV" value={h.notary.date_rdv ? new Date(h.notary.date_rdv).toLocaleString('fr-CH') : '—'} />
            <Kpi label="Signature" value={h.notary.date_signature ? new Date(h.notary.date_signature).toLocaleDateString('fr-CH') : '—'} />
            <Kpi label="Remise des clés" value={h.notary.date_remise_cles ? new Date(h.notary.date_remise_cles).toLocaleDateString('fr-CH') : '—'} />
          </div>
        )}
      </Card>

      {/* Steps timeline */}
      <Card className="p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4"><ListChecks className="h-5 w-5 text-sky-600" />Progression des 17 étapes</h3>
        <div className="space-y-1.5">
          {h.steps.length === 0 && <p className="text-sm text-muted-foreground">Aucune étape.</p>}
          {h.steps.map((st) => (
            <div key={st.id} className="flex items-center justify-between gap-3 py-1.5 px-2 rounded hover:bg-muted/30">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {st.statut === 'fait' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> :
                 st.statut === 'en_cours' ? <Sparkles className="h-4 w-4 text-amber-600 shrink-0" /> :
                 <Hash className="h-4 w-4 text-muted-foreground shrink-0" />}
                <span className="text-sm truncate">{st.ordre}. {st.label}</span>
              </div>
              <select
                value={st.statut || 'a_faire'}
                onChange={async (e) => { await h.updateStep(st.id, { statut: e.target.value, date_fait: e.target.value === 'fait' ? new Date().toISOString() : null }); }}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                <option value="a_faire">À faire</option>
                <option value="en_cours">En cours</option>
                <option value="fait">Fait</option>
                <option value="bloque">Bloqué</option>
              </select>
            </div>
          ))}
        </div>
      </Card>

      {h.project.notes_internes && (
        <Card className="p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-2"><FileText className="h-5 w-5 text-sky-600" />Notes internes</h3>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{h.project.notes_internes}</p>
        </Card>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg bg-muted/30 border border-border/30 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm mt-0.5 truncate">{value}</div>
    </div>
  );
}

function Mini({ icon: Icon, color, label, text }: any) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-2">
      <div className={`flex items-center gap-1 ${color} text-[11px] font-semibold mb-0.5`}><Icon className="h-3 w-3" />{label}</div>
      <div className="text-xs">{text}</div>
    </div>
  );
}

// ---- Documents admin block: reuse AchatDocumentsSection for checklist UX,
// add per-document actions (valider/refuser/commenter/marquer manquant/demander).
function DocumentsAdminBlock({ projectId, documents, reload, mode }: { projectId: string; documents: any[]; reload: () => Promise<void>; mode: 'admin' | 'agent' }) {
  return (
    <div className="space-y-4">
      <AchatDocumentsSection documents={documents} />
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h4 className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-sky-600" />Actions documents ({documents.length})</h4>
        </div>
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun document uploadé. L'upload s'effectue côté client depuis « Mon dossier ».</p>
        ) : (
          <div className="space-y-2">
            {documents.map((d) => (
              <DocActionRow key={d.id} doc={d} onChange={reload} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function DocActionRow({ doc, onChange }: { doc: any; onChange: () => Promise<void> }) {
  const [commentaire, setCommentaire] = useState(doc.commentaire_admin || '');
  const [busy, setBusy] = useState(false);

  const validate = async (statut: 'valide' | 'refuse' | 'manquant' | 'demande') => {
    setBusy(true);
    try {
      const patch: any = { statut_admin: statut, commentaire_admin: commentaire || null, date_validation_admin: new Date().toISOString() };
      await supabase.from('documents').update(patch).eq('id', doc.id);
      toast.success('Document mis à jour');
      await onChange();
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
    } finally { setBusy(false); }
  };

  const view = async () => {
    if (!doc.url) { toast.error('Pas de fichier'); return; }
    try {
      const { data } = await supabase.storage.from('documents').createSignedUrl(doc.url, 300);
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
      else window.open(doc.url, '_blank');
    } catch { window.open(doc.url, '_blank'); }
  };

  const statutColor: Record<string, string> = {
    valide: 'bg-emerald-100 text-emerald-700',
    refuse: 'bg-red-100 text-red-700',
    manquant: 'bg-amber-100 text-amber-700',
    demande: 'bg-sky-100 text-sky-700',
  };

  return (
    <div className="rounded-lg border border-border p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-sky-600 shrink-0" />
          <span className="text-sm truncate">{doc.nom}</span>
          {doc.purchase_category && <Badge variant="outline" className="text-[10px]">{doc.purchase_category}</Badge>}
          {doc.statut_admin && <Badge className={`text-[10px] border-0 ${statutColor[doc.statut_admin] || 'bg-zinc-100 text-zinc-700'}`}>{doc.statut_admin}</Badge>}
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Button size="sm" variant="ghost" onClick={view}>Voir</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => validate('valide')}><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => validate('refuse')}><XCircle className="h-3.5 w-3.5 text-red-600" /></Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => validate('manquant')}>Manquant</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => validate('demande')}>Demander</Button>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 text-xs border rounded px-2 py-1 bg-background"
          placeholder="Commentaire interne…"
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          onBlur={async () => {
            if (commentaire !== (doc.commentaire_admin || '')) {
              await supabase.from('documents').update({ commentaire_admin: commentaire || null }).eq('id', doc.id);
              await onChange();
            }
          }}
        />
      </div>
    </div>
  );
}
