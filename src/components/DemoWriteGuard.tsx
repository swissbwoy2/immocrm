import { useEffect } from 'react';
import { useIsDemoAccount } from '@/hooks/useIsDemoAccount';
import { toast } from 'sonner';

const TOAST_ID = 'demo-readonly-toast';
const MSG = '🎬 Mode démo : action désactivée. Activez votre vrai compte pour interagir.';

/**
 * Global write-blocker for the demo account.
 *
 * Mounts at the root of the authenticated layout. When the user is the demo
 * account, intercepts at the *capture* phase any event that would mutate state:
 *   - clicks on submit buttons, buttons inside forms, and elements marked [data-demo-action]
 *   - form submissions
 *   - file input selections
 *   - drag & drop uploads
 *
 * Pure navigation (links, sidebar, tabs, dialogs opening) keeps working.
 * Read-only inputs (search, filters) keep working unless explicitly tagged.
 */
export function DemoWriteGuard() {
  const isDemo = useIsDemoAccount();

  useEffect(() => {
    if (!isDemo) return;

    const showToast = () => {
      toast.info(MSG, { id: TOAST_ID, duration: 3000 });
    };

    const isWriteTrigger = (el: Element | null): boolean => {
      if (!el) return false;
      // Explicit opt-in / opt-out
      if (el.closest('[data-demo-allow]')) return false;
      if (el.closest('[data-demo-action]')) return true;

      // File inputs
      if (el instanceof HTMLInputElement && el.type === 'file') return true;

      // Form submit buttons
      const btn = el.closest('button');
      if (btn) {
        const type = btn.getAttribute('type');
        if (type === 'submit') return true;
        // Match buttons whose text suggests a write action (Enregistrer, Envoyer, Modifier, Supprimer, Confirmer, Accepter, Refuser, Postuler, Télécharger, Uploader, Soumettre, Sauvegarder, Valider, Créer, Ajouter, Payer)
        const label = (btn.textContent || '').trim().toLowerCase();
        const writeWords = [
          'enregistr', 'envoyer', 'modifier', 'supprim', 'confirm', 'accepter', 'refuser',
          'postuler', 'téléverser', 'uploader', 'soumettre', 'sauvegard', 'valider',
          'créer', 'ajouter', 'payer', 'mettre à jour', 'changer', 'générer', 'publier',
          'inviter', 'activer', 'désactiver', 'révoquer', 'transférer', 'archiv',
          'rejoindre', 'réserver', 'annuler', 'reporter', 'planifier', 'déposer',
        ];
        if (writeWords.some((w) => label.includes(w))) return true;
      }
      return false;
    };

    const onClick = (e: Event) => {
      const target = e.target as Element | null;
      if (isWriteTrigger(target)) {
        e.preventDefault();
        e.stopPropagation();
        showToast();
      }
    };

    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement | null;
      if (form?.closest('[data-demo-allow]')) return;
      e.preventDefault();
      e.stopPropagation();
      showToast();
    };

    const onChange = (e: Event) => {
      const target = e.target as HTMLInputElement | null;
      if (target instanceof HTMLInputElement && target.type === 'file') {
        if (target.closest('[data-demo-allow]')) return;
        e.preventDefault();
        e.stopPropagation();
        // Reset file input
        target.value = '';
        showToast();
      }
    };

    const onDrop = (e: DragEvent) => {
      const target = e.target as Element | null;
      if (target?.closest('[data-demo-allow]')) return;
      // If the drop carries files, block it
      if (e.dataTransfer?.files?.length) {
        e.preventDefault();
        e.stopPropagation();
        showToast();
      }
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('change', onChange, true);
    document.addEventListener('drop', onDrop, true);

    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('change', onChange, true);
      document.removeEventListener('drop', onDrop, true);
    };
  }, [isDemo]);

  return null;
}

export default DemoWriteGuard;
