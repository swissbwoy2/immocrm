import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useEmailTemplates, EmailTemplate, DEFAULT_TEMPLATES } from "@/hooks/useEmailTemplates";
import { Plus, Edit2, Trash2, FileText, Loader2, Copy, Download, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EmailTemplatesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: string;
  onSelectTemplate?: (template: EmailTemplate) => void;
}

const AVAILABLE_VARIABLES = [
  { name: '{client_name}', description: 'Nom complet du client' },
  { name: '{client_gender}', description: 'Genre (mon client / ma cliente)' },
  { name: '{address}', description: 'Adresse du bien' },
  { name: '{pieces}', description: 'Nombre de pièces' },
  { name: '{price}', description: 'Prix du loyer' },
];

export function EmailTemplatesManager({ 
  open, 
  onOpenChange,
  category = 'dossier',
  onSelectTemplate 
}: EmailTemplatesManagerProps) {
  const { 
    templates, 
    loading, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate,
    initializeDefaultTemplates,
    getTemplatesWithDefaults 
  } = useEmailTemplates(category);

  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    subject_template: '',
    body_template: '',
  });

  // Initialize default templates on first load if none exist
  useEffect(() => {
    if (open && templates.length === 0 && !loading) {
      initializeDefaultTemplates();
    }
  }, [open, templates.length, loading]);

  const resetForm = () => {
    setFormData({
      name: '',
      subject_template: '',
      body_template: '',
    });
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormData({
      name: '',
      subject_template: 'Candidature - {address} - {client_name}',
      body_template: '',
    });
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setIsCreating(false);
    setFormData({
      name: template.name,
      subject_template: template.subject_template || '',
      body_template: template.body_template,
    });
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    await createTemplate({
      name: `${template.name} (copie)`,
      subject_template: template.subject_template || undefined,
      body_template: template.body_template,
      category: template.category,
      variables: template.variables,
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.body_template.trim()) return;

    setSaving(true);
    try {
      if (editingTemplate && !editingTemplate.id.startsWith('default-')) {
        await updateTemplate(editingTemplate.id, {
          name: formData.name,
          subject_template: formData.subject_template || null,
          body_template: formData.body_template,
        });
      } else {
        await createTemplate({
          name: formData.name,
          subject_template: formData.subject_template || undefined,
          body_template: formData.body_template,
          category,
          variables: AVAILABLE_VARIABLES.map(v => v.name.replace(/[{}]/g, '')),
        });
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id.startsWith('default-')) return;
    await deleteTemplate(id);
  };

  const insertVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      body_template: prev.body_template + variable,
    }));
  };

  const displayedTemplates = getTemplatesWithDefaults();
  const isEditing = editingTemplate !== null || isCreating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestion des modèles d'email
          </DialogTitle>
          <DialogDescription>
            Créez et gérez vos modèles d'email pour l'envoi de dossiers
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 h-[60vh]">
          {/* Templates List */}
          <div className="w-1/3 border-r pr-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm text-muted-foreground">
                Mes modèles ({displayedTemplates.length})
              </h3>
              <Button size="sm" variant="outline" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-1" />
                Nouveau
              </Button>
            </div>
            
            <ScrollArea className="h-[calc(100%-40px)]">
              <div className="space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : displayedTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Aucun modèle créé
                  </div>
                ) : (
                  displayedTemplates.map(template => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                        editingTemplate?.id === template.id ? 'border-primary bg-accent/30' : ''
                      }`}
                      onClick={() => handleEdit(template)}
                    >
                      <CardHeader className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-medium truncate">
                              {template.name}
                            </CardTitle>
                            <CardDescription className="text-xs line-clamp-2 mt-1">
                              {template.body_template.substring(0, 80)}...
                            </CardDescription>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicate(template);
                                    }}
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Dupliquer</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {!template.id.startsWith('default-') && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer ce modèle ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible. Le modèle "{template.name}" sera définitivement supprimé.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => handleDelete(template.id)}
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Editor Panel */}
          <div className="flex-1 pl-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    {isCreating ? 'Nouveau modèle' : `Modifier "${editingTemplate?.name}"`}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    Annuler
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="template-name">Nom du modèle *</Label>
                    <Input
                      id="template-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Suite à une visite"
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-subject">Objet de l'email</Label>
                    <Input
                      id="template-subject"
                      value={formData.subject_template}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject_template: e.target.value }))}
                      placeholder="Ex: Candidature - {address} - {client_name}"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="template-body">Corps de l'email *</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Info className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Utilisez les variables ci-dessous pour personnaliser automatiquement vos emails</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    {/* Variables buttons */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {AVAILABLE_VARIABLES.map(v => (
                        <TooltipProvider key={v.name}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="cursor-pointer hover:bg-accent"
                                onClick={() => insertVariable(v.name)}
                              >
                                {v.name}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{v.description}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>

                    <Textarea
                      id="template-body"
                      value={formData.body_template}
                      onChange={(e) => setFormData(prev => ({ ...prev, body_template: e.target.value }))}
                      placeholder="Rédigez votre modèle d'email..."
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={resetForm}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={saving || !formData.name.trim() || !formData.body_template.trim()}
                  >
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingTemplate && !editingTemplate.id.startsWith('default-') ? 'Enregistrer' : 'Créer'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">
                  Sélectionnez un modèle pour le modifier<br />
                  ou créez-en un nouveau
                </p>
                <Button variant="outline" className="mt-4" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un modèle
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
