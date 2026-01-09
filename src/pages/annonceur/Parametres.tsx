import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AnnonceurLayout } from '@/components/annonceur/AnnonceurLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Bell, Lock, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Parametres() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  
  // Password change state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  // Fetch annonceur settings
  const { data: annonceur } = useQuery({
    queryKey: ['annonceur-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonceurs')
        .select('notifications_email, notifications_sms')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update notifications mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: { notifications_email?: boolean; notifications_sms?: boolean }) => {
      const { error } = await supabase
        .from('annonceurs')
        .update(data)
        .eq('user_id', user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annonceur-settings'] });
      toast.success('Préférences mises à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwords.new !== passwords.confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwords.new.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;

      toast.success('Mot de passe modifié avec succès');
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setChangingPassword(false);
    }
  };

  // Delete account
  const handleDeleteAccount = async () => {
    try {
      // Delete annonceur profile (cascade will handle related data)
      const { error: deleteError } = await supabase
        .from('annonceurs')
        .delete()
        .eq('user_id', user?.id);

      if (deleteError) throw deleteError;

      // Sign out
      await signOut();
      toast.success('Compte supprimé avec succès');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression du compte');
    }
  };

  return (
    <AnnonceurLayout>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Paramètres</h1>
          <p className="text-muted-foreground">
            Gérez vos préférences et votre compte
          </p>
        </div>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choisissez comment vous souhaitez être notifié
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notif">Notifications par email</Label>
                <p className="text-sm text-muted-foreground">
                  Recevez des emails pour les nouveaux messages et contacts
                </p>
              </div>
              <Switch
                id="email-notif"
                checked={annonceur?.notifications_email ?? true}
                onCheckedChange={(checked) => 
                  updateNotificationsMutation.mutate({ notifications_email: checked })
                }
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sms-notif">Notifications SMS</Label>
                <p className="text-sm text-muted-foreground">
                  Recevez des SMS pour les contacts urgents
                </p>
              </div>
              <Switch
                id="sms-notif"
                checked={annonceur?.notifications_sms ?? false}
                onCheckedChange={(checked) => 
                  updateNotificationsMutation.mutate({ notifications_sms: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Sécurité
            </CardTitle>
            <CardDescription>
              Modifiez votre mot de passe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" disabled={changingPassword || !passwords.new || !passwords.confirm}>
                <Save className="h-4 w-4 mr-2" />
                {changingPassword ? 'Modification...' : 'Modifier le mot de passe'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Zone de danger
            </CardTitle>
            <CardDescription>
              Actions irréversibles sur votre compte
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer mon compte
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Elle supprimera définitivement votre compte
                    et toutes vos annonces associées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </AnnonceurLayout>
  );
}
