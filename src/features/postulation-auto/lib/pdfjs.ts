import { useEffect, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export { pdfjsLib };

export function usePdfDocument(bytes: Uint8Array | null) {
  const [doc, setDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let current: any = null;
    if (!bytes) {
      setDoc(null);
      setNumPages(0);
      return;
    }
    setLoading(true);
    const task = pdfjsLib.getDocument({ data: bytes.slice(0) });
    task.promise
      .then((pdf: any) => {
        if (cancelled) {
          pdf.destroy();
          return;
        }
        current = pdf;
        setDoc(pdf);
        setNumPages(pdf.numPages);
      })
      .catch(() => {
        if (!cancelled) {
          setDoc(null);
          setNumPages(0);
        }
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
      try {
        current?.destroy();
      } catch {
        /* noop */
      }
    };
  }, [bytes]);

  return { doc, numPages, loading };
}
