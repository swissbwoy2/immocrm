import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { AnnonceMessagesPanel } from '@/components/annonces/AnnonceMessagesPanel';
import { ConversationsAnnoncePanel } from '@/components/messaging/ConversationsAnnoncePanel';
import { MESSENGER_PAGE_HEIGHT } from '@/components/messaging/MessengerSplitLayout';
import { cn } from '@/lib/utils';

type Onglet = 'candidatures' | 'annonces';

/**
 * Messagerie candidat : pleine hauteur comme la messagerie client (liste | conversation).
 * Deux sources inchangées : conversations liées aux candidatures (ConversationsAnnoncePanel)
 * et échanges sur les annonces publiques (AnnonceMessagesPanel).
 */
export default function CandidatMessages() {
  const { user } = useAuth();
  const [sp] = useSearchParams();
  const initialId = sp.get('conversation');
  // Lecture seule du cache déjà alimenté par ConversationsAnnoncePanel (aucune requête ajoutée).
  const { data: convs } = useQuery<any[]>({ queryKey: ['conv-annonce', 'candidat', user?.id], enabled: false });
  const hasConvs = (convs?.length ?? 0) > 0;
  const [onglet, setOnglet] = useState<Onglet>(initialId ? 'candidatures' : 'annonces');
  const actif: Onglet = hasConvs ? onglet : 'annonces';

  return (
    <div className={cn(MESSENGER_PAGE_HEIGHT, 'flex min-h-0 w-full flex-col gap-3 px-3 pb-3 pt-3 md:px-6 md:pb-6 md:pt-6')}>
      <header className="flex shrink-0 flex-wrap items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold tracking-tight text-foreground md:text-[28px]">Messages</h1>
          <p className="text-[15px] text-muted-foreground">Mes échanges sur les annonces</p>
        </div>
        {hasConvs && (
          <div className="imr-lg-segment inline-flex rounded-full p-1" role="tablist" aria-label="Type de conversations">
            {([['candidatures', 'Mes candidatures'], ['annonces', 'Annonces']] as [Onglet, string][]).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={actif === k}
                data-state={actif === k ? 'active' : 'inactive'}
                onClick={() => setOnglet(k)}
                className="min-h-[40px] rounded-full px-4 text-sm font-medium"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </header>
      {user && (
        <div className={cn('min-h-0 flex-1', actif !== 'candidatures' && 'hidden')}>
          <ConversationsAnnoncePanel
            userId={user.id}
            mode="candidat"
            initialId={initialId}
            className="h-full min-h-0 grid-rows-[minmax(0,1fr)] rounded-[22px]"
          />
        </div>
      )}
      <div className={cn('min-h-0 flex-1', actif !== 'annonces' && 'hidden')}>
        {user && <AnnonceMessagesPanel userId={user.id} emptyLabel="Vous n'avez encore contacté aucune annonce" />}
      </div>
    </div>
  );
}
