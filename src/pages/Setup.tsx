import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Setup() {
  const [loading, setLoading] = useState(false);
  const [loadingClient, setLoadingClient] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const createAdminAccount = async () => {
    setLoading(true);
    try {
      // Call edge function to create admin
      const { data, error } = await supabase.functions.invoke('create-admin', {
        method: 'POST',
      });

      if (error) throw error;

      toast({
        title: 'Installation réussie',
        description: 'Le compte administrateur a été créé avec succès',
      });

      navigate('/login');
    } catch (error: any) {
      if (error.message?.includes('Admin already exists')) {
        toast({
          title: 'Compte existant',
          description: 'Le compte admin existe déjà. Vous pouvez vous connecter.',
        });
        navigate('/login');
      } else {
        toast({
          title: 'Erreur',
          description: error.message || 'Erreur lors de la création du compte admin',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetClientPassword = async () => {
    setLoadingClient(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-client-password', {
        body: {
          email: 'christ.ramazani@immo-rama.ch',
          newPassword: 'Client123!'
        }
      });

      if (error) throw error;

      toast({
        title: 'Mot de passe réinitialisé',
        description: 'Le mot de passe de Christ Ramazani a été réinitialisé à "Client123!"',
      });

    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la réinitialisation du mot de passe',
        variant: 'destructive',
      });
    } finally {
      setLoadingClient(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl">Configuration initiale</CardTitle>
            <CardDescription className="text-base">
              Bienvenue ! Créez le compte administrateur pour commencer.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
              <p className="font-medium">Compte administrateur :</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>Email:</strong> admin@immo-rama.ch</p>
                <p><strong>Mot de passe:</strong> Admin123!</p>
                <p><strong>Rôle:</strong> Administrateur</p>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg text-sm space-y-2">
              <p className="font-medium">Compte client (Christ Ramazani) :</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>Email:</strong> christ.ramazani@immo-rama.ch</p>
                <p><strong>Mot de passe:</strong> Client123!</p>
                <p><strong>Rôle:</strong> Client</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={createAdminAccount} 
            className="w-full" 
            disabled={loading || loadingClient}
          >
            {loading ? 'Création en cours...' : 'Créer le compte administrateur'}
          </Button>

          <Button 
            onClick={resetClientPassword} 
            variant="secondary"
            className="w-full" 
            disabled={loading || loadingClient}
          >
            {loadingClient ? 'Réinitialisation...' : 'Réinitialiser mot de passe de Christ Ramazani'}
          </Button>

          <Button 
            variant="outline" 
            onClick={() => navigate('/login')} 
            className="w-full"
            disabled={loading || loadingClient}
          >
            J'ai déjà un compte
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
