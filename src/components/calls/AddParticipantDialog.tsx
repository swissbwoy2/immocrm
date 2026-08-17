import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChatAvatar } from '@/components/messaging/ChatAvatar';
import { CallCandidate, CallMode, fetchInviteCandidates, inviteToCall } from '@/lib/livekitCall';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  mode: CallMode;
}

const roleLabel: Record<string, string> = {
  admin: 'Admin',
  agent: 'Agent',
  coursier: 'Coursier',
  client: 'Client',
};

export function AddParticipantDialog({ open, onOpenChange, conversationId, mode }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<CallCandidate[]>([]);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invited, setInvited] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetchInviteCandidates(conversationId)
      .then((list) => !cancelled && setCandidates(list))
      .catch((e) =>
        toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, conversationId, toast]);

  const handleInvite = async (c: CallCandidate) => {
    setInvitingId(c.user_id);
    try {
      await inviteToCall({ conversationId, userId: c.user_id, mode });
      setInvited((prev) => [...prev, c.user_id]);
      toast({ title: 'Invitation envoyée', description: `${c.name} a été invité à rejoindre l'appel.` });
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un participant</DialogTitle>
          <DialogDescription>
            Les personnes liées au dossier peuvent être invitées à rejoindre l'appel.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : candidates.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune personne à inviter pour ce dossier.
          </p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {candidates.map((c) => (
              <div
                key={c.user_id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
              >
                <ChatAvatar name={c.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">{roleLabel[c.role] || c.role}</p>
                </div>
                <Button
                  size="sm"
                  variant={invited.includes(c.user_id) ? 'secondary' : 'default'}
                  disabled={invitingId === c.user_id || invited.includes(c.user_id)}
                  onClick={() => handleInvite(c)}
                >
                  {invitingId === c.user_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : invited.includes(c.user_id) ? (
                    'Invité'
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-1" /> Inviter
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
