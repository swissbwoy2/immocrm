import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  CheckCircle2,
  FileEdit,
  Flag,
  Folder,
  Forward,
  Inbox,
  KeyRound,
  Loader2,
  Mail,
  MailOpen,
  Paperclip,
  PenSquare,
  RefreshCw,
  Reply,
  ReplyAll,
  Search,
  Send,
  Settings,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import { DashBadge } from '@/components/client/dashboard/DashPrimitives';
import { downloadBlob } from '@/lib/candidatureDocs';
import {
  addressLabel,
  base64ToBlob,
  cleanSnippet,
  db,
  emailDocument,
  FOLDER_LABEL,
  FOLDER_ORDER,
  formatList,
  formatSize,
  LIST_COLUMNS,
  mailAction,
  type MailBox,
  type MailFolder,
  type MailListItem,
  type MailMessage,
  shortAddress,
  syncMailbox,
} from '@/lib/mailbox';
import { type ComposerInit, MailComposer, quoteBlock } from '@/components/mail/MailComposer';

const PAGE_SIZE = 50;
const BOX_KEY = 'admin-boite-mail-box';

const FOLDER_ICON = {
  inbox: Inbox,
  drafts: FileEdit,
  sent: Send,
  archive: Archive,
  spam: ShieldAlert,
  trash: Trash2,
  other: Folder,
} as const;

function listDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Hier';
  return format(d, 'd MMM yy', { locale: fr });
}

function fullDate(iso: string | null): string {
  if (!iso) return '';
  return format(new Date(iso), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
}

function prefixSubject(prefix: 'RE' | 'TR', subject: string | null): string {
  const s = (subject || '').trim();
  const re = prefix === 'RE' ? /^(re|réf|ref|aw)\s*:/i : /^(tr|fwd?|wg)\s*:/i;
  return re.test(s) ? s : `${prefix}: ${s}`;
}

export default function BoiteMail() {
  const navigate = useNavigate();
  const [boxes, setBoxes] = useState<MailBox[]>([]);
  const [boxId, setBoxId] = useState<string>(() => {
    try { return localStorage.getItem(BOX_KEY) || ''; } catch { return ''; }
  });
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [folderId, setFolderId] = useState<string>('');
  const [items, setItems] = useState<MailListItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<MailMessage | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [pane, setPane] = useState<'folders' | 'list' | 'reader'>('list');
  const [composer, setComposer] = useState<ComposerInit | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDraft, setConfirmDraft] = useState(false);
  const loadSeq = useRef(0);

  const box = boxes.find((b) => b.id === boxId) || null;
  const folder = folders.find((f) => f.id === folderId) || null;

  // ---- chargements ----

  const loadBoxes = useCallback(async () => {
    const { data, error } = await db.rpc('admin_mail_boxes');
    if (error) {
      toast.error('Lecture des boîtes impossible');
      return;
    }
    const list = (data || []) as MailBox[];
    setBoxes(list);
    setBoxId((current) => {
      if (current && list.some((b) => b.id === current)) return current;
      const first = list.find((b) => b.has_password) || list[0];
      return first?.id || '';
    });
  }, []);

  const loadFolders = useCallback(async (id: string) => {
    if (!id) return;
    const { data } = await db.from('mail_folders').select('*').eq('mailbox_id', id).eq('present_on_server', true).eq('selectable', true);
    const list = ((data || []) as MailFolder[]).sort(
      (a, b) => (FOLDER_ORDER[a.role] ?? 9) - (FOLDER_ORDER[b.role] ?? 9) || a.name.localeCompare(b.name, 'fr'),
    );
    setFolders(list);
    setFolderId((current) => {
      if (current && list.some((f) => f.id === current)) return current;
      return (list.find((f) => f.role === 'inbox') || list[0])?.id || '';
    });
  }, []);

  const loadItems = useCallback(async (fid: string, pageNo: number, q: string) => {
    if (!fid) {
      setItems([]);
      return;
    }
    const seq = ++loadSeq.current;
    setLoadingList(true);
    let req = db
      .from('mail_messages')
      .select(LIST_COLUMNS)
      .eq('folder_id', fid)
      .eq('deleted_on_server', false)
      .order('sent_at', { ascending: false, nullsFirst: false })
      .range(pageNo * PAGE_SIZE, pageNo * PAGE_SIZE + PAGE_SIZE - 1);
    const clean = q.replace(/[%,()*]/g, ' ').trim();
    if (clean) {
      req = req.or(`subject.ilike.%${clean}%,from_email.ilike.%${clean}%,from_name.ilike.%${clean}%,snippet.ilike.%${clean}%`);
    }
    const { data } = await req;
    if (seq !== loadSeq.current) return;
    const rows = (data || []) as MailListItem[];
    setItems((prev) => (pageNo === 0 ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE_SIZE);
    setLoadingList(false);
  }, []);

  useEffect(() => { void loadBoxes(); }, [loadBoxes]);

  useEffect(() => {
    if (!boxId) return;
    try { localStorage.setItem(BOX_KEY, boxId); } catch { /* stockage indisponible */ }
    setFolders([]);
    setFolderId('');
    setItems([]);
    setSelectedId(null);
    setMessage(null);
    void loadFolders(boxId);
  }, [boxId, loadFolders]);

  useEffect(() => {
    setPage(0);
    setSelectedId(null);
    setMessage(null);
    void loadItems(folderId, 0, query);
  }, [folderId, query, loadItems]);

  // Rafraîchissement discret toutes les 60 s (la relève serveur tourne toutes les 5 min).
  useEffect(() => {
    const t = setInterval(() => {
      if (document.hidden || !boxId) return;
      void loadBoxes();
      void loadFolders(boxId);
      if (page === 0) void loadItems(folderId, 0, query);
    }, 60_000);
    return () => clearInterval(t);
  }, [boxId, folderId, page, query, loadBoxes, loadFolders, loadItems]);

  const openMessage = async (id: string) => {
    setSelectedId(id);
    setPane('reader');
    setLoadingMsg(true);
    const { data } = await db.from('mail_messages').select('*').eq('id', id).maybeSingle();
    let msg = data as MailMessage | null;
    setMessage(msg);
    setLoadingMsg(false);
    if (msg && (!msg.is_seen || (msg.body_text === null && msg.body_html === null))) {
      try {
        const res = await mailAction<{ message: MailMessage }>('read', { message_id: id });
        if (res?.message) {
          msg = { ...msg, ...res.message };
          setMessage(msg);
        }
      } catch {
        /* lecture locale suffisante si la fonction n'est pas joignable */
      }
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, is_seen: true } : it)));
    }
  };

  const refresh = async () => {
    if (!box) return;
    if (!box.has_password) {
      toast.error('Mot de passe manquant pour cette boîte');
      return;
    }
    setSyncing(true);
    try {
      await syncMailbox(box.id);
      toast.success('Boîte relevée');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Relève impossible');
    } finally {
      setSyncing(false);
      await loadBoxes();
      await loadFolders(box.id);
      await loadItems(folderId, 0, query);
      setPage(0);
    }
  };

  // ---- actions sur un message ----

  const runAction = async (label: string, fn: () => Promise<unknown>, after?: () => void) => {
    setActing(label);
    try {
      await fn();
      after?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action impossible');
    } finally {
      setActing(null);
    }
  };

  const moveTo = (target: 'trash' | 'spam' | 'inbox' | 'archive', label: string) => {
    if (!message) return;
    void runAction(label, () => mailAction('move', { message_ids: [message.id], target }), () => {
      toast.success(label);
      setItems((prev) => prev.filter((it) => it.id !== message.id));
      setMessage(null);
      setSelectedId(null);
      setPane('list');
      void loadFolders(boxId);
    });
  };

  const toggleSeen = () => {
    if (!message) return;
    const seen = !message.is_seen;
    void runAction('seen', () => mailAction('flags', { message_ids: [message.id], seen }), () => {
      setMessage({ ...message, is_seen: seen });
      setItems((prev) => prev.map((it) => (it.id === message.id ? { ...it, is_seen: seen } : it)));
    });
  };

  const toggleFlag = () => {
    if (!message) return;
    const flagged = !message.is_flagged;
    void runAction('flag', () => mailAction('flags', { message_ids: [message.id], flagged }), () => {
      setMessage({ ...message, is_flagged: flagged });
      setItems((prev) => prev.map((it) => (it.id === message.id ? { ...it, is_flagged: flagged } : it)));
    });
  };

  const downloadAttachment = async (part: string) => {
    if (!message) return;
    setActing(`att-${part}`);
    try {
      const res = await mailAction<{ filename: string; mime: string; base64: string }>('attachment', { message_id: message.id, part });
      downloadBlob(base64ToBlob(res.base64, res.mime), res.filename || 'piece-jointe');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Téléchargement impossible');
    } finally {
      setActing(null);
    }
  };

  const sendDraft = () => {
    if (!message) return;
    setConfirmDraft(false);
    void runAction('send-draft', () => mailAction<{ recipients: string[]; warnings?: string[] }>('send_draft', { message_id: message.id }), () => {
      toast.success('Brouillon envoyé et rangé dans « Brouillons envoyés »');
      setItems((prev) => prev.filter((it) => it.id !== message.id));
      setMessage(null);
      setSelectedId(null);
      setPane('list');
      void loadFolders(boxId);
    });
  };

  // ---- rédaction ----

  const openComposer = (init: ComposerInit) => {
    setComposer(init);
    setComposerOpen(true);
  };

  const quotedOriginal = (m: MailMessage) => {
    const header = `Le ${fullDate(m.sent_at)}, ${addressLabel({ name: m.from_name, email: m.from_email || '' })} a écrit :`;
    const html = m.body_html ? DOMPurify.sanitize(m.body_html, { FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'] }) : null;
    return quoteBlock(header, html, m.body_text);
  };

  const reply = (all: boolean) => {
    if (!message || !box) return;
    const replyTarget = message.reply_to?.length ? message.reply_to : [{ name: message.from_name, email: message.from_email || '' }];
    const own = box.address.toLowerCase();
    const others = all
      ? [...(message.to_list || []), ...(message.cc_list || [])].filter((a) => a.email && a.email.toLowerCase() !== own && !replyTarget.some((r) => r.email === a.email))
      : [];
    openComposer({
      mailboxId: box.id,
      to: replyTarget.filter((a) => a.email).map(addressLabel).join(', '),
      cc: others.map(addressLabel).join(', '),
      subject: prefixSubject('RE', message.subject),
      quotedHtml: quotedOriginal(message),
      replyToMessageId: message.id,
      kind: 'reponse',
      title: all ? 'Répondre à tous' : 'Répondre',
    });
  };

  const forward = () => {
    if (!message || !box) return;
    const header = `---------- Message transféré ----------\nDe : ${addressLabel({ name: message.from_name, email: message.from_email || '' })}\nDate : ${fullDate(message.sent_at)}\nObjet : ${message.subject || ''}\nÀ : ${formatList(message.to_list)}`;
    openComposer({
      mailboxId: box.id,
      subject: prefixSubject('TR', message.subject),
      quotedHtml: quoteBlock(header, message.body_html ? DOMPurify.sanitize(message.body_html, { FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'] }) : null, message.body_text),
      attachments: (message.attachments || []).filter((a) => !a.inline).map((a) => ({
        key: `${message.id}-${a.part}`, filename: a.filename, size: a.size, mime: a.mime, message_id: message.id, part: a.part,
      })),
      kind: 'transfert',
      title: 'Transférer',
    });
  };

  const editDraft = () => {
    if (!message || !box) return;
    openComposer({
      mailboxId: box.id,
      to: formatList(message.to_list),
      cc: formatList(message.cc_list),
      bcc: formatList(message.bcc_list),
      subject: message.subject || '',
      text: message.body_text || (message.body_html ? message.body_html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() : ''),
      attachments: (message.attachments || []).filter((a) => !a.inline).map((a) => ({
        key: `${message.id}-${a.part}`, filename: a.filename, size: a.size, mime: a.mime, message_id: message.id, part: a.part,
      })),
      draftMessageId: message.id,
      title: 'Modifier le brouillon',
    });
  };

  const newMessage = () => {
    if (!box) return;
    openComposer({ mailboxId: box.id, title: 'Nouveau message' });
  };

  const isDraftFolder = folder?.role === 'drafts';
  const isSentLike = folder?.role === 'sent' || folder?.role === 'drafts';

  const folderLabel = (f: MailFolder) => (f.role !== 'other' ? FOLDER_LABEL[f.role] : f.name);

  const iframeSrc = useMemo(() => (message?.body_html ? emailDocument(message.body_html) : null), [message?.body_html]);

  // ---- rendu ----

  const boxSelect = (
    <Select value={boxId} onValueChange={setBoxId}>
      <SelectTrigger className="h-10 w-full sm:w-[320px]">
        <SelectValue placeholder="Choisir une adresse" />
      </SelectTrigger>
      <SelectContent>
        {boxes.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            <span className="flex items-center gap-2">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', !b.has_password ? 'bg-muted-foreground/40' : b.full_sync_error ? 'bg-destructive' : 'bg-emerald-500')} />
              <span className="truncate">{b.address}</span>
              {b.inbox_unseen > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">{b.inbox_unseen}</Badge>}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const folderList = (
    <nav className="space-y-0.5" aria-label="Dossiers">
      {folders.length === 0 && box?.has_password && (
        <p className="px-3 py-2 text-xs text-muted-foreground">Dossiers en cours de relève…</p>
      )}
      {folders.map((f) => {
        const Icon = FOLDER_ICON[f.role] || Folder;
        const count = f.role === 'drafts' ? f.total_count : f.unseen_count;
        const active = f.id === folderId;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => { setFolderId(f.id); setPane('list'); }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
              active ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{folderLabel(f)}</span>
            {count > 0 && <span className={cn('text-xs tabular-nums', active ? 'text-primary' : 'text-muted-foreground')}>{count}</span>}
          </button>
        );
      })}
    </nav>
  );

  const noPassword = box && !box.has_password;

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-2 pb-4 pt-2 sm:px-4">
      {/* En-tête */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-foreground">Boîte mail</h1>
            <p className="truncate text-xs text-muted-foreground">
              {box?.full_sync_at ? `Relevée ${format(new Date(box.full_sync_at), "d MMM 'à' HH:mm", { locale: fr })}` : 'Boîtes de l\'agence'}
              {box?.full_sync_error ? ' · erreur de relève' : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {boxSelect}
          <Button size="sm" className="h-10" onClick={newMessage} disabled={!box?.has_password}>
            <PenSquare className="mr-1.5 h-4 w-4" /> Nouveau
          </Button>
          <Button size="icon" variant="outline" className="h-10 w-10" onClick={refresh} disabled={syncing || !box} aria-label="Actualiser">
            <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
          </Button>
          <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => setSettingsOpen(true)} aria-label="Réglages des boîtes">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {box?.full_sync_error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Dernière relève de {box.address} : {box.full_sync_error}</span>
        </div>
      )}

      {noPassword ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center">
          <KeyRound className="h-8 w-8 text-muted-foreground" />
          <p className="max-w-md text-sm text-muted-foreground">
            Le mot de passe de <strong className="text-foreground">{box?.address}</strong> n'est pas encore enregistré.
            Saisissez-le une fois (il reste dans le coffre sécurisé, jamais affiché) : la boîte complète apparaîtra ici dans les 5 minutes.
          </p>
          <Button onClick={() => navigate('/admin/steeve')}><KeyRound className="mr-1.5 h-4 w-4" /> Saisir le mot de passe</Button>
        </div>
      ) : (
        <div className="grid min-h-[70vh] gap-3 lg:h-[calc(100dvh-13rem)] lg:grid-cols-[220px_minmax(300px,380px)_1fr]">
          {/* Dossiers */}
          <aside className={cn('rounded-2xl border border-border/60 bg-card p-2 lg:block lg:overflow-y-auto', pane === 'folders' ? 'block' : 'hidden')}>
            {folderList}
          </aside>

          {/* Liste */}
          <section className={cn('flex min-h-0 flex-col rounded-2xl border border-border/60 bg-card lg:flex', pane === 'list' ? 'flex' : 'hidden')}>
            <div className="flex items-center gap-2 border-b border-border/60 p-2">
              <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setPane('folders')}>
                <Folder className="mr-1 h-4 w-4" /> {folder ? folderLabel(folder) : 'Dossiers'}
              </Button>
              <form
                className="relative flex-1"
                onSubmit={(e) => { e.preventDefault(); setQuery(search); }}
              >
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); if (!e.target.value) setQuery(''); }}
                  placeholder="Rechercher"
                  className="h-9 pl-8"
                />
              </form>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {loadingList && items.length === 0 ? (
                <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : items.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">{query ? 'Aucun résultat.' : 'Aucun message dans ce dossier.'}</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {items.map((it) => {
                    const who = isSentLike ? (it.to_list?.[0] ? shortAddress(it.to_list[0]) : '(sans destinataire)') : (it.from_name || it.from_email || '(inconnu)');
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => openMessage(it.id)}
                          className={cn('flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60', selectedId === it.id && 'bg-primary/5')}
                        >
                          <div className="flex items-center gap-2">
                            {!it.is_seen && !isSentLike && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Non lu" />}
                            <span className={cn('min-w-0 flex-1 truncate text-sm', !it.is_seen && !isSentLike ? 'font-semibold text-foreground' : 'text-foreground/90')}>
                              {isDraftFolder ? `À : ${who}` : who}
                            </span>
                            {it.is_flagged && <Flag className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
                            {it.has_attachments && <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{listDate(it.sent_at)}</span>
                          </div>
                          <span className={cn('truncate text-sm', !it.is_seen && !isSentLike ? 'font-medium text-foreground' : 'text-foreground/80')}>
                            {it.subject || '(sans objet)'}
                          </span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">{cleanSnippet(it.snippet)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {hasMore && (
                <div className="p-3 text-center">
                  <Button variant="outline" size="sm" disabled={loadingList} onClick={() => { const next = page + 1; setPage(next); void loadItems(folderId, next, query); }}>
                    {loadingList ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Messages plus anciens
                  </Button>
                </div>
              )}
              {!hasMore && folder && !folder.backfill_done && items.length > 0 && (
                <p className="p-3 text-center text-xs text-muted-foreground">Les messages plus anciens arrivent au fil des relèves.</p>
              )}
            </div>
          </section>

          {/* Lecture */}
          <section className={cn('flex min-h-0 flex-col rounded-2xl border border-border/60 bg-card lg:flex', pane === 'reader' ? 'flex' : 'hidden')}>
            {!message ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
                {loadingMsg ? <Loader2 className="h-5 w-5 animate-spin" /> : <><MailOpen className="h-8 w-8" /> Sélectionnez un message</>}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1 border-b border-border/60 p-2">
                  <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setPane('list')}>
                    <ArrowLeft className="mr-1 h-4 w-4" /> Retour
                  </Button>
                  {isDraftFolder ? (
                    <>
                      <Button size="sm" onClick={() => setConfirmDraft(true)} disabled={!!acting}>
                        {acting === 'send-draft' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
                        Valider et envoyer
                      </Button>
                      <Button size="sm" variant="outline" onClick={editDraft} disabled={!!acting}><FileEdit className="mr-1.5 h-4 w-4" /> Modifier</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => reply(false)}><Reply className="mr-1.5 h-4 w-4" /> Répondre</Button>
                      <Button size="sm" variant="ghost" onClick={() => reply(true)}><ReplyAll className="mr-1.5 h-4 w-4" /> <span className="hidden sm:inline">Répondre à tous</span><span className="sm:hidden">Tous</span></Button>
                      <Button size="sm" variant="ghost" onClick={forward}><Forward className="mr-1.5 h-4 w-4" /> Transférer</Button>
                    </>
                  )}
                  <div className="ml-auto flex items-center gap-1">
                    {!isDraftFolder && (
                      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={toggleSeen} disabled={!!acting} aria-label={message.is_seen ? 'Marquer non lu' : 'Marquer lu'}>
                        {message.is_seen ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className={cn('h-9 w-9', message.is_flagged && 'text-amber-500')} onClick={toggleFlag} disabled={!!acting} aria-label="Suivi">
                      <Flag className="h-4 w-4" />
                    </Button>
                    {folder?.role !== 'archive' && !isDraftFolder && (
                      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => moveTo('archive', 'Message archivé')} disabled={!!acting} aria-label="Archiver">
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                    {folder?.role === 'spam' ? (
                      <Button size="sm" variant="ghost" onClick={() => moveTo('inbox', 'Remis dans la réception')} disabled={!!acting}>Pas un spam</Button>
                    ) : !isSentLike && (
                      <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => moveTo('spam', 'Déplacé dans Spam')} disabled={!!acting} aria-label="Spam">
                        <ShieldAlert className="h-4 w-4" />
                      </Button>
                    )}
                    {folder?.role !== 'trash' && (
                      <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => moveTo('trash', 'Mis à la corbeille')} disabled={!!acting} aria-label="Corbeille">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <h2 className="mb-3 break-words text-lg font-semibold text-foreground">{message.subject || '(sans objet)'}</h2>
                  <div className="mb-4 space-y-0.5 text-sm">
                    <p className="break-words"><span className="text-muted-foreground">De : </span><span className="font-medium">{addressLabel({ name: message.from_name, email: message.from_email || '' })}</span></p>
                    {message.to_list?.length > 0 && <p className="break-words"><span className="text-muted-foreground">À : </span>{formatList(message.to_list)}</p>}
                    {message.cc_list?.length > 0 && <p className="break-words"><span className="text-muted-foreground">Cc : </span>{formatList(message.cc_list)}</p>}
                    {message.bcc_list?.length > 0 && <p className="break-words"><span className="text-muted-foreground">Cci : </span>{formatList(message.bcc_list)}</p>}
                    <p className="text-xs text-muted-foreground">{fullDate(message.sent_at)}</p>
                  </div>

                  {(message.attachments || []).filter((a) => !a.inline).length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {message.attachments.filter((a) => !a.inline).map((a) => (
                        <button
                          key={a.part}
                          type="button"
                          onClick={() => downloadAttachment(a.part)}
                          disabled={acting === `att-${a.part}`}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs hover:bg-muted"
                        >
                          {acting === `att-${a.part}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                          <span className="truncate">{a.filename}</span>
                          <span className="text-muted-foreground">{formatSize(a.size)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {iframeSrc ? (
                    <iframe
                      title="Contenu du message"
                      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                      srcDoc={iframeSrc}
                      className="min-h-[300px] w-full rounded-lg border-0 bg-white"
                      onLoad={(e) => {
                        const f = e.currentTarget;
                        try {
                          const h = f.contentDocument?.documentElement?.scrollHeight;
                          if (h) f.style.height = `${Math.min(h + 24, 20000)}px`;
                        } catch { /* hauteur par défaut */ }
                      }}
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm text-foreground">{message.body_text || (loadingMsg ? '' : '(message vide)')}</pre>
                  )}
                  {message.body_truncated && <p className="mt-3 text-xs text-muted-foreground">Message très long : seul le début est affiché.</p>}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      <MailComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        boxes={boxes}
        init={composer}
        onDone={() => { void loadFolders(boxId); void loadItems(folderId, 0, query); }}
      />

      <AlertDialog open={confirmDraft} onOpenChange={setConfirmDraft}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envoyer ce brouillon ?</AlertDialogTitle>
            <AlertDialogDescription>
              Envoyé tel quel depuis {box?.address} à : {message ? [formatList(message.to_list), formatList(message.cc_list), formatList(message.bcc_list)].filter(Boolean).join(', ') || '(aucun destinataire)' : ''}.
              {message?.attachments?.length ? ` ${message.attachments.length} pièce(s) jointe(s).` : ''} Le brouillon sera rangé dans « Brouillons envoyés ».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={sendDraft}>Envoyer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MailSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} boxes={boxes} onSaved={loadBoxes} onPasswords={() => navigate('/admin/steeve')} />
    </div>
  );
}

function MailSettingsDialog({
  open, onOpenChange, boxes, onSaved, onPasswords,
}: { open: boolean; onOpenChange: (o: boolean) => void; boxes: MailBox[]; onSaved: () => void; onPasswords: () => void }) {
  const [edits, setEdits] = useState<Record<string, { name: string; signature: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [tests, setTests] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<string, { name: string; signature: string }> = {};
    for (const b of boxes) next[b.id] = { name: b.display_name || '', signature: b.signature_html || '' };
    setEdits(next);
  }, [open, boxes]);

  const save = async (b: MailBox) => {
    setBusy(`save-${b.id}`);
    const e = edits[b.id];
    const { error } = await db.rpc('admin_mail_box_profile', { p_id: b.id, p_display_name: e?.name || '', p_signature_html: e?.signature || '' });
    setBusy(null);
    if (error) toast.error('Enregistrement impossible');
    else { toast.success(`${b.address} enregistrée`); onSaved(); }
  };

  const test = async (b: MailBox) => {
    setBusy(`test-${b.id}`);
    try {
      const r = await mailAction<{ imap: string; smtp: string }>('test', { mailbox_id: b.id });
      setTests((t) => ({ ...t, [b.id]: `Réception : ${r.imap} · Envoi : ${r.smtp}` }));
    } catch (e) {
      setTests((t) => ({ ...t, [b.id]: e instanceof Error ? e.message : 'Test impossible' }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent mobileFullHeight className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 pt-2 md:mx-auto md:max-w-2xl md:pt-0">
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 pb-4 pr-14 pt-2 text-left md:px-6 md:pt-6">
          <DialogTitle className="text-lg">Réglages des boîtes</DialogTitle>
          <DialogDescription className="text-sm">
            Nom d'expéditeur et signature de chaque adresse. Les mots de passe se saisissent une fois dans Steeve → Boîtes e-mail partagées (coffre sécurisé).
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4 md:px-6">
          {boxes.length === 0 && (
            <p className="imr-lg-card rounded-[22px] p-4 text-sm text-muted-foreground">Aucune boîte disponible.</p>
          )}
          {boxes.map((b) => {
            const status: { label: string; tone: 'warning' | 'danger' | 'success' | 'neutral' } = !b.has_password
              ? { label: 'Mot de passe manquant', tone: 'warning' }
              : b.full_sync_error
                ? { label: 'Erreur de relève', tone: 'danger' }
                : b.full_sync_at
                  ? { label: 'Branchée', tone: 'success' }
                  : { label: 'En attente de relève', tone: 'neutral' };
            return (
              <section key={b.id} aria-labelledby={`box-${b.id}`} className="imr-lg-card min-w-0 rounded-[22px] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 id={`box-${b.id}`} className="break-all text-[15px] font-semibold text-foreground">{b.address}</h3>
                    {b.full_sync_at && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Dernière relève : {new Intl.DateTimeFormat('fr-CH', { timeZone: 'Europe/Zurich', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(b.full_sync_at))}
                      </p>
                    )}
                  </div>
                  <DashBadge tone={status.tone}>{status.label}</DashBadge>
                </div>
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor={`name-${b.id}`}>Nom d'expéditeur</Label>
                    <Input id={`name-${b.id}`} className="h-11 rounded-xl" value={edits[b.id]?.name || ''} onChange={(e) => setEdits((s) => ({ ...s, [b.id]: { ...s[b.id], name: e.target.value } }))} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`sig-${b.id}`}>Signature (HTML simple accepté)</Label>
                    <Textarea id={`sig-${b.id}`} rows={3} className="rounded-xl text-base md:text-sm" value={edits[b.id]?.signature || ''} onChange={(e) => setEdits((s) => ({ ...s, [b.id]: { ...s[b.id], signature: e.target.value } }))} />
                  </div>
                </div>
                {tests[b.id] && <p className="mt-3 break-words rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{tests[b.id]}</p>}
                {b.full_sync_error && <p className="mt-3 break-words text-sm text-destructive">{b.full_sync_error}</p>}
                <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
                  <Button variant="outline" className="min-h-11" onClick={() => test(b)} disabled={!b.has_password || busy === `test-${b.id}`}>
                    {busy === `test-${b.id}` && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Tester la connexion
                  </Button>
                  <Button className="min-h-11" onClick={() => save(b)} disabled={busy === `save-${b.id}`}>
                    {busy === `save-${b.id}` && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Enregistrer
                  </Button>
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex shrink-0 flex-row gap-2 border-t border-border/60 bg-background/90 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:justify-between md:px-6 md:pb-4">
          <Button variant="outline" className="min-h-11 shrink-0" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button
            variant="outline"
            className="min-h-11 min-w-0 flex-1 sm:flex-none"
            onClick={() => {
              try { localStorage.setItem('admin-steeve-section', 'boites'); } catch { /* stockage indisponible */ }
              onPasswords();
            }}
          >
            <KeyRound className="mr-1.5 h-4 w-4" /> Gérer les mots de passe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
