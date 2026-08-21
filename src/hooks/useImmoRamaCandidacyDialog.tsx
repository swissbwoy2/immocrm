import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown } from 'lucide-react';
import { CANDIDACY_LEGAL } from '@/config/candidacy-terms';
import { CandidacyDetailedTerms } from '@/components/legal/CandidacyDetailedTerms';

/**
 * Dialog "Avant de continuer" affiché avant « Déposer mon dossier ».
 * (A) version courte + lien « Voir les conditions détaillées » → (B) panneau scrollable.
 * Case à cocher obligatoire : le bouton « OK, je continue » reste désactivé tant
 * qu'elle n'est pas cochée.
 */
export function useImmoRamaCandidacyDialog(options?: { onConfirm?: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [acceptedCommission, setAcceptedCommission] = useState(false);
  const [acceptedTransmission, setAcceptedTransmission] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const bothAccepted = acceptedCommission && acceptedTransmission;

  const openDialog = useCallback(() => {
    setAcceptedCommission(false);
    setAcceptedTransmission(false);
    setShowDetails(false);
    setOpen(true);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setAcceptedCommission(false);
      setAcceptedTransmission(false);
      setShowDetails(false);
    }
  }, []);

  const confirm = options?.onConfirm ?? (() => navigate('/nouveau-mandat'));

  const dialog = (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="z-[210] max-h-[85vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Avant de continuer</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-muted-foreground">
              <p>
                Vous souhaitez qu'Immo-rama.ch dépose votre candidature pour ce logement à votre place.
                En cliquant sur «&nbsp;Déposer ma candidature&nbsp;», vous demandez à Immo-rama.ch de
                transmettre aux destinataires concernés les informations et documents nécessaires à
                l'examen de votre dossier.
              </p>

              <p className="font-semibold text-foreground">Commission uniquement en cas de succès</p>
              <p>
                Si vous obtenez ce logement grâce à l'intervention d'Immo-rama.ch, une commission
                correspondant à un mois de loyer brut, charges comprises, sera due conformément aux règles
                du courtage des art. 412 ss CO. TVA au taux légal, si elle est due, en sus.
              </p>
              <p>
                <strong className="text-foreground">Aucun double paiement&nbsp;:</strong> si cette candidature
                est déjà couverte par un mandat Immo-rama.ch prévoyant la même commission au succès, une
                seule commission sera facturée pour l'attribution du même logement.
              </p>

              <p className="font-semibold text-foreground">Vos données</p>
              <p>
                Vous autorisez Immo-rama.ch à transmettre, uniquement dans la mesure nécessaire à cette
                candidature, votre dossier et les informations pertinentes à la régie, au propriétaire ou au
                bailleur concerné. Si votre dossier contient des données relatives à un co-candidat, garant
                ou autre tiers, vous confirmez l'avoir informé de cette transmission. Consultez notre{' '}
                <Link
                  to="/politique-confidentialite"
                  target="_blank"
                  className="text-primary underline underline-offset-2"
                >
                  Politique de confidentialité
                </Link>{' '}
                pour davantage d'informations ou contactez-nous à{' '}
                <a
                  href={`mailto:${CANDIDACY_LEGAL.emailProtectionDonnees}`}
                  className="text-primary underline underline-offset-2"
                >
                  {CANDIDACY_LEGAL.emailProtectionDonnees}
                </a>
                .
              </p>

              <button
                type="button"
                onClick={() => setShowDetails((v) => !v)}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2"
                aria-expanded={showDetails}
              >
                Voir les conditions détaillées
                <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
              </button>

              {showDetails && (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3">
                  <CandidacyDetailedTerms />
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm cursor-pointer">
            <Checkbox
              checked={acceptedCommission}
              onCheckedChange={(v) => setAcceptedCommission(v === true)}
              className="mt-0.5 min-w-[20px] min-h-[20px]"
            />
            <span>
              J'ai compris et j'accepte la commission applicable uniquement en cas d'attribution du logement
              grâce à l'intervention d'Immo-rama.ch.
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm cursor-pointer">
            <Checkbox
              checked={acceptedTransmission}
              onCheckedChange={(v) => setAcceptedTransmission(v === true)}
              className="mt-0.5 min-w-[20px] min-h-[20px]"
            />
            <span>Je demande à Immo-rama.ch de transmettre mon dossier pour cette candidature.</span>
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction disabled={!bothAccepted} onClick={confirm}>
            DÉPOSER MA CANDIDATURE
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { openDialog, dialog, isOpen: open };
}
