import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Trash2, AlertCircle, CheckCircle, Eye, Sparkles } from 'lucide-react';
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

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Le fichier est trop volumineux (max 10MB)');
      return;
    }

    setUploading(currentDocKey);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `mandat/${Date.now()}_${currentDocKey}.${fileExt}`;

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const { data: uploadData, error } = await supabase.storage
        .from('client-documents')
        .upload(fileName, file);

      clearInterval(progressInterval);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('client-documents')
        .getPublicUrl(fileName);

      const newDoc: DocumentData = {
        name: file.name,
        url: urlData.publicUrl,
        type: currentDocKey,
      };

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
  const progressPercentage = (uploadedCount / requiredCount) * 100;

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4 relative">
          <FileText className="h-8 w-8 text-primary" />
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-75" />
        </div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          Documents requis
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          L'inscription doit être accompagnée des documents suivants
        </p>
      </div>

      {/* Progress Circle */}
      <div className="flex flex-col items-center p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-sm border border-border/50">
        <div className="relative w-24 h-24">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted/30"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${progressPercentage * 2.51} 251`}
              className="transition-all duration-700 ease-out"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(var(--accent))" />
              </linearGradient>
            </defs>
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-primary">{uploadedCount}</span>
            <span className="text-xs text-muted-foreground">/ {requiredCount}</span>
          </div>
          {/* Glow effect when complete */}
          {uploadedCount === requiredCount && (
            <div className="absolute inset-0 rounded-full bg-green-500/20 blur-xl animate-pulse" />
          )}
        </div>
        <p className="mt-3 text-sm font-medium flex items-center gap-2">
          {uploadedCount === requiredCount ? (
            <>
              <Sparkles className="h-4 w-4 text-green-500" />
              <span className="text-green-600">Tous les documents sont uploadés !</span>
            </>
          ) : (
            <span className="text-muted-foreground">Documents uploadés</span>
          )}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
      />

      {/* Documents list */}
      <div className="space-y-3">
        {REQUIRED_DOCUMENTS.map((doc, index) => {
          const uploadedDoc = getUploadedDoc(doc.key);
          const isUploading = uploading === doc.key;

          return (
            <Card 
              key={doc.key} 
              className={`p-4 backdrop-blur-sm transition-all duration-500 hover:shadow-lg animate-fade-in ${
                uploadedDoc 
                  ? 'bg-green-500/5 border-green-500/30 shadow-green-500/5' 
                  : 'bg-card/80 border-border/50 hover:border-primary/30'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Icon and label */}
                <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                    transition-all duration-300
                    ${uploadedDoc 
                      ? 'bg-green-500/20 text-green-600' 
                      : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {uploadedDoc ? (
                      <CheckCircle className="h-5 w-5 animate-scale-in" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium leading-tight block">
                      {doc.label}
                      {doc.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {uploadedDoc && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {uploadedDoc.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2 ml-13 sm:ml-0">
                  {uploadedDoc ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(uploadedDoc.url, '_blank')}
                        className="h-9 px-3 gap-1.5 hover:bg-primary/10"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="text-xs">Voir</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDocument(doc.key)}
                        className="h-9 px-3 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerFileInput(doc.key)}
                      disabled={isUploading}
                      className="h-9 gap-1.5 bg-background/50 hover:bg-primary/10 hover:border-primary/50 transition-all duration-300"
                    >
                      <Upload className={`h-4 w-4 ${isUploading ? 'animate-bounce' : ''}`} />
                      <span className="text-xs">{isUploading ? 'Upload...' : 'Charger'}</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Upload progress */}
              {isUploading && (
                <div className="mt-3 space-y-1">
                  <Progress value={uploadProgress} className="h-1.5" />
                  <p className="text-xs text-muted-foreground text-right">{uploadProgress}%</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <p className="text-xs text-muted-foreground text-center px-2 flex items-center justify-center gap-2">
        <FileText className="h-3 w-3" />
        Formats acceptés: PDF, JPG, PNG (max 10MB par fichier)
      </p>
    </div>
  );
}
