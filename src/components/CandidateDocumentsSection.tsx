import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Upload, FileText, Image as ImageIcon, Eye, Download, Trash2, Loader2, User, Users, Shield, CheckCircle, AlertTriangle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ClientCandidate, CANDIDATE_TYPE_LABELS } from '@/hooks/useClientCandidates';
import { RequestDocumentsDialog } from './RequestDocumentsDialog';
import { getStoragePath } from '@/lib/documentUtils';
interface Document {
  id: string;
  nom: string;
  url: string;
  type: string;
  type_document?: string;
  taille?: number;
  candidate_id?: string;
  client_id?: string;
}

interface CandidateDocumentsSectionProps {
  clientId: string;
  clientUserId: string;
  clientName?: string;
  candidates: ClientCandidate[];
  onDocumentsChange?: () => void;
  refreshKey?: number;
  agentUserId?: string;
  agentId?: string;
}

const REQUIRED_DOCUMENTS = [
  { type: 'fiche_salaire', label: '💰 Fiches de salaire (3 dernières)', count: 3 },
  { type: 'extrait_poursuites', label: '📋 Extrait des poursuites (< 3 mois)', count: 1 },
  { type: 'piece_identite', label: '🪪 Pièce d\'identité / Permis', count: 1 },
  { type: 'attestation_domicile', label: '🏠 Attestation de domicile', count: 1 },
  { type: 'contrat_travail', label: '📝 Contrat de travail / Attestation employeur', count: 1 },
  { type: 'rc_menage', label: '🛡️ RC Ménage', count: 1 },
];

export function CandidateDocumentsSection({
  clientId,
  clientUserId,
  clientName,
  candidates,
  onDocumentsChange,
  refreshKey,
  agentUserId,
  agentId,
}: CandidateDocumentsSectionProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ClientCandidate | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('autre');
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestCandidate, setRequestCandidate] = useState<ClientCandidate | null>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      
      // Charger les documents du client et des candidats
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId)
        .order('date_upload', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [clientId, refreshKey]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (selectedFile.size > maxSize) {
      toast.error('Fichier trop volumineux (max 1GB)');
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${clientUserId}/${Date.now()}_${selectedCandidate?.id || 'client'}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('client-documents')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: clientUserId,
          client_id: clientId,
          candidate_id: selectedCandidate?.id || null,
          nom: selectedFile.name,
          type: selectedFile.type,
          type_document: documentType,
          taille: selectedFile.size,
          url: fileName,
        });

      if (dbError) throw dbError;

      toast.success('Document ajouté');
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setDocumentType('autre');
      setSelectedCandidate(null);
      
      // Reload documents and check completion
      const { data: updatedDocs } = await supabase
        .from('documents')
        .select('*')
        .eq('client_id', clientId);
      
      setDocuments(updatedDocs || []);
      
      // Check if dossier is now 100% complete and notify agent
      if (agentUserId && updatedDocs) {
        const clientDocs = updatedDocs.filter(d => !d.candidate_id);
        const docTypes = clientDocs.map(d => d.type_document).filter(Boolean);
        const requiredTypes = REQUIRED_DOCUMENTS.map(r => r.type);
        const missingCount = requiredTypes.filter(t => !docTypes.includes(t)).length;
        
        if (missingCount === 0) {
          // Dossier is 100% complete - notify agent
          try {
            await supabase.rpc('create_notification', {
              p_user_id: agentUserId,
              p_type: 'dossier_complete',
              p_title: '✅ Dossier complet',
              p_message: `Le dossier de ${clientName || 'votre client'} est maintenant complet à 100%`,
              p_link: `/agent/clients/${clientId}`,
              p_metadata: { client_id: clientId }
            });
            toast.success('🎉 Dossier maintenant complet !', {
              description: 'Votre agent a été notifié.'
            });
          } catch (notifError) {
            console.error('Error sending notification:', notifError);
          }
        }
      }
      
      onDocumentsChange?.();
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      if (!documentToDelete.url.startsWith('data:')) {
        // Extract relative path from full URL if needed
        const storagePath = getStoragePath(documentToDelete.url);
        await supabase.storage
          .from('client-documents')
          .remove([storagePath]);
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentToDelete.id);

      if (error) throw error;

      toast.success('Document supprimé');
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
      loadDocuments();
      onDocumentsChange?.();
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handlePreview = async (doc: Document) => {
    setSelectedDocument(doc);
    try {
      if (doc.url.startsWith('data:')) {
        setPreviewUrl(doc.url);
      } else {
        // Extract relative path from full URL if needed
        const storagePath = getStoragePath(doc.url);
        const { data, error } = await supabase.storage
          .from('client-documents')
          .createSignedUrl(storagePath, 3600);

        if (error) throw error;
        setPreviewUrl(data.signedUrl);
      }
      setPreviewOpen(true);
    } catch (error) {
      console.error('Error creating preview:', error);
      toast.error('Erreur lors de la prévisualisation');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      if (doc.url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = doc.url;
        link.download = doc.nom;
        link.click();
      } else {
        // Extract relative path from full URL if needed
        const storagePath = getStoragePath(doc.url);
        const { data, error } = await supabase.storage
          .from('client-documents')
          .createSignedUrl(storagePath, 60);

        if (error) throw error;
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const openUploadForCandidate = (candidate: ClientCandidate | null) => {
    setSelectedCandidate(candidate);
    setUploadDialogOpen(true);
  };

  const openRequestDialog = (candidate: ClientCandidate | null) => {
    setRequestCandidate(candidate);
    setRequestDialogOpen(true);
  };

  // Grouper les documents par personne
  const clientDocuments = documents.filter(d => !d.candidate_id);
  const candidateDocumentsMap = new Map<string, Document[]>();
  candidates.forEach(c => {
    candidateDocumentsMap.set(c.id, documents.filter(d => d.candidate_id === c.id));
  });

  const getDocumentIcon = (type: string) => {
    if (type?.includes('pdf')) return FileText;
    if (type?.includes('image')) return ImageIcon;
    return FileText;
  };

  const countDocumentsByType = (docs: Document[]) => {
    const counts: Record<string, number> = {};
    docs.forEach(d => {
      const type = d.type_document || 'autre';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  };

  const getCompletionStatus = (docs: Document[]) => {
    const counts = countDocumentsByType(docs);
    let complete = 0;
    REQUIRED_DOCUMENTS.forEach(req => {
      if ((counts[req.type] || 0) >= req.count) complete++;
    });
    return { complete, total: REQUIRED_DOCUMENTS.length };
  };

  if (loading) {
    return <div className="animate-pulse h-40 bg-muted rounded-lg" />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Documents du client principal */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-base min-w-0">
                  <User className="w-4 h-4 shrink-0" />
                  <span className="truncate">👤 {clientName || 'Client'}</span>
                </CardTitle>
                <Badge variant="outline" className="shrink-0">
                  {clientDocuments.length} doc{clientDocuments.length > 1 ? 's' : ''}
                </Badge>
                {(() => {
                  const status = getCompletionStatus(clientDocuments);
                  return status.complete === status.total ? (
                    <Badge className="bg-green-600 shrink-0">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Complet
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      {status.complete}/{status.total}
                    </Badge>
                  );
                })()}
              </div>
              <div className="flex flex-wrap gap-2">
                {agentId && agentUserId && (
                  <Button size="sm" variant="outline" className="shrink-0" onClick={() => openRequestDialog(null)}>
                    <Mail className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Demander</span>
                    <span className="sm:hidden">Dem.</span>
                  </Button>
                )}
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => openUploadForCandidate(null)}>
                  <Upload className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Ajouter</span>
                  <span className="sm:hidden">Ajt.</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {clientDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun document</p>
            ) : (
              <div className="space-y-2">
                {clientDocuments.map(doc => {
                  const Icon = getDocumentIcon(doc.type);
                  return (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm truncate">{doc.nom}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handlePreview(doc)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600"
                          onClick={() => { setDocumentToDelete(doc); setDeleteDialogOpen(true); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents par candidat */}
        {candidates.map(candidate => {
          const candidateDocs = candidateDocumentsMap.get(candidate.id) || [];
          const status = getCompletionStatus(candidateDocs);
          const TypeIcon = candidate.type === 'garant' ? Shield : Users;

          return (
            <Card key={candidate.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="flex items-center gap-2 text-base min-w-0">
                      <TypeIcon className={`w-4 h-4 shrink-0 ${candidate.type === 'garant' ? 'text-purple-600' : 'text-blue-600'}`} />
                      <span className="truncate">{CANDIDATE_TYPE_LABELS[candidate.type]}: {candidate.prenom}</span>
                    </CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      {candidateDocs.length} doc{candidateDocs.length > 1 ? 's' : ''}
                    </Badge>
                    {status.complete === status.total ? (
                      <Badge className="bg-green-600 shrink-0">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Complet
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="shrink-0">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {status.complete}/{status.total}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {agentId && agentUserId && (
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => openRequestDialog(candidate)}>
                        <Mail className="w-4 h-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Demander</span>
                        <span className="sm:hidden">Dem.</span>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="shrink-0" onClick={() => openUploadForCandidate(candidate)}>
                      <Upload className="w-4 h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Ajouter</span>
                      <span className="sm:hidden">Ajt.</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {candidateDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun document</p>
                ) : (
                  <div className="space-y-2">
                    {candidateDocs.map(doc => {
                      const Icon = getDocumentIcon(doc.type);
                      return (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-sm truncate">{doc.nom}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handlePreview(doc)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}>
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-600"
                              onClick={() => { setDocumentToDelete(doc); setDeleteDialogOpen(true); }}
                            >
                              <Trash2 className="w-4 h-4" />
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
        })}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ajouter un document pour {selectedCandidate ? `${selectedCandidate.prenom} ${selectedCandidate.nom}` : clientName || 'le client'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de document</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fiche_salaire">💰 Fiche de salaire</SelectItem>
                  <SelectItem value="extrait_poursuites">📋 Extrait des poursuites</SelectItem>
                  <SelectItem value="piece_identite">🪪 Pièce d'identité</SelectItem>
                  <SelectItem value="attestation_domicile">🏠 Attestation de domicile</SelectItem>
                  <SelectItem value="contrat_travail">📝 Contrat de travail</SelectItem>
                  <SelectItem value="attestation_employeur">👔 Attestation employeur</SelectItem>
                  <SelectItem value="rc_menage">🛡️ RC Ménage</SelectItem>
                  <SelectItem value="autre">📄 Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fichier</Label>
              <Input
                type="file"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (max 1GB)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
              {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.nom}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {selectedDocument?.type.includes('pdf') ? (
              <iframe src={previewUrl} className="w-full h-[70vh]" />
            ) : (
              <img src={previewUrl} alt={selectedDocument?.nom} className="max-w-full" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le document "{documentToDelete?.nom}" sera définitivement supprimé.
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

      {/* Request Documents Dialog */}
      {agentId && agentUserId && (
        <RequestDocumentsDialog
          open={requestDialogOpen}
          onOpenChange={setRequestDialogOpen}
          clientId={clientId}
          clientUserId={clientUserId}
          clientName={clientName || 'Client'}
          candidate={requestCandidate}
          existingDocuments={documents}
          agentId={agentId}
          agentUserId={agentUserId}
        />
      )}
    </>
  );
}
