import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

interface MandateStatus {
  prenom: string;
  nom: string;
  email: string;
  status: string;
  type_recherche: string;
  type_bien: string;
  zone_recherche: string;
  signed_at: string;
  created_at: string;
  activation_deposit_paid: boolean;
}

interface AuditLog {
  event_type: string;
  event_description: string;
  created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Brouillon', color: 'text-muted-foreground', icon: Clock },
  pending_payment: { label: 'En attente de paiement', color: 'text-amber-600', icon: Clock },
  active: { label: 'Actif', color: 'text-green-600', icon: CheckCircle2 },
  expired: { label: 'Expiré', color: 'text-destructive', icon: XCircle },
  cancelled: { label: 'Annulé', color: 'text-destructive', icon: XCircle },
  completed: { label: 'Terminé', color: 'text-primary', icon: CheckCircle2 },
};

export default function MandatV3Suivi() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [mandate, setMandate] = useState<MandateStatus | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Lien de suivi invalide');
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/mandate-get-status?token=${token}`
        );
        const data = await res.json();

        if (!data.success) {
          setError(data.error || 'Erreur de chargement');
        } else {
          setMandate(data.mandate);
          setLogs(data.logs || []);
        }
      } catch (err) {
        setError('Impossible de charger les données');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md px-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold text-foreground">{error}</h2>
          <p className="text-muted-foreground">Vérifiez votre lien de suivi ou contactez l'agence.</p>
        </div>
      </div>
    );
  }

  if (!mandate) return null;

  const statusInfo = STATUS_MAP[mandate.status] || STATUS_MAP.draft;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Suivi de votre mandat</h1>
          <p className="text-muted-foreground mt-2">ImmoRésidence Sàrl</p>
        </div>

        {/* Status card */}
        <div className="bg-card rounded-2xl border shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              mandate.status === 'active' ? 'bg-green-100 dark:bg-green-900/30' :
              mandate.status === 'pending_payment' ? 'bg-amber-100 dark:bg-amber-900/30' :
              'bg-muted'
            }`}>
              <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <p className={`text-lg font-bold ${statusInfo.color}`}>{statusInfo.label}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Mandant</span>
              <p className="font-medium">{mandate.prenom} {mandate.nom}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Email</span>
              <p className="font-medium">{mandate.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Recherche</span>
              <p className="font-medium">{mandate.type_recherche} — {mandate.type_bien || 'Non précisé'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Zone</span>
              <p className="font-medium">{mandate.zone_recherche || 'Non précisée'}</p>
            </div>
            {mandate.signed_at && (
              <div>
                <span className="text-muted-foreground">Signé le</span>
                <p className="font-medium">{new Date(mandate.signed_at).toLocaleDateString('fr-CH')}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Acompte</span>
              <p className="font-medium">{mandate.activation_deposit_paid ? '✅ Payé' : '⏳ En attente'}</p>
            </div>
          </div>
        </div>

        {/* Activity log */}
        {logs.length > 0 && (
          <div className="bg-card rounded-2xl border shadow-sm p-6">
            <h3 className="font-semibold text-foreground mb-4">Historique</h3>
            <div className="space-y-4">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">{log.event_description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('fr-CH')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
