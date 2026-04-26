import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, AlertCircle, CheckCircle, Eye, Sparkles } from 'lucide-react';
import { MandatFormData, DocumentData } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LuxuryIconBadge } from '@/components/forms-premium/LuxuryIconBadge';
import { IconDocument, IconUpload } from '@/components/forms-premium/icons/LuxuryIcons';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

const REQUIRED_DOCUMENTS = [
  { key: 'poursuites', label: "Extrait de l'office des poursuites (moins de 3 mois)", required: true },
  { key: 'salaire1', label: 'Fiche de salaire 1', required: true },
  { key: 'salaire2', label: 'Fiche de salaire 2', required: true },
  { key: 'salaire3', label: 'Fiche de salaire 3', required: true },
  { key: 'identite', label: "Copie pièce d'identité ou permis de séjour", required: true },
];

export default function MandatFormStep6({ data, onChange }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentDocKey, setCurrentDocKey] = useState<string>('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentDocKey) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('Le fichier est trop volumineux (max 10MB)'); return; }
    setUploading(currentDocKey);
    setUploadProgress(0);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `mandat/${Date.now()}_${currentDocKey}.${fileExt}`;
      const progressInterval = setInterval(() => setUploadProgress(prev => Math.min(prev + 10, 90)), 100);
      const { error } = await supabase.storage.from('client-documents').upload(fileName, file);
      clearInterval(progressInterval);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('client-documents').getPublicUrl(fileName);
      const newDoc: DocumentData = { name: file.name, url: urlData.publicUrl, type: currentDocKey, size: file.size };
      onChange({ documents_uploades: [...data.documents_uploades.filter(d => d.type !== currentDocKey), newDoc] });
      setUploadProgress(100);
      toast.success('Document uploadé');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(null); setUploadProgress(0); setCurrentDocKey('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveDocument = (docType: string) => onChange({ documents_uploades: data.documents_uploades.filter(d => d.type !== docType) });
  const triggerFileInput = (docKey: string) => { setCurrentDocKey(docKey); fileInputRef.current?.click(); };
  const getUploadedDoc = (docKey: string) => data.documents_uploades.find(d => d.type === docKey);

  const uploadedCount = data.documents_uploades.length;
  const requiredCount = REQUIRED_DOCUMENTS.filter(d => d.required).length;
  const progressPct = (uploadedCount / requiredCount) * 100;
  const allDone = uploadedCount === requiredCount;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Documents requis</h2>
        <p className="text-sm text-[hsl(40_20%_55%)] mt-1">L'inscription doit être accompagnée des documents suivants.</p>
      </div>

      {/* Progress ring */}
      <div className="flex flex-col items-center p-5 rounded-2xl border border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_12%_10%/0.5)]">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="40" cy="40" r="33" stroke="hsl(30 10% 18%)" strokeWidth="6" fill="none" />
            <circle
              cx="40" cy="40" r="33" strokeWidth="6" fill="none" strokeLinecap="round"
              stroke="url(#goldGrad)"
              strokeDasharray={`${progressPct * 2.073} 207.3`}
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(38 55% 65%)" />
                <stop offset="100%" stopColor="hsl(38 45% 48%)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-[hsl(38_55%_65%)]">{uploadedCount}</span>
            <span className="text-[10px] text-[hsl(40_20%_45%)]">/ {requiredCount}</span>
          </div>
          {allDone && <div className="absolute inset-0 rounded-full bg-[hsl(38_55%_65%/0.12)] blur-xl animate-pulse" />}
        </div>
        <p className="mt-2 text-xs font-medium flex items-center gap-1.5">
          {allDone
            ? <><Sparkles size={13} className="text-emerald-400" /><span className="text-emerald-400">Tous les documents sont uploadés !</span></>
            : <span className="text-[hsl(40_20%_45%)]">Documents uploadés</span>
          }
        </p>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileSelect} />

      {/* Documents list */}
      <div className="space-y-2.5">
        {REQUIRED_DOCUMENTS.map((doc, index) => {
          const uploadedDoc = getUploadedDoc(doc.key);
          const isUploading = uploading === doc.key;
          return (
            <div
              key={doc.key}
              className={`rounded-xl border p-4 transition-all duration-300 ${
                uploadedDoc
                  ? 'border-emerald-500/25 bg-emerald-950/10'
                  : 'border-[hsl(38_45%_48%/0.15)] bg-[hsl(30_12%_10%/0.4)] hover:border-[hsl(38_45%_48%/0.3)]'
              }`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${uploadedDoc ? 'bg-emerald-500/20' : 'bg-[hsl(30_10%_16%)]'}`}>
                    {uploadedDoc
                      ? <CheckCircle size={16} className="text-emerald-400" />
                      : <AlertCircle size={16} className="text-[hsl(40_20%_40%)]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(40_20%_72%)] leading-tight">
                      {doc.label}{doc.required && <span className="text-red-400 ml-1">*</span>}
                    </p>
                    {uploadedDoc && (
                      <p className="text-[11px] text-[hsl(40_20%_45%)] truncate mt-0.5 flex items-center gap-1">
                        <FileText size={10} /> {uploadedDoc.name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-12 sm:ml-0">
                  {uploadedDoc ? (
                    <>
                      <button type="button" onClick={() => window.open(uploadedDoc.url, '_blank')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[hsl(40_20%_60%)] hover:text-[hsl(38_55%_65%)] hover:bg-[hsl(38_45%_48%/0.1)] transition-colors">
                        <Eye size={13} /> Voir
                      </button>
                      <button type="button" onClick={() => handleRemoveDocument(doc.key)} className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-950/30 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => triggerFileInput(doc.key)}
                      disabled={isUploading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[hsl(38_45%_48%/0.3)] text-[hsl(38_55%_65%)] hover:bg-[hsl(38_45%_48%/0.1)] transition-colors disabled:opacity-50"
                    >
                      <IconUpload size={13} className={isUploading ? 'animate-bounce' : ''} />
                      {isUploading ? 'Upload...' : 'Charger'}
                    </button>
                  )}
                </div>
              </div>

              {isUploading && (
                <div className="mt-3 space-y-1">
                  <div className="h-1 rounded-full bg-[hsl(30_10%_18%)] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[hsl(38_55%_65%)] to-[hsl(38_45%_48%)] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <p className="text-[10px] text-[hsl(40_20%_40%)] text-right">{uploadProgress}%</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[hsl(40_20%_35%)] text-center flex items-center justify-center gap-1.5">
        <FileText size={11} /> Formats acceptés: PDF, JPG, PNG (max 10MB par fichier)
      </p>
    </div>
  );
}
