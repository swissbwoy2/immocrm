import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Trash2, Eye, Loader2, FileText, Image as ImageIcon, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';

type Kind = 'photos' | 'documents';

interface Props {
  requestId: string;
  kind: Kind;
  canDelete?: boolean;
  documentTypes?: string[];
  showStatus?: boolean;
}

const STATUS_STYLE: Record<string, { label: string; cls: string; icon: any }> = {
  pending:   { label: 'En attente',  cls: 'bg-amber-100 text-amber-800',  icon: Clock },
  validated: { label: 'Validé',      cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  rejected:  { label: 'Refusé',      cls: 'bg-rose-100 text-rose-700',    icon: AlertCircle },
};

export function RelouerUploader({
  requestId,
  kind,
  canDelete = true,
  documentTypes = ['Bail à loyer', 'Lettre de résiliation', 'Confirmation de résiliation', 'Plan du logement', 'Règlement d\'immeuble', 'Autre'],
  showStatus = true,
}: Props) {
  const table = kind === 'photos' ? 'relouer_photos' : 'relouer_documents';
  const bucket = kind === 'photos' ? 'relouer-photos' : 'relouer-documents';
  const [rows, setRows] = useState<any[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState<string>(documentTypes[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from(table as any)
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    setRows(data || []);

    if (kind === 'photos' && data?.length) {
      const map: Record<string, string> = {};
      await Promise.all(
        data.map(async (r: any) => {
          const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(r.storage_path, 300);
          if (signed?.signedUrl) map[r.id] = signed.signedUrl;
        }),
      );
      setPreviews(map);
    }
  };

  useEffect(() => { if (requestId) load(); /* eslint-disable-next-line */ }, [requestId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    let ok = 0, ko = 0;
    for (const file of Array.from(files)) {
      try {
        const ext = file.name.split('.').pop() || 'bin';
        const path = `${requestId}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from(bucket).upload(path, file, {
          contentType: file.type, upsert: false,
        });
        if (up.error) throw up.error;

        const row: any = {
          request_id: requestId,
          storage_path: path,
          status: 'pending',
          uploaded_by: user?.id || null,
        };
        if (kind === 'photos') {
          row.category = 'interior';
          row.display_order = rows.length + ok;
        } else {
          row.document_type = docType;
          row.filename = file.name;
        }
        const ins = await supabase.from(table as any).insert(row);
        if (ins.error) throw ins.error;

        await supabase.from('relouer_timeline').insert({
          request_id: requestId,
          event_type: kind === 'photos' ? 'photo_uploaded' : 'document_uploaded',
          payload: { filename: file.name, document_type: row.document_type || null },
          created_by: user?.id || null,
        });
        ok++;
      } catch (e: any) {
        console.error(e);
        ko++;
      }
    }
    setBusy(false);
    if (ok) toast.success(`${ok} fichier(s) ajouté(s)`);
    if (ko) toast.error(`${ko} échec(s)`);
    if (inputRef.current) inputRef.current.value = '';
    load();
  };

  const open = async (r: any) => {
    const { data } = await supabase.storage.from(bucket).createSignedUrl(r.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const remove = async (r: any) => {
    if (!confirm('Supprimer ce fichier ?')) return;
    await supabase.storage.from(bucket).remove([r.storage_path]);
    await supabase.from(table as any).delete().eq('id', r.id);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('relouer_timeline').insert({
      request_id: requestId,
      event_type: kind === 'photos' ? 'photo_deleted' : 'document_deleted',
      payload: { filename: r.filename || r.storage_path },
      created_by: user?.id || null,
    });
    toast.success('Supprimé');
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {kind === 'documents' && (
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {documentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="bg-sky-600 hover:bg-sky-700 text-white"
        >
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {kind === 'photos' ? 'Ajouter des photos' : 'Ajouter un document'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple={kind === 'photos'}
          accept={kind === 'photos' ? 'image/*' : '.pdf,.png,.jpg,.jpeg,.doc,.docx'}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-xl">
          {kind === 'photos' ? 'Aucune photo pour le moment.' : 'Aucun document pour le moment.'}
        </div>
      ) : kind === 'photos' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {rows.map((r) => {
            const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
            return (
              <div key={r.id} className="group relative aspect-square rounded-xl overflow-hidden bg-muted border">
                {previews[r.id] ? (
                  <img src={previews[r.id]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="h-6 w-6" /></div>
                )}
                {showStatus && (
                  <Badge className={`absolute top-2 left-2 ${st.cls} border-0 text-[10px]`}>
                    {st.label}
                  </Badge>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <Button size="icon" variant="secondary" onClick={() => open(r)}><Eye className="h-4 w-4" /></Button>
                  {canDelete && r.status !== 'validated' && (
                    <Button size="icon" variant="destructive" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
                {r.admin_comment && (
                  <div className="absolute bottom-0 inset-x-0 bg-rose-600/90 text-white text-[10px] px-2 py-1">
                    {r.admin_comment}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
            const Icon = st.icon;
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/40 transition">
                <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{r.document_type || 'Document'}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.filename || r.storage_path} · {new Date(r.created_at).toLocaleDateString('fr-CH')}
                  </div>
                  {r.admin_comment && (
                    <div className="text-xs text-rose-600 mt-1">{r.admin_comment}</div>
                  )}
                </div>
                {showStatus && (
                  <Badge className={`${st.cls} border-0 text-[10px] flex items-center gap-1`}>
                    <Icon className="h-3 w-3" /> {st.label}
                  </Badge>
                )}
                <Button size="icon" variant="ghost" onClick={() => open(r)}><Eye className="h-4 w-4" /></Button>
                {canDelete && r.status !== 'validated' && (
                  <Button size="icon" variant="ghost" onClick={() => remove(r)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RelouerUploader;
