import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, RefreshCw, Download, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useRenovationFiles } from '../hooks/useRenovationFiles';
import { RenovationFileCategory, RenovationJobStatus } from '../types/renovation';
import { downloadRenovationFile } from '../api/downloadFile';
import { toast } from 'sonner';

const CATEGORIES: { value: RenovationFileCategory; label: string }[] = [
  { value: 'photo_before', label: 'Photo avant' },
  { value: 'photo_during', label: 'Photo pendant' },
  { value: 'photo_after', label: 'Photo après' },
  { value: 'quote', label: 'Devis' },
  { value: 'invoice', label: 'Facture' },
  { value: 'contract', label: 'Contrat' },
  { value: 'permit', label: 'Permis' },
  { value: 'plan', label: 'Plan' },
  { value: 'diagnostic', label: 'Diagnostic' },
  { value: 'technical_report', label: 'Rapport technique' },
  { value: 'insurance', label: 'Assurance' },
  { value: 'warranty', label: 'Garantie' },
  { value: 'other', label: 'Autre' },
];

const jobStatusConfig: Record<RenovationJobStatus, { icon: React.ReactNode; label: string; color: string }> = {
  queued: { icon: <Clock className="h-3.5 w-3.5" />, label: 'En attente', color: 'text-muted-foreground' },
  processing: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, label: 'Analyse...', color: 'text-blue-600' },
  completed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Analysé', color: 'text-green-600' },
  failed: { icon: <AlertCircle className="h-3.5 w-3.5" />, label: 'Échec', color: 'text-destructive' },
};

interface Props {
  projectId: string;
  canUpload?: boolean;
}

export function RenovationFilesList({ projectId, canUpload = true }: Props) {
  const { files, jobs, upload, retry } = useRenovationFiles(projectId);
  const [selectedCategory, setSelectedCategory] = useState<RenovationFileCategory>('other');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    upload.mutate({ file, category: selectedCategory });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = async (fileId: string) => {
    try {
      const { signedUrl, fileName } = await downloadRenovationFile(fileId);
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = fileName;
      a.target = '_blank';
      a.click();
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    }
  };

  const getJobForFile = (fileId: string) => {
    return jobs.data?.find(j => j.file_id === fileId);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Documents</CardTitle>
        {canUpload && (
          <div className="flex items-center gap-2">
            <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as RenovationFileCategory)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.docx"
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {files.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !files.data?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun document pour ce projet.
          </p>
        ) : (
          <div className="space-y-2">
            {files.data.map(file => {
              const job = getJobForFile(file.id);
              const jobConfig = job ? jobStatusConfig[job.status] : null;

              return (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.file_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORIES.find(c => c.value === file.category)?.label || file.category}
                        </Badge>
                        {file.file_size && (
                          <span className="text-xs text-muted-foreground">
                            {(file.file_size / 1024).toFixed(0)} KB
                          </span>
                        )}
                        {jobConfig && (
                          <span className={`flex items-center gap-1 text-xs ${jobConfig.color}`}>
                            {jobConfig.icon}
                            {jobConfig.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {job?.status === 'failed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => retry.mutate({ jobId: job.id })}
                        disabled={retry.isPending}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(file.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
