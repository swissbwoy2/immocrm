import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CalendarCheck, Clock, CheckCircle, MapPin, Banknote, Home, Maximize2, Phone, Mail, KeyRound, Building, User, MessageSquare, FileText, Upload, Loader2, X, Image, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PremiumPageHeader } from '@/components/premium/PremiumPageHeader';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AddressLink } from '@/components/AddressLink';

export default function CoursierMissions() {
  const { user } = useAuth();
  const [coursierId, setCoursierId] = useState<string | null>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackMedias, setFeedbackMedias] = useState<any[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    try {
      const { data: coursierData } = await supabase
        .from('coursiers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!coursierData) { setLoading(false); return; }
      setCoursierId(coursierData.id);

      const { data: allMissions } = await supabase
        .from('visites')
        .select('*, offres(*), clients!client_id(id, user_id, profiles:user_id(prenom, nom, email, telephone)), agents!agent_id(id, user_id, profiles:user_id(prenom, nom, email, telephone))')
        .or(`statut_coursier.eq.en_attente,coursier_id.eq.${coursierData.id}`)
        .order('date_visite', { ascending: true });

      setMissions(allMissions || []);
    } catch (error) {
      console.error('Error loading missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (missionId: string) => {
    if (!coursierId) return;
    try {
      const { error } = await supabase
        .from('visites')
        .update({ coursier_id: coursierId, statut_coursier: 'accepte' })
        .eq('id', missionId)
        .eq('statut_coursier', 'en_attente');

      if (error) throw error;
      toast.success('Mission acceptée !');
      loadData();
    } catch (error) {
      toast.error("Erreur lors de l'acceptation");
    }
  };

  const handleMediaUpload = async (files: FileList) => {
    if (!selectedMission) return;
    setUploadingMedia(true);
    const newMedias = [...feedbackMedias];
    
    for (const file of Array.from(files)) {
      try {
        const filePath = `visites-coursier/${selectedMission.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage
          .from('client-documents')
          .upload(filePath, file);
        
        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('client-documents')
            .getPublicUrl(filePath);
          
          newMedias.push({ url: publicUrl, type: file.type, name: file.name });
        }
      } catch (err) {
        console.error('Upload error:', err);
      }
    }
    setFeedbackMedias(newMedias);
    setUploadingMedia(false);
  };

  const handleComplete = async () => {
    if (!selectedMission || !feedback.trim()) {
      toast.error('Veuillez remplir le compte-rendu');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('visites')
        .update({
          statut_coursier: 'termine',
          feedback_coursier: feedback,
        })
        .eq('id', selectedMission.id);

      if (error) throw error;
      toast.success('Mission terminée ! Rémunération de 5.- CHF enregistrée');
      setCompleteOpen(false);
      setFeedback('');
      setFeedbackMedias([]);
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la complétion');
    } finally {
      setSubmitting(false);
    }
  };

  const available = missions.filter(m => m.statut_coursier === 'en_attente');
  const myActive = missions.filter(m => m.coursier_id === coursierId && m.statut_coursier === 'accepte');
  const myCompleted = missions.filter(m => m.coursier_id === coursierId && m.statut_coursier === 'termine');

  const renderMissionCard = (mission: any, type: 'available' | 'active' | 'completed') => (
    <Card 
      key={mission.id} 
      className={`border-border/50 hover:shadow-lg transition-all cursor-pointer ${
        type === 'active' ? 'border-amber-500/30 bg-amber-500/5' : 
        type === 'completed' ? 'border-green-500/30 bg-green-500/5' : ''
      }`}
      onClick={() => { setSelectedMission(mission); setDetailOpen(true); }}
    >
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between">
          <AddressLink address={mission.adresse} className="font-medium text-sm" truncate />
          <Badge className={
            type === 'available' ? 'bg-primary/10 text-primary border-primary/30' :
            type === 'active' ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' :
            'bg-green-500/10 text-green-600 border-green-500/30'
          }>
            {type === 'available' ? `${(mission.remuneration_coursier || 5).toFixed(0)} CHF` :
             type === 'active' ? 'En cours' : 'Terminée'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {format(new Date(mission.date_visite), "EEE dd MMM 'à' HH:mm", { locale: fr })}
        </div>

        {mission.agents?.profiles && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <UserCog className="h-3 w-3" />
            Agent: {mission.agents.profiles.prenom} {mission.agents.profiles.nom}
          </div>
        )}

        {mission.offres && (
          <div className="flex gap-2 flex-wrap">
            {mission.offres.pieces && (
              <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                <Home className="h-3 w-3" />{mission.offres.pieces}p
              </div>
            )}
            {mission.offres.surface && (
              <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                <Maximize2 className="h-3 w-3" />{mission.offres.surface}m²
              </div>
            )}
            {mission.offres.prix && (
              <div className="flex items-center gap-1 text-xs bg-muted/50 px-2 py-1 rounded">
                <Banknote className="h-3 w-3" />{mission.offres.prix.toLocaleString('fr-CH')} CHF
              </div>
            )}
          </div>
        )}

        {type === 'available' && (
          <Button onClick={(e) => { e.stopPropagation(); handleAccept(mission.id); }} className="w-full" size="sm">
            <CheckCircle className="mr-2 h-4 w-4" />
            Accepter la mission (5.-)
          </Button>
        )}
        {type === 'active' && (
          <Button 
            onClick={(e) => { e.stopPropagation(); setSelectedMission(mission); setCompleteOpen(true); }} 
            className="w-full bg-green-600 hover:bg-green-700" 
            size="sm"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Terminer la visite
          </Button>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-muted rounded-xl" />)}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-primary/5">
      <div className="p-4 md:p-8 space-y-6">
        <PremiumPageHeader
          icon={CalendarCheck}
          title="Mes missions"
          subtitle="Consultez les missions disponibles et gérez vos visites en cours"
        />

        <Tabs defaultValue="available">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="available">
              Disponibles {available.length > 0 && <Badge variant="secondary" className="ml-1">{available.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="active">
              En cours {myActive.length > 0 && <Badge variant="secondary" className="ml-1">{myActive.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="completed">Terminées</TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-4">
            {available.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <CalendarCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune mission disponible pour le moment</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {available.map(m => renderMissionCard(m, 'available'))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            {myActive.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune mission en cours</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myActive.map(m => renderMissionCard(m, 'active'))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {myCompleted.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucune mission terminée</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myCompleted.map(m => renderMissionCard(m, 'completed'))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la mission</DialogTitle>
          </DialogHeader>
          {selectedMission && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-medium">{selectedMission.adresse}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {format(new Date(selectedMission.date_visite), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                </div>
              </div>

              {/* Agent responsable */}
              {selectedMission.agents?.profiles && (
                <Card className="bg-purple-500/5 border-purple-500/20">
                  <CardContent className="pt-4 space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <UserCog className="h-4 w-4 text-purple-600" />
                      Agent responsable
                    </h4>
                    <div className="text-sm space-y-1">
                      <div className="font-medium">
                        {selectedMission.agents.profiles.prenom} {selectedMission.agents.profiles.nom}
                      </div>
                      {selectedMission.agents.profiles.telephone && (
                        <a href={`tel:${selectedMission.agents.profiles.telephone}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Phone className="h-3.5 w-3.5" />
                          {selectedMission.agents.profiles.telephone}
                        </a>
                      )}
                      {selectedMission.agents.profiles.email && (
                        <a href={`mailto:${selectedMission.agents.profiles.email}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Mail className="h-3.5 w-3.5" />
                          {selectedMission.agents.profiles.email}
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Offer details */}
              {selectedMission.offres && (
                <Card className="bg-muted/30">
                  <CardContent className="pt-4 space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Building className="h-4 w-4 text-primary" />
                      Détails du bien
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedMission.offres.pieces && <div><span className="text-muted-foreground">Pièces:</span> {selectedMission.offres.pieces}</div>}
                      {selectedMission.offres.surface && <div><span className="text-muted-foreground">Surface:</span> {selectedMission.offres.surface}m²</div>}
                      {selectedMission.offres.prix && <div><span className="text-muted-foreground">Prix:</span> {selectedMission.offres.prix.toLocaleString('fr-CH')} CHF</div>}
                      {selectedMission.offres.etage && <div><span className="text-muted-foreground">Étage:</span> {selectedMission.offres.etage}</div>}
                    </div>
                    {selectedMission.offres.description && (
                      <p className="text-sm text-muted-foreground mt-2">{selectedMission.offres.description}</p>
                    )}
                    {selectedMission.offres.lien_annonce && (
                      <a href={selectedMission.offres.lien_annonce} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" />
                        Voir l'annonce
                      </a>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Contact de la visite (client) */}
              {selectedMission.clients?.profiles && (
                <Card className="bg-blue-500/5 border-blue-500/20">
                  <CardContent className="pt-4 space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      Contact de la visite
                    </h4>
                    <div className="text-sm space-y-1">
                      <div className="font-medium">
                        {selectedMission.clients.profiles.prenom} {selectedMission.clients.profiles.nom}
                      </div>
                      {selectedMission.clients.profiles.telephone && (
                        <a href={`tel:${selectedMission.clients.profiles.telephone}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Phone className="h-3.5 w-3.5" />
                          {selectedMission.clients.profiles.telephone}
                        </a>
                      )}
                      {selectedMission.clients.profiles.email && (
                        <a href={`mailto:${selectedMission.clients.profiles.email}`} className="flex items-center gap-2 text-primary hover:underline">
                          <Mail className="h-3.5 w-3.5" />
                          {selectedMission.clients.profiles.email}
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Informations d'accès */}
              {(selectedMission.offres?.concierge_nom || selectedMission.offres?.locataire_nom || selectedMission.offres?.code_immeuble) && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4 space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary" />
                      Informations d'accès
                    </h4>
                    {selectedMission.offres?.code_immeuble && (
                      <div className="text-sm flex items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Code immeuble:</span>
                        <span className="font-mono font-medium">{selectedMission.offres.code_immeuble}</span>
                      </div>
                    )}
                    {selectedMission.offres?.concierge_nom && (
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Concierge:</span>
                          <span>{selectedMission.offres.concierge_nom}</span>
                        </div>
                        {selectedMission.offres.concierge_tel && (
                          <a href={`tel:${selectedMission.offres.concierge_tel}`} className="ml-6 text-primary hover:underline">
                            📞 {selectedMission.offres.concierge_tel}
                          </a>
                        )}
                      </div>
                    )}
                    {selectedMission.offres?.locataire_nom && (
                      <div className="text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Locataire:</span>
                          <span>{selectedMission.offres.locataire_nom}</span>
                        </div>
                        {selectedMission.offres.locataire_tel && (
                          <a href={`tel:${selectedMission.offres.locataire_tel}`} className="ml-6 text-primary hover:underline">
                            📞 {selectedMission.offres.locataire_tel}
                          </a>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes de visite */}
              {selectedMission.notes && (
                <div className="p-3 bg-amber-500/10 rounded-lg">
                  <p className="text-sm flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-amber-600 mt-0.5" />
                    <span>{selectedMission.notes}</span>
                  </p>
                </div>
              )}

              {/* Feedback coursier if completed */}
              {selectedMission.feedback_coursier && (
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <h4 className="text-sm font-medium mb-1">Mon compte-rendu</h4>
                  <p className="text-sm text-muted-foreground">{selectedMission.feedback_coursier}</p>
                </div>
              )}

              {/* Rémunération */}
              <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <span className="text-sm font-medium">Rémunération</span>
                <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-base">
                  {(selectedMission.remuneration_coursier || 5).toFixed(2)} CHF
                </Badge>
              </div>

              <DialogFooter>
                {selectedMission.statut_coursier === 'en_attente' && (
                  <Button onClick={() => { handleAccept(selectedMission.id); setDetailOpen(false); }} className="w-full">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accepter la mission
                  </Button>
                )}
                {selectedMission.statut_coursier === 'accepte' && selectedMission.coursier_id === coursierId && (
                  <Button 
                    onClick={() => { setDetailOpen(false); setCompleteOpen(true); }} 
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Terminer la visite
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Terminer la visite</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Compte-rendu de la visite *</Label>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Décrivez votre visite : état du bien, impressions, remarques..."
                rows={5}
              />
            </div>

            {/* Media upload */}
            <div className="space-y-2">
              <Label>Photos / vidéos (optionnel)</Label>
              <div className="flex flex-wrap gap-2">
                {feedbackMedias.map((media, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    {media.type?.startsWith('image') ? (
                      <img src={media.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={() => setFeedbackMedias(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-destructive rounded-full text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  {uploadingMedia ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*,video/*" 
                    multiple
                    onChange={(e) => e.target.files && handleMediaUpload(e.target.files)}
                  />
                </label>
              </div>
            </div>

            <div className="p-3 bg-green-500/10 rounded-lg flex items-center justify-between">
              <span className="text-sm">Rémunération pour cette visite</span>
              <span className="font-bold text-green-600">5.00 CHF</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>Annuler</Button>
            <Button 
              onClick={handleComplete} 
              disabled={submitting || !feedback.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Terminer et enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
