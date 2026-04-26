import { useState, useMemo } from 'react';
import { CreditCard, FileText, Sparkles, ShieldCheck } from 'lucide-react';
import { MandatFormData, DocumentData } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PremiumDocumentDropzone, UploadedPreview } from '@/components/forms-premium/PremiumDocumentDropzone';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

/**
 * Détermine si la pièce d'identité ou un permis de séjour est attendu.
 * - Permis B / C / F / N → permis de séjour (recto + verso)
 * - Suisse / autre        → carte d'identité (recto + verso)
 */
function getIdentityKind(typePermis: string | undefined): 'permis_sejour' | 'piece_identite' {
  if (!typePermis) return 'piece_identite';
  return ['B', 'C', 'F', 'N'].includes(typePermis) ? 'permis_sejour' : 'piece_identite';
}

const ID_LABELS = {
  piece_identite: { title: "Document d'identité", short: 'identité' },
  permis_sejour: { title: "Document d'identité", short: 'identité' },
} as const;

const SALAIRE_KEYS: Array<{ key: 'salaire1' | 'salaire2' | 'salaire3'; label: string }> = [
  { key: 'salaire1', label: 'Fiche de salaire 1' },
  { key: 'salaire2', label: 'Fiche de salaire 2' },
  { key: 'salaire3', label: 'Fiche de salaire 3' },
];

export default function MandatFormStep6({ data, onChange }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);

  const idKind = getIdentityKind(data.type_permis);
  const idTitle = ID_LABELS[idKind].title;
  const idShort = ID_LABELS[idKind].short;

  // Mapping des clés UI ↔ documents_uploades
  const docByKey = useMemo(() => {
    const m: Record<string, DocumentData | undefined> = {};
    for (const d of data.documents_uploades) m[d.type] = d;
    return m;
  }, [data.documents_uploades]);

  const previewFromDoc = (doc: DocumentData | undefined): UploadedPreview | null => {
    if (!doc) return null;
    const lower = doc.name.toLowerCase();
    const isImage = /\.(png|jpe?g|webp|gif)$/.test(lower);
    return { name: doc.name, url: isImage ? doc.url : undefined, isImage, size: doc.size };
  };

  const setDoc = (typeKey: string, doc: DocumentData | null) => {
    const filtered = data.documents_uploades.filter((d) => d.type !== typeKey);
    onChange({ documents_uploades: doc ? [...filtered, doc] : filtered });
  };

  const handleUpload = async (typeKey: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10 MB)');
      return;
    }
    setUploading(typeKey);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `mandat/${Date.now()}_${typeKey}.${ext}`;
      const { error } = await supabase.storage.from('client-documents').upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('client-documents').getPublicUrl(fileName);
      setDoc(typeKey, { name: file.name, url: urlData.publicUrl, type: typeKey, size: file.size });
      toast.success('Document ajouté');
    } catch (err) {
      console.error('Upload error', err);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(null);
    }
  };

  // Compteur intelligent : poursuites + 3 salaires + 2 faces identité
  const required = ['poursuites', 'salaire1', 'salaire2', 'salaire3', `${idKind}_recto`, `${idKind}_verso`];
  const uploadedCount = required.filter((k) => !!docByKey[k]).length;
  const total = required.length;
  const pct = Math.round((uploadedCount / total) * 100);
  const allDone = uploadedCount === total;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">Documents à fournir</h2>
        <p className="text-sm text-[hsl(40_20%_55%)] mt-1">
          Téléchargez ou scannez les documents nécessaires pour constituer votre dossier.
        </p>
      </div>

      {/* Progression compacte */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-[hsl(38_45%_48%/0.18)] bg-[hsl(30_12%_10%/0.5)]">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12">
            <svg className="w-full h-full -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="hsl(30 10% 18%)" strokeWidth="4" fill="none" />
              <circle
                cx="24"
                cy="24"
                r="20"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                stroke="url(#prog6)"
                strokeDasharray={`${(pct / 100) * 125.66} 125.66`}
                className="transition-all duration-500"
              />
              <defs>
                <linearGradient id="prog6" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(38 55% 65%)" />
                  <stop offset="100%" stopColor="hsl(38 45% 48%)" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[hsl(38_55%_65%)]">
              {pct}%
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[hsl(40_20%_82%)]">
              {uploadedCount} / {total} documents
            </p>
            <p className="text-xs text-[hsl(40_20%_50%)]">
              {allDone ? (
                <span className="text-emerald-400 inline-flex items-center gap-1">
                  <Sparkles size={12} /> Dossier complet
                </span>
              ) : (
                'Complétez votre dossier pour activer les recherches'
              )}
            </p>
          </div>
        </div>
        <ShieldCheck className="h-5 w-5 text-[hsl(38_55%_65%)] hidden sm:block" />
      </div>

      {/* === Documents administratifs === */}
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[hsl(40_20%_75%)] border-b border-[hsl(38_45%_48%/0.15)] pb-2">
          <FileText className="h-4 w-4 text-[hsl(38_55%_65%)]" />
          Documents administratifs
        </h3>

        {/* Extrait des poursuites */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-medium text-[hsl(40_20%_82%)]">
              Extrait des poursuites <span className="text-red-400">*</span>
            </p>
            <span className="text-[11px] text-[hsl(40_20%_45%)]">Datant de moins de 3 mois</span>
          </div>
          <PremiumDocumentDropzone
            documentType="extrait_poursuites"
            baseFileName="extrait_poursuites"
            preview={previewFromDoc(docByKey['poursuites'])}
            disabled={uploading === 'poursuites'}
            onFile={(f) => handleUpload('poursuites', f)}
            onRemove={() => setDoc('poursuites', null)}
          />
        </div>

        {/* 3 fiches de salaire */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-sm font-medium text-[hsl(40_20%_82%)]">
              3 dernières fiches de salaire <span className="text-red-400">*</span>
            </p>
            <span className="text-[11px] text-[hsl(40_20%_45%)]">Une par mois</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SALAIRE_KEYS.map((s) => (
              <div key={s.key}>
                <p className="text-[11px] text-[hsl(40_20%_55%)] mb-1.5">{s.label}</p>
                <PremiumDocumentDropzone
                  documentType="fiche_salaire"
                  baseFileName={s.key}
                  compact
                  preview={previewFromDoc(docByKey[s.key])}
                  disabled={uploading === s.key}
                  onFile={(f) => handleUpload(s.key, f)}
                  onRemove={() => setDoc(s.key, null)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === Identité === */}
      <section className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[hsl(40_20%_75%)] border-b border-[hsl(38_45%_48%/0.15)] pb-2">
          <CreditCard className="h-4 w-4 text-[hsl(38_55%_65%)]" />
          {idTitle} <span className="text-[hsl(40_20%_55%)] font-normal">(Carte d'identité Suisse ou Permis de séjour)</span>
        </h3>
        <p className="text-xs text-[hsl(40_20%_55%)] -mt-2">
          Recto et verso obligatoires.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(['recto', 'verso'] as const).map((face) => {
            const key = `${idKind}_${face}`;
            return (
              <div key={key}>
                <p className="text-sm font-medium text-[hsl(40_20%_82%)] mb-2">
                  {idTitle} ({face}) <span className="text-red-400">*</span>
                </p>
                <PremiumDocumentDropzone
                  documentType={idKind}
                  baseFileName={key}
                  preview={previewFromDoc(docByKey[key])}
                  disabled={uploading === key}
                  onFile={(f) => handleUpload(key, f)}
                  onRemove={() => setDoc(key, null)}
                />
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-[11px] text-[hsl(40_20%_35%)] text-center flex items-center justify-center gap-1.5">
        <FileText size={11} /> Formats acceptés : PDF, JPG, PNG · 10 MB max par fichier
      </p>
    </div>
  );
}
