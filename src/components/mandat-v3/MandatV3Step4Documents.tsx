import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { File, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MandatV3FormData, MandateDocumentData } from './types';
import { toast } from 'sonner';
import DocumentUploadField from '@/components/scanner/DocumentUploadField';

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

  const uploadFile = async (file: File) => {
    if (!mandateId || !accessToken) {
      toast.error("Mandat non initialisé. Sauvegardez l'étape 1 d'abord.");
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const filePath = `${mandateId}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('mandates-private')
        .upload(filePath, file);

      if (uploadError) {
        toast.error(`Erreur upload: ${file.name}`);
        console.error(uploadError);
        return;
      }

      const response = await fetch(getEdgeFunctionUrl('mandate-update-draft'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mandate_id: mandateId,
          access_token: accessToken,
          action: 'register_document',
          data: {
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            file_size: file.size,
            document_category: category,
          },
        }),
      });
      const result = await response.json();
      if (!result.success) {
        await supabase.storage.from('mandates-private').remove([filePath]);
        toast.error(`Erreur enregistrement: ${file.name}`);
        return;
      }

      const newDoc: MandateDocumentData = {
        id: result.document_id || crypto.randomUUID(),
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        document_category: category,
      };
      onChange({ documents: [...data.documents, newDoc] });
      toast.success(`Document ajouté : ${file.name}`);
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de l\'upload du document.');
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = (id: string) => {
    onChange({ documents: data.documents.filter((d) => d.id !== id) });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Documents</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Scannez ou téléversez vos documents. Les pièces officielles (identité, permis, fiches de salaire,
          extrait des poursuites…) requièrent <strong>recto et verso</strong>.
        </p>
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

          <DocumentUploadField
            documentType={category}
            disabled={uploading}
            baseFileName={`${category}_${mandateId.slice(0, 8)}`}
            onFile={uploadFile}
          />
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
