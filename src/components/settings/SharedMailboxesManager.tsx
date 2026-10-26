import { useCallback, useEffect, useState } from 'react';
import { DASH_CARD, DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
  verified_count: number;
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
    <section aria-labelledby="steeve-boites-title" className={`${DASH_CARD} min-w-0 p-4 md:p-6`}>
      <header className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Inbox className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 id="steeve-boites-title" className="text-base font-semibold leading-snug text-foreground md:text-[17px]">Boîtes e-mail lues par Steeve</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Steeve n'y retrouve que les échanges directs avec un client (e-mails qu'il a envoyés ou dont il est destinataire,
            expéditeur authentifié), en extraits masqués, et seulement si son adresse est de confiance. Relève toutes les 5 minutes.
          </p>
        </div>
      </header>

      <div className="mt-4 space-y-3 md:mt-5">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : mailboxes.length === 0 ? (
          <p className="rounded-2xl border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground dark:bg-white/[0.03]">Aucune boîte configurée.</p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/50 dark:bg-white/[0.03]">
            {mailboxes.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all font-medium text-foreground">{m.address}</span>
                    {m.label && <span className="text-sm text-muted-foreground">· {m.label}</span>}
                    <DashBadge tone={m.is_active ? 'success' : 'muted'}>{m.is_active ? 'Active' : 'Inactive'}</DashBadge>
                    {!m.has_password && <DashBadge tone="danger">{passwordState(m)}</DashBadge>}
                  </div>
                  {m.has_password && <p className="text-sm text-muted-foreground">{passwordState(m)}</p>}
                  <p className="text-sm text-muted-foreground">
                    Dernière relève : {formatDate(m.last_sync_at)} · {m.emails_count} e-mail(s) relevé(s), dont {m.verified_count} d'expéditeur authentifié
                    {m.pending_count ? ` · ${m.pending_count} en attente` : ''}
                  </p>
                  {m.last_error && <p className="break-words text-sm text-destructive">{m.last_error}</p>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={() => edit(m)}>
                    <Pencil className="h-4 w-4 mr-1" /> Modifier
                  </Button>
                  <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setToDelete(m)} aria-label={`Supprimer ${m.address}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={() => setForm({ ...EMPTY_FORM })}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter une boîte
        </Button>
      </div>

      <Dialog open={!!form} onOpenChange={(open) => { if (!open && !saving) setForm(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Modifier la boîte' : 'Ajouter une boîte'}</DialogTitle>
            <DialogDescription>
              Le mot de passe est rangé dans le coffre du serveur et n'est jamais réaffiché. Un changement d'adresse,
              de serveur ou de port demande de saisir à nouveau le mot de passe.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="mb-address">Adresse e-mail</Label>
                <Input id="mb-address" type="email" autoComplete="off" placeholder="visites@immo-rama.ch" className="h-11 rounded-xl"
                  value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mb-label">Libellé</Label>
                <Input id="mb-label" placeholder="Visites" value={form.label} className="h-11 rounded-xl"
                  onChange={(e) => setForm({ ...form, label: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="mb-host">Serveur IMAP</Label>
                  <Input id="mb-host" className="h-11 rounded-xl" value={form.imapHost} onChange={(e) => setForm({ ...form, imapHost: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mb-port">Port</Label>
                  <Input id="mb-port" inputMode="numeric" className="h-11 rounded-xl" value={form.imapPort}
                    onChange={(e) => setForm({ ...form, imapPort: e.target.value.replace(/\D/g, '') })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mb-password">Mot de passe</Label>
                <Input id="mb-password" type="password" autoComplete="new-password" className="h-11 rounded-xl"
                  placeholder={form.id ? 'Laisser vide pour garder le mot de passe actuel' : ''}
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="flex min-h-[56px] items-center justify-between gap-4 rounded-2xl border border-border/60 px-4">
                <Label htmlFor="mb-active" className="text-[15px] font-medium">Relève active</Label>
                <Switch id="mb-active" checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="min-h-11" disabled={saving} onClick={() => setForm(null)}>Annuler</Button>
            <Button className="min-h-11" disabled={saving} onClick={() => void save()}>
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
    </section>
  );
}
