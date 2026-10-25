import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AnnonceMessagesPanel } from '@/components/annonces/AnnonceMessagesPanel';
import { ConversationsAnnoncePanel } from '@/components/messaging/ConversationsAnnoncePanel';
import { DashPage, DashPageHeader } from '@/components/client/dashboard/DashPrimitives';

export default function CandidatMessages() {
  const { user } = useAuth();
  const [sp] = useSearchParams();
  return (
    <DashPage className="space-y-6">
      <DashPageHeader title="Messages" subtitle="Mes échanges sur les annonces" />
      {user && <ConversationsAnnoncePanel userId={user.id} mode="candidat" initialId={sp.get('conversation')} />}
      <div className="min-h-[60vh]">
        {user && <AnnonceMessagesPanel userId={user.id} emptyLabel="Vous n'avez encore contacté aucune annonce" />}
      </div>
    </DashPage>
  );
}
