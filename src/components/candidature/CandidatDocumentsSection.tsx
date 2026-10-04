import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SignaturePad from '@/components/mandat/SignaturePad';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';
import { useAuth } from '@/contexts/AuthContext';
import { CandidateDocumentsSection } from '@/components/CandidateDocumentsSection';
import { CandidatureDoc, DOC_ORDER, SIGNABLE, generateAndStorePdf } from '@/lib/candidatureDocs';

export function useCandidatureDocs(candidatureId?: string) {
  return useQuery({
    queryKey: ['candidature-docs', candidatureId],
    enabled: !!candidatureId,
    queryFn: async (): Promise<CandidatureDoc[]> => {
      const { data } = await (supabase as any).from('candidature_documents').select('*').eq('candidature_id', candidatureId);
      return ((data ?? []) as CandidatureDoc[]).sort((a, b) => DOC_ORDER.indexOf(a.template_code) - DOC_ORDER.indexOf(b.template_code));
    },
  });
}

export const docBadge = (d: CandidatureDoc) =>
  d.statut === 'signe'
    ? <Badge className="shrink-0">Signé le {d.signe_at ? new Date(d.signe_at).toLocaleDateString('fr-CH', { timeZone: 'Europe/Zurich' }) : ''}</Badge>
    : SIGNABLE.includes(d.template_code)
      ? <Badge variant="secondary" className="shrink-0">À signer</Badge>
      : <Badge variant="outline" className="shrink-0">Lecture seule</Badge>;

export function CandidatDocumentsSection({ candidatureId, canSign = true }: { candidatureId: string; canSign?: boolean }) {
  const qc = useQueryClient();
  const { data: docs = [] } = useCandidatureDocs(candidatureId);
  const [preview, setPreview] = useState<CandidatureDoc | null>(null);
  const [signing, setSigning] = useState<CandidatureDoc | null>(null);
  const [sig, setSig] = useState('');
  const [lieu, setLieu] = useState('');
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const pieces = canSign && user ? (
    <CandidateDocumentsSection clientId="" clientUserId={user.id} clientName="Mes pièces justificatives" candidates={[]} candidatureId={candidatureId} />
  ) : null;
  if (!docs.length) return pieces;

  const signer = async () => {
    if (!signing || !sig || !lieu.trim() || busy) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc('candidat_signer_document', { p_document_id: signing.id, p_signature: sig, p_lieu: lieu.trim() });
    if (error) { setBusy(false); return toast.error(error.message); }
    // Notification staff (best-effort)
    try {
      const { data: staff } = await (supabase as any).from('user_roles').select('user_id').eq('role', 'admin');
      await Promise.all((staff ?? []).map((s: any) => (supabase as any).rpc('create_notification', {
        p_user_id: s.user_id, p_type: 'document_signe', p_title: 'Document signé',
        p_message: `${signing.titre} a été signé par le candidat.`, p_link: '/admin/candidatures-relocation',
      })));
    } catch { /* ignore */ }
    const { data: fresh } = await (supabase as any).from('candidature_documents').select('*').eq('candidature_id', candidatureId);
    const all = (fresh ?? []) as CandidatureDoc[];
    const signed = all.find((d) => d.id === signing.id);
    const bail = all.find((d) => d.template_code === 'bail_loyer');
    try {
      if (signed) await generateAndStorePdf(signed, all);
      if (bail && signed?.template_code === 'notification_loyer') await generateAndStorePdf(bail, all);
    } catch { /* PDF régénérable depuis l'aperçu */ }
    toast.success('Document signé');
    setBusy(false); setSigning(null); setSig('');
    qc.invalidateQueries({ queryKey: ['candidature-docs', candidatureId] });
    qc.invalidateQueries({ queryKey: ['candidat-candidatures'] });
  };

  return (
    <div className="space-y-3">
    {pieces}
    <div className="space-y-2 rounded-lg border p-3">
      <p className="text-sm font-semibold text-foreground">Mes documents</p>
      {docs.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-sm">{d.titre}</span>
          {docBadge(d)}
          <div className="flex w-full gap-2 sm:w-auto">
            <Button size="sm" variant="outline" className="min-h-[40px] flex-1" onClick={() => setPreview(d)}>Aperçu</Button>
            {canSign && SIGNABLE.includes(d.template_code) && d.statut !== 'signe' && (
              <Button size="sm" className="min-h-[40px] flex-1" onClick={() => { setSigning(d); setSig(''); }}><PenLine className="mr-1 h-4 w-4" />Signer</Button>
            )}
          </div>
        </div>
      ))}
      <DocumentPreviewDialog doc={preview} all={docs} onClose={() => setPreview(null)} />
      <Dialog open={!!signing} onOpenChange={(o) => !o && setSigning(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Signer : {signing?.titre}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label htmlFor="sig-lieu">Lieu</Label><Input id="sig-lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Ex. Lausanne" className="min-h-[44px]" /></div>
            {signing && <SignaturePad key={signing.id} value={sig} onChange={setSig} />}
            <Button className="min-h-[44px] w-full" disabled={!sig || !lieu.trim() || busy} onClick={signer}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Valider ma signature
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
