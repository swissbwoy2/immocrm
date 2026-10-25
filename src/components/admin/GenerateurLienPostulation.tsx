import { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, Loader2, Power, PowerOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';

const lienComplet = (token: string) => `${window.location.origin}/postuler/${token}`;

function nouveauToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 28);
}

const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' }) : '—';

/**
 * Genere un lien de postulation a envoyer a une personne qui n'arrive pas a postuler.
 * Le lien ouvre le formulaire de demande de location pour l'annonce choisie,
 * apres une connexion par lien a usage unique envoye par e-mail.
 */
export function GenerateurLienPostulation() {
  const { user } = useAuth();
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [liens, setLiens] = useState<any[]>([]);
  const [annonceId, setAnnonceId] = useState<string>('');
  const [note, setNote] = useState('');
  const [creation, setCreation] = useState(false);
  const [ouvert, setOuvert] = useState(false);

  const charger = async () => {
    const [{ data: a }, { data: l }] = await Promise.all([
      (supabase as any).from('annonces_publiques')
        .select('id, titre, adresse, ville')
        .eq('statut', 'publie')
        .order('date_publication', { ascending: false })
        .limit(300),
      (supabase as any).from('postulation_liens')
        .select('id, token, annonce_id, note, actif, utilisations, expires_at, created_at, annonces_publiques(titre, adresse, ville)')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    setAnnonces(a ?? []);
    setLiens(l ?? []);
  };

  useEffect(() => { if (ouvert) charger(); }, [ouvert]);

  const libelle = (x: any) => [x?.adresse, x?.ville].filter(Boolean).join(', ') || x?.titre || 'Annonce';

  const creer = async () => {
    if (!annonceId) return toast.error('Choisissez une annonce');
    if (!user?.id) return;
    setCreation(true);
    try {
      const token = nouveauToken();
      const { error } = await (supabase as any).from('postulation_liens').insert({
        token, annonce_id: annonceId, created_by: user.id, note: note.trim() || null,
      });
      if (error) throw error;
      await navigator.clipboard.writeText(lienComplet(token)).catch(() => undefined);
      toast.success('Lien généré et copié');
      setNote('');
      await charger();
    } catch (e: any) {
      toast.error(e?.message || 'Génération impossible');
    } finally {
      setCreation(false);
    }
  };

  const copier = async (token: string) => {
    try {
      await navigator.clipboard.writeText(lienComplet(token));
      toast.success('Lien copié');
    } catch {
      toast.error('Copie impossible — sélectionnez le lien à la main');
    }
  };

  const basculer = async (l: any) => {
    const { error } = await (supabase as any).from('postulation_liens').update({ actif: !l.actif }).eq('id', l.id);
    if (error) return toast.error(error.message);
    toast.success(l.actif ? 'Lien désactivé' : 'Lien réactivé');
    charger();
  };

  const actifs = useMemo(() => liens.filter((l) => l.actif).length, [liens]);

  return (
    <Collapsible open={ouvert} onOpenChange={setOuvert}>
      <div className={DASH_CARD}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between gap-3 p-4 md:p-5 text-left min-h-[44px]">
            <span className="flex items-center gap-3 text-base font-semibold">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Link2 className="h-4 w-4" />
              </span>
              Générer un lien de postulation
            </span>
            <span className="text-sm text-muted-foreground">{ouvert ? 'Masquer' : `${actifs || ''} ${actifs ? 'lien(s) actif(s)' : 'Ouvrir'}`}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-4 border-t border-border/70 p-4 md:p-5">
            <p className="text-sm text-muted-foreground">
              À envoyer à une personne qui n'arrive pas à postuler. Elle recevra un lien de connexion par e-mail,
              son compte candidat sera créé si besoin, puis elle arrivera directement sur le formulaire de demande de location.
            </p>
            <div className="space-y-1">
              <Label>Annonce *</Label>
              <Select value={annonceId} onValueChange={setAnnonceId}>
                <SelectTrigger className="min-h-[44px] rounded-full"><SelectValue placeholder="Choisir l'objet visité" /></SelectTrigger>
                <SelectContent>
                  {annonces.map((a) => <SelectItem key={a.id} value={a.id}>{libelle(a)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="gl-note">Pour qui (note interne)</Label>
              <Input id="gl-note" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. Mme Dupont, vue le 12 — n'arrive pas à postuler" className="min-h-[44px] rounded-full" />
            </div>
            <Button onClick={creer} disabled={creation || !annonceId} className="min-h-[44px] w-full rounded-full sm:w-auto">
              {creation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Générer et copier le lien
            </Button>

            {liens.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium">Liens générés</p>
                {liens.map((l) => (
                  <div key={l.id} className="flex flex-col gap-2 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{libelle(l.annonces_publiques)}</p>
                      {l.note && <p className="truncate text-xs text-muted-foreground">{l.note}</p>}
                      <p className="text-xs text-muted-foreground">
                        Créé le {fmt(l.created_at)} · expire le {fmt(l.expires_at)} · {l.utilisations} utilisation{l.utilisations > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <DashBadge tone={l.actif ? 'success' : 'muted'}>{l.actif ? 'Actif' : 'Désactivé'}</DashBadge>
                      <Button size="sm" variant="outline" className="min-h-[40px] rounded-full" onClick={() => copier(l.token)}>
                        <Copy className="mr-1 h-3.5 w-3.5" /> Copier
                      </Button>
                      <Button size="sm" variant="ghost" className="min-h-[40px] rounded-full" onClick={() => basculer(l)}>
                        {l.actif ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
