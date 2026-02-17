import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Calendar, CheckCircle2, XCircle, Loader2, Unlink } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export function GoogleCalendarConnect() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    checkConnection();
  }, [user]);

  // Handle callback from Google OAuth
  useEffect(() => {
    const gcalStatus = searchParams.get('google_calendar');
    if (gcalStatus === 'success') {
      toast.success('Google Agenda connecté avec succès !');
      checkConnection();
      // Clean up URL params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('google_calendar');
      setSearchParams(newParams, { replace: true });
    } else if (gcalStatus === 'error') {
      const reason = searchParams.get('reason') || 'unknown';
      toast.error(`Erreur de connexion Google Agenda (${reason})`);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('google_calendar');
      newParams.delete('reason');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams]);

  const checkConnection = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      setIsConnected(!error && data !== null);
    } catch {
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user) return;
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Vous devez être connecté');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/google-calendar-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ app_url: window.location.origin }),
      });

      const data = await response.json();

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Impossible de générer le lien OAuth');
      }

      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error connecting Google Calendar:', error);
      toast.error(error.message || 'Erreur lors de la connexion à Google Agenda');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      toast.success('Google Agenda déconnecté');
    } catch (error: any) {
      console.error('Error disconnecting Google Calendar:', error);
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Google Agenda
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Chargement...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Google Agenda
        </CardTitle>
        <CardDescription>
          Synchronisez automatiquement vos événements avec votre Google Agenda
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
          {isConnected ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">Connecté</p>
                <p className="text-xs text-muted-foreground">
                  Les nouveaux événements seront automatiquement ajoutés à votre Google Agenda
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Non connecté</p>
                <p className="text-xs text-muted-foreground">
                  Connectez votre compte pour synchroniser vos événements
                </p>
              </div>
            </>
          )}
        </div>

        {isConnected ? (
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="text-destructive hover:bg-destructive/10 border-destructive/30"
          >
            {disconnecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Unlink className="w-4 h-4 mr-2" />
            )}
            {disconnecting ? 'Déconnexion...' : 'Déconnecter Google Agenda'}
          </Button>
        ) : (
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="w-4 h-4 mr-2" />
            )}
            {connecting ? 'Redirection vers Google...' : 'Connecter Google Agenda'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
