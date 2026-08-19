import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [accepted, setAccepted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const openDialog = useCallback(() => {
    setAccepted(false);
    setShowDetails(false);
    setOpen(true);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      setAccepted(false);
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
                En poursuivant, vous mandatez Immo-rama.ch (Logisorama.ch) pour déposer votre dossier de
                candidature au logement sélectionné et effectuer les démarches nécessaires auprès de la gérance ou
                du bailleur.
              </p>

              <p className="font-semibold text-foreground">Commission uniquement en cas de succès</p>
              <p>
                Si notre intervention aboutit à l'attribution du logement et à la conclusion du bail, une
                commission de courtage équivalente à un mois de loyer brut est due, conformément aux art. 412 et
                413 CO.
              </p>
              <p>
                Par « loyer brut », on entend le loyer net mensuel + les charges mensuelles prévues au bail, hors
                dépôt de garantie et autres prestations distinctes.
              </p>
              <p>
                Si Immo-rama.ch est assujettie à la TVA, la TVA au taux légal de {CANDIDACY_LEGAL.tauxTVA} s'ajoute
                à cette commission. Le montant total correspond alors à 1,081 × le loyer brut mensuel.
              </p>
              <p>
                Le dépôt d'une candidature ne garantit pas l'attribution du logement. La décision appartient
                exclusivement à la gérance ou au bailleur.
              </p>

              <p className="font-semibold text-foreground">Protection de vos données</p>
              <p>
                Pour traiter votre candidature, vous autorisez expressément Immo-rama.ch à utiliser et à
                transmettre à la gérance, au bailleur ou à leurs représentants les données et documents strictement
                nécessaires, notamment :
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>pièce d'identité et/ou permis de séjour ;</li>
                <li>fiches de salaire et informations professionnelles ;</li>
                <li>extrait de l'Office des poursuites ;</li>
                <li>coordonnées et autres justificatifs nécessaires au dossier.</li>
              </ul>
              <p>
                Ces documents contiennent des informations personnelles et financières confidentielles et peuvent,
                selon leur contenu, comprendre des données sensibles.
              </p>
              <p>
                Ils sont utilisés uniquement pour préparer, transmettre et suivre votre candidature, fournir le
                service demandé et gérer l'éventuelle commission de succès.
              </p>
              <p>
                Les pièces du dossier sont conservées pendant la durée nécessaire au service, puis supprimées ou
                anonymisées au plus tard {CANDIDACY_LEGAL.conservationJours} jours après sa fin, sauf obligation
                légale ou nécessité de conserver certaines informations en cas de créance ou de litige.
              </p>
              <p>
                Vous pouvez demander l'accès à vos données, leur rectification et, lorsque les conditions légales
                sont réunies, leur suppression ou la cessation de leur traitement, auprès de{' '}
                {CANDIDACY_LEGAL.emailProtectionDonnees}.
              </p>
              <p>
                Vous êtes libre de ne pas utiliser ce service. Le retrait de votre autorisation reste possible pour
                l'avenir ; dans ce cas, Immo-rama.ch ne pourra plus transmettre de nouvelles candidatures
                nécessitant ces données.
              </p>
              <p>
                Cette autorisation permet uniquement de déposer et suivre votre candidature. Elle n'autorise pas
                Immo-rama.ch à signer un bail, une garantie ou un autre engagement contractuel en votre nom sans
                procuration distincte.
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

        <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm cursor-pointer">
          <Checkbox
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            aria-label="J'ai lu et j'accepte les conditions"
            className="mt-0.5"
          />
          <span>J'ai lu et j'accepte les conditions</span>
        </label>

        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction disabled={!accepted} onClick={confirm}>
            OK, je continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { openDialog, dialog, isOpen: open };
}
