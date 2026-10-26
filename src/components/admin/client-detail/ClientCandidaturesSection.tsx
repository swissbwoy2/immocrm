import { CheckCircle2, FileCheck, MapPin, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { CandidatureWorkflowTimeline } from '@/components/CandidatureWorkflowTimeline';
import { formatZurichShortDate } from '@/lib/dateZurich';
import { FicheCard, InlineEmpty } from './parts';
import { chf, getCandidatureStatutLabel, getCandidatureStatutTone } from './model';

/** Candidatures déposées : statut, complétude, étapes, accepter / refuser si en attente. */
export function CandidaturesCard({ candidatures, onStatutChange }: {
  candidatures: any[];
  onStatutChange: (candidatureId: string, newStatut: string, offreId?: string) => void;
}) {
  return (
    <FicheCard icon={FileCheck} title={`Candidatures déposées (${candidatures.length})`}>
      {candidatures.length > 0 ? (
        <div className="space-y-2.5">
          {candidatures.map((candidature) => (
            <article key={candidature.id} className="min-w-0 rounded-2xl bg-muted/40 p-3.5 dark:bg-white/[0.04]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="break-words text-[15px] font-medium text-foreground">
                      {candidature.offres?.adresse || 'Offre inconnue'}
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {candidature.offres && (
                        <span>{chf(candidature.offres.prix, '—')} • {candidature.offres.pieces || 'N/A'} pièces</span>
                      )}
                      {' • '}
                      Déposée le {formatZurichShortDate(candidature.date_depot || candidature.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pl-12 sm:pl-0">
                  <DashBadge tone={getCandidatureStatutTone(candidature.statut)}>
                    {getCandidatureStatutLabel(candidature.statut)}
                  </DashBadge>
                  <DashBadge tone={candidature.dossier_complet ? 'success' : 'warning'}>
                    {candidature.dossier_complet ? 'Complet' : 'Incomplet'}
                  </DashBadge>
                </div>
              </div>

              {/* Workflow Timeline */}
              <div className="mt-3 overflow-x-auto">
                <CandidatureWorkflowTimeline currentStatut={candidature.statut} />
              </div>

              {/* Action buttons for pending candidatures */}
              {candidature.statut === 'en_attente' && (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
                  <Button
                    variant="success"
                    onClick={() => onStatutChange(candidature.id, 'acceptee', candidature.offre_id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accepter
                  </Button>
                  <Button
                    variant="outline"
                    className="text-destructive"
                    onClick={() => onStatutChange(candidature.id, 'refusee', candidature.offre_id)}
                  >
                    <XCircle className="h-4 w-4" />
                    Refuser
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <InlineEmpty icon={FileCheck} title="Aucune candidature déposée" />
      )}
    </FicheCard>
  );
}
