import { useEffect, useState } from 'react';
import { LayoutDashboard, FileText, Home, Calendar, FileCheck, MessageSquare, File } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { KPICard } from '@/components/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentUser, getClients, getOffres, getAgents } from '@/utils/localStorage';
import { calculateDaysElapsed, calculateDaysRemaining, getClientStats, getProchainesVisites, getCandidatures } from '@/utils/calculations';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, User } from 'lucide-react';

const clientMenu = [
  { name: 'Mon tableau de bord', icon: LayoutDashboard, path: '/client' },
  { name: 'Mon dossier', icon: FileText, path: '/client/dossier' },
  { name: 'Offres reçues', icon: Home, path: '/client/offres' },
  { name: 'Prochaines visites', icon: Calendar, path: '/client/visites' },
  { name: 'Mes candidatures', icon: FileCheck, path: '/client/candidatures' },
  { name: 'Messagerie', icon: MessageSquare, path: '/client/messagerie' },
  { name: 'Mes documents', icon: File, path: '/client/documents' },
];

export default function ClientDashboard() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [client, setClient] = useState(() => {
    const clients = getClients();
    return clients.find(c => c.email === currentUser?.email);
  });
  const [agent, setAgent] = useState(() => {
    if (!client?.agentId) return null;
    const agents = getAgents();
    return agents.find(a => a.id === client.agentId);
  });
  const [offres, setOffres] = useState(getOffres());

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'client') {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  if (!currentUser || !client) return null;

  const daysElapsed = calculateDaysElapsed(client.dateInscription);
  const daysRemaining = calculateDaysRemaining(client.dateInscription);
  const progressPercent = Math.min((daysElapsed / 90) * 100, 100);

  const stats = getClientStats(client.id, offres);
  const prochainesVisites = getProchainesVisites(client.id, offres).slice(0, 3);
  const candidatures = getCandidatures(client.id, offres).slice(0, 3);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar menu={clientMenu} userRole="client" userName={`${currentUser.prenom} ${currentUser.nom}`} />

      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Mon tableau de bord</h1>
            <p className="text-muted-foreground">Suivez l'avancement de votre recherche</p>
          </div>

          {/* Alerte mandat */}
          {daysRemaining > 0 && daysRemaining <= 30 && (
            <Card className="mb-6 border-warning bg-warning/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      Il vous reste {daysRemaining} jours sur votre mandat !
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Souhaitez-vous renouveler ou avez-vous des questions ?
                    </p>
                    <div className="flex gap-3 mt-4">
                      <Button size="sm" variant="default">
                        Renouveler mon mandat
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate('/client/messagerie')}>
                        Contacter mon agent
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {daysRemaining <= 0 && (
            <Card className="mb-6 border-destructive bg-destructive/5">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">❌ Votre mandat a expiré</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Contactez-nous pour renouveler ou demander un remboursement.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Offres reçues</p>
                <h3 className="text-2xl font-bold mt-2">{stats.offresRecues}</h3>
                {stats.offresNonVues > 0 && (
                  <p className="text-xs text-primary font-medium mt-1">{stats.offresNonVues} nouvelles</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Visites à venir</p>
                <h3 className="text-2xl font-bold mt-2">{stats.visitesAVenir}</h3>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Visites effectuées</p>
                <h3 className="text-2xl font-bold mt-2">{stats.visitesEffectuees}</h3>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground">Candidatures</p>
                <h3 className="text-2xl font-bold mt-2">{stats.candidaturesDeposees}</h3>
                {stats.candidaturesEnAttente > 0 && (
                  <p className="text-xs text-warning font-medium mt-1">{stats.candidaturesEnAttente} en attente</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Mon mandat */}
            <Card>
              <CardHeader>
                <CardTitle>📋 Mon mandat</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Date de début</p>
                    <p className="font-medium">{new Date(client.dateInscription).toLocaleDateString('fr-CH')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Jours restants</p>
                    <p className="font-medium">{daysRemaining > 0 ? daysRemaining : 0} jours</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      daysRemaining > 30 ? 'bg-success/10 text-success' :
                      daysRemaining > 0 ? 'bg-warning/10 text-warning' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {daysRemaining > 0 ? 'Actif' : 'Expiré'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Budget recherché</p>
                    <p className="font-medium">{client.budgetMax} CHF</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progression</span>
                    <span className="font-medium">{Math.round(progressPercent)}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Mon agent */}
            {agent && (
              <Card>
                <CardHeader>
                  <CardTitle>👤 Mon agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{agent.prenom} {agent.nom}</p>
                      <p className="text-sm text-muted-foreground mt-1">{agent.email}</p>
                      <p className="text-sm text-muted-foreground">{agent.telephone}</p>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => navigate('/client/messagerie')}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Prochaines visites */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>📅 Prochaines visites</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prochainesVisites.length > 0 ? (
                <>
                  {prochainesVisites.map(visite => (
                    <div key={visite.offreId} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{visite.adresse}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {visite.nombrePieces} pièces • {visite.surface}m² • {visite.prix} CHF/mois
                          </p>
                          {visite.codeImmeuble && (
                            <p className="text-sm text-primary mt-2">Code: {visite.codeImmeuble}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{new Date(visite.date).toLocaleDateString('fr-CH')}</p>
                          <p className="text-sm text-muted-foreground">{visite.heure}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm text-primary"
                    onClick={() => navigate('/client/visites')}
                  >
                    Voir toutes les visites →
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Aucune visite planifiée</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Candidatures récentes */}
          <Card>
            <CardHeader>
              <CardTitle>📝 Mes candidatures récentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {candidatures.length > 0 ? (
                <>
                  {candidatures.map(cand => (
                    <div key={cand.offreId} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{cand.localisation}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Déposée le {new Date(cand.dateDepot).toLocaleDateString('fr-CH')}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          cand.resultat === 'acceptee' ? 'bg-success/10 text-success' :
                          cand.resultat === 'refusee' ? 'bg-destructive/10 text-destructive' :
                          'bg-warning/10 text-warning'
                        }`}>
                          {cand.resultat === 'acceptee' ? '✅ Acceptée' :
                           cand.resultat === 'refusee' ? '❌ Refusée' :
                           '⏳ En attente'}
                        </span>
                      </div>
                    </div>
                  ))}
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm text-primary"
                    onClick={() => navigate('/client/candidatures')}
                  >
                    Voir toutes les candidatures →
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Aucune candidature déposée</p>
                  <p className="text-xs mt-1">Votre agent déposera vos candidatures après les visites</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
