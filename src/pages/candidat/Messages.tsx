import { MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AnnonceMessagesPanel } from '@/components/annonces/AnnonceMessagesPanel';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';

export default function CandidatMessages() {
  const { user } = useAuth();
  return (
    <div className="flex-1 overflow-y-auto">
      <PremiumPageShellV2>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <MessageSquare className="h-6 w-6 text-primary" /> Messages
        </h1>
        <div className="min-h-[60vh]">
          {user && <AnnonceMessagesPanel userId={user.id} emptyLabel="Vous n'avez encore contacté aucune annonce" />}
        </div>
      </PremiumPageShellV2>
    </div>
  );
}