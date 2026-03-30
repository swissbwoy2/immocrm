import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, File, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MandatV3FormData, MandateDocumentData } from './types';
import { toast } from 'sonner';

interface Props {
  data: MandatV3FormData;
  mandateId: string | null;
  accessToken: string | null;
  onChange: (data: Partial<MandatV3FormData>) => void;
}

const DOC_CATEGORIES = [
  { value: 'piece_identite', label: 'Pièce d\'identité / Permis' },
  { value: 'fiche_salaire', label: 'Fiche de salaire' },
  { value: 'extrait_poursuites', label: 'Extrait des poursuites' },
  { value: 'attestation_employeur', label: 'Attestation d\'employeur' },
  { value: 'autre', label: 'Autre document' },
];

function getEdgeFunctionUrl(name: string): string {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  return `https://${projectId}.supabase.co/functions/v1/${name}`;
}

export default function MandatV3Step4Documents({ data, mandateId, accessToken, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('autre');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !mandateId || !accessToken) return;

    setUploading(true);
    const newDocs: MandateDocumentData[] = [];

    for (const file of Array.from(files)) {
      const filePath = `${mandateId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('mandates-private').upload(filePath, file);

      if (uploadError) {
        toast.error(`Erreur upload: ${file.name}`);
        console.error(uploadError);
        continue;
      }

      try {
        const response = await fetch(getEdgeFunctionUrl('mandate-update-draft'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mandate_id: mandateId, access_token: accessToken,
            action: 'register_document',
            data: { file_name: file.name, file_path: filePath, file_type: file.type, file_size: file.size, document_category: category },
          }),
        });
        const result = await response.json();
        if (!result.success) {
          await supabase.storage.from('mandates-private').remove([filePath]);
          toast.error(`Erreur enregistrement: ${file.name}`);
          continue;
        }
        newDocs.push({ id: result.document_id || crypto.randomUUID(), file_name: file.name, file_path: filePath, file_type: file.type, document_category: category });
      } catch (err) {
        await supabase.storage.from('mandates-private').remove([filePath]);
        toast.error(`Erreur enregistrement: ${file.name}`);
        continue;
      }
    }

    onChange({ documents: [...data.documents, ...newDocs] });
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    if (newDocs.length) toast.success(`${newDocs.length} document(s) uploadé(s)`);
  };

  const removeDoc = (id: string) => {
    onChange({ documents: data.documents.filter((d) => d.id !== id) });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Documents</h2>
        <p className="text-sm text-muted-foreground mt-1">Téléversez les documents nécessaires à votre dossier.</p>
      </div>

      {!mandateId && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-amber-800 dark:text-amber-200">
          Veuillez d'abord remplir et sauvegarder vos informations d'identité (étape 1) pour pouvoir uploader des documents.
        </div>
      )}

      {mandateId && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Catégorie du document</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full gap-2 min-h-[48px] border-dashed border-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Upload en cours...' : 'Choisir un fichier'}
          </Button>
          <input ref={fileRef} type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleUpload} />
        </div>
      )}

      {data.documents.length > 0 && (
        <div className="space-y-2">
          <Label>Documents uploadés ({data.documents.length})</Label>
          {data.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <File className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">{DOC_CATEGORIES.find((c) => c.value === doc.document_category)?.label}</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeDoc(doc.id)} className="min-h-[44px] min-w-[44px] shrink-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
