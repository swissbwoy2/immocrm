import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Download, Eye, User, Calendar, File } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AgentDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

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
  }, [user]);

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

      // Récupérer tous les clients de cet agent
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, user_id')
        .eq('agent_id', agentData.id);

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
      // Si l'URL est une data URL (base64)
      if (document.url.startsWith('data:')) {
        console.log('Processing base64 document, type:', document.type);
        
        // Pour les PDFs en base64, on doit créer un Blob URL
        if (document.type === 'application/pdf') {
          try {
            // Extraire le base64 pur (enlever le préfixe data:...)
            const base64Data = document.url.split(',')[1];
            console.log('Base64 data length:', base64Data?.length);
            
            // Décoder le base64
            const binaryString = atob(base64Data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Créer un Blob avec le bon type MIME
            const blob = new Blob([bytes], { type: 'application/pdf' });
            console.log('Blob created, size:', blob.size, 'type:', blob.type);
            
            // Créer une URL pour le Blob
            const blobUrl = URL.createObjectURL(blob);
            console.log('Blob URL created:', blobUrl);
            
            setPreviewUrl(blobUrl);
            setPreviewDialogOpen(true);
          } catch (error) {
            console.error('Error converting base64 to Blob:', error);
            toast.error('Erreur lors de la conversion du document');
            return;
          }
        } else {
          // Pour les images, utiliser directement la data URL
          console.log('Using data URL directly for image');
          setPreviewUrl(document.url);
          setPreviewDialogOpen(true);
        }
        return;
      }

      // Sinon, extraire le chemin du fichier et créer une URL signée
      let filePath = document.url;
      if (filePath.includes('/storage/v1/object/')) {
        const parts = filePath.split('/client-documents/');
        filePath = parts[1] || filePath;
      }

      const { data, error } = await supabase.storage
        .from('client-documents')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

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
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedDocument?.nom}</span>
              {selectedDocument?.type.includes('pdf') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewUrl, '_blank')}
                >
                  Ouvrir dans un nouvel onglet
                </Button>
              )}
            </DialogTitle>
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
              <embed
                src={previewUrl}
                type="application/pdf"
                className="w-full h-[70vh]"
              />
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aperçu non disponible pour ce type de fichier
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}