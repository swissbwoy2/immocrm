import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Eye, User, Calendar, File, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function AgentDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [documentToRename, setDocumentToRename] = useState<any>(null);
  const [newDocumentName, setNewDocumentName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadDocuments();
    
    // Real-time subscription pour les nouveaux documents
    const channel = supabase
      .channel('agent-documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        () => {
          loadDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadDocuments = async () => {
    if (!user) return;

    try {
      // Récupérer l'agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!agentData) return;

      // Récupérer tous les clients de cet agent via client_agents
      const { data: clientAgentsData } = await supabase
        .from('client_agents')
        .select('client_id')
        .eq('agent_id', agentData.id);

      const clientIds = clientAgentsData?.map(ca => ca.client_id) || [];

      const { data: clientsData } = clientIds.length > 0
        ? await supabase
            .from('clients')
            .select('id, user_id')
            .in('id', clientIds)
        : { data: [] };

      if (!clientsData || clientsData.length === 0) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      const clientUserIds = clientsData.map(c => c.user_id);

      // Récupérer les documents de ces clients
      const { data: documentsData } = await supabase
        .from('documents')
        .select('*')
        .in('user_id', clientUserIds)
        .order('created_at', { ascending: false });

      // Charger les profils des clients
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const documentsWithProfiles = documentsData?.map(doc => ({
        ...doc,
        client_profile: profilesMap.get(doc.user_id)
      })) || [];

      setDocuments(documentsWithProfiles);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (document: any) => {
    setSelectedDocument(document);
    
    try {
      let blobUrl: string;
      
      // Si l'URL est une data URL (base64)
      if (document.url.startsWith('data:')) {
        const base64Data = document.url.split(',')[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const blob = new Blob([bytes], { type: document.type });
        blobUrl = URL.createObjectURL(blob);
      } else {
        // Extraire le chemin du fichier
        let filePath = document.url;
        if (filePath.includes('/storage/v1/object/')) {
          const parts = filePath.split('/client-documents/');
          filePath = parts[1] || filePath;
        }

        // Télécharger le fichier en blob depuis le storage
        const { data, error } = await supabase.storage
          .from('client-documents')
          .download(filePath);

        if (error) throw error;
        blobUrl = URL.createObjectURL(data);
      }

      setPreviewUrl(blobUrl);
      setPreviewDialogOpen(true);
    } catch (error) {
      console.error('Error creating preview URL:', error);
      toast.error('Impossible de prévisualiser le document');
    }
  };

  const handleRename = async () => {
    if (!documentToRename || !newDocumentName.trim()) return;

    try {
      const { error } = await supabase
        .from('documents')
        .update({ nom: newDocumentName.trim() })
        .eq('id', documentToRename.id);

      if (error) throw error;

      toast.success('Document renommé avec succès');
      setRenameDialogOpen(false);
      setDocumentToRename(null);
      setNewDocumentName('');
      loadDocuments();
    } catch (error) {
      console.error('Error renaming document:', error);
      toast.error('Impossible de renommer le document');
    }
  };

  const handleDownload = async (document: any) => {
    try {
      // Si l'URL est une data URL (base64), la télécharger directement
      if (document.url.startsWith('data:')) {
        const link = window.document.createElement('a');
        link.href = document.url;
        link.download = document.nom;
        link.click();
        toast.success('Téléchargement démarré');
        return;
      }

      // Sinon, créer une URL signée depuis le storage
      let filePath = document.url;
      if (filePath.includes('/storage/v1/object/')) {
        const parts = filePath.split('/client-documents/');
        filePath = parts[1] || filePath;
      }

      const { data, error } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(filePath, 60);

      if (error) throw error;

      if (data?.signedUrl) {
        const link = window.document.createElement('a');
        link.href = data.signedUrl;
        link.download = document.nom;
        link.click();
        toast.success('Téléchargement démarré');
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    
    setIsDeleting(true);
    try {
      // Supprimer du storage si ce n'est pas une data URL
      if (!documentToDelete.url.startsWith('data:')) {
        let filePath = documentToDelete.url;
        if (filePath.includes('/storage/v1/object/')) {
          const parts = filePath.split('/client-documents/');
          filePath = parts[1] || filePath;
        }
        
        const { error: storageError } = await supabase.storage
          .from('client-documents')
          .remove([filePath]);

        if (storageError) {
          console.warn('Storage delete warning:', storageError);
        }
      }

      // Supprimer de la base de données
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentToDelete.id);

      if (dbError) throw dbError;

      toast.success('Document supprimé avec succès');
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Impossible de supprimer le document');
    } finally {
      setIsDeleting(false);
    }
  };

  const getDocumentIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word') || type.includes('document')) return '📝';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const groupedDocuments = documents.reduce((acc, doc) => {
    const clientName = doc.client_profile 
      ? `${doc.client_profile.prenom} ${doc.client_profile.nom}`
      : 'Client inconnu';
    
    if (!acc[clientName]) {
      acc[clientName] = [];
    }
    acc[clientName].push(doc);
    return acc;
  }, {} as Record<string, any[]>);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Documents clients</h1>
          <p className="text-muted-foreground">
            {documents.length} document{documents.length > 1 ? 's' : ''} au total
          </p>
        </div>

        {Object.keys(groupedDocuments).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedDocuments).map(([clientName, clientDocs]: [string, any[]]) => (
              <div key={clientName}>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {clientName}
                  <Badge variant="secondary">{clientDocs.length}</Badge>
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {clientDocs.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{getDocumentIcon(doc.type)}</span>
                              <CardTitle className="text-base truncate">
                                {doc.nom}
                              </CardTitle>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {doc.type_document || 'Autre'}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(doc.created_at).toLocaleDateString('fr-CH', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <File className="h-3 w-3" />
                            <span>{formatFileSize(doc.taille)}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {doc.type.includes('image') || doc.type.includes('pdf') ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreview(doc)}
                              className="flex-1"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Aperçu
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDocumentToRename(doc);
                              setNewDocumentName(doc.nom);
                              setRenameDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setDocumentToDelete(doc);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            className="flex-1"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Télécharger
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun document disponible</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog d'aperçu */}
      <Dialog open={previewDialogOpen} onOpenChange={(open) => {
        setPreviewDialogOpen(open);
        // Libérer le Blob URL quand on ferme le dialog
        if (!open && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }
      }}>
        <DialogContent className="max-w-5xl max-h-[95vh]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.nom}</DialogTitle>
            <DialogDescription>
              Aperçu du document
            </DialogDescription>
          </DialogHeader>
          <div className="h-[80vh]">
            {selectedDocument?.type.includes('pdf') ? (
              <object
                data={previewUrl}
                type="application/pdf"
                className="w-full h-full rounded-lg"
              >
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p className="mb-4">Impossible d'afficher le PDF dans le navigateur.</p>
                  <Button onClick={() => handleDownload(selectedDocument)}>
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger le PDF
                  </Button>
                </div>
              </object>
            ) : selectedDocument?.type.includes('image') ? (
              <div className="h-full overflow-auto flex justify-center items-start">
                <img
                  src={previewUrl}
                  alt={selectedDocument?.nom}
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aperçu non disponible pour ce type de fichier
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renommer le document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nouveau nom</Label>
              <Input
                value={newDocumentName}
                onChange={(e) => setNewDocumentName(e.target.value)}
                placeholder="Nom du document"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRename} disabled={!newDocumentName.trim()}>
              Renommer
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
              Êtes-vous sûr de vouloir supprimer "{documentToDelete?.nom}" ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDocument}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}