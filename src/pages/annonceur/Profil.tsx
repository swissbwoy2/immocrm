import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AnnonceurLayout } from '@/components/annonceur/AnnonceurLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Star,
  Upload,
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function Profil() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch annonceur profile
  const { data: annonceur, isLoading } = useQuery({
    queryKey: ['annonceur-profil', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('annonceurs')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch reviews
  const { data: avis } = useQuery({
    queryKey: ['annonceur-avis', annonceur?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avis_annonceurs')
        .select('*')
        .eq('annonceur_id', annonceur?.id)
        .eq('statut', 'publie')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!annonceur?.id,
  });

  // Form state
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    nom_entreprise: '',
    telephone: '',
    telephone_secondaire: '',
    adresse: '',
    code_postal: '',
    ville: '',
    site_web: '',
  });

  // Initialize form when data loads
  useState(() => {
    if (annonceur) {
      setFormData({
        nom: annonceur.nom || '',
        prenom: annonceur.prenom || '',
        nom_entreprise: annonceur.nom_entreprise || '',
        telephone: annonceur.telephone || '',
        telephone_secondaire: annonceur.telephone_secondaire || '',
        adresse: annonceur.adresse || '',
        code_postal: annonceur.code_postal || '',
        ville: annonceur.ville || '',
        site_web: annonceur.site_web || '',
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('annonceurs')
        .update(data)
        .eq('id', annonceur?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annonceur-profil'] });
      toast.success('Profil mis à jour avec succès');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'particulier': return 'Particulier';
      case 'agence': return 'Agence immobilière';
      case 'promoteur': return 'Promoteur';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <AnnonceurLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-3">
            <Skeleton className="h-64 md:col-span-1" />
            <Skeleton className="h-64 md:col-span-2" />
          </div>
        </div>
      </AnnonceurLayout>
    );
  }

  if (!annonceur) {
    return (
      <AnnonceurLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Profil non trouvé</p>
        </div>
      </AnnonceurLayout>
    );
  }

  return (
    <AnnonceurLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mon profil</h1>
            <p className="text-muted-foreground">
              Gérez vos informations personnelles
            </p>
          </div>
          {!isEditing && (
            <Button onClick={() => {
              setFormData({
                nom: annonceur.nom || '',
                prenom: annonceur.prenom || '',
                nom_entreprise: annonceur.nom_entreprise || '',
                telephone: annonceur.telephone || '',
                telephone_secondaire: annonceur.telephone_secondaire || '',
                adresse: annonceur.adresse || '',
                code_postal: annonceur.code_postal || '',
                ville: annonceur.ville || '',
                site_web: annonceur.site_web || '',
              });
              setIsEditing(true);
            }}>
              Modifier le profil
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={annonceur.logo_url || ''} />
                  <AvatarFallback className="text-2xl">
                    {annonceur.nom?.[0]}{annonceur.prenom?.[0]}
                  </AvatarFallback>
                </Avatar>
                
                <h2 className="text-xl font-semibold">
                  {annonceur.prenom} {annonceur.nom}
                </h2>
                
                {annonceur.nom_entreprise && (
                  <p className="text-muted-foreground">{annonceur.nom_entreprise}</p>
                )}

                <Badge variant="outline" className="mt-2">
                  {getTypeLabel(annonceur.type_annonceur)}
                </Badge>

                <div className="flex items-center gap-2 mt-4">
                  {annonceur.est_verifie ? (
                    <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Vérifié
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Non vérifié
                    </Badge>
                  )}
                </div>

                <Separator className="my-4 w-full" />

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 w-full text-center">
                  <div>
                    <p className="text-2xl font-bold">{annonceur.nb_annonces_publiees || 0}</p>
                    <p className="text-xs text-muted-foreground">Annonces</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{annonceur.nb_vues_totales || 0}</p>
                    <p className="text-xs text-muted-foreground">Vues totales</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{annonceur.nb_contacts_recus || 0}</p>
                    <p className="text-xs text-muted-foreground">Contacts</p>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <p className="text-2xl font-bold">{annonceur.note_moyenne?.toFixed(1) || '-'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info / Edit Form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Informations</CardTitle>
              <CardDescription>
                {isEditing ? 'Modifiez vos informations' : 'Vos informations de contact'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom</Label>
                      <Input
                        id="prenom"
                        value={formData.prenom}
                        onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom</Label>
                      <Input
                        id="nom"
                        value={formData.nom}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      />
                    </div>
                  </div>

                  {annonceur.type_annonceur !== 'particulier' && (
                    <div className="space-y-2">
                      <Label htmlFor="nom_entreprise">Nom de l'entreprise</Label>
                      <Input
                        id="nom_entreprise"
                        value={formData.nom_entreprise}
                        onChange={(e) => setFormData({ ...formData, nom_entreprise: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="telephone">Téléphone</Label>
                      <Input
                        id="telephone"
                        type="tel"
                        value={formData.telephone}
                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telephone_secondaire">Téléphone secondaire</Label>
                      <Input
                        id="telephone_secondaire"
                        type="tel"
                        value={formData.telephone_secondaire}
                        onChange={(e) => setFormData({ ...formData, telephone_secondaire: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adresse">Adresse</Label>
                    <Input
                      id="adresse"
                      value={formData.adresse}
                      onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="code_postal">Code postal</Label>
                      <Input
                        id="code_postal"
                        value={formData.code_postal}
                        onChange={(e) => setFormData({ ...formData, code_postal: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ville">Ville</Label>
                      <Input
                        id="ville"
                        value={formData.ville}
                        onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="site_web">Site web</Label>
                    <Input
                      id="site_web"
                      type="url"
                      placeholder="https://"
                      value={formData.site_web}
                      onChange={(e) => setFormData({ ...formData, site_web: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={updateMutation.isPending}>
                      <Save className="h-4 w-4 mr-2" />
                      {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Annuler
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span>{annonceur.email}</span>
                  </div>
                  
                  {annonceur.telephone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span>{annonceur.telephone}</span>
                    </div>
                  )}
                  
                  {annonceur.adresse && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <span>
                        {annonceur.adresse}, {annonceur.code_postal} {annonceur.ville}
                      </span>
                    </div>
                  )}
                  
                  {annonceur.site_web && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <a 
                        href={annonceur.site_web} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {annonceur.site_web}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reviews Section */}
        {avis && avis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Avis reçus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {avis.map((review) => (
                  <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.note_globale
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      {review.titre && (
                        <span className="font-medium">{review.titre}</span>
                      )}
                    </div>
                    <p className="text-muted-foreground">{review.commentaire}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AnnonceurLayout>
  );
}
