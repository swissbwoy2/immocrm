import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertTriangle, RefreshCw, Mail, Phone, CheckCircle2, UserPlus, ArrowLeft, Search, Loader2 } from "lucide-react";
import { PremiumPageHeader } from "@/components/premium/PremiumPageHeader";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface SignupAttempt {
  id: string;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  source: string | null;
  parcours: string | null;
  stage: 'auth_signup_failed' | 'provision_failed' | 'succeeded' | 'lead_only';
  error_message: string | null;
  user_agent: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
}

const STAGE_LABELS: Record<SignupAttempt['stage'], { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  auth_signup_failed: { label: 'Échec création compte', variant: 'destructive' },
  provision_failed: { label: 'Échec profil/rôle', variant: 'destructive' },
  succeeded: { label: 'Succès', variant: 'default' },
  lead_only: { label: 'Lead seul', variant: 'secondary' },
};

export default function InscriptionsEchouees() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [attempts, setAttempts] = useState<SignupAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [search, setSearch] = useState("");
  const [resolveDialog, setResolveDialog] = useState<SignupAttempt | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [inviting, setInviting] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const q = supabase
      .from('signup_attempts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    const { data, error } = await q;
    if (error) {
      toast({ title: 'Erreur chargement', description: error.message, variant: 'destructive' });
    } else {
      setAttempts((data as SignupAttempt[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = attempts.filter(a => {
    if (!showResolved && a.resolved_at) return false;
    if (showResolved && !a.resolved_at) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!a.email.toLowerCase().includes(s) &&
          !(a.first_name || '').toLowerCase().includes(s) &&
          !(a.last_name || '').toLowerCase().includes(s) &&
          !(a.phone || '').includes(s)) return false;
    }
    return true;
  });

  const stats = {
    total: attempts.length,
    failed: attempts.filter(a => a.stage !== 'succeeded' && !a.resolved_at).length,
    succeeded: attempts.filter(a => a.stage === 'succeeded').length,
    resolved: attempts.filter(a => a.resolved_at).length,
  };

  const handleInvite = async (a: SignupAttempt) => {
    if (!a.email) return;
    setInviting(a.id);
    try {
      const { error } = await supabase.functions.invoke('invite-client', {
        body: {
          email: a.email,
          prenom: a.first_name || '',
          nom: a.last_name || '',
          telephone: a.phone || null,
          invitationLegere: true,
          typeRecherche: a.parcours === 'vente' ? 'Acheter' : 'Louer',
        },
      });
      if (error) throw error;
      toast({ title: 'Invitation envoyée', description: `${a.email} recevra un email d'invitation` });
      setResolveDialog(a);
      setResolveNotes('Invitation manuelle envoyée depuis le tableau des inscriptions échouées');
    } catch (e: any) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setInviting(null);
    }
  };

  const handleResolve = async () => {
    if (!resolveDialog) return;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('signup_attempts')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: userData.user?.id || null,
        resolution_notes: resolveNotes || null,
      } as any)
      .eq('id', resolveDialog.id);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Marqué comme résolu' });
    setResolveDialog(null);
    setResolveNotes('');
    await load();
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/clients')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux clients
        </Button>

        <PremiumPageHeader
          title="Inscriptions échouées"
          subtitle={`${stats.failed} inscription(s) non résolue(s) • ${stats.resolved} résolue(s)`}
          icon={AlertTriangle}
          badge="Récupération"
          action={
            <Button onClick={load} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Rafraîchir
            </Button>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
          <Card className="p-4"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-bold">{stats.total}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Échecs non résolus</div><div className="text-2xl font-bold text-destructive">{stats.failed}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Succès</div><div className="text-2xl font-bold text-green-600">{stats.succeeded}</div></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Résolus</div><div className="text-2xl font-bold">{stats.resolved}</div></Card>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Email, nom, téléphone…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant={showResolved ? "outline" : "default"} size="sm" onClick={() => setShowResolved(false)}>
            À traiter ({stats.failed})
          </Button>
          <Button variant={showResolved ? "default" : "outline"} size="sm" onClick={() => setShowResolved(true)}>
            Résolus ({stats.resolved})
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-500 mb-3" />
            <p className="text-muted-foreground">
              {showResolved ? "Aucune inscription résolue." : "Aucune inscription en échec. 🎉"}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(a => {
              const stage = STAGE_LABELS[a.stage];
              return (
                <Card key={a.id} className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge variant={stage.variant}>{stage.label}</Badge>
                        {a.source && <Badge variant="outline" className="text-xs">{a.source}</Badge>}
                        {a.parcours && <Badge variant="outline" className="text-xs">{a.parcours}</Badge>}
                        {a.resolved_at && <Badge variant="secondary"><CheckCircle2 className="w-3 h-3 mr-1" />Résolu</Badge>}
                      </div>
                      <div className="font-medium">
                        {a.first_name || a.last_name ? `${a.first_name || ''} ${a.last_name || ''}`.trim() : '(sans nom)'}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{a.email}</span>
                        {a.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{a.phone}</span>}
                        <span>{formatDistanceToNow(new Date(a.created_at), { locale: fr, addSuffix: true })}</span>
                      </div>
                      {a.error_message && (
                        <div className="text-xs text-destructive/80 mt-2 font-mono break-all">
                          {a.error_message}
                        </div>
                      )}
                      {a.resolution_notes && (
                        <div className="text-xs text-muted-foreground mt-2 italic">
                          ✓ {a.resolution_notes}
                        </div>
                      )}
                    </div>
                    {!a.resolved_at && (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleInvite(a)}
                          disabled={inviting === a.id}
                        >
                          {inviting === a.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                          Inviter
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setResolveDialog(a); setResolveNotes(''); }}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Résoudre
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={!!resolveDialog} onOpenChange={(o) => !o && setResolveDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marquer comme résolu</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                {resolveDialog?.email}
              </div>
              <Textarea
                placeholder="Notes de résolution (optionnel) — ex: contacté par téléphone, invitation envoyée…"
                value={resolveNotes}
                onChange={e => setResolveNotes(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
              <Button onClick={handleResolve}>Marquer résolu</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
