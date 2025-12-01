import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { MandatFormData, DocumentData } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  data: MandatFormData;
  onChange: (data: Partial<MandatFormData>) => void;
}

const REQUIRED_DOCUMENTS = [
  { key: 'poursuites', label: 'Extrait de l\'office des poursuites (moins de 3 mois)', required: true },
  { key: 'salaire1', label: 'Fiche de salaire 1', required: true },
  { key: 'salaire2', label: 'Fiche de salaire 2', required: true },
  { key: 'salaire3', label: 'Fiche de salaire 3', required: true },
  { key: 'identite', label: 'Copie pièce d\'identité ou permis de séjour', required: true },
];

export default function MandatFormStep6({ data, onChange }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentDocKey, setCurrentDocKey] = useState<string>('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentDocKey) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('Le fichier est trop volumineux (max 10MB)');
      return;
    }

    setUploading(currentDocKey);
    setUploadProgress(0);

    try {
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `mandat/${Date.now()}_${currentDocKey}.${fileExt}`;

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const { data: uploadData, error } = await supabase.storage
        .from('client-documents')
        .upload(fileName, file);

      clearInterval(progressInterval);

      if (error) throw error;

      // Obtenir l'URL publique
      const { data: urlData } = supabase.storage
        .from('client-documents')
        .getPublicUrl(fileName);

      const newDoc: DocumentData = {
        name: file.name,
        url: urlData.publicUrl,
        type: currentDocKey,
      };

      // Mettre à jour les documents
      const updatedDocs = data.documents_uploades.filter(d => d.type !== currentDocKey);
      onChange({ documents_uploades: [...updatedDocs, newDoc] });

      setUploadProgress(100);
      toast.success('Document uploadé');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setUploading(null);
      setUploadProgress(0);
      setCurrentDocKey('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveDocument = (docType: string) => {
    onChange({ documents_uploades: data.documents_uploades.filter(d => d.type !== docType) });
  };

  const triggerFileInput = (docKey: string) => {
    setCurrentDocKey(docKey);
    fileInputRef.current?.click();
  };

  const getUploadedDoc = (docKey: string) => {
    return data.documents_uploades.find(d => d.type === docKey);
  };

  const uploadedCount = data.documents_uploades.length;
  const requiredCount = REQUIRED_DOCUMENTS.filter(d => d.required).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold">Documents requis</h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          L'inscription doit être accompagnée des documents suivants
        </p>
      </div>

      <div className="flex items-center justify-center p-3 sm:p-4 bg-primary/5 rounded-lg">
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-bold text-primary">{uploadedCount}/{requiredCount}</p>
          <p className="text-xs text-muted-foreground">Documents uploadés</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
      />

      <div className="space-y-2 sm:space-y-3">
        {REQUIRED_DOCUMENTS.map((doc) => {
          const uploadedDoc = getUploadedDoc(doc.key);
          const isUploading = uploading === doc.key;

          return (
            <Card key={doc.key} className={`p-3 sm:p-4 ${uploadedDoc ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Icon and label */}
                <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                  {uploadedDoc ? (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5 sm:mt-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs sm:text-sm font-medium leading-tight block">
                      {doc.label}
                      {doc.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {uploadedDoc && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{uploadedDoc.name}</p>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2 ml-8 sm:ml-0">
                  {uploadedDoc ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(uploadedDoc.url, '_blank')}
                        className="h-8 px-2 sm:px-3 gap-1.5"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="text-xs">Voir</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDocument(doc.key)}
                        className="h-8 px-2 sm:px-3 gap-1.5 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-xs sm:hidden">Suppr.</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerFileInput(doc.key)}
                      disabled={isUploading}
                      className="h-8 gap-1.5"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-xs">{isUploading ? 'Upload...' : 'Charger'}</span>
                    </Button>
                  )}
                </div>
              </div>

              {isUploading && (
                <Progress value={uploadProgress} className="mt-3 h-1" />
              )}
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center px-2">
        Formats acceptés: PDF, JPG, PNG (max 10MB par fichier)
      </p>
    </div>
  );
}
