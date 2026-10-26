import { useEffect, useMemo, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { Loader2, Paperclip, Save, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  escapeHtml,
  formatSize,
  isValidEmail,
  mailAction,
  type MailBox,
  parseRecipients,
  textToHtml,
} from '@/lib/mailbox';

export interface ComposerAttachment {
  key: string;
  filename: string;
  size: number;
  mime: string;
  /** Fichier déposé depuis l'ordinateur. */
  bucket?: string;
  path?: string;
  /** Pièce jointe d'un message existant (transfert, brouillon modifié). */
  message_id?: string;
  part?: string;
}

export interface ComposerInit {
  mailboxId: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  text?: string;
  /** Message cité sous la réponse (HTML), non modifiable. */
  quotedHtml?: string;
  attachments?: ComposerAttachment[];
  replyToMessageId?: string | null;
  draftMessageId?: string | null;
  kind?: 'reponse' | 'transfert' | 'autre';
  title?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boxes: MailBox[];
  init: ComposerInit | null;
  onDone: () => void;
}

export function MailComposer({ open, onOpenChange, boxes, init, onDone }: Props) {
  const [mailboxId, setMailboxId] = useState('');
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState('');
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [withSignature, setWithSignature] = useState(true);
  const [busy, setBusy] = useState<'send' | 'draft' | 'upload' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !init) return;
    setMailboxId(init.mailboxId);
    setTo(init.to || '');
    setCc(init.cc || '');
    setBcc(init.bcc || '');
    setShowCc(!!(init.cc || init.bcc));
    setSubject(init.subject || '');
    setText(init.text || '');
    setAttachments(init.attachments || []);
    setWithSignature(true);
  }, [open, init]);

  const box = boxes.find((b) => b.id === mailboxId);

  const signatureHtml = withSignature && box?.signature_html ? box.signature_html : '';
  const signaturePreview = useMemo(
    () => (box?.signature_html ? DOMPurify.sanitize(box.signature_html, { FORBID_TAGS: ['script', 'style', 'iframe', 'form'] }) : ''),
    [box?.signature_html],
  );

  /** Texte, puis signature, puis message cité (comme un logiciel de messagerie). */
  const buildHtml = () => {
    const body = textToHtml(text);
    const signed = signatureHtml ? `${body}<br><br>${signatureHtml}` : body;
    return init?.quotedHtml ? `${signed}<br>${init.quotedHtml}` : signed;
  };
  /** Version texte seule possible uniquement sans signature ni citation (sinon dérivée du HTML). */
  const plainText = () => (init?.quotedHtml || signatureHtml ? undefined : text);

  const payloadAttachments = () =>
    attachments.map((a) => (a.bucket ? { bucket: a.bucket, path: a.path, filename: a.filename, mime: a.mime } : { message_id: a.message_id, part: a.part }));

  const validate = (forSend: boolean) => {
    const all = [...parseRecipients(to), ...parseRecipients(cc), ...parseRecipients(bcc)];
    const bad = all.filter((a) => !isValidEmail(a.email));
    if (bad.length) {
      toast.error(`Adresse invalide : ${bad.map((b) => b.email).join(', ')}`);
      return false;
    }
    if (forSend && all.length === 0) {
      toast.error('Ajoutez au moins un destinataire');
      return false;
    }
    if (!box?.has_password) {
      toast.error("Cette boîte n'a pas encore de mot de passe");
      return false;
    }
    return true;
  };

  const send = async () => {
    if (!validate(true)) return;
    if (!subject.trim() && !confirm('Envoyer sans objet ?')) return;
    setBusy('send');
    try {
      const res = await mailAction('send', {
        mailbox_id: mailboxId,
        to: parseRecipients(to),
        cc: parseRecipients(cc),
        bcc: parseRecipients(bcc),
        subject,
        html: buildHtml(),
        text: plainText(),
        signature: false,
        attachments: payloadAttachments(),
        reply_to_message_id: init?.replyToMessageId || undefined,
        draft_message_id: init?.draftMessageId || undefined,
        kind: init?.kind,
      });
      toast.success(`Message envoyé depuis ${box?.address}`);
      if (res?.warnings?.length) toast.warning(res.warnings.join(' · '));
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setBusy(null);
    }
  };

  const saveDraft = async () => {
    if (!validate(false)) return;
    setBusy('draft');
    try {
      await mailAction('save_draft', {
        mailbox_id: mailboxId,
        to: parseRecipients(to),
        cc: parseRecipients(cc),
        subject,
        html: buildHtml(),
        attachments: payloadAttachments(),
        reply_to_message_id: init?.replyToMessageId || undefined,
        draft_message_id: init?.draftMessageId || undefined,
      });
      toast.success('Brouillon enregistré dans « Brouillons »');
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setBusy(null);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy('upload');
    try {
      const added: ComposerAttachment[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 15 * 1024 * 1024) {
          toast.error(`${file.name} : 15 Mo au maximum par fichier`);
          continue;
        }
        const safe = file.name.replace(/[^\w.\-() ]+/g, '_');
        const path = `${crypto.randomUUID()}/${safe}`;
        const { error } = await supabase.storage.from('mail-attachments').upload(path, file, { contentType: file.type || 'application/octet-stream' });
        if (error) {
          toast.error(`${file.name} : dépôt impossible`);
          continue;
        }
        added.push({ key: path, filename: file.name, size: file.size, mime: file.type || 'application/octet-stream', bucket: 'mail-attachments', path });
      }
      setAttachments((prev) => [...prev, ...added]);
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const total = attachments.reduce((s, a) => s + (a.size || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-3 overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{init?.title || 'Nouveau message'}</DialogTitle>
          <DialogDescription className="sr-only">Rédaction d'un e-mail depuis une boîte de l'agence</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <div className="grid gap-1.5">
            <Label>De</Label>
            <Select value={mailboxId} onValueChange={setMailboxId}>
              <SelectTrigger><SelectValue placeholder="Choisir la boîte" /></SelectTrigger>
              <SelectContent>
                {boxes.map((b) => (
                  <SelectItem key={b.id} value={b.id} disabled={!b.has_password}>
                    {b.display_name} &lt;{b.address}&gt;{!b.has_password ? ' — mot de passe manquant' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="mail-to">À</Label>
              {!showCc && (
                <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setShowCc(true)}>
                  Cc / Cci
                </button>
              )}
            </div>
            <Input id="mail-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="regie@exemple.ch, autre@exemple.ch" autoComplete="off" />
          </div>
          {showCc && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="mail-cc">Cc</Label>
                <Input id="mail-cc" value={cc} onChange={(e) => setCc(e.target.value)} autoComplete="off" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="mail-bcc">Cci</Label>
                <Input id="mail-bcc" value={bcc} onChange={(e) => setBcc(e.target.value)} autoComplete="off" />
              </div>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="mail-subject">Objet</Label>
            <Input id="mail-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mail-body">Message</Label>
            <Textarea id="mail-body" value={text} onChange={(e) => setText(e.target.value)} rows={10} className="min-h-[200px] text-sm" />
            {box?.signature_html ? (
              <div className="rounded-lg border border-border/70 bg-muted/20 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="mail-signature" className="text-xs font-medium text-muted-foreground">
                    Signature de {box.address}
                  </Label>
                  <Switch id="mail-signature" checked={withSignature} onCheckedChange={setWithSignature} />
                </div>
                {withSignature && (
                  <div className="mt-2 max-h-56 overflow-auto rounded-md bg-white p-3 [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: signaturePreview }} />
                )}
              </div>
            ) : (
              box && <p className="text-xs text-muted-foreground">Aucune signature pour {box.address} (réglages ⚙︎ de la boîte mail).</p>
            )}
          </div>
          {init?.quotedHtml && (
            <details className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground">Message d'origine (joint sous votre texte)</summary>
              <div className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap text-muted-foreground">
                {init.quotedHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 2000)}
              </div>
            </details>
          )}
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {attachments.map((a) => (
                <span key={a.key} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs">
                  <Paperclip className="h-3 w-3 shrink-0" />
                  <span className="truncate">{a.filename}</span>
                  <span className="text-muted-foreground">{formatSize(a.size)}</span>
                  <button type="button" aria-label={`Retirer ${a.filename}`} onClick={() => setAttachments((p) => p.filter((x) => x.key !== a.key))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            {total > 15 * 1024 * 1024 && <p className="text-xs text-destructive">Attention : plus de 15 Mo de pièces jointes, certaines régies refusent les gros messages.</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
          <div>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={() => fileRef.current?.click()}>
              {busy === 'upload' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Paperclip className="mr-1.5 h-4 w-4" />}
              Joindre
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={saveDraft}>
              {busy === 'draft' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Brouillon
            </Button>
            <Button type="button" size="sm" disabled={!!busy} onClick={send}>
              {busy === 'send' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
              Envoyer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Bloc cité pour une réponse ou un transfert. */
export function quoteBlock(header: string, html: string | null, text: string | null): string {
  const inner = html || `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(text || '')}</pre>`;
  return `<div style="color:#6b7280;font-size:12px;margin-top:12px">${escapeHtml(header)}</div><blockquote style="margin:4px 0 0 0;padding-left:10px;border-left:3px solid #d1d5db">${inner}</blockquote>`;
}
