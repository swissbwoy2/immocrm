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
  onChange: (data: Partial<MandatV3FormData>) => void;
}

const DOC_CATEGORIES = [
  { value: 'piece_identite', label: 'Pièce d\'identité / Permis' },
  { value: 'fiche_salaire', label: 'Fiche de salaire' },
  { value: 'extrait_poursuites', label: 'Extrait des poursuites' },
  { value: 'attestation_employeur', label: 'Attestation d\'employeur' },
  { value: 'autre', label: 'Autre document' },
];

export default function MandatV3Step4Documents({ data, mandateId, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState('autre');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !mandateId) return;

    setUploading(true);
    const newDocs: MandateDocumentData[] = [];

    for (const file of Array.from(files)) {
      const filePath = `${mandateId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('mandates-private').upload(filePath, file);

      if (error) {
        toast.error(`Erreur upload: ${file.name}`);
        console.error(error);
        continue;
      }

      // Record in mandate_documents table
      const { data: docRow, error: insertErr } = await supabase
        .from('mandate_documents' as any)
        .insert({
          mandate_id: mandateId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          document_category: category,
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('Doc insert error:', insertErr);
      } else {
        newDocs.push({
          id: (docRow as any)?.id || crypto.randomUUID(),
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          document_category: category,
        });
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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Documents</h2>
        <p className="text-sm text-muted-foreground mt-1">Téléversez les documents nécessaires à votre dossier.</p>
      </div>

      {!mandateId && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200">
          Veuillez d'abord remplir et sauvegarder vos informations d'identité (étape 1) pour pouvoir uploader des documents.
        </div>
      )}

      {mandateId && (
        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Catégorie du document</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Upload...' : 'Choisir un fichier'}
            </Button>
          </div>
          <input ref={fileRef} type="file" className="hidden" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleUpload} />
        </div>
      )}

      {data.documents.length > 0 && (
        <div className="space-y-2">
          <Label>Documents uploadés</Label>
          {data.documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">{DOC_CATEGORIES.find((c) => c.value === doc.document_category)?.label || doc.document_category}</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeDoc(doc.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
