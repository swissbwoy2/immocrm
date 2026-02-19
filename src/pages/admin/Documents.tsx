import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Eye, User, Calendar, File, Search, Pencil, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getStoragePath, formatFileSize as formatFileSizeUtil } from '@/lib/documentUtils';

export default function AdminDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [documentToRename, setDocumentToRename] = useState<any>(null);
  const [newDocumentName, setNewDocumentName] = useState('');
  const [missingFiles, setMissingFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDocuments();
    
    // Real-time subscription pour les nouveaux documents
    const channel = supabase
      .channel('admin-documents')
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

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredDocuments(documents);
    } else {
      const filtered = documents.filter(doc => {
        const clientName = doc.client_profile 
          ? `${doc.client_profile.prenom} ${doc.client_profile.nom}`.toLowerCase()
          : '';
        const docName = doc.nom.toLowerCase();
        const docType = (doc.type_document || '').toLowerCase();
        
        return clientName.includes(searchTerm.toLowerCase()) ||
               docName.includes(searchTerm.toLowerCase()) ||
               docType.includes(searchTerm.toLowerCase());
      });
      setFilteredDocuments(filtered);
    }
  }, [searchTerm, documents]);

  const loadDocuments = async () => {
    if (!user) return;

    try {
      // L'admin peut voir tous les documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      // Charger les profils des clients
      const userIds = [...new Set(documentsData?.map(d => d.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const documentsWithProfiles = documentsData?.map(doc => ({
        ...doc,
        client_profile: profilesMap.get(doc.user_id)
      })) || [];

      setDocuments(documentsWithProfiles);
      setFilteredDocuments(documentsWithProfiles);

      // Vérifier quels fichiers existent dans le stockage (en background)
      checkMissingFiles(documentsWithProfiles);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Erreur lors du chargement des documents');
    } finally {
      setLoading(false);
    }
  };

  const checkMissingFiles = async (docs: any[]) => {
    const storageDocs = docs.filter(d => d.url && !d.url.startsWith('data:'));
    const missing = new Set<string>();
    // Vérifier par lots de 10 pour ne pas surcharger
    for (let i = 0; i < Math.min(storageDocs.length, 50); i++) {
      const doc = storageDocs[i];
      try {
        const filePath = getStoragePath(doc.url);
        const { error } = await supabase.storage
          .from('client-documents')
          .createSignedUrl(filePath, 10);
        if (error) {
          missing.add(doc.id);
        }
      } catch {
        missing.add(doc.id);
      }
    }
    setMissingFiles(missing);
  };


  const handlePreview = async (document: any) => {
    setSelectedDocument(document);
    
    try {
      // Gérer les data URLs (documents en base64 dans la DB)
      if (document.url.startsWith('data:')) {
        if (document.type === 'application/pdf') {
          // Convertir base64 en Blob pour les PDFs
          const base64Data = document.url.split(',')[1];
          const binaryString = atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const blobUrl = URL.createObjectURL(blob);
          
          setPreviewUrl(blobUrl);
          setPreviewDialogOpen(true);
        } else {
          // Pour les images, utiliser directement la data URL
          setPreviewUrl(document.url);
          setPreviewDialogOpen(true);
        }
        return;
      }

      // Extraire le chemin relatif et créer une signed URL
      const filePath = getStoragePath(document.url);
      const { data } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(filePath, 3600);

      if (data?.signedUrl) {
        setPreviewUrl(data.signedUrl);
        setPreviewDialogOpen(true);
      }
    } catch (error) {
      console.error('Error creating preview URL:', error);
      toast.error('Impossible de prévisualiser le document');
    }
  };

  const handleDownload = async (document: any) => {
    try {
      // Gérer les data URLs (documents en base64 dans la DB)
      if (document.url.startsWith('data:')) {
        const link = window.document.createElement('a');
        link.href = document.url;
        link.download = document.nom;
        link.click();
        toast.success('Téléchargement démarré');
        return;
      }

      // Extraire le chemin relatif et créer une signed URL
      const filePath = getStoragePath(document.url);
      const { data } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(filePath, 60);

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

  const getDocumentIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word') || type.includes('document')) return '📝';
    return '📎';
  };

  const formatFileSize = (bytes: number) => formatFileSizeUtil(bytes);

  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
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
          <h1 className="text-3xl font-bold">Tous les documents</h1>
          <p className="text-muted-foreground">
            {filteredDocuments.length} document{filteredDocuments.length > 1 ? 's' : ''}
            {searchTerm && ` trouvé${filteredDocuments.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom de client, document ou type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
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
                  {clientDocs.map((doc, docIndex) => (
                    <Card key={doc.id} className="card-interactive animate-fade-in" style={{ animationDelay: `${docIndex * 30}ms`, animationFillMode: 'backwards' }}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{getDocumentIcon(doc.type)}</span>
                              <CardTitle className="text-base truncate">
                                {doc.nom}
                              </CardTitle>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {doc.type_document || 'Autre'}
                              </Badge>
                              {missingFiles.has(doc.id) && (
                                <Badge variant="destructive" className="text-xs flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Fichier manquant
                                </Badge>
                              )}
                            </div>
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
          <Card className="card-interactive animate-fade-in">
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                {searchTerm 
                  ? 'Aucun document trouvé avec ces critères'
                  : 'Aucun document disponible'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog d'aperçu */}
      <Dialog open={previewDialogOpen} onOpenChange={(open) => {
        setPreviewDialogOpen(open);
        // Libérer le Blob URL quand on ferme pour éviter les fuites mémoire
        if (!open && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.nom}</DialogTitle>
            <DialogDescription>
              Aperçu du document
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {selectedDocument?.type.includes('image') ? (
              <img
                src={previewUrl}
                alt={selectedDocument?.nom}
                className="w-full h-auto"
              />
            ) : selectedDocument?.type.includes('pdf') ? (
              <iframe
                src={previewUrl}
                className="w-full h-[70vh]"
                title="Document preview"
              />
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aperçu non disponible pour ce type de fichier
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de renommage */}
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
    </div>
  );
}