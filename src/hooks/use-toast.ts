import { toast as sonnerToast } from 'sonner';

interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

/**
 * Wrapper de compatibilité pour migrer de shadcn toast vers sonner.
 * Utilise sonner en interne mais maintient l'API existante.
 */
function toast(props: ToastProps) {
  const { title, description, variant } = props;
  if (variant === 'destructive') {
    sonnerToast.error(title, { description });
  } else {
    sonnerToast.success(title, { description });
  }
}

/**
 * Hook de compatibilité pour les composants utilisant l'ancienne API.
 * @deprecated Utilisez directement `import { toast } from 'sonner'` dans les nouveaux composants.
 */
function useToast() {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
    toasts: [],
  };
}

export { useToast, toast };
