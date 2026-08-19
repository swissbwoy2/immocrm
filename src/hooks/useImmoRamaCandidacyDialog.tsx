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

/**
 * Dialog "Avant de continuer" affiché avant « Déposer mon dossier ».
 * Case à cocher obligatoire : le bouton « OK, je continue » reste désactivé tant
 * qu'elle n'est pas cochée.
 */
export function useImmoRamaCandidacyDialog(options?: { onConfirm?: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const openDialog = useCallback(() => {
    setAccepted(false);
    setOpen(true);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setAccepted(false);
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
                Vous souhaitez qu'Immo-rama.ch dépose votre dossier de candidature à votre place ? Nos
                conseillers préparent et transmettent un dossier complet et soigné à la gérance ou au
                propriétaire, afin de maximiser vos chances d'obtenir le logement.
              </p>
              <p>
                En cas d'attribution du logement grâce à notre intervention, une commission d'agence
                équivalente à un mois de loyer brut sera due.
              </p>
              <p>
                Protection de vos données : les informations et les pièces justificatives que vous nous
                confiez (par exemple extrait de l'Office des poursuites, pièce d'identité ou permis de
                séjour, fiches de salaire) sont traitées de manière confidentielle, dans le respect de la
                législation suisse sur la protection des données. Vous les fournissez librement et vous
                autorisez Immo-rama.ch à les communiquer à la gérance ou au bailleur dans le seul but de
                traiter votre candidature.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <label className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm cursor-pointer">
          <Checkbox
            checked={accepted}
            onCheckedChange={(v) => setAccepted(v === true)}
            aria-label="J'ai lu et j'accepte les conditions ci-dessus."
            className="mt-0.5"
          />
          <span>J'ai lu et j'accepte les conditions ci-dessus.</span>
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
