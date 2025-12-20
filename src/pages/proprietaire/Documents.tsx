import { useEffect, useState, useCallback } from 'react';
import { FileText, Upload, Search, Filter, Building2, FolderOpen, Download, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PremiumPageHeader, PremiumEmptyState } from '@/components/premium';
import { UploadDocumentDialog } from '@/components/proprietaire/UploadDocumentDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const DOCUMENT_TYPES = [
  { value: 'bail', label: 'Bail' },
  { value: 'contrat', label: 'Contrat' },
  { value: 'registre_foncier', label: 'Registre foncier' },
  { value: 'plan', label: 'Plan' },
  { value: 'hypotheque', label: 'Hypothèque' },
  { value: 'assurance', label: 'Assurance' },
  { value: 'decompte_charges', label: 'Décompte charges' },
  { value: 'facture', label: 'Facture' },
  { value: 'rapport_technique', label: 'Rapport technique' },
  { value: 'pv_assemblee', label: 'PV assemblée' },
  { value: 'correspondance', label: 'Correspondance' },
  { value: 'photo', label: 'Photo' },
  { value: 'autre', label: 'Autre' }
];

export default function Documents() {
  const { user } = useAuth();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<any[]>([]);
  const [immeubles, setImmeubles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [immeubleFilter, setImmeubleFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Get proprietaire
      const { data: proprio } = await supabase
        .from('proprietaires')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!proprio) {
        setLoading(false);
        return;
      }

      // Load immeubles
      const { data: immeublesData } = await supabase
        .from('immeubles')
        .select('id, nom')
        .eq('proprietaire_id', proprio.id);

      setImmeubles(immeublesData || []);

      // Load documents
      const immeublesIds = (immeublesData || []).map(i => i.id);
      if (immeublesIds.length === 0) {
        setDocuments([]);
        setLoading(false);
        return;
      }

      const { data: docsData, error } = await supabase
        .from('documents_immeuble')
        .select('*')
        .in('immeuble_id', immeublesIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with immeuble names
      const enrichedDocs = (docsData || []).map(d => ({
        ...d,
        immeuble_nom: immeublesData?.find(i => i.id === d.immeuble_id)?.nom
      }));

      setDocuments(enrichedDocs);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = 
      doc.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || doc.type_document === typeFilter;
    const matchesImmeuble = immeubleFilter === 'all' || doc.immeuble_id === immeubleFilter;
    
    return matchesSearch && matchesType && matchesImmeuble;
  });

  // Group by type
  const groupedByType = filteredDocuments.reduce((acc, doc) => {
    const type = doc.type_document || 'autre';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, any[]>);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeLabel = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <PremiumPageHeader
        title="Documents"
        subtitle={`${documents.length} document${documents.length > 1 ? 's' : ''} dans votre GED`}
        icon={FileText}
        action={
          <Button onClick={() => setShowUploadDialog(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Ajouter un document
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {DOCUMENT_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={immeubleFilter} onValueChange={setImmeubleFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Immeuble" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les immeubles</SelectItem>
                {immeubles.map(imm => (
                  <SelectItem key={imm.id} value={imm.id}>{imm.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {filteredDocuments.length === 0 ? (
        <PremiumEmptyState
          icon={FolderOpen}
          title={searchTerm || typeFilter !== 'all' || immeubleFilter !== 'all' ? "Aucun résultat" : "Aucun document"}
          description={
            searchTerm || typeFilter !== 'all' || immeubleFilter !== 'all'
              ? "Aucun document ne correspond à vos critères."
              : "Commencez par ajouter vos premiers documents."
          }
          action={!searchTerm && typeFilter === 'all' && immeubleFilter === 'all' ? (
            <Button onClick={() => setShowUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Ajouter un document
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByType).map(([type, docs]) => (
            <Card key={type}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  {getTypeLabel(type)}
                  <Badge variant="secondary">{(docs as any[]).length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(docs as any[]).map((doc) => (
                    <Card 
                      key={doc.id} 
                      className="group cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => window.open(doc.url, '_blank')}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                              {doc.nom}
                            </h4>
                            {doc.immeuble_nom && (
                              <p className="text-xs text-muted-foreground truncate">{doc.immeuble_nom}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              {doc.taille && <span>{formatFileSize(doc.taille)}</span>}
                              {doc.date_document && (
                                <span>{new Date(doc.date_document).toLocaleDateString('fr-CH')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="outline" className="flex-1" onClick={(e) => {
                            e.stopPropagation();
                            window.open(doc.url, '_blank');
                          }}>
                            <Eye className="w-3 h-3 mr-1" />
                            Voir
                          </Button>
                          <Button size="sm" variant="outline" onClick={(e) => {
                            e.stopPropagation();
                            const link = document.createElement('a');
                            link.href = doc.url;
                            link.download = doc.nom;
                            link.click();
                          }}>
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UploadDocumentDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={loadData}
      />
    </div>
  );
}
