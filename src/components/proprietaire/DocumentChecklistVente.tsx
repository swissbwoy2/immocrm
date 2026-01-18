import { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, AlertCircle, FileText, Upload, 
  ChevronDown, ChevronUp, Info, Building2, Home, Building
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface DocumentRequirement {
  id: string;
  label: string;
  description: string;
  required: boolean;
  documentTypes: string[]; // Types de documents qui satisfont ce requirement
}

export interface DocumentCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requirements: DocumentRequirement[];
}

// Documents requis par type de bien
export const VILLA_DOCUMENTS: DocumentCategory[] = [
  {
    id: 'legal',
    label: 'Documents légaux',
    icon: FileText,
    requirements: [
      {
        id: 'registre_foncier',
        label: 'Extrait du registre foncier',
        description: 'Extrait récent du registre foncier attestant de la propriété',
        required: true,
        documentTypes: ['registre_foncier'],
      },
    ],
  },
  {
    id: 'assurance',
    label: 'Assurances',
    icon: FileText,
    requirements: [
      {
        id: 'police_eca',
        label: 'Police ECA détaillée',
        description: 'Police d\'assurance ECA avec les volumes assurés',
        required: true,
        documentTypes: ['assurance', 'police_eca'],
      },
    ],
  },
  {
    id: 'technique',
    label: 'Documents techniques',
    icon: FileText,
    requirements: [
      {
        id: 'plans_m2',
        label: 'Plans avec surfaces (m²)',
        description: 'Plans de tous les étages avec les surfaces en m²',
        required: true,
        documentTypes: ['plan', 'plans_m2'],
      },
      {
        id: 'cecb',
        label: 'CECB (si réalisé)',
        description: 'Certificat énergétique cantonal des bâtiments',
        required: false,
        documentTypes: ['cecb', 'rapport_technique'],
      },
    ],
  },
  {
    id: 'travaux',
    label: 'Travaux et rénovations',
    icon: FileText,
    requirements: [
      {
        id: 'tableau_travaux',
        label: 'Tableau des travaux',
        description: 'Historique des travaux à plus-value ou d\'entretien avec coûts par corps de métier',
        required: false,
        documentTypes: ['facture', 'tableau_travaux', 'rapport_technique'],
      },
    ],
  },
  {
    id: 'particularites',
    label: 'Particularités',
    icon: Info,
    requirements: [
      {
        id: 'particularites',
        label: 'Particularités à signaler',
        description: 'Servitudes, droits de passage, restrictions, ou autres informations importantes',
        required: false,
        documentTypes: ['autre', 'correspondance'],
      },
    ],
  },
];

export const APPARTEMENT_DOCUMENTS: DocumentCategory[] = [
  {
    id: 'legal',
    label: 'Documents légaux',
    icon: FileText,
    requirements: [
      {
        id: 'registre_foncier',
        label: 'Extrait du registre foncier',
        description: 'Extrait récent du registre foncier avec les quotes-parts PPE',
        required: true,
        documentTypes: ['registre_foncier'],
      },
      {
        id: 'rau',
        label: 'Règlement d\'administration (RAU)',
        description: 'Règlement d\'administration et d\'utilisation de la copropriété',
        required: true,
        documentTypes: ['rau', 'reglement', 'autre'],
      },
    ],
  },
  {
    id: 'assemblee',
    label: 'Assemblées générales',
    icon: Building2,
    requirements: [
      {
        id: 'pv_ag_1',
        label: 'PV dernière assemblée générale',
        description: 'Procès-verbal de la dernière assemblée générale',
        required: true,
        documentTypes: ['pv_assemblee'],
      },
      {
        id: 'pv_ag_2',
        label: 'PV avant-dernière assemblée',
        description: 'Procès-verbal de l\'avant-dernière assemblée générale',
        required: true,
        documentTypes: ['pv_assemblee'],
      },
      {
        id: 'pv_ag_3',
        label: 'PV 3ème dernière assemblée',
        description: 'Procès-verbal de la 3ème dernière assemblée générale',
        required: true,
        documentTypes: ['pv_assemblee'],
      },
    ],
  },
  {
    id: 'charges',
    label: 'Décomptes de charges',
    icon: FileText,
    requirements: [
      {
        id: 'charges_1',
        label: 'Décompte charges année N-1',
        description: 'Décompte des charges de l\'année précédente',
        required: true,
        documentTypes: ['decompte_charges'],
      },
      {
        id: 'charges_2',
        label: 'Décompte charges année N-2',
        description: 'Décompte des charges de l\'année N-2',
        required: true,
        documentTypes: ['decompte_charges'],
      },
      {
        id: 'charges_3',
        label: 'Décompte charges année N-3',
        description: 'Décompte des charges de l\'année N-3',
        required: true,
        documentTypes: ['decompte_charges'],
      },
      {
        id: 'charges_chauffage',
        label: 'Comptabilité chauffage (si séparée)',
        description: 'Décompte séparé du chauffage si comptabilité distincte',
        required: false,
        documentTypes: ['decompte_charges'],
      },
      {
        id: 'charges_parking',
        label: 'Comptabilité parking (si séparée)',
        description: 'Décompte séparé du parking si comptabilité distincte',
        required: false,
        documentTypes: ['decompte_charges'],
      },
    ],
  },
  {
    id: 'assurance',
    label: 'Assurances',
    icon: FileText,
    requirements: [
      {
        id: 'police_eca',
        label: 'Police ECA détaillée',
        description: 'Police d\'assurance ECA de l\'immeuble',
        required: true,
        documentTypes: ['assurance', 'police_eca'],
      },
    ],
  },
  {
    id: 'technique',
    label: 'Documents techniques',
    icon: FileText,
    requirements: [
      {
        id: 'plans_m2',
        label: 'Plans avec surfaces (m²)',
        description: 'Plans de l\'appartement avec les surfaces en m² (souvent absents au RF)',
        required: true,
        documentTypes: ['plan', 'plans_m2'],
      },
      {
        id: 'cecb',
        label: 'CECB (si réalisé)',
        description: 'Certificat énergétique cantonal des bâtiments',
        required: false,
        documentTypes: ['cecb', 'rapport_technique'],
      },
    ],
  },
  {
    id: 'travaux',
    label: 'Travaux et rénovations',
    icon: FileText,
    requirements: [
      {
        id: 'tableau_travaux',
        label: 'Tableau des travaux',
        description: 'Historique des travaux à plus-value ou d\'entretien avec coûts par corps de métier',
        required: false,
        documentTypes: ['facture', 'tableau_travaux', 'rapport_technique'],
      },
    ],
  },
  {
    id: 'particularites',
    label: 'Particularités',
    icon: Info,
    requirements: [
      {
        id: 'particularites',
        label: 'Particularités à signaler',
        description: 'Servitudes, travaux votés non réalisés, litiges en cours, etc.',
        required: false,
        documentTypes: ['autre', 'correspondance'],
      },
    ],
  },
];

export const IMMEUBLE_DOCUMENTS: DocumentCategory[] = [
  {
    id: 'legal',
    label: 'Documents légaux',
    icon: FileText,
    requirements: [
      {
        id: 'registre_foncier',
        label: 'Extrait du registre foncier',
        description: 'Extrait récent du registre foncier',
        required: true,
        documentTypes: ['registre_foncier'],
      },
    ],
  },
  {
    id: 'location',
    label: 'État locatif',
    icon: Building,
    requirements: [
      {
        id: 'etat_locatif',
        label: 'État locatif actuel',
        description: 'Tableau récapitulatif des loyers et locataires',
        required: true,
        documentTypes: ['etat_locatif', 'autre'],
      },
      {
        id: 'reserve_locative',
        label: 'Réserve locative (si existante)',
        description: 'Potentiel de hausse des loyers',
        required: false,
        documentTypes: ['etat_locatif', 'autre'],
      },
    ],
  },
  {
    id: 'assemblee',
    label: 'Assemblées générales',
    icon: Building2,
    requirements: [
      {
        id: 'pv_ag_1',
        label: 'PV dernière assemblée générale',
        description: 'Procès-verbal de la dernière assemblée générale',
        required: true,
        documentTypes: ['pv_assemblee'],
      },
      {
        id: 'pv_ag_2',
        label: 'PV avant-dernière assemblée',
        description: 'Procès-verbal de l\'avant-dernière assemblée générale',
        required: true,
        documentTypes: ['pv_assemblee'],
      },
      {
        id: 'pv_ag_3',
        label: 'PV 3ème dernière assemblée',
        description: 'Procès-verbal de la 3ème dernière assemblée générale',
        required: true,
        documentTypes: ['pv_assemblee'],
      },
    ],
  },
  {
    id: 'assurance',
    label: 'Assurances',
    icon: FileText,
    requirements: [
      {
        id: 'police_eca',
        label: 'Police ECA détaillée',
        description: 'Police d\'assurance ECA avec les volumes assurés',
        required: true,
        documentTypes: ['assurance', 'police_eca'],
      },
    ],
  },
  {
    id: 'technique',
    label: 'Documents techniques',
    icon: FileText,
    requirements: [
      {
        id: 'plans_m2',
        label: 'Plans avec surfaces (m²)',
        description: 'Plans de tous les étages avec les surfaces en m²',
        required: true,
        documentTypes: ['plan', 'plans_m2'],
      },
      {
        id: 'cecb',
        label: 'CECB (si réalisé)',
        description: 'Certificat énergétique cantonal des bâtiments',
        required: false,
        documentTypes: ['cecb', 'rapport_technique'],
      },
    ],
  },
  {
    id: 'travaux',
    label: 'Travaux et rénovations',
    icon: FileText,
    requirements: [
      {
        id: 'tableau_travaux',
        label: 'Tableau des travaux',
        description: 'Historique des travaux à plus-value ou d\'entretien avec coûts par corps de métier',
        required: false,
        documentTypes: ['facture', 'tableau_travaux', 'rapport_technique'],
      },
    ],
  },
  {
    id: 'particularites',
    label: 'Particularités',
    icon: Info,
    requirements: [
      {
        id: 'particularites',
        label: 'Particularités à signaler',
        description: 'Servitudes, travaux planifiés, litiges, informations importantes pour les acheteurs',
        required: false,
        documentTypes: ['autre', 'correspondance'],
      },
    ],
  },
];

// Helper function to get document categories based on property type
export const getDocumentCategoriesForType = (typeBien: string | null): DocumentCategory[] => {
  if (!typeBien) return VILLA_DOCUMENTS;
  
  const type = typeBien.toLowerCase();
  
  if (type.includes('appartement') || type.includes('ppe') || type.includes('studio')) {
    return APPARTEMENT_DOCUMENTS;
  }
  
  if (type.includes('immeuble') || type.includes('locatif') || type.includes('commercial')) {
    return IMMEUBLE_DOCUMENTS;
  }
  
  // Villa, maison, chalet, etc.
  return VILLA_DOCUMENTS;
};

interface UploadedDocument {
  id: string;
  type_document: string;
  nom: string;
  annee?: number;
}

interface DocumentChecklistVenteProps {
  typeBien: string | null;
  uploadedDocuments: UploadedDocument[];
  onUploadClick: (documentType: string, label: string) => void;
  className?: string;
}

export function DocumentChecklistVente({
  typeBien,
  uploadedDocuments,
  onUploadClick,
  className,
}: DocumentChecklistVenteProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['legal', 'technique']));
  
  const categories = getDocumentCategoriesForType(typeBien);
  
  // Check if a requirement is satisfied by uploaded documents
  const isRequirementSatisfied = (requirement: DocumentRequirement): boolean => {
    return uploadedDocuments.some(doc => 
      requirement.documentTypes.includes(doc.type_document)
    );
  };
  
  // Count satisfied requirements
  const countSatisfiedInCategory = (category: DocumentCategory): { satisfied: number; required: number; total: number } => {
    const required = category.requirements.filter(r => r.required);
    const satisfied = category.requirements.filter(r => isRequirementSatisfied(r));
    const requiredSatisfied = required.filter(r => isRequirementSatisfied(r));
    
    return {
      satisfied: satisfied.length,
      required: requiredSatisfied.length,
      total: category.requirements.length,
    };
  };
  
  // Calculate overall progress
  const calculateOverallProgress = () => {
    let totalRequired = 0;
    let satisfiedRequired = 0;
    
    categories.forEach(cat => {
      cat.requirements.forEach(req => {
        if (req.required) {
          totalRequired++;
          if (isRequirementSatisfied(req)) {
            satisfiedRequired++;
          }
        }
      });
    });
    
    return totalRequired > 0 ? Math.round((satisfiedRequired / totalRequired) * 100) : 100;
  };
  
  const overallProgress = calculateOverallProgress();
  const allRequiredSatisfied = overallProgress === 100;
  
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };
  
  const getPropertyTypeLabel = () => {
    if (!typeBien) return 'Villa / Maison';
    const type = typeBien.toLowerCase();
    if (type.includes('appartement') || type.includes('ppe')) return 'Appartement / PPE';
    if (type.includes('immeuble') || type.includes('locatif')) return 'Immeuble de rapport';
    return 'Villa / Maison';
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents requis pour la vente
            </CardTitle>
            <CardDescription className="mt-1">
              {getPropertyTypeLabel()} - Documents à fournir pour constituer le dossier de vente
            </CardDescription>
          </div>
          <Badge 
            variant={allRequiredSatisfied ? 'default' : 'secondary'}
            className={cn(
              allRequiredSatisfied && "bg-green-500 hover:bg-green-600"
            )}
          >
            {allRequiredSatisfied ? 'Dossier complet' : `${overallProgress}% complet`}
          </Badge>
        </div>
        <Progress 
          value={overallProgress} 
          className="mt-4 h-2"
        />
      </CardHeader>
      
      <CardContent className="p-0 divide-y divide-border">
        {categories.map((category) => {
          const { satisfied, total } = countSatisfiedInCategory(category);
          const isExpanded = expandedCategories.has(category.id);
          const CategoryIcon = category.icon;
          const allCategorySatisfied = satisfied === total;
          
          return (
            <Collapsible
              key={category.id}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category.id)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      allCategorySatisfied ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"
                    )}>
                      {allCategorySatisfied ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <CategoryIcon className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{category.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {satisfied}/{total} document{total > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!allCategorySatisfied && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        En attente
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-2">
                  {category.requirements.map((req) => {
                    const isSatisfied = isRequirementSatisfied(req);
                    
                    return (
                      <div
                        key={req.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-colors",
                          isSatisfied 
                            ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900" 
                            : "bg-muted/30 border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {isSatisfied ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                          ) : req.required ? (
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                "font-medium text-sm",
                                isSatisfied && "text-green-700 dark:text-green-400"
                              )}>
                                {req.label}
                              </p>
                              {req.required && !isSatisfied && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 text-amber-600 border-amber-300">
                                  Obligatoire
                                </Badge>
                              )}
                              {!req.required && (
                                <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
                                  Optionnel
                                </Badge>
                              )}
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs text-muted-foreground truncate max-w-[300px] cursor-help">
                                    {req.description}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-[300px]">
                                  <p>{req.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                        
                        {!isSatisfied && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onUploadClick(req.documentTypes[0], req.label)}
                            className="shrink-0"
                          >
                            <Upload className="w-3 h-3 mr-1.5" />
                            Ajouter
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
