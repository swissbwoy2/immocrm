import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Upload, Loader2, CheckCircle2, AlertCircle, CalendarIcon, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess?: () => void;
}

type Step = 'upload' | 'analyzing' | 'review' | 'manual';

export function ExtractPoursuitesUploadDialog({ open, onOpenChange, clientId, onSuccess }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [aiResult, setAiResult] = useState<{ date_emission: string; confidence: number } | null>(null);
  const [manualDate, setManualDate] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setAiResult(null);
    setManualDate(undefined);
    setSaving(false);
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFileSelect = (f: File) => {
    if (f.type !== 'application/pdf' && !f.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un PDF ou une image');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10 Mo)');
      return;
    }
    setFile(f);
  };

  const uploadAndAnalyze = async () => {
    if (!file || !user) return;
    setStep('analyzing');
    try {
      // 1. Upload
      const ext = file.name.split('.').pop();
      const path = `${clientId}/extrait_poursuites_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('client-documents')
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      // 2. Créer entrée documents
      const { data: doc, error: docErr } = await supabase
        .from('documents')
        .insert({
          nom: file.name,
          type: file.type,
          taille: file.size,
          user_id: user.id,
          client_id: clientId,
          url: path,
          type_document: 'extrait_poursuites',
        })
        .select('id')
        .single();
      if (docErr) throw docErr;

      // 3. Appel IA
      const { data, error } = await supabase.functions.invoke('extract-poursuites-date', {
        body: { document_id: doc.id, client_id: clientId },
      });

      if (error || !data?.ok) {
        const msg = data?.error || error?.message || 'Extraction IA échouée';
        toast.error(msg);
        // Fallback : laisser saisir manuellement
        setStep('manual');
        return;
      }

      setAiResult({ date_emission: data.date_emission, confidence: data.confidence });
      setStep('review');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Erreur upload');
      setStep('upload');
    }
  };

  const confirmDate = async (dateStr: string, method: 'ai' | 'manual') => {
    setSaving(true);
    try {
      const { error } = await (supabase.from('clients') as any).update({
        extrait_poursuites_date_emission: dateStr,
        extrait_poursuites_extraction_method: method,
        extrait_poursuites_last_reminder_at: null,
      }).eq('id', clientId);
      if (error) throw error;
      toast.success('Date enregistrée ✅');
      onSuccess?.();
      handleClose(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Sauvegarde échouée');
    } finally {
      setSaving(false);
    }
  };

  const confidencePct = aiResult ? Math.round(aiResult.confidence * 100) : 0;
  const confidenceColor =
    confidencePct >= 80 ? 'text-green-600' : confidencePct >= 50 ? 'text-orange-600' : 'text-red-600';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Mon extrait de poursuites
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && "Uploadez votre extrait, l'IA détecte automatiquement la date d'émission."}
            {step === 'analyzing' && "L'IA lit votre document…"}
            {step === 'review' && 'Vérifiez la date détectée'}
            {step === 'manual' && "Saisie manuelle de la date d'émission"}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <label
              htmlFor="poursuites-file"
              className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/30 transition"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="text-sm font-medium">{file ? file.name : 'Cliquez pour sélectionner un fichier'}</div>
              <div className="text-xs text-muted-foreground">PDF ou image — max 10 Mo</div>
              <input
                id="poursuites-file"
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </label>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('manual')}>
                Saisir manuellement
              </Button>
              <Button className="flex-1" disabled={!file} onClick={uploadAndAnalyze}>
                <Sparkles className="w-4 h-4 mr-1" />
                Analyser avec l'IA
              </Button>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center gap-3 py-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Lecture du document…</p>
          </div>
        )}

        {step === 'review' && aiResult && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Date détectée</p>
                  <p className="text-2xl font-bold mt-1">{format(new Date(aiResult.date_emission), 'd MMMM yyyy', { locale: fr })}</p>
                  <p className={cn('text-xs mt-1', confidenceColor)}>
                    Confiance IA : {confidencePct}%
                  </p>
                </div>
              </div>
            </div>

            {confidencePct < 70 && (
              <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-sm flex gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <span>Confiance faible. Vérifiez attentivement la date avant de confirmer.</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('manual')}>
                ✏️ Corriger
              </Button>
              <Button
                className="flex-1"
                disabled={saving}
                onClick={() => confirmDate(aiResult.date_emission, 'ai')}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '✅ Confirmer'}
              </Button>
            </div>
          </div>
        )}

        {step === 'manual' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Date d'émission de l'extrait</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !manualDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {manualDate ? format(manualDate, 'd MMMM yyyy', { locale: fr }) : 'Sélectionner une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={manualDate}
                    onSelect={setManualDate}
                    disabled={(d) => d > new Date() || d < new Date('2020-01-01')}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('upload')}>
                Retour
              </Button>
              <Button
                className="flex-1"
                disabled={!manualDate || saving}
                onClick={() => manualDate && confirmDate(format(manualDate, 'yyyy-MM-dd'), 'manual')}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
