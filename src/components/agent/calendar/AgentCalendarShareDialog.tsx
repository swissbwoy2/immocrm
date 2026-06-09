import { useMemo, useState } from 'react';
import { Check, X, Trash2, Send, Share2, Inbox, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAgentCalendarShares, type AgentCalendarShare } from '@/hooks/useAgentCalendarShares';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function agentLabel(a: { prenom?: string | null; nom?: string | null } | null | undefined) {
  if (!a) return 'Agent inconnu';
  return `${a.prenom || ''} ${a.nom || ''}`.trim() || 'Agent';
}

export function AgentCalendarShareDialog({ open, onOpenChange }: Props) {
  const {
    loading,
    agents,
    incoming,
    outgoing,
    accepted,
    shares,
    sendRequest,
    respond,
    revoke,
  } = useAgentCalendarShares();
  const [selectedAgent, setSelectedAgent] = useState<string>('');

  // Exclude agents we already have any share with
  const availableAgents = useMemo(() => {
    const taken = new Set(
      shares
        .filter((s) => s.status === 'pending' || s.status === 'accepted')
        .flatMap((s) => [s.requester_agent_id, s.recipient_agent_id])
    );
    return agents.filter((a) => !taken.has(a.id));
  }, [agents, shares]);

  const handleSend = async () => {
    if (!selectedAgent) return;
    await sendRequest(selectedAgent);
    setSelectedAgent('');
  };

  const renderShareLine = (
    s: AgentCalendarShare,
    partnerKey: 'requester' | 'recipient',
    actions: React.ReactNode
  ) => {
    const partner = s[partnerKey];
    return (
      <div
        key={s.id}
        className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/60 p-3"
      >
        <div className="min-w-0">
          <p className="font-medium truncate">{agentLabel(partner)}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(s.updated_at || s.created_at), {
              addSuffix: true,
              locale: fr,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Partage d'agenda entre agents
          </DialogTitle>
          <DialogDescription>
            Envoyez une demande à un collègue. Une fois acceptée, vous verrez tous les deux vos
            agendas mutuels (visites, rendez‑vous, événements) et pourrez les modifier.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Send new request */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Send className="h-4 w-4" /> Envoyer une demande
            </h3>
            <div className="flex gap-2">
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={
                      availableAgents.length === 0 ? 'Aucun agent disponible' : 'Choisir un agent…'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {agentLabel(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSend} disabled={!selectedAgent}>
                Envoyer
              </Button>
            </div>
          </section>

          {/* Incoming */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Inbox className="h-4 w-4" /> Demandes reçues
              {incoming.length > 0 && <Badge variant="secondary">{incoming.length}</Badge>}
            </h3>
            {incoming.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune demande en attente.</p>
            ) : (
              <div className="space-y-2">
                {incoming.map((s) =>
                  renderShareLine(s, 'requester', (
                    <>
                      <Button size="sm" onClick={() => respond(s.id, true)}>
                        <Check className="h-4 w-4 mr-1" /> Accepter
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => respond(s.id, false)}>
                        <X className="h-4 w-4 mr-1" /> Refuser
                      </Button>
                    </>
                  ))
                )}
              </div>
            )}
          </section>

          {/* Outgoing */}
          {outgoing.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Send className="h-4 w-4" /> Demandes envoyées
              </h3>
              <div className="space-y-2">
                {outgoing.map((s) =>
                  renderShareLine(s, 'recipient', (
                    <>
                      <Badge variant="outline">En attente</Badge>
                      <Button size="sm" variant="ghost" onClick={() => revoke(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ))
                )}
              </div>
            </section>
          )}

          {/* Accepted */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Share2 className="h-4 w-4" /> Partages actifs
              {accepted.length > 0 && <Badge variant="secondary">{accepted.length}</Badge>}
            </h3>
            {accepted.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun partage actif.</p>
            ) : (
              <div className="space-y-2">
                {accepted.map((s) => {
                  // Show the other side
                  const partnerKey =
                    s.requester?.id && s.requester_agent_id !== s.recipient_agent_id
                      ? // We don't know which side I am here without myAgentId, but the hook ensures partner is the OTHER one if we pick the non-self.
                        ('requester' as const)
                      : ('recipient' as const);
                  // Simpler: show the partner that is NOT me — handled in hook by including both sides; pick the one whose id differs from the share's "mine"
                  return (
                    <ShareAcceptedRow
                      key={s.id}
                      share={s}
                      onRevoke={() => revoke(s.id)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {loading && <p className="text-xs text-muted-foreground">Chargement…</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareAcceptedRow({
  share,
  onRevoke,
}: {
  share: AgentCalendarShare;
  onRevoke: () => void;
}) {
  // We rely on hook's enrichment; pick the partner that is NOT the current user.
  // Since hook puts both sides in requester/recipient, choose the one whose user_id != auth user.
  // The hook already returns both populated; we determine "me" by looking at duplicates.
  // Easier: show both labels.
  const a = share.requester;
  const b = share.recipient;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
      <div className="min-w-0">
        <p className="font-medium truncate">
          {agentLabel(a)} ↔ {agentLabel(b)}
        </p>
        <p className="text-xs text-muted-foreground">
          Actif depuis{' '}
          {formatDistanceToNow(new Date(share.accepted_at || share.updated_at), {
            addSuffix: true,
            locale: fr,
          })}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onRevoke}>
        <Trash2 className="h-4 w-4 mr-1" /> Révoquer
      </Button>
    </div>
  );
}
