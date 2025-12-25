import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Image, File, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useFileDownload } from '@/hooks/useFileDownload';

interface SharedDocument {
  id: string;
  nom: string;
  type: string;
  taille: number | null;
  url: string;
  downloadUrl: string;
}

const DownloadFiles = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { downloadFromUrl } = useFileDownload();

  useEffect(() => {
    if (token) {
      fetchDocuments();
    }
  }, [token]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase.functions.invoke('get-shared-files', {
        body: null,
        headers: {},
      });

      // Use query parameter approach
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shared-files?token=${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Lien invalide ou expiré');
        return;
      }

      setDocuments(result.documents);
      setExpiresAt(result.expiresAt);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Erreur lors du chargement des fichiers');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (type.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Taille inconnue';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleDownload = async (doc: SharedDocument) => {
    try {
      setDownloading(doc.id);
      
      const result = await downloadFromUrl(doc.downloadUrl, {
        filename: doc.nom,
        mimeType: doc.type,
      });
      
      if (result.success) {
        toast({
          title: "Téléchargement démarré",
          description: doc.nom,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('Download error:', err);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le fichier",
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    for (const doc of documents) {
      await handleDownload(doc);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const totalSize = documents.reduce((acc, doc) => acc + (doc.taille || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-lg mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Chargement des fichiers...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-lg mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Lien invalide</h2>
            <p className="text-muted-foreground text-center mb-6">{error}</p>
            <Link to="/">
              <Button variant="outline">Retour à l'accueil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>Fichiers partagés</CardTitle>
            <CardDescription>
              {documents.length} fichier{documents.length > 1 ? 's' : ''} disponible{documents.length > 1 ? 's' : ''} 
              ({formatFileSize(totalSize)})
            </CardDescription>
            {expiresAt && (
              <p className="text-sm text-muted-foreground mt-2">
                Expire le {new Date(expiresAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {documents.length > 1 && (
              <Button 
                onClick={handleDownloadAll} 
                className="w-full"
                disabled={downloading !== null}
              >
                <Download className="h-4 w-4 mr-2" />
                Tout télécharger
              </Button>
            )}
            
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(doc.type)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{doc.nom}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(doc.taille)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc.id}
                  >
                    {downloading === doc.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t text-center">
              <p className="text-xs text-muted-foreground">
                Partagé via Immo-Rama
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DownloadFiles;
