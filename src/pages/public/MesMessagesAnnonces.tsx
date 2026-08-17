import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PublicHeader } from '@/components/public/PublicHeader';
import { AnnonceMessagesPanel } from '@/components/annonces/AnnonceMessagesPanel';
import { MessageSquare, Loader2 } from 'lucide-react';

export default function MesMessagesAnnonces() {
  const { user, loading } = useAuth();
  const { conversationId } = useParams();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="theme-luxury min-h-screen bg-background flex flex-col">
      <PublicHeader />
      <main className="container mx-auto px-4 py-6 flex-1 flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> Mes annonces contactées
          </h1>
          <p className="text-sm text-muted-foreground">
            Échangez directement avec les annonceurs des biens qui vous intéressent.
          </p>
        </div>
        <div className="flex-1 min-h-[70vh]">
          <AnnonceMessagesPanel
            userId={user.id}
            initialConversationId={conversationId || null}
            emptyLabel="Vous n'avez encore contacté aucune annonce"
          />
        </div>
      </main>
    </div>
  );
}
