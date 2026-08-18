import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseProject } from '@/hooks/usePurchaseProject';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { PremiumDashboardHeader } from '@/components/premium/PremiumDashboardHeader';
import { Loader2, Sparkles, Clock, Banknote, FileText, ShieldCheck, Mail, Phone } from 'lucide-react';
import { formatCHF } from '@/lib/purchaseFinancing';
import { DashboardAdBanner } from '@/components/client/dashboard/DashboardAdBanner';

interface Props {
  profile?: { prenom?: string; nom?: string } | null;
}

export default function DashboardAchatEnAttente({ profile }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, project, financing, computed, agent } = usePurchaseProject({ userId: user?.id || null });

  useEffect(() => { document.title = "Parcours d'achat en attente d'activation | Immo-Rama"; }, []);

  if (loading) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  const initials = (profile?.prenom?.[0] || '?') + (profile?.nom?.[0] || '');
  const fullName = `${profile?.prenom || ''} ${profile?.nom || ''}`.trim() || 'Acheteur';

  return (
    <PremiumPageShellV2>
      <div className="space-y-6 p-4 md:p-6">
        <DashboardAdBanner />
        <PremiumDashboardHeader userName={fullName} parcoursType="achat" />
        <div className="flex justify-end">
          <Badge className="bg-amber-500/15 text-amber-700 border-amber-400/40">En attente d'activation</Badge>
        </div>

        <Card className="p-6 border-amber-200 bg-gradient-to-br from-amber-50/60 to-white">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-amber-100">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Votre projet d'achat est en cours de validation
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Notre équipe vérifie votre dossier, votre mandat signé et le règlement de l'acompte <strong>CHF 2&apos;499.–</strong>.
                Dès activation, votre suivi achat démarrera automatiquement.
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Mandat signé électroniquement ✓</li>
                <li className="flex items-center gap-2"><Banknote className="h-4 w-4 text-amber-500" /> Acompte CHF 2&apos;499.– en attente de règlement</li>
                <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Documents financiers à compléter au besoin</li>
              </ul>
            </div>
          </div>
        </Card>

        {financing && computed && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Aperçu de votre tenue des charges</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>Prix cible : <strong>{formatCHF(computed.prixCible)}</strong></div>
              <div>Capacité d'achat max : <strong>{formatCHF(computed.capaciteAchatMax)}</strong></div>
              <div>Hypothèque estimée : <strong>{formatCHF(computed.montantHypothecaire)}</strong></div>
              <div>Charges théoriques : <strong>{formatCHF(computed.chargesMensuelles)}/mois</strong></div>
              <div>Fonds propres totaux : <strong>{formatCHF(computed.fondsPropresTotal)}</strong></div>
              <div>Taux d'effort : <strong>{computed.tauxEffort.toFixed(1)} %</strong></div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Indicatif. La validation bancaire définitive sera demandée à notre partenaire après activation du parcours.
            </p>
          </Card>
        )}

        {agent && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Votre conseiller</h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {(agent.prenom?.[0] || '') + (agent.nom?.[0] || '')}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{agent.prenom} {agent.nom}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-3">
                  {agent.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{agent.email}</span>}
                  {agent.telephone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{agent.telephone}</span>}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-5">
          <Button variant="outline" onClick={() => navigate('/client/documents')}>
            <FileText className="h-4 w-4 mr-2" /> Compléter mes documents
          </Button>
        </Card>
      </div>
    </PremiumPageShellV2>
  );
}
