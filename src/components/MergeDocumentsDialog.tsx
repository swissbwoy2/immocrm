import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown, FileText, Image as ImageIcon, AlertTriangle, Loader2, FilePlus } from 'lucide-react';
import { mergeDocuments, isSupported } from '@/utils/pdfMerger';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  nom: string;
  url: string;
  type: string;
  type_document?: string;
}

interface MergeDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documents: Document[];
  clientId: string;
  clientUserId: string;
  clientName?: string;
  onSuccess: () => void;
}

export function MergeDocumentsDialog({
  open,
  onOpenChange,
  documents,
  clientId,
  clientUserId,
  clientName,
  onSuccess,
}: MergeDocumentsDialogProps) {
  const { toast } = useToast();
  const [selectedDocs, setSelectedDocs] = useState<Document[]>([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });

  // Filtrer les documents supportés
  const supportedDocs = documents.filter(isSupported);
  const unsupportedDocs = documents.filter(d => !isSupported(d));

  useEffect(() => {
    if (open) {
      setSelectedDocs([]);
      const date = new Date().toISOString().split('T')[0];
      const name = clientName?.replace(/\s+/g, '_') || 'Client';
      setFileName(`Dossier_complet_${name}_${date}.pdf`);
      setProgress({ current: 0, total: 0, status: '' });
    }
  }, [open, clientName]);

  const toggleDocument = (doc: Document) => {
    setSelectedDocs(prev => {
      const exists = prev.find(d => d.id === doc.id);
      if (exists) {
        return prev.filter(d => d.id !== doc.id);
      } else {
        return [...prev, doc];
      }
    });
  };

  const moveDocument = (index: number, direction: 'up' | 'down') => {
    const newDocs = [...selectedDocs];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newDocs.length) return;
    
    [newDocs[index], newDocs[newIndex]] = [newDocs[newIndex], newDocs[index]];
    setSelectedDocs(newDocs);
  };

  const getDocTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      'fiche_salaire': '💰 Fiche salaire',
      'extrait_poursuites': '📋 Extrait poursuites',
      'piece_identite': '🪪 Pièce ID',
      'dossier_complet': '📎 Dossier complet',
      'autre': '📄 Autre'
    };
    return labels[type || 'autre'] || '📄 Autre';
  };

  const getFileIcon = (type: string) => {
    if (type?.includes('pdf')) return FileText;
    if (type?.includes('image')) return ImageIcon;
    return FileText;
  };

  const handleMerge = async () => {
    if (selectedDocs.length < 2) {
      toast({
        title: 'Sélection insuffisante',
        description: 'Veuillez sélectionner au moins 2 documents',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Fusionner les documents
      const mergedBlob = await mergeDocuments(selectedDocs, (current, total, status) => {
        setProgress({ current, total, status });
      });

      // Uploader le fichier fusionné
      const fileExt = 'pdf';
      const storagePath = `${clientUserId}/${Date.now()}_dossier_complet.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(storagePath, mergedBlob);

      if (uploadError) throw uploadError;

      // Créer l'entrée en base
      const user = await supabase.auth.getUser();
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.data.user?.id || clientUserId,
          client_id: clientId,
          nom: fileName,
          type: 'application/pdf',
          type_document: 'dossier_complet',
          taille: mergedBlob.size,
          url: storagePath,
        });

      if (dbError) throw dbError;

      toast({
        title: 'Dossier créé',
        description: `Le fichier "${fileName}" a été créé avec succès`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error merging documents:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le dossier complet',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const isDocSelected = (docId: string) => selectedDocs.some(d => d.id === docId);
  const selectedIndex = (docId: string) => selectedDocs.findIndex(d => d.id === docId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus className="w-5 h-5" />
            Créer un dossier complet
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Nom du fichier */}
          <div className="space-y-2">
            <Label htmlFor="filename">Nom du fichier</Label>
            <Input
              id="filename"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Dossier_complet.pdf"
            />
          </div>

          {/* Liste des documents */}
          <div className="space-y-2">
            <Label>Sélectionnez et ordonnez les documents ({selectedDocs.length} sélectionné{selectedDocs.length > 1 ? 's' : ''})</Label>
            
            {supportedDocs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aucun document compatible (PDF ou image)</p>
              </div>
            ) : (
              <div className="space-y-2 border rounded-lg p-2">
                {supportedDocs.map((doc) => {
                  const Icon = getFileIcon(doc.type);
                  const selected = isDocSelected(doc.id);
                  const index = selectedIndex(doc.id);
                  
                  return (
                    <div
                      key={doc.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        selected ? 'bg-primary/10 border-primary' : 'bg-background hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleDocument(doc)}
                      />
                      
                      {selected && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => moveDocument(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => moveDocument(index, 'down')}
                            disabled={index === selectedDocs.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      
                      {selected && (
                        <Badge variant="secondary" className="text-xs min-w-[24px] justify-center">
                          {index + 1}
                        </Badge>
                      )}
                      
                      <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.nom}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {getDocTypeLabel(doc.type_document)}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Avertissement pour les documents non supportés */}
          {unsupportedDocs.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-500">
                  {unsupportedDocs.length} document{unsupportedDocs.length > 1 ? 's' : ''} non supporté{unsupportedDocs.length > 1 ? 's' : ''}
                </p>
                <p className="text-yellow-600 dark:text-yellow-400">
                  Les fichiers DOCX, DOC et autres formats ne peuvent pas être fusionnés. Seuls les PDF et images (JPG, PNG) sont pris en charge.
                </p>
              </div>
            </div>
          )}

          {/* Barre de progression */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{progress.status}</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Annuler
          </Button>
          <Button
            onClick={handleMerge}
            disabled={selectedDocs.length < 2 || isProcessing || !fileName.trim()}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <FilePlus className="w-4 h-4 mr-2" />
                Créer le dossier ({selectedDocs.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
