import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Banknote, CheckCircle2, Circle, Clock, FileCheck, FileText, Loader2, MessageSquare, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchaseProject } from '@/hooks/usePurchaseProject';
import { Button } from '@/components/ui/button';
import { PremiumPageShellV2 } from '@/components/dashboard/v2';
import { PremiumDashboardHeader } from '@/components/premium/PremiumDashboardHeader';
import { PremiumAgentCard } from '@/components/premium/PremiumAgentCard';
import { MustChangePasswordBanner } from '@/components/MustChangePasswordBanner';
import { formatCHF } from '@/lib/purchaseFinancing';
import { DashboardAdBanner } from '@/components/client/dashboard/DashboardAdBanner';
import { DASH_CARD, DashSection, LinkRow, TodoCard } from '@/components/client/dashboard/DashPrimitives';

interface Props {
  profile?: { prenom?: string; nom?: string } | null;
}

/**
 * Acheteur dont le parcours n'est pas encore activé (mandat à signer ou en cours de validation).
 * Même ossature que les tableaux de bord client : À faire → Mon projet → Mon conseiller.
 */
export default function DashboardAchatEnAttente({ profile }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { loading, project, financing, computed, agent } = usePurchaseProject({ userId: user?.id || null });

  // La signature peut être enregistrée sur la fiche client (formulaire de mandat) sans que le projet soit à jour.
  const [signatureClient, setSignatureClient] = useState<boolean | null>(null);

  useEffect(() => { document.title = "Parcours d'achat en attente d'activation | Immo-Rama"; }, []);
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    supabase
      .from('clients')
      .select('mandat_date_signature, mandat_signature_data')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => { if (alive) setSignatureClient(!!(data?.mandat_date_signature || data?.mandat_signature_data)); }, () => { if (alive) setSignatureClient(false); });
    return () => { alive = false; };
  }, [user?.id]);

  if (loading || (user?.id && signatureClient === null)) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const mandatSigne = !!signatureClient || (!!project && (!!project.date_signature_mandat || ['signe', 'signé', 'valide'].includes(String(project.statut_mandat || '').toLowerCase())));
  const acompteRegle = !!project && (!!project.date_paiement_acompte || ['paye', 'payé', 'regle', 'réglé', 'recu', 'reçu'].includes(String(project.statut_acompte || '').toLowerCase()));

  const etapes = [
    { ok: mandatSigne, label: "Mandat d'achat signé électroniquement" },
    { ok: acompteRegle, label: `Acompte ${project?.montant_acompte ? formatCHF(Number(project.montant_acompte)) : "CHF 2'499.–"} réglé` },
    { ok: false, label: "Validation et activation par Immo-Rama" },
  ];

  return (
    <PremiumPageShellV2 className="relative z-10 mx-auto w-full max-w-6xl">
      {/* Bannière : tout en haut de l'accueil */}
      <DashboardAdBanner />
      <MustChangePasswordBanner />
      <PremiumDashboardHeader
        userName={profile?.prenom}
        parcoursType="achat"
        isAcheteur
        onMessagesClick={() => navigate('/client/messagerie')}
      />

      {/* À faire */}
      <div className="space-y-3">
        {!mandatSigne ? (
          <TodoCard
            icon={FileCheck}
            title="Activez votre recherche d'achat"
            description="Signez votre mandat d'accompagnement à l'achat pour démarrer la recherche active, sur le marché et hors marché."
            action={<Button size="sm" className="rounded-full" onClick={() => navigate('/nouveau-mandat')}>Signer mon mandat</Button>}
          />
        ) : (
          <TodoCard
            icon={Clock}
            title="Votre projet d'achat est en cours de validation"
            description="Notre équipe vérifie votre dossier, votre mandat signé et le règlement de l'acompte. Dès l'activation, votre suivi achat démarre automatiquement."
          />
        )}
        <TodoCard
          icon={FileText}
          tone="muted"
          title="Préparez votre dossier acheteur"
          description="Pièce d'identité, fiches de salaire, avis de taxation, fonds propres : vos documents accélèrent l'accord bancaire."
          action={<Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate('/client/documents')}>Ajouter mes documents</Button>}
        />
      </div>

      {/* Mon projet */}
      <DashSection title="Mon projet d'achat">
        <div className={`${DASH_CARD} p-4 md:p-5`}>
          <p className="mb-3 text-sm font-semibold text-foreground">Activation de votre accompagnement</p>
          <ul className="space-y-2.5">
            {etapes.map((e) => (
              <li key={e.label} className="flex items-center gap-2.5 text-sm">
                {e.ok
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className={e.ok ? 'text-foreground' : 'text-muted-foreground'}>{e.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {financing && computed && (
          <div className={`${DASH_CARD} p-4 md:p-5`}>
            <p className="mb-3 text-sm font-semibold text-foreground">Aperçu de votre tenue des charges</p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Prix cible</dt><dd className="font-medium">{formatCHF(computed.prixCible)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Capacité d'achat max</dt><dd className="font-medium">{formatCHF(computed.capaciteAchatMax)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Hypothèque estimée</dt><dd className="font-medium">{formatCHF(computed.montantHypothecaire)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Charges théoriques</dt><dd className="font-medium">{formatCHF(computed.chargesMensuelles)}/mois</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Fonds propres totaux</dt><dd className="font-medium">{formatCHF(computed.fondsPropresTotal)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Taux d'effort</dt><dd className="font-medium">{computed.tauxEffort.toFixed(1)} %</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Indicatif. La validation bancaire définitive sera demandée à notre partenaire après activation du parcours.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
          <LinkRow icon={Banknote} label="Mon financement" sub="Capacité d'achat et fonds propres" onClick={() => navigate('/client/financement')} />
          <LinkRow icon={FileText} label="Mon dossier" sub="Mandat, documents et informations" onClick={() => navigate('/client/dossier')} />
        </div>
      </DashSection>

      {/* Mon conseiller */}
      <DashSection title="Mon conseiller">
        {agent ? (
          <PremiumAgentCard agent={agent as any} onMessage={() => navigate('/client/messagerie')} />
        ) : (
          <div className={`${DASH_CARD} p-6 text-center`}>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <User className="h-7 w-7 text-muted-foreground" />
            </span>
            <p className="mt-3 font-semibold text-foreground">Conseiller attribué à l'activation</p>
            <p className="mt-1 text-sm text-muted-foreground">Une question d'ici là ? Écrivez à l'équipe.</p>
            <Button variant="outline" className="mt-4 rounded-full" onClick={() => navigate('/client/messagerie')}>
              <MessageSquare className="mr-2 h-4 w-4" /> Écrire à l'équipe
            </Button>
          </div>
        )}
      </DashSection>
    </PremiumPageShellV2>
  );
}
