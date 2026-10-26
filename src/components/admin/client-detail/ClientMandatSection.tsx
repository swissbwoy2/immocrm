import { Ban, CheckCircle2, Download, FilePlus, FileText, Loader2, Mail, Receipt, RefreshCw, RotateCcw, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatZurichShortDate } from '@/lib/dateZurich';
import { FicheCard, InlineEmpty, Notice } from './parts';
import type { Client } from './model';

/**
 * Contrat de mandat (chercheur) : statut, signature, PDF complet, régénération,
 * remboursement / annulation pour le compte du client, e-mail de test, relance d'une nouvelle recherche.
 */
export function MandatContractCard({
  client, daysElapsed, regeneratingContract, relaunching, abaNinjaLoading,
  onDownloadFull, onRegenerate, onGenerate, onRefund, onCancel, onTestEmail, onRelaunch,
}: {
  client: Client;
  daysElapsed: number;
  regeneratingContract: boolean;
  relaunching: boolean;
  abaNinjaLoading: boolean;
  onDownloadFull: () => void;
  onRegenerate: () => void;
  onGenerate: () => void;
  onRefund: () => void;
  onCancel: () => void;
  onTestEmail: () => void;
  onRelaunch: () => void;
}) {
  const hasContract = client.mandat_pdf_url || client.mandat_signature_data || client.demande_mandat_id;
  return (
    <FicheCard icon={FileText} title="Contrat de mandat">
      {hasContract ? (
        <div className="space-y-3">
          {/* Status */}
          <Notice icon={CheckCircle2} tone="success" title="Contrat signé">
            {client.mandat_date_signature && (
              <span className="text-muted-foreground">Signé le {formatZurichShortDate(client.mandat_date_signature)}</span>
            )}
          </Notice>

          {/* Signature preview */}
          {client.mandat_signature_data && (
            <div className="rounded-2xl border border-dashed border-border bg-white p-3.5">
              <p className="mb-2 text-[13px] text-neutral-500">Signature électronique</p>
              <img src={client.mandat_signature_data} alt="Signature" className="max-h-16 object-contain" />
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* Download full mandate PDF (always regenerated to ensure FULL legal text) */}
            <Button variant="outline" className="h-auto min-h-11 whitespace-normal" onClick={onDownloadFull}>
              <Download className="h-4 w-4" />
              Télécharger le mandat complet (PDF)
            </Button>
            {/* Regenerate button */}
            {client.demande_mandat_id && (
              <Button variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={regeneratingContract} onClick={onRegenerate}>
                <RefreshCw className={`h-4 w-4 ${regeneratingContract ? 'animate-spin' : ''}`} />
                {regeneratingContract ? 'Régénération...' : 'Régénérer le PDF'}
              </Button>
            )}
          </div>

          {/* Annulation / Remboursement pour le compte du client */}
          {client.statut === 'actif' && client.mandat_date_signature && (
            <div className="space-y-2 border-t border-border/50 pt-3">
              <p className="text-sm text-muted-foreground">Si le client a fait sa demande par téléphone ou email :</p>
              <Button
                variant="outline"
                className="h-auto min-h-11 w-full whitespace-normal"
                disabled={daysElapsed < 80 || daysElapsed > 90}
                onClick={onRefund}
                title={
                  daysElapsed < 80
                    ? `Disponible à partir du 80ème jour (actuel : ${daysElapsed})`
                    : daysElapsed > 90
                      ? `Fenêtre close (jours 80–90). Mandat renouvelé automatiquement (actuel : J${daysElapsed}).`
                      : undefined
                }
              >
                <Wallet className="h-4 w-4" />
                Demander le remboursement pour le client
                {daysElapsed < 80 && <span className="text-sm text-muted-foreground">(J{daysElapsed}/80)</span>}
                {daysElapsed > 90 && <span className="text-sm text-muted-foreground">(fenêtre close)</span>}
              </Button>
              <Button variant="outline" className="h-auto min-h-11 w-full whitespace-normal text-destructive" onClick={onCancel}>
                <Ban className="h-4 w-4" />
                Annuler le mandat (sans remboursement)
              </Button>
              <Button variant="ghost" className="h-auto min-h-11 w-full whitespace-normal" onClick={onTestEmail}>
                <Mail className="h-4 w-4" />
                Tester l'email d'annulation (m'envoyer)
              </Button>
            </div>
          )}

          {/* Relance de recherche — pour clients relogé / inactif / stoppé / suspendu */}
          {client.journey_type !== 'purchase_search' &&
            ['reloge', 'inactif', 'stoppe', 'suspendu'].includes(client.statut || '') && (
            <div className="space-y-2 border-t border-border/50 pt-3">
              <p className="text-sm text-muted-foreground">Le client souhaite reprendre une nouvelle recherche :</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-auto min-h-11 w-full whitespace-normal"
                    disabled={relaunching || abaNinjaLoading || client.refund_status === 'pending'}
                    title={client.refund_status === 'pending' ? 'Un remboursement est en cours — impossible de relancer.' : undefined}
                  >
                    <RotateCcw className={`h-4 w-4 ${relaunching ? 'animate-spin' : ''}`} />
                    {relaunching ? 'Relance en cours…' : 'Relancer une nouvelle recherche (90 jours)'}
                    {(client.relance_count ?? 0) > 0 && (
                      <span className="text-sm text-muted-foreground">({client.relance_count} déjà)</span>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Relancer une nouvelle recherche ?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2 text-sm">
                        <p>
                          Le compte du client sera <strong>réactivé</strong> et un
                          <strong> nouveau mandat de 90 jours</strong> démarrera aujourd'hui.
                        </p>
                        <p>
                          Une nouvelle <strong>facture d'acompte de CHF 300.-</strong> sera automatiquement
                          générée dans AbaNinja et envoyée par email au client.
                        </p>
                        <p className="text-muted-foreground">Le compteur de jours de recherche repart à zéro.</p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={onRelaunch}>Confirmer la relance</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {client.derniere_relance_at && (
                <p className="text-sm text-muted-foreground">Dernière relance : {formatZurichShortDate(client.derniere_relance_at)}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <InlineEmpty
          icon={FileText}
          title="Aucun contrat enregistré"
          description="Le contrat sera généré lors de l'activation du mandat"
          action={client.demande_mandat_id ? (
            /* Button to generate if demande_mandat_id exists but no PDF */
            <Button variant="outline" disabled={regeneratingContract} onClick={onGenerate}>
              <FilePlus className={`h-4 w-4 ${regeneratingContract ? 'animate-spin' : ''}`} />
              {regeneratingContract ? 'Génération...' : 'Générer le PDF'}
            </Button>
          ) : undefined}
        />
      )}
    </FicheCard>
  );
}

/** Facture d'acompte AbaNinja : référence si créée, sinon bouton de création. */
export function InvoiceCard({ invoiceRef, loading, onCreate }: { invoiceRef?: string | null; loading: boolean; onCreate: () => void }) {
  return (
    <FicheCard icon={Receipt} title="Facture AbaNinja">
      {invoiceRef ? (
        <Notice icon={CheckCircle2} tone="success" title="Facture créée">Référence : {invoiceRef}</Notice>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] text-muted-foreground">Aucune facture n'a encore été créée pour ce client.</p>
          <Button variant="warning" onClick={onCreate} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
            Créer facture
          </Button>
        </div>
      )}
    </FicheCard>
  );
}
