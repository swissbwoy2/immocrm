import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { ConfirmKind } from './ClientDetailHeader';

/**
 * Confirmations des actions rares du menu « Plus » (mêmes textes qu'avant) :
 * suspendre, stopper, réactiver la recherche, supprimer le client.
 */
export function ClientConfirmDialogs({ kind, onClose, onSuspend, onStop, onReactivate, onDelete }: {
  kind: ConfirmKind | null;
  onClose: () => void;
  onSuspend: () => void;
  onStop: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const props = (k: ConfirmKind) => ({ open: kind === k, onOpenChange: (o: boolean) => { if (!o) onClose(); } });
  return (
    <>
      <AlertDialog {...props('suspend')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspendre la recherche ?</AlertDialogTitle>
            <AlertDialogDescription>
              La barre de progression sera figée et le compteur J+ arrêté. Vous pourrez réactiver la recherche plus tard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="imr-lg-warning" onClick={onSuspend}>Suspendre</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog {...props('stop')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stopper la recherche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le client arrête sa recherche. La barre de progression sera figée définitivement. Le client restera dans la base de données.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="imr-lg-danger" onClick={onStop}>Stopper</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog {...props('reactivate')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réactiver la recherche ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le compteur J+ reprendra là où il s'était arrêté. La barre de progression recommencera à avancer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={onReactivate}>Réactiver</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog {...props('delete')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <Trash2 className="h-5 w-5" />
              </span>
              Confirmer la suppression
            </AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible et supprimera toutes les données associées (documents, candidatures, visites, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="imr-lg-danger">Supprimer définitivement</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
