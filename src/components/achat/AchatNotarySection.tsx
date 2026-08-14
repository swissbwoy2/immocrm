import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scale, Calendar, Key, Mail, Phone } from 'lucide-react';

interface AchatNotarySectionProps {
  notary: any | null;
}

const STATUT_LABEL: Record<string, { label: string; color: string }> = {
  a_planifier:        { label: 'À planifier', color: 'bg-amber-100 text-amber-700' },
  rdv_planifie:       { label: 'RDV planifié', color: 'bg-primary/10 text-primary' },
  signe:              { label: 'Acte signé', color: 'bg-emerald-100 text-emerald-700' },
  cles_remises:       { label: 'Clés remises', color: 'bg-emerald-100 text-emerald-700' },
};

export function AchatNotarySection({ notary }: AchatNotarySectionProps) {
  if (!notary) {
    return (
      <Card className="p-6 border-primary/20">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Scale className="h-5 w-5 text-primary" />
          Notaire & remise des clés
        </h2>
        <div className="text-center py-10 text-sm text-muted-foreground">
          L'étape notariale sera planifiée une fois votre offre d'achat acceptée.
        </div>
      </Card>
    );
  }

  const s = STATUT_LABEL[notary.statut] || { label: notary.statut, color: 'bg-zinc-100 text-zinc-700' };

  return (
    <Card className="p-6 border-primary/20">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Notaire & remise des clés
        </h2>
        <Badge className={`border-0 ${s.color}`}>{s.label}</Badge>
      </div>

      <div className="space-y-3 text-sm">
        {notary.notaire_nom && (
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="font-semibold">{notary.notaire_nom}</span>
          </div>
        )}
        {notary.notaire_email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <a href={`mailto:${notary.notaire_email}`} className="hover:text-primary">{notary.notaire_email}</a>
          </div>
        )}
        {notary.notaire_telephone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" />
            <a href={`tel:${notary.notaire_telephone}`} className="hover:text-primary">{notary.notaire_telephone}</a>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <DateBlock icon={Calendar} label="Rendez-vous" date={notary.date_rdv} />
          <DateBlock icon={Scale} label="Signature" date={notary.date_signature} />
          <DateBlock icon={Key} label="Remise des clés" date={notary.date_remise_cles} />
        </div>
      </div>
    </Card>
  );
}

function DateBlock({ icon: Icon, label, date }: any) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-1">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="text-sm font-semibold">
        {date ? new Date(date).toLocaleDateString('fr-CH') : '—'}
      </div>
    </div>
  );
}
