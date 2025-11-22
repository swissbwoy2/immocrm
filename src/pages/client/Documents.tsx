import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, Upload, Download, Trash2, File, 
  Image as ImageIcon, FileSpreadsheet, AlertCircle 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Documents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('autre');

  useEffect(() => {
    loadDocuments();
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;

    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!clientData) {
        console.log('No client data found');
        return;
      }
      
      setClientId(clientData.id);

      const { data: docsData, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('date_upload', { ascending: false });

      if (error) throw error;

      setDocuments(docsData || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const validateFile = (file: File): boolean => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'La taille maximale est de 10 MB',
        variant: 'destructive',
      });
      return false;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Type de fichier non supporté',
        description: 'Formats acceptés : PDF, JPG, PNG',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile || isUploading) return;

    setIsUploading(true);

    try {
      const filePath = `${user!.id}/general/${Date.now()}_${selectedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          nom: selectedFile.name,
          type: selectedFile.type,
          taille: selectedFile.size,
          user_id: user!.id,
          client_id: clientId,
          type_document: selectedType,
          url: filePath,
        });

      if (dbError) throw dbError;

      await loadDocuments();

      toast({
        title: 'Document ajouté',
        description: 'Le document a été uploadé avec succès',
      });

      setUploadDialogOpen(false);
      setSelectedType('autre');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'uploader le fichier',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;

    try {
      if (!selectedDoc.url.startsWith('data:')) {
        const { error: storageError } = await supabase.storage
          .from('client-documents')
          .remove([selectedDoc.url]);

        if (storageError) throw storageError;
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', selectedDoc.id);

      if (error) throw error;

      await loadDocuments();

      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé avec succès',
      });

      setDeleteDialogOpen(false);
      setSelectedDoc(null);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le document',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = async (doc: any) => {
    if (doc.url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.nom;
      link.click();
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('client-documents')
        .download(doc.url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.nom;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le document',
        variant: 'destructive'
      });
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'fiche_salaire': '💰 Fiche salaire',
      'extrait_poursuites': '📋 Extrait poursuites',
      'piece_identite': '🪪 Pièce ID',
      'autre': '📄 Autre'
    };
    return labels[type] || '📄 Autre';
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return FileText;
    if (type.includes('image')) return ImageIcon;
    if (type.includes('sheet')) return FileSpreadsheet;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Mes documents</h1>
              <p className="text-muted-foreground">
                {documents.length} document{documents.length > 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Ajouter un document
            </Button>
          </div>

          {/* Info banner */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Documents importants à fournir :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Fiche de salaire (3 derniers mois)</li>
                  <li>Attestation de l'employeur</li>
                  <li>Justificatif de domicile</li>
                  <li>Pièce d'identité</li>
                  <li>Extrait de poursuites</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Liste des documents */}
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => {
                const Icon = getFileIcon(doc.type);
                return (
                  <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Icon className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm truncate" title={doc.nom}>
                              {doc.nom}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatFileSize(doc.taille)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(doc.type_document)}
                        </Badge>
                        {doc.offre_id && (
                          <Badge variant="secondary" className="text-xs ml-2">
                            📝 Candidature
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Ajouté le {new Date(doc.date_upload).toLocaleDateString('fr-CH')}
                        </p>
                      </div>
                      
                      {doc.type.includes('image') && doc.url && doc.url.startsWith('data:') && (
                        <img 
                          src={doc.url} 
                          alt={doc.nom}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDownload(doc)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Télécharger
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedDoc(doc);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Aucun document</h3>
                <p className="text-muted-foreground mb-4">
                  Commencez par uploader vos documents importants
                </p>
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Ajouter un document
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
            <DialogDescription>
              Formats acceptés : PDF, JPG, PNG (max 10 MB)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mb-4">
            <div className="space-y-2">
              <Label>Type de document</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiche_salaire">Fiche de salaire</SelectItem>
                  <SelectItem value="extrait_poursuites">Extrait des poursuites</SelectItem>
                  <SelectItem value="piece_identite">Pièce d'identité</SelectItem>
                  <SelectItem value="autre">Autre document</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {selectedFile ? (
              <div className="space-y-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  Changer de fichier
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-medium mb-2">
                  Glissez-déposez votre fichier ici
                </p>
                <p className="text-xs text-muted-foreground mb-4">ou</p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Sélectionner un fichier
                </Button>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFile(null);
                setSelectedType('autre');
              }}
            >
              Annuler
            </Button>
            <Button 
              onClick={handleConfirmUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Upload en cours...' : 'Confirmer l\'upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le document</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{selectedDoc?.nom}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}