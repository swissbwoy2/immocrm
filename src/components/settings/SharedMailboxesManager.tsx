import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Inbox, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Mailbox = {
  id: string;
  address: string;
  label: string | null;
  imap_host: string;
  imap_port: number;
  is_active: boolean;
  has_password: boolean;
  last_sync_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  pending_count: number | null;
  emails_count: number;
};

type FormState = {
  id: string | null;
  address: string;
  label: string;
  imapHost: string;
  imapPort: string;
  password: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  id: null,
  address: '',
  label: '',
  imapHost: 'mail.infomaniak.com',
  imapPort: '993',
  password: '',
  isActive: true,
};

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

function formatDate(iso: string | null) {
  if (!iso) return 'jamais';
  return new Intl.DateTimeFormat('fr-CH', {
    timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));
}

/**
 * Boîtes e-mail lues par Steeve (info@, martins@, relocation@, visites@, boîtes Logisorama…).
 * Le mot de passe est enregistré dans le coffre du serveur : il n'est jamais réaffiché.
 */
export function SharedMailboxesManager() {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Mailbox | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_shared_mailboxes');
    if (error) {
      console.error(error);
      toast.error('Impossible de charger les boîtes e-mail');
    } else {
      setMailboxes((data ?? []) as Mailbox[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const edit = (m: Mailbox) => setForm({
    id: m.id,
    address: m.address,
    label: m.label ?? '',
    imapHost: m.imap_host,
    imapPort: String(m.imap_port),
    password: '',
    isActive: m.is_active,
  });

  const save = async () => {
    if (!form) return;
    const address = form.address.trim().toLowerCase();
    const port = Number(form.imapPort);
    if (!EMAIL_PATTERN.test(address)) {
      toast.error('Adresse e-mail invalide');
      return;
    }
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      toast.error('Port invalide');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('admin_save_shared_mailbox', {
      p_id: form.id,
      p_address: address,
      p_label: form.label.trim() || null,
      p_imap_host: form.imapHost.trim() || 'mail.infomaniak.com',
      p_imap_port: port,
      p_is_active: form.isActive,
      p_password: form.password || null,
    });
    setSaving(false);
    if (error) {
      const known = ['Nouveau mot de passe requis', 'Serveur IMAP invalide', 'Mot de passe invalide'];
      const message = known.find((k) => error.message.includes(k));
      toast.error(error.message.includes('duplicate') ? 'Cette adresse existe déjà' : message ? error.message : "L'enregistrement a échoué");
      return;
    }
    toast.success('Boîte enregistrée');
    setForm(null);
    void load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.rpc('admin_delete_shared_mailbox', { p_id: toDelete.id });
    if (error) toast.error('La suppression a échoué');
    else toast.success('Boîte supprimée');
    setToDelete(null);
    void load();
  };

  const passwordState = (m: Mailbox) => (m.has_password ? 'Mot de passe enregistré' : 'Mot de passe manquant');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="w-5 h-5" />
          Boîtes e-mail lues par Steeve
        </CardTitle>
        <CardDescription>
          Steeve lit ces boîtes pour retrouver les e-mails qui concernent un client (ses adresses ou son nom complet),
          et n'en donne que des extraits limités à son dossier. Relève toutes les 5 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : mailboxes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune boîte configurée.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border">
            {mailboxes.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium break-all">{m.address}</span>
                    {m.label && <span className="text-sm text-muted-foreground">· {m.label}</span>}
                    <Badge variant={m.is_active ? 'default' : 'secondary'}>{m.is_active ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className={`text-xs ${!m.has_password ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {passwordState(m)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dernière relève : {formatDate(m.last_sync_at)} · {m.emails_count} e-mail(s) relevé(s)
                    {m.pending_count ? ` · ${m.pending_count} en attente` : ''}
                  </p>
                  {m.last_error && <p className="text-xs text-destructive">{m.last_error}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="outline" size="sm" onClick={() => edit(m)}>
                    <Pencil className="h-4 w-4 mr-1" /> Modifier
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setToDelete(m)} aria-label={`Supprimer ${m.address}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" onClick={() => setForm({ ...EMPTY_FORM })}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter une boîte
        </Button>
      </CardContent>

      <Dialog open={!!form} onOpenChange={(open) => { if (!open && !saving) setForm(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Modifier la boîte' : 'Ajouter une boîte'}</DialogTitle>
            <DialogDescription>
              Le mot de passe est rangé dans le coffre du serveur et n'est jamais réaffiché. Un changement d'adresse,
              de serveur ou de port demande de saisir à nouveau le mot de passe.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="mb-address">Adresse e-mail</Label>
                <Input id="mb-address" type="email" autoComplete="off" placeholder="visites@immo-rama.ch"
                  value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mb-label">Libellé</Label>
                <Input id="mb-label" placeholder="Visites" value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="mb-host">Serveur IMAP</Label>
                  <Input id="mb-host" value={form.imapHost} onChange={(e) => setForm({ ...form, imapHost: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mb-port">Port</Label>
                  <Input id="mb-port" inputMode="numeric" value={form.imapPort}
                    onChange={(e) => setForm({ ...form, imapPort: e.target.value.replace(/\D/g, '') })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="mb-password">Mot de passe</Label>
                <Input id="mb-password" type="password" autoComplete="new-password"
                  placeholder={form.id ? 'Laisser vide pour garder le mot de passe actuel' : ''}
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mb-active">Relève active</Label>
                <Switch id="mb-active" checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setForm(null)}>Annuler</Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(open) => { if (!open) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {toDelete?.address} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Steeve ne lira plus cette boîte. Les e-mails déjà relevés pour elle et son mot de passe enregistré sont supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
