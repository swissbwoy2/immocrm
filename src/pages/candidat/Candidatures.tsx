import { useMemo, useState } from 'react';
import { DASH_CARD, DashBadge, DashEmptyState, DashFilterPills, DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';
import { FileStack } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RelocationTimeline } from '@/components/candidature/RelocationTimeline';
import { Home, MessageCircle, Send } from 'lucide-react';
import { annonceOf, candidaturePhoto, candidatureTone, formatChf, prochaineEtape } from '@/components/candidat/candidatParts';
import { useNavigate } from 'react-router-dom';
import { VisiteConfirmGate } from '@/components/candidature/VisiteConfirmGate';
import { CandidatDocumentsSection } from '@/components/candidature/CandidatDocumentsSection';
import { ouvrirConversationAnnonce } from '@/components/messaging/ConversationsAnnoncePanel';
import type { UnifiedCandidature } from '@/hooks/useCandidatCandidatures';
import { Button } from '@/components/ui/button';
import { useCandidatCandidatures, statutLabel, RETENU_BAILLEUR } from '@/hooks/useCandidatCandidatures';

type Filter = 'toutes' | 'en_cours' | 'retenues' | 'terminees';
const CLOSED = ['refuse', 'refusee', 'desiste'];
// Documents uniquement après pré-sélection (documents_demandes) et étapes suivantes.
const DOCS_OK = ['documents_demandes', 'retenu_bailleur', 'bail_signe', 'etat_lieux_effectue', 'cles_remises'];

export default function CandidatCandidatures() {
  const { data = [], isLoading } = useCandidatCandidatures();
  const [filter, setFilter] = useState<Filter>('toutes');
  const qc = useQueryClient();
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [askVisit, setAskVisit] = useState<UnifiedCandidature | null>(null);
  const [askStep, setAskStep] = useState<'visite' | 'deposer'>('visite');
  const navigate = useNavigate();
  const now = Date.now();
  const eligibles = data.filter((c) => c.source === 'location' && !c.annulee && ['en_attente', 'visite_effectuee'].includes(c.statut) && c.date_visite && new Date(c.date_visite).getTime() < now);

  const deposer = () => {
    if (!selected) return;
    navigate(`/candidat/demande?candidature=${selected}`);
  };
  const contacter = async (annonceId: string) => {
    const id = await ouvrirConversationAnnonce(annonceId);
    if (id) navigate(`/candidat/messages?conversation=${id}`);
  };

  const confirmer = async (id: string) => {
    if (busy) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('candidat_confirmer_attribution', { _id: id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Confirmation enregistrée');
    qc.invalidateQueries({ queryKey: ['candidat-candidatures'] });
  };

  const list = useMemo(() => data.filter((c) => {
    if (filter === 'en_cours') return !CLOSED.includes(c.statut);
    if (filter === 'retenues') return c.statut === RETENU_BAILLEUR;
    if (filter === 'terminees') return CLOSED.includes(c.statut);
    return true;
  }), [data, filter]);
  const counts: Record<Filter, number> = {
    toutes: data.length,
    en_cours: data.filter((c) => !CLOSED.includes(c.statut)).length,
    retenues: data.filter((c) => c.statut === RETENU_BAILLEUR).length,
    terminees: data.filter((c) => CLOSED.includes(c.statut)).length,
  };

  return (
    <>
      <VisiteConfirmGate list={data} force={askVisit} forceStep={askStep} onClose={() => setAskVisit(null)} />
      <DashPage>
        <DashPageHeader
          title="Mes candidatures"
          subtitle="Suivez l'état de vos candidatures en temps réel"
        />
        <DashFilterPills<Filter>
          label="Filtrer mes candidatures"
          options={([['toutes', 'Toutes'], ['en_cours', 'En cours'], ['retenues', 'Retenues'], ['terminees', 'Terminées']] as [Filter, string][]).map(([key, label]) => ({ key, label, count: counts[key] }))}
          value={filter}
          onChange={setFilter}
        />
        <div className={`${DASH_CARD} mb-5 space-y-3 p-4 md:p-5`}>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Send className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-foreground">Déposer une candidature</p>
              {eligibles.length === 0 && (
                <p className="mt-0.5 text-sm text-muted-foreground">Vous pourrez déposer votre candidature une fois la visite d'un logement effectuée.</p>
              )}
            </div>
          </div>
          {eligibles.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="min-h-[44px] rounded-full sm:flex-1"><SelectValue placeholder="Choisir le logement visité" /></SelectTrigger>
                <SelectContent>
                  {eligibles.map((c) => <SelectItem key={c.id} value={c.id}>{c.adresse}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button disabled={!selected || busy} onClick={deposer} className="min-h-[44px]">Envoyer ma candidature</Button>
            </div>
          )}
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : list.length === 0 ? (
          <DashEmptyState icon={FileStack} title="Aucune candidature pour le moment." />
        ) : (
          <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((c) => {
              const photo = candidaturePhoto(c);
              const prix = formatChf(c.source === 'location' ? annonceOf(c)?.prix : c.prix, ' /mois');
              const details = [c.pieces ? `${c.pieces} pièces` : null, c.surface ? `${c.surface} m²` : null].filter(Boolean).join(' · ');
              const showDeposer = c.source === 'location' && !c.annulee && c.raw?.visite_confirmee === true && !DOCS_OK.includes(c.statut) && c.statut !== 'candidature_deposee' && !CLOSED.includes(c.statut);
              const showVisite = c.source === 'location' && !c.annulee && c.raw?.visite_confirmee !== true && ['en_attente', 'visite_planifiee'].includes(c.statut) && c.date_visite && new Date(c.date_visite).getTime() < now;
              const showContact = c.source === 'location' && c.raw?.annonce_id;
              const showConfirmer = c.source === 'location' && c.statut === RETENU_BAILLEUR && !c.raw?.candidat_confirme_at;
              const showTimeline = c.source === 'location' && (c.raw?.date_depot || ['candidature_deposee', 'documents_demandes', 'retenu_bailleur', 'bail_signe', 'etat_lieux_effectue', 'cles_remises', 'refusee', 'desiste'].includes(c.statut));
              return (
                <article key={`${c.source}-${c.id}`} className={`${DASH_CARD} flex min-w-0 flex-col overflow-hidden`}>
                  <div className="h-36 w-full shrink-0 overflow-hidden bg-muted">
                    {photo ? (
                      <img src={photo} alt={c.adresse} loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Home className="h-8 w-8" aria-hidden="true" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-3 p-4 md:p-5">
                    <div className="min-w-0">
                      <p className="line-clamp-2 break-words text-base font-semibold text-foreground">{c.adresse}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {[details, c.date ? `Depuis le ${new Date(c.date).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' })}` : null].filter(Boolean).join(' · ')}
                      </p>
                      {prix && <p className="mt-1 text-[15px] font-semibold text-foreground">{prix}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <DashBadge tone={candidatureTone(c)}>{c.annulee ? 'Visite annulée' : statutLabel(c.statut)}</DashBadge>
                      <DashBadge tone="muted">{c.dossier}</DashBadge>
                    </div>
                    <div className="imr-lg-glass rounded-2xl px-3.5 py-2.5">
                      <p className="text-xs font-medium text-muted-foreground">Prochaine étape</p>
                      <p className="text-[15px] font-semibold text-foreground">{prochaineEtape(c, now)}</p>
                    </div>
                    {c.annulee && c.annulation_message && (
                      <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{c.annulation_message}</p>
                    )}
                    {(showConfirmer || showDeposer || showVisite) && (
                      <div className="flex flex-col gap-2">
                        {showConfirmer && (
                          <Button disabled={busy} onClick={() => confirmer(c.id)} className="min-h-[44px] w-full">Je confirme vouloir conclure</Button>
                        )}
                        {showDeposer && (
                          <Button className="h-auto min-h-[44px] w-full whitespace-normal py-2.5 text-center" onClick={() => { setAskStep('deposer'); setAskVisit(c); }}>Souhaitez-vous déposer votre dossier ?</Button>
                        )}
                        {showVisite && (
                          <Button variant={showDeposer || showConfirmer ? 'outline' : 'default'} className="h-auto min-h-[44px] w-full whitespace-normal py-2.5 text-center" onClick={() => { setAskStep('visite'); setAskVisit(c); }}>Avez-vous visité cet objet ? Répondre</Button>
                        )}
                      </div>
                    )}
                    {showTimeline && (
                      <div className="border-t border-border/60 pt-3">
                        <p className="mb-2 text-sm font-semibold text-foreground">Suivi du dossier</p>
                        <RelocationTimeline r={{ ...c.raw, statut: c.statut }} />
                      </div>
                    )}
                    {c.source === 'location' && DOCS_OK.includes(c.statut) && <CandidatDocumentsSection candidatureId={c.id} />}
                    {showContact && (
                      <Button variant="outline" className="min-h-[44px] w-full" onClick={() => contacter(c.raw.annonce_id)}><MessageCircle className="mr-1 h-4 w-4" />Contacter</Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </DashPage>
    </>
  );
}
