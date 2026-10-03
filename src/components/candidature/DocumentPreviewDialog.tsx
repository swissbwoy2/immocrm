import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { CandidatureDoc, downloadBlob, fullHtml, generateAndStorePdf, pdfBodies } from '@/lib/candidatureDocs';

export function DocumentPreviewDialog({ doc, all, onClose }: { doc: CandidatureDoc | null; all: CandidatureDoc[]; onClose: () => void }) {
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => { if (doc) pdfBodies(doc, all).then((b) => setHtml(fullHtml(b))); else setHtml(''); }, [doc, all]);

  const pdf = async () => {
    if (!doc || busy) return;
    setBusy(true);
    try {
      const { blob } = await generateAndStorePdf(doc, all);
      downloadBlob(blob, `${doc.titre || doc.template_code}.pdf`);
    } catch (e: any) { toast.error(e?.message || 'PDF impossible'); }
    setBusy(false);
  };

  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[92vh] max-w-4xl flex-col gap-3 p-3 sm:p-6">
        <DialogHeader><DialogTitle className="pr-6 text-base">{doc?.titre}</DialogTitle></DialogHeader>
        <iframe ref={ref} title="Aperçu" srcDoc={html} className="w-full flex-1 rounded border bg-muted" />
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" className="min-h-[44px]" onClick={() => ref.current?.contentWindow?.print()}><Printer className="mr-2 h-4 w-4" />Imprimer</Button>
          <Button className="min-h-[44px]" disabled={busy} onClick={pdf}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
