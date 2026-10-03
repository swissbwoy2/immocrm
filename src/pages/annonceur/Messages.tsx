import { useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AnnonceurLayout } from '@/components/annonceur/AnnonceurLayout';
import { AnnonceMessagesPanel } from '@/components/annonces/AnnonceMessagesPanel';
import { MessageSquare } from 'lucide-react';
import { ConversationsAnnoncePanel } from '@/components/messaging/ConversationsAnnoncePanel';

export default function Messages() {
  const { conversationId } = useParams();
  const { user } = useAuth();

  return (
    <AnnonceurLayout>
      <div className="h-full flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" /> Messages
          </h1>
          <p className="text-sm text-muted-foreground">
            Vos échanges avec les personnes intéressées par vos annonces.
          </p>
        </div>
        {user && <ConversationsAnnoncePanel userId={user.id} mode="annonceur" initialId={conversationId || null} />}
        <div className="flex-1 min-h-[70vh]">
          {user && (
            <AnnonceMessagesPanel
              userId={user.id}
              initialConversationId={conversationId || null}
              emptyLabel="Aucun message pour le moment"
            />
          )}
        </div>
      </div>
    </AnnonceurLayout>
  );
}
