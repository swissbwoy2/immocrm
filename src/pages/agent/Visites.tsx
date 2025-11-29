import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar, Clock, User, MessageSquare, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function AgentVisites() {
  const { user } = useAuth();
  const [visites, setVisites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedVisite, setSelectedVisite] = useState<any>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [recommandation, setRecommandation] = useState<'recommande' | 'neutre' | 'deconseille'>('neutre');

  const handleOpenDetail = (visite: any) => {
    setSelectedVisite(visite);
    setDetailDialogOpen(true);
  };

  useEffect(() => {
    loadVisites();
  }, [user]);

  const loadVisites = async () => {
    if (!user) return;

    try {
      const { data: agentData } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!agentData) return;

      const { data: visitesData } = await supabase
        .from('visites')
        .select('*, offres(*), clients!visites_client_id_fkey(id, user_id)')
        .eq('agent_id', agentData.id)
        .order('date_visite', { ascending: true });

      // Charger les profils des clients
      const clientUserIds = visitesData?.map(v => v.clients?.user_id).filter(Boolean) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientUserIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const visitesWithProfiles = visitesData?.map(v => ({
        ...v,
        client_profile: profilesMap.get(v.clients?.user_id)
      })) || [];

      setVisites(visitesWithProfiles);
    } catch (error) {
      console.error('Error loading visites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarquerEffectuee = async (visite: any) => {
    if (visite.est_deleguee) {
      // Pour les visites déléguées, ouvrir le dialog de feedback
      setSelectedVisite(visite);
      setFeedbackText(visite.feedback_agent || '');
      setRecommandation(visite.recommandation_agent || 'neutre');
      setFeedbackDialogOpen(true);
    } else {
      // Pour les visites normales, juste marquer comme effectuée
      try {
        await supabase
          .from('visites')
          .update({ statut: 'effectuee' })
          .eq('id', visite.id);

        toast.success('✅ Visite marquée comme effectuée');
        await loadVisites();
      } catch (error) {
        console.error('Error updating visite:', error);
        toast.error('❌ Erreur lors de la mise à jour');
      }
    }
  };

  const handleSaveFeedback = async () => {
    if (!selectedVisite || !feedbackText.trim()) {
      toast.error('Veuillez remplir le feedback');
      return;
    }

    try {
      await supabase
        .from('visites')
        .update({
          statut: 'effectuee',
          feedback_agent: feedbackText,
          recommandation_agent: recommandation
        })
        .eq('id', selectedVisite.id);

      // Notifier le client
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', selectedVisite.client_id)
        .eq('agent_id', selectedVisite.agent_id)
        .maybeSingle();

      if (conv) {
        const recommandationEmoji = {
          recommande: '👍',
          neutre: '🤷',
          deconseille: '👎'
        }[recommandation];

        const recommandationText = {
          recommande: 'Je recommande ce bien',
          neutre: 'Avis neutre',
          deconseille: 'Je ne recommande pas ce bien'
        }[recommandation];

        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: user!.id,
          sender_type: 'agent',
          content: `🏠 **Retour de la visite déléguée**\n\n📍 ${selectedVisite.adresse}\n\n${recommandationEmoji} **${recommandationText}**\n\n📝 Feedback:\n${feedbackText}`
        });
      }

      toast.success('✅ Feedback enregistré et client notifié');
      setFeedbackDialogOpen(false);
      await loadVisites();
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast.error('❌ Erreur lors de l\'enregistrement');
    }
  };

  const getRecommandationBadge = (recommandation: string | null) => {
    if (!recommandation) return null;
    
    const config = {
      recommande: { icon: ThumbsUp, label: 'Recommandé', variant: 'default' as const },
      neutre: { icon: Minus, label: 'Neutre', variant: 'secondary' as const },
      deconseille: { icon: ThumbsDown, label: 'Déconseillé', variant: 'destructive' as const }
    }[recommandation];

    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const now = new Date();
  const visitesDeleguees = visites.filter(v => v.est_deleguee && v.statut === 'planifiee');
  const visitesNormalesAVenir = visites.filter(v => !v.est_deleguee && v.statut === 'planifiee' && new Date(v.date_visite) >= now);
  const visitesEffectuees = visites.filter(v => v.statut === 'effectuee');

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Visites clients</h1>
          <p className="text-muted-foreground">
            {visitesDeleguees.length} visite{visitesDeleguees.length > 1 ? 's' : ''} déléguée{visitesDeleguees.length > 1 ? 's' : ''} • {visitesNormalesAVenir.length} visite{visitesNormalesAVenir.length > 1 ? 's' : ''} normale{visitesNormalesAVenir.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Visites déléguées */}
        {visitesDeleguees.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">🤝 Visites déléguées par les clients</h2>
            <div className="grid gap-4">
              {visitesDeleguees.map(visite => (
                <Card key={visite.id} className="border-primary/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOpenDetail(visite)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {visite.adresse}
                          <Badge variant="outline" className="ml-2">Déléguée</Badge>
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Demandée le {new Date(visite.created_at).toLocaleDateString('fr-CH')}
                          </div>
                        </div>
                      </div>
                      <Badge>À faire</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {visite.client_profile && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {visite.client_profile.prenom} {visite.client_profile.nom}
                        </span>
                      </div>
                    )}
                    {visite.offres && (
                      <div className="text-sm text-muted-foreground">
                        {visite.offres.pieces} pièces • {visite.offres.surface}m² • {visite.offres.prix} CHF/mois
                      </div>
                    )}
                    {visite.notes && (
                      <p className="text-sm bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                        💡 {visite.notes}
                      </p>
                    )}
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarquerEffectuee(visite);
                      }}
                      className="w-full"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Visite effectuée - Donner mon feedback
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Visites normales à venir */}
        {visitesNormalesAVenir.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">📅 Visites planifiées</h2>
            <div className="grid gap-4">
              {visitesNormalesAVenir.map(visite => (
                <Card key={visite.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOpenDetail(visite)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle>{visite.adresse}</CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(visite.date_visite).toLocaleDateString('fr-CH')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(visite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <Badge variant="default">Planifiée</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {visite.client_profile && (
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {visite.client_profile.prenom} {visite.client_profile.nom}
                        </span>
                      </div>
                    )}
                    {visite.offres && (
                      <div className="text-sm text-muted-foreground">
                        {visite.offres.pieces} pièces • {visite.offres.surface}m² • {visite.offres.prix} CHF/mois
                      </div>
                    )}
                    {visite.notes && (
                      <p className="text-sm bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                        💡 {visite.notes}
                      </p>
                    )}
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarquerEffectuee(visite);
                      }}
                      className="w-full"
                    >
                      Marquer comme effectuée
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Visites effectuées */}
        <div>
          <h2 className="text-xl font-semibold mb-4">✅ Visites effectuées</h2>
          {visitesEffectuees.length > 0 ? (
            <div className="grid gap-4">
              {visitesEffectuees.slice(0, 10).map(visite => (
                <Card key={visite.id} className="opacity-75 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleOpenDetail(visite)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {visite.adresse}
                          {visite.est_deleguee && (
                            <Badge variant="outline" className="text-xs">Déléguée</Badge>
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(visite.date_visite).toLocaleDateString('fr-CH')}
                          </div>
                          {visite.recommandation_agent && (
                            <div className="flex items-center gap-1">
                              {getRecommandationBadge(visite.recommandation_agent)}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary">Effectuée</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {visite.client_profile && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4" />
                        <span>
                          {visite.est_deleguee && <span className="text-muted-foreground">Visite effectuée pour </span>}
                          <span className="font-medium">{visite.client_profile.prenom} {visite.client_profile.nom}</span>
                        </span>
                      </div>
                    )}
                    {visite.feedback_agent && (
                      <div className="text-sm bg-muted p-3 rounded-lg">
                        <p className="font-medium mb-1">📝 Feedback:</p>
                        <p className="text-muted-foreground">{visite.feedback_agent}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aucune visite effectuée
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog de feedback */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feedback de la visite déléguée</DialogTitle>
            <DialogDescription>
              Partagez votre avis sur le bien visité avec votre client
            </DialogDescription>
          </DialogHeader>

          {selectedVisite && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold">{selectedVisite.adresse}</h4>
                {selectedVisite.offres && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedVisite.offres.pieces} pièces • {selectedVisite.offres.surface}m² • {selectedVisite.offres.prix} CHF/mois
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Votre recommandation *</Label>
                <RadioGroup value={recommandation} onValueChange={(v: any) => setRecommandation(v)}>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="recommande" id="recommande" />
                    <Label htmlFor="recommande" className="flex items-center gap-2 cursor-pointer flex-1">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">Je recommande ce bien</p>
                        <p className="text-xs text-muted-foreground">Le bien correspond aux attentes du client</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="neutre" id="neutre" />
                    <Label htmlFor="neutre" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Minus className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="font-medium">Avis neutre</p>
                        <p className="text-xs text-muted-foreground">Le bien a des points positifs et négatifs</p>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="deconseille" id="deconseille" />
                    <Label htmlFor="deconseille" className="flex items-center gap-2 cursor-pointer flex-1">
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                      <div>
                        <p className="font-medium">Je ne recommande pas ce bien</p>
                        <p className="text-xs text-muted-foreground">Le bien ne convient pas au client</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Votre feedback détaillé *</Label>
                <Textarea
                  id="feedback"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Décrivez l'état du bien, l'ambiance, les points positifs/négatifs, vos impressions générales..."
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Ce feedback sera partagé avec votre client pour l'aider dans sa décision
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveFeedback} disabled={!feedbackText.trim()}>
              Enregistrer et notifier le client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de détail de visite */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Détails de la visite
              {selectedVisite?.est_deleguee && (
                <Badge variant="outline">Déléguée</Badge>
              )}
              {selectedVisite?.statut === 'effectuee' && (
                <Badge variant="secondary">Effectuée</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedVisite && (
            <div className="space-y-4">
              {/* Adresse */}
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-lg">{selectedVisite.adresse}</h4>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedVisite.date_visite).toLocaleDateString('fr-CH')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(selectedVisite.date_visite).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Client */}
              {selectedVisite.client_profile && (
                <div className="space-y-2">
                  <h5 className="font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {selectedVisite.est_deleguee ? 'Visite déléguée pour' : 'Client'}
                  </h5>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">
                      {selectedVisite.client_profile.prenom} {selectedVisite.client_profile.nom}
                    </p>
                    {selectedVisite.client_profile.email && (
                      <p className="text-sm text-muted-foreground">{selectedVisite.client_profile.email}</p>
                    )}
                    {selectedVisite.client_profile.telephone && (
                      <p className="text-sm text-muted-foreground">{selectedVisite.client_profile.telephone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Détails de l'offre */}
              {selectedVisite.offres && (
                <div className="space-y-2">
                  <h5 className="font-medium">📋 Détails du bien</h5>
                  <div className="p-3 border rounded-lg space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Pièces:</span>
                        <span className="ml-1 font-medium">{selectedVisite.offres.pieces}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Surface:</span>
                        <span className="ml-1 font-medium">{selectedVisite.offres.surface}m²</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prix:</span>
                        <span className="ml-1 font-medium">{selectedVisite.offres.prix} CHF/mois</span>
                      </div>
                    </div>
                    {selectedVisite.offres.etage && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Étage:</span>
                        <span className="ml-1">{selectedVisite.offres.etage}</span>
                      </p>
                    )}
                    {selectedVisite.offres.disponibilite && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Disponibilité:</span>
                        <span className="ml-1">{selectedVisite.offres.disponibilite}</span>
                      </p>
                    )}
                    {selectedVisite.offres.description && (
                      <p className="text-sm text-muted-foreground mt-2">{selectedVisite.offres.description}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Notes du client (pour visites déléguées) */}
              {selectedVisite.notes && (
                <div className="space-y-2">
                  <h5 className="font-medium">💬 Notes du client</h5>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm">{selectedVisite.notes}</p>
                  </div>
                </div>
              )}

              {/* Feedback agent (si visite effectuée) */}
              {selectedVisite.statut === 'effectuee' && selectedVisite.feedback_agent && (
                <div className="space-y-2">
                  <h5 className="font-medium flex items-center gap-2">
                    📝 Mon feedback
                    {selectedVisite.recommandation_agent && getRecommandationBadge(selectedVisite.recommandation_agent)}
                  </h5>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{selectedVisite.feedback_agent}</p>
                  </div>
                </div>
              )}

              {/* Infos pratiques */}
              {selectedVisite.offres && (selectedVisite.offres.code_immeuble || selectedVisite.offres.concierge_nom || selectedVisite.offres.locataire_nom) && (
                <div className="space-y-2">
                  <h5 className="font-medium">🔑 Informations pratiques</h5>
                  <div className="p-3 border rounded-lg space-y-2 text-sm">
                    {selectedVisite.offres.code_immeuble && (
                      <p>
                        <span className="text-muted-foreground">Code immeuble:</span>
                        <span className="ml-1 font-mono bg-muted px-2 py-0.5 rounded">{selectedVisite.offres.code_immeuble}</span>
                      </p>
                    )}
                    {selectedVisite.offres.concierge_nom && (
                      <p>
                        <span className="text-muted-foreground">Concierge:</span>
                        <span className="ml-1">{selectedVisite.offres.concierge_nom}</span>
                        {selectedVisite.offres.concierge_tel && <span className="ml-1">({selectedVisite.offres.concierge_tel})</span>}
                      </p>
                    )}
                    {selectedVisite.offres.locataire_nom && (
                      <p>
                        <span className="text-muted-foreground">Locataire actuel:</span>
                        <span className="ml-1">{selectedVisite.offres.locataire_nom}</span>
                        {selectedVisite.offres.locataire_tel && <span className="ml-1">({selectedVisite.offres.locataire_tel})</span>}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Fermer
            </Button>
            {selectedVisite?.statut === 'planifiee' && (
              <Button onClick={() => {
                setDetailDialogOpen(false);
                handleMarquerEffectuee(selectedVisite);
              }}>
                {selectedVisite.est_deleguee ? 'Donner mon feedback' : 'Marquer effectuée'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}