import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote, TrendingUp, Wallet, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import { FinancingComputed, FinancingSettings, formatCHF } from '@/lib/purchaseFinancing';

interface AchatFinancingCardProps {
  computed: FinancingComputed | null;
  settings: FinancingSettings;
  statutBancaire?: string | null;
}

const STATUT_BANCAIRE_LABEL: Record<string, { label: string; color: string }> = {
  a_evaluer:        { label: 'À évaluer', color: 'bg-muted text-muted-foreground' },
  en_cours:         { label: 'En cours d\'analyse', color: 'bg-amber-100 text-amber-700' },
  validation_orale: { label: 'Validation orale reçue', color: 'bg-primary/10 text-primary' },
  valide:           { label: 'Validation bancaire confirmée', color: 'bg-emerald-100 text-emerald-700' },
  refuse:           { label: 'Refusé', color: 'bg-red-100 text-red-700' },
};

export function AchatFinancingCard({ computed, settings, statutBancaire }: AchatFinancingCardProps) {
  if (!computed) {
    return (
      <Card className="p-6 border-primary/20">
        <div className="text-center py-8">
          <Banknote className="h-10 w-10 text-primary mx-auto mb-3 opacity-60" />
          <p className="text-sm text-muted-foreground">Votre profil de financement n'a pas encore été créé.</p>
        </div>
      </Card>
    );
  }

  const sb = STATUT_BANCAIRE_LABEL[statutBancaire || 'a_evaluer'] || STATUT_BANCAIRE_LABEL.a_evaluer;

  return (
    <Card className="p-6 border-primary/20">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          Tenue des charges & capacité d'achat
        </h2>
        <Badge className={`border-0 ${sb.color}`}>{sb.label}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <Metric icon={TrendingUp} label="Revenu annuel retenu" value={formatCHF(computed.revenuTotal)} sub={`Net après engagements : ${formatCHF(computed.revenuNet)}`} color="text-emerald-600" />
        <Metric icon={Wallet} label="Fonds propres totaux" value={formatCHF(computed.fondsPropresTotal)} sub={`Dont LPP/EPL : ${formatCHF(computed.fondsPropresLpp)}`} color="text-primary" />
        <Metric icon={Building2} label="Prix cible" value={formatCHF(computed.prixCible)} sub={`Apport requis (${settings.fonds_propres_min}%) : ${formatCHF(computed.fondsPropresRequis)}`} color="text-primary" />
        <Metric icon={TrendingUp} label="Capacité d'achat maximale" value={formatCHF(computed.capaciteAchatMax)} sub={`Sur revenu : ${formatCHF(computed.prixMaxFinancable)}`} color="text-amber-600" />
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5/40 p-4 mb-4">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">Charges théoriques</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground text-xs">Hypothèque estimée</div>
            <div className="font-semibold">{formatCHF(computed.montantHypothecaire)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Charges annuelles</div>
            <div className="font-semibold">{formatCHF(computed.chargesAnnuelles)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Charges mensuelles</div>
            <div className="font-semibold">{formatCHF(computed.chargesMensuelles)}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs">Taux d'effort</div>
            <div className={`font-semibold ${computed.tauxEffort > settings.taux_effort_max ? 'text-red-600' : 'text-emerald-600'}`}>
              {computed.tauxEffort.toFixed(1)} % <span className="text-xs text-muted-foreground">/ {settings.taux_effort_max} %</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-3">
          Taux retenus : intérêt {settings.taux_interet_theorique} %, entretien {settings.taux_entretien} %,
          amortissement {settings.taux_amortissement} %. Ces paramètres sont modifiables dans l'admin.
        </div>
      </div>

      {computed.warnings.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-amber-900 mb-1">Points d'attention</div>
              <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
                {computed.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
        </div>
      ) : computed.prixCible > 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-emerald-900">
              Votre projet est conforme aux règles de tenue des charges suisses.
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function Metric({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
