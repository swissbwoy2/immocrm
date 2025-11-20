import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Sidebar } from '@/components/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ArrowLeft, Pencil, Trash2, Mail, Phone, MapPin, Calendar, Users, 
  DollarSign, Home, Building2, Briefcase, Heart, Car, Send, X, Check,
  TrendingUp, Flag, FileText, Download, Upload as UploadIcon, Eye
} from 'lucide-react';
import { getCurrentUser, getClients, saveClients, getOffres } from '@/utils/localStorage';
import { Client, Offre } from '@/data/mockData';
import { calculateMandateDuration } from '@/utils/calculations';
import { useToast } from '@/hooks/use-toast';

const clientSchema = z.object({
  prenom: z.string().trim().min(1, 'Le prénom est requis').max(100),
  nom: z.string().trim().min(1, 'Le nom est requis').max(100),
  email: z.string().trim().email('Email invalide').max(255),
  telephone: z.string().trim().min(1, 'Le téléphone est requis'),
  adresse: z.string().trim().min(1, 'L\'adresse est requise'),
  dateNaissance: z.string().min(1, 'La date de naissance est requise'),
  nationalite: z.string().trim().min(1, 'La nationalité est requise'),
  typePermis: z.string().min(1, 'Le type de permis est requis'),
  etatCivil: z.string().min(1, 'L\'état civil est requis'),
  profession: z.string().trim().min(1, 'La profession est requise'),
  employeur: z.string().trim().min(1, 'L\'employeur est requis'),
  revenuMensuel: z.number().min(0, 'Le revenu doit être positif'),
  dateEngagement: z.string().optional(),
  geranceActuelle: z.string().optional(),
  contactGerance: z.string().optional(),
  loyerActuel: z.number().min(0),
  depuisLe: z.string().optional(),
  nombrePiecesActuel: z.number().min(1),
  motifChangement: z.string().optional(),
  typeRecherche: z.string().min(1),
  typeBien: z.string().min(1),
  nombrePiecesSouhaite: z.string().min(1),
  budgetMax: z.number().min(0),
  regions: z.array(z.string()).min(1, 'Au moins une région est requise'),
  animaux: z.boolean(),
  vehicules: z.boolean(),
  numeroPlaques: z.string().optional(),
  souhaitsParticuliers: z.string().optional(),
});

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<any>(null);
  const [documents, setDocuments] = useState<Array<{
    id: string;
    name: string;
    type: string;
    size: number;
    uploadDate: string;
    data: string;
  }>>(() => {
    const stored = localStorage.getItem(`client-documents-${id}`);
    return stored ? JSON.parse(stored) : [];
  });
  const currentUser = getCurrentUser();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      adresse: '',
      dateNaissance: '',
      nationalite: '',
      typePermis: '',
      etatCivil: '',
      profession: '',
      employeur: '',
      revenuMensuel: 0,
      dateEngagement: '',
      geranceActuelle: '',
      contactGerance: '',
      loyerActuel: 0,
      depuisLe: '',
      nombrePiecesActuel: 1,
      motifChangement: '',
      typeRecherche: '',
      typeBien: '',
      nombrePiecesSouhaite: '',
      budgetMax: 0,
      regions: [],
      animaux: false,
      vehicules: false,
      numeroPlaques: '',
      souhaitsParticuliers: '',
    },
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'agent') {
      navigate('/login');
      return;
    }

    const clients = getClients();
    const foundClient = clients.find(c => c.id === id);
    
    if (!foundClient) {
      toast({
        title: 'Client introuvable',
        description: 'Ce client n\'existe pas',
        variant: 'destructive',
      });
      navigate('/agent/mes-clients');
      return;
    }

    setClient(foundClient);

    const allOffres = getOffres();
    const clientOffres = allOffres.filter(o => o.clientId === id);
    setOffres(clientOffres);
  }, [id, currentUser, navigate, toast]);

  // Initialiser le formulaire séparément pour éviter la boucle infinie
  useEffect(() => {
    if (!client) return;
    
    form.reset({
      prenom: client.prenom,
      nom: client.nom,
      email: client.email,
      telephone: client.telephone,
      adresse: client.adresse,
      dateNaissance: client.dateNaissance,
      nationalite: client.nationalite,
      typePermis: client.typePermis,
      etatCivil: client.etatCivil,
      profession: client.profession,
      employeur: client.employeur,
      revenuMensuel: client.revenuMensuel,
      dateEngagement: client.dateEngagement || '',
      geranceActuelle: client.geranceActuelle || '',
      contactGerance: client.contactGerance || '',
      loyerActuel: client.loyerActuel,
      depuisLe: client.depuisLe || '',
      nombrePiecesActuel: client.nombrePiecesActuel,
      motifChangement: client.motifChangement || '',
      typeRecherche: client.typeRecherche,
      typeBien: client.typeBien,
      nombrePiecesSouhaite: client.nombrePiecesSouhaite,
      budgetMax: client.budgetMax,
      regions: client.regions,
      animaux: client.animaux,
      vehicules: client.vehicules,
      numeroPlaques: client.numeroPlaques || '',
      souhaitsParticuliers: client.souhaitsParticuliers || '',
    });
  }, [client?.id]);

  const handleSave = (values: z.infer<typeof clientSchema>) => {
    if (!client) return;

    const clients = getClients();
    const updatedClients = clients.map(c => 
      c.id === client.id 
        ? {
            ...c,
            ...values,
          }
        : c
    );

    saveClients(updatedClients);
    
    const updatedClient = updatedClients.find(c => c.id === client.id);
    if (updatedClient) {
      setClient(updatedClient);
    }

    toast({
      title: 'Client mis à jour',
      description: 'Les modifications ont été enregistrées avec succès',
    });

    setIsEditing(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    
    const newDocuments = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          const document = {
            id: `doc-${Date.now()}-${i}`,
            name: file.name,
            type: file.type,
            size: file.size,
            uploadDate: new Date().toISOString(),
            data: reader.result as string,
          };
          newDocuments.push(document);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    const updatedDocuments = [...documents, ...newDocuments];
    setDocuments(updatedDocuments);
    localStorage.setItem(`client-documents-${id}`, JSON.stringify(updatedDocuments));
    
    setUploading(false);
    setUploadDialogOpen(false);
    
    toast({
      title: 'Documents ajoutés',
      description: `${newDocuments.length} document(s) ajouté(s) avec succès`,
    });
  };

  const handleDeleteDocument = (docId: string) => {
    const updatedDocuments = documents.filter(d => d.id !== docId);
    setDocuments(updatedDocuments);
    localStorage.setItem(`client-documents-${id}`, JSON.stringify(updatedDocuments));
    
    toast({
      title: 'Document supprimé',
      description: 'Le document a été supprimé avec succès',
    });
  };

  const handleDownloadDocument = (document: any) => {
    const link = window.document.createElement('a');
    link.href = document.data;
    link.download = document.name;
    link.click();
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDelete = () => {
    if (!client) return;

    const clients = getClients();
    const updatedClients = clients.filter(c => c.id !== client.id);
    saveClients(updatedClients);

    toast({
      title: 'Client supprimé',
      description: 'Le client a été supprimé avec succès',
    });

    navigate('/agent/mes-clients');
  };

  // Calculs mémorisés - DOIVENT être avant tout return conditionnel
  const mandateData = useMemo(
    () => client ? calculateMandateDuration(client.dateInscription) : { daysElapsed: 0, daysRemaining: 0, progressPercentage: 0 },
    [client?.dateInscription]
  );
  const budgetRecommande = useMemo(
    () => client ? Math.round(client.revenuMensuel / 3) : 0,
    [client?.revenuMensuel]
  );
  const progressColor = useMemo(
    () => mandateData.daysElapsed < 60 ? 'bg-green-500' : mandateData.daysElapsed < 90 ? 'bg-orange-500' : 'bg-red-500',
    [mandateData.daysElapsed]
  );

  if (!client) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Chargement...</p>
        </main>
      </div>
    );
  }

  const { daysElapsed, daysRemaining, progressPercentage } = mandateData;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Form {...form}>
          <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">
                    {client.prenom} {client.nom}
                  </h1>
                  <Badge variant="outline">
                    <Flag className="w-3 h-3 mr-1" />
                    {client.nationalite}
                  </Badge>
                  <Badge variant="secondary">Permis {client.typePermis}</Badge>
                </div>
                
                {/* Barre de progression */}
                <div className="mt-4 max-w-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">
                      Progression du mandat
                    </p>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      daysElapsed < 60 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : daysElapsed < 90 
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {Math.floor(daysRemaining)}j {Math.floor((daysRemaining - Math.floor(daysRemaining)) * 24)}h {Math.floor(((daysRemaining - Math.floor(daysRemaining)) * 24 - Math.floor((daysRemaining - Math.floor(daysRemaining)) * 24)) * 60)}m
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-right mb-2">
                    {Math.floor(daysElapsed)} / 90 jours
                  </p>
                  <Progress value={progressPercentage} className="h-3" indicatorClassName={progressColor} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/agent/mes-clients')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                {!isEditing ? (
                  <>
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                    <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Supprimer
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => {
                      setIsEditing(false);
                      form.reset();
                    }}>
                      <X className="w-4 h-4 mr-2" />
                      Annuler
                    </Button>
                    <Button onClick={form.handleSubmit(handleSave)}>
                      <Check className="w-4 h-4 mr-2" />
                      Enregistrer
                    </Button>
                  </>
                )}
              </div>
            </div>

          {/* Situation financière */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Situation financière
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Revenu mensuel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="revenuMensuel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Revenu mensuel (CHF)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? '' : e.target.valueAsNumber;
                                field.onChange(value);
                              }}
                              onBlur={(e) => {
                                const value = e.target.valueAsNumber;
                                if (isNaN(value)) {
                                  field.onChange(0);
                                }
                                field.onBlur();
                              }}
                              name={field.name}
                              ref={field.ref}
                              placeholder="Revenu mensuel"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <>
                      <p className="text-2xl font-bold">
                        {client.revenuMensuel.toLocaleString('fr-CH')} CHF
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Net</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Budget maximum
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <FormField
                      control={form.control}
                      name="budgetMax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget maximum (CHF)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? '' : e.target.valueAsNumber;
                                field.onChange(value);
                              }}
                              onBlur={(e) => {
                                const value = e.target.valueAsNumber;
                                if (isNaN(value)) {
                                  field.onChange(0);
                                }
                                field.onBlur();
                              }}
                              name={field.name}
                              ref={field.ref}
                              placeholder="Budget maximum"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <>
                      <p className="text-2xl font-bold">
                        {client.budgetMax.toLocaleString('fr-CH')} CHF
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Par mois</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50 dark:bg-green-950">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Budget recommandé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {budgetRecommande.toLocaleString('fr-CH')} CHF
                  </p>
                  <Badge variant="secondary" className="mt-1">Règle du tiers</Badge>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Informations personnelles */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Informations personnelles
            </h2>
            <Card>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                {isEditing ? (
                  <>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="telephone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Téléphone</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="adresse"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateNaissance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date de naissance</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="etatCivil"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>État civil</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Célibataire">Célibataire</SelectItem>
                              <SelectItem value="Marié">Marié</SelectItem>
                              <SelectItem value="Divorcé">Divorcé</SelectItem>
                              <SelectItem value="Veuf">Veuf</SelectItem>
                              <SelectItem value="Partenariat enregistré">Partenariat enregistré</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="nationalite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nationalité</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="typePermis"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type de permis</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{client.email}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Téléphone</p>
                        <p className="font-medium">{client.telephone}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Adresse</p>
                        <p className="font-medium">{client.adresse}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date de naissance</p>
                        <p className="font-medium">
                          {client.dateNaissance 
                            ? (() => {
                                const date = new Date(client.dateNaissance);
                                return isNaN(date.getTime()) 
                                  ? client.dateNaissance 
                                  : date.toLocaleDateString('fr-CH');
                              })()
                            : 'Non renseignée'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">État civil</p>
                        <p className="font-medium">{client.etatCivil || 'Non renseigné'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Building2 className="w-5 h-5 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Nationalité / Permis</p>
                        <p className="font-medium">{client.nationalite} • {client.typePermis}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Situation actuelle */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Home className="w-5 h-5" />
              Situation actuelle
            </h2>
            <Card>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                {isEditing ? (
                  <>
                    <FormField
                      control={form.control}
                      name="geranceActuelle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gérance actuelle</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="contactGerance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact gérance</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="loyerActuel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Loyer actuel (CHF)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? '' : e.target.valueAsNumber;
                                field.onChange(value);
                              }}
                              onBlur={(e) => {
                                const value = e.target.valueAsNumber;
                                if (isNaN(value)) {
                                  field.onChange(0);
                                }
                                field.onBlur();
                              }}
                              name={field.name}
                              ref={field.ref}
                              placeholder="Loyer actuel"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="depuisLe"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Depuis le</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="nombrePiecesActuel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre de pièces actuel</FormLabel>
                          <FormControl>
                            <Input 
                              type="number"
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? '' : e.target.valueAsNumber;
                                field.onChange(value);
                              }}
                              onBlur={(e) => {
                                const value = e.target.valueAsNumber;
                                if (isNaN(value) || value < 1) {
                                  field.onChange(1);
                                } else {
                                  field.onChange(Math.round(value));
                                }
                                field.onBlur();
                              }}
                              name={field.name}
                              ref={field.ref}
                              placeholder="Nombre de pièces"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="motifChangement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motif du changement</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Gérance actuelle</p>
                      <p className="font-medium">{client.geranceActuelle || 'Non renseigné'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Contact gérance</p>
                      <p className="font-medium">{client.contactGerance || 'Non renseigné'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Loyer actuel</p>
                      <p className="font-medium">{client.loyerActuel.toLocaleString('fr-CH')} CHF</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Depuis le</p>
                      <p className="font-medium">
                        {client.depuisLe ? new Date(client.depuisLe).toLocaleDateString('fr-CH') : 'Non renseigné'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Nombre de pièces actuel</p>
                      <p className="font-medium">{client.nombrePiecesActuel} pièces</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Motif du changement</p>
                      <p className="font-medium">{client.motifChangement}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Situation professionnelle */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Situation professionnelle
            </h2>
            <Card>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                {isEditing ? (
                  <>
                    <FormField
                      control={form.control}
                      name="profession"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profession</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="employeur"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employeur</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateEngagement"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date d'engagement</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Revenu mensuel net</p>
                      <p className="text-muted-foreground text-xs">Modifiable dans la section "Situation financière"</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <Briefcase className="w-5 h-5 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm text-muted-foreground">Profession</p>
                        <p className="font-medium">{client.profession}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Employeur</p>
                      <p className="font-medium">{client.employeur}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Date d'engagement</p>
                      <p className="font-medium">
                        {client.dateEngagement ? new Date(client.dateEngagement).toLocaleDateString('fr-CH') : 'Non renseigné'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Revenu mensuel net</p>
                      <p className="font-medium">{client.revenuMensuel.toLocaleString('fr-CH')} CHF</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Critères de recherche */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Home className="w-5 h-5" />
              Critères de recherche
            </h2>
            <Card>
              <CardContent className="space-y-6 pt-6">
                {isEditing ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="typeRecherche"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type de recherche</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="typeBien"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type de bien</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="nombrePiecesSouhaite"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de pièces souhaité</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="ex: 3+" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Budget maximum</p>
                        <p className="text-muted-foreground text-xs">Modifiable dans la section "Situation financière"</p>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="regions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Régions recherchées (séparées par des virgules)</FormLabel>
                          <FormControl>
                            <Input 
                              value={field.value.join(', ')}
                              onChange={(e) => field.onChange(e.target.value.split(',').map(r => r.trim()))}
                              placeholder="ex: Lausanne, Genève, Vaud"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="animaux"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-3 space-y-0">
                            <FormControl>
                              <Checkbox 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Animaux</FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vehicules"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-3 space-y-0">
                            <FormControl>
                              <Checkbox 
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Véhicules</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="numeroPlaques"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Numéro de plaques (optionnel)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="souhaitsParticuliers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Souhaits particuliers</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={4} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Type de recherche</p>
                        <p className="font-medium">{client.typeRecherche}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Type de bien</p>
                        <p className="font-medium">{client.typeBien}</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Nombre de pièces souhaité</p>
                        <p className="font-medium">{client.nombrePiecesSouhaite} pièces</p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Budget maximum</p>
                        <p className="font-medium">{client.budgetMax.toLocaleString('fr-CH')} CHF</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Régions recherchées</p>
                      <div className="flex flex-wrap gap-2">
                        {client.regions.map((region, index) => (
                          <Badge key={index} variant="secondary">
                            {region}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <Heart className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Animaux</p>
                          <Badge variant={client.animaux ? "default" : "secondary"}>
                            {client.animaux ? 'Oui' : 'Non'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Car className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Véhicules</p>
                          <Badge variant={client.vehicules ? "default" : "secondary"}>
                            {client.vehicules ? `Oui (${client.numeroPlaques})` : 'Non'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {client.souhaitsParticuliers && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Souhaits particuliers</p>
                        <p className="font-medium p-4 bg-muted rounded-lg">{client.souhaitsParticuliers}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Offres de biens envoyées */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Send className="w-5 h-5" />
                Offres de biens envoyées
              </h2>
              <Button onClick={() => navigate(`/agent/envoyer-offre?clientId=${client.id}`)}>
                <Send className="w-4 h-4 mr-2" />
                Envoyer une offre
              </Button>
            </div>

            {offres.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {offres.map((offre) => (
                  <Card key={offre.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{offre.localisation}</CardTitle>
                        <Badge variant="secondary">{offre.statut}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Prix</span>
                        <span className="font-medium">{offre.prix.toLocaleString('fr-CH')} CHF</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Surface</span>
                        <span className="font-medium">{offre.surface} m²</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pièces</span>
                        <span className="font-medium">{offre.nombrePieces}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Date d'envoi</span>
                        <span className="font-medium">
                          {new Date(offre.dateEnvoi).toLocaleDateString('fr-CH')}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Aucune offre envoyée pour le moment
                </CardContent>
              </Card>
            )}
          </div>

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents
              </h2>
              <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
                <UploadIcon className="w-4 h-4 mr-2" />
                Ajouter un document
              </Button>
            </div>
            
            {documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="text-2xl">{getFileIcon(doc.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.size)} • {new Date(doc.uploadDate).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPreviewDocument(doc)}
                          title="Aperçu"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownloadDocument(doc)}
                          title="Télécharger"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Aucun document disponible
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        </Form>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le client</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {client?.prenom} {client?.nom} ? 
              Cette action est irréversible et supprimera toutes les données associées.
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

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter des documents</DialogTitle>
            <DialogDescription>
              Sélectionnez un ou plusieurs fichiers à ajouter au dossier du client
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
            {uploading && (
              <p className="text-sm text-muted-foreground mt-2">Upload en cours...</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Document Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewDocument?.name}</DialogTitle>
            <DialogDescription>
              {previewDocument && formatFileSize(previewDocument.size)} • {previewDocument && new Date(previewDocument.uploadDate).toLocaleDateString('fr-FR')}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {previewDocument && (
              <div className="flex items-center justify-center">
                {previewDocument.type.includes('image') ? (
                  <img 
                    src={previewDocument.data} 
                    alt={previewDocument.name}
                    className="max-w-full h-auto rounded-lg"
                  />
                ) : previewDocument.type.includes('pdf') ? (
                  <iframe
                    src={previewDocument.data}
                    className="w-full h-[60vh] border rounded-lg"
                    title={previewDocument.name}
                  />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      Aperçu non disponible pour ce type de fichier
                    </p>
                    <Button onClick={() => handleDownloadDocument(previewDocument)}>
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDocument(null)}>
              Fermer
            </Button>
            {previewDocument && (
              <Button onClick={() => handleDownloadDocument(previewDocument)}>
                <Download className="w-4 h-4 mr-2" />
                Télécharger
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
