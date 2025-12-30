import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DeleteAccountDialogProps {
  userType: 'client' | 'agent' | 'proprietaire' | 'apporteur';
}

export function DeleteAccountDialog({ userType }: DeleteAccountDialogProps) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const CONFIRM_PHRASE = 'SUPPRIMER';

  const getDeleteFunction = () => {
    switch (userType) {
      case 'client':
        return 'delete-client';
      case 'agent':
        return 'delete-agent';
      case 'proprietaire':
        return 'delete-proprietaire';
      case 'apporteur':
        return 'delete-apporteur';
      default:
        return 'delete-client';
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    
    if (confirmText !== CONFIRM_PHRASE) {
      toast.error(`Veuillez taper "${CONFIRM_PHRASE}" pour confirmer`);
      return;
    }

    setLoading(true);
    try {
      const functionName = getDeleteFunction();
      
      const { error } = await supabase.functions.invoke(functionName, {
        body: { userId: user.id }
      });

      if (error) throw error;

      toast.success('Votre compte a été supprimé avec succès');
      await signOut();
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error(error.message || 'Erreur lors de la suppression du compte');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-auto">
          <Trash2 className="h-4 w-4 mr-2" />
          Supprimer mon compte
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Supprimer votre compte
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              Cette action est <strong>irréversible</strong>. Toutes vos données seront définitivement supprimées, y compris :
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Votre profil et informations personnelles</li>
              <li>Vos documents uploadés</li>
              <li>Votre historique de conversations</li>
              <li>Toutes vos données associées</li>
            </ul>
            <div className="pt-4">
              <Label htmlFor="confirm-delete" className="text-foreground">
                Pour confirmer, tapez <strong>{CONFIRM_PHRASE}</strong> ci-dessous :
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder={CONFIRM_PHRASE}
                className="mt-2"
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || confirmText !== CONFIRM_PHRASE}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer définitivement
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
