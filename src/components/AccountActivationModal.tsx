import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Send, CheckCircle, Loader2, LogOut, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AccountActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName?: string;
}

export function AccountActivationModal({ isOpen, onClose, userId, userName }: AccountActivationModalProps) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [typeRecherche, setTypeRecherche] = useState<string>('Louer');
  const navigate = useNavigate();

  // Récupérer le type de recherche du client
  useEffect(() => {
    const fetchTypeRecherche = async () => {
      if (!userId) return;
      
      try {
        // Récupérer l'email du profil
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();
        
        if (profile?.email) {
          // Récupérer le type_recherche depuis demandes_mandat
          const { data: demande } = await supabase
            .from('demandes_mandat')
            .select('type_recherche')
            .eq('email', profile.email)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (demande?.type_recherche) {
            setTypeRecherche(demande.type_recherche);
          }
        }
      } catch (error) {
        console.error('Error fetching type_recherche:', error);
      }
    };
    
    if (isOpen && userId) {
      fetchTypeRecherche();
    }
  }, [isOpen, userId]);

  // Montant dynamique selon le type de recherche
  const montantAcompte = typeRecherche === 'Acheter' ? "2'500.-" : "300.-";

  const handleContactAdmin = async () => {
    setSending(true);
    
    try {
      // Récupérer les infos du client
      const { data: profile } = await supabase
        .from('profiles')
        .select('prenom, nom, email')
        .eq('id', userId)
        .single();

      const clientName = profile ? `${profile.prenom} ${profile.nom}` : userName || 'Un nouveau client';
      const clientEmail = profile?.email || '';

      // Récupérer tous les admins
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (!adminRoles || adminRoles.length === 0) {
        throw new Error('Aucun administrateur trouvé');
      }

      // Créer une notification pour chaque admin
      for (const admin of adminRoles) {
        await supabase.rpc('create_notification', {
          p_user_id: admin.user_id,
          p_type: 'activation_request',
          p_title: '🆕 Demande d\'activation de compte',
          p_message: `${clientName} (${clientEmail}) a tenté d'accéder à son dashboard. Veuillez importer son fichier CSV dans clients pour lier le compte et l'activer. Merci de bien vérifier que l'acompte a bien été comptabilisé.`,
          p_link: '/admin/clients',
          p_metadata: JSON.stringify({ client_user_id: userId, client_email: clientEmail })
        });
      }

      setSent(true);
      toast.success('Demande d\'activation envoyée aux administrateurs');
    } catch (error) {
      console.error('Error sending activation request:', error);
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleOpenFormulaire = () => {
    window.open('https://immo-rama.ch/formulaire', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-warning" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Compte non encore activé
          </DialogTitle>
          <DialogDescription className="text-center space-y-3 pt-2">
            <p>
              Votre compte n'est pas encore activé.
            </p>
            <p>
              Veuillez vérifier auprès de l'administrateur que votre <strong>mandat de recherche signé</strong> a bien été reçu et que votre <strong>acompte de CHF {montantAcompte}</strong> a été comptabilisé.
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex flex-col gap-2 sm:flex-col mt-4">
          {sent ? (
            <div className="flex items-center justify-center gap-2 text-green-600 py-3">
              <CheckCircle className="w-5 h-5" />
              <span>Demande envoyée ! Nous vous contacterons bientôt.</span>
            </div>
          ) : (
            <>
              <Button 
                onClick={handleOpenFormulaire}
                className="w-full"
                size="lg"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Activer ma recherche
              </Button>
              
              <Button 
                onClick={handleContactAdmin} 
                disabled={sending}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Contacter l'administrateur
                  </>
                )}
              </Button>
            </>
          )}
          
          <Button 
            variant="ghost" 
            onClick={handleLogout} 
            className="w-full text-muted-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Se déconnecter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
