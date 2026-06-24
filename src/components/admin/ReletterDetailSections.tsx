import { PremiumCard } from '@/components/premium/PremiumCard';
import { CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign, Building2, Home, FileText, MapPin, Calendar, Phone, Mail,
  CheckCircle2, Clock, Key, Users, Hash, Layers, Send, ShieldCheck, Wallet,
  AlertCircle,
} from 'lucide-react';

type Req = any;
type Profile = { prenom: string; nom: string; email: string; telephone?: string };

const STATUS_BANNER: Record<string, { label: string; tone: string; bg: string; icon: any }> = {
  new_request:           { label: 'Nouvelle demande reçue — à qualifier', tone: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30',    icon: Clock },
  to_qualify:            { label: 'Dossier reloueur à qualifier',          tone: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30',  icon: AlertCircle },
  missing_information:   { label: 'Informations manquantes',               tone: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/30',  icon: AlertCircle },
  waiting_documents:     { label: 'Documents nécessaires',                 tone: 'text-orange-600 dark:text-orange-400',bg: 'bg-orange-500/10 border-orange-500/30',icon: FileText },
  waiting_photos:        { label: 'Photos nécessaires',                    tone: 'text-orange-600 dark:text-orange-400',bg: 'bg-orange-500/10 border-orange-500/30',icon: FileText },
  ready_to_publish:      { label: 'Logement prêt à diffuser',              tone: 'text-emerald-600 dark:text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/30',icon: CheckCircle2 },
  published:             { label: 'Annonce publiée — visites possibles',   tone: 'text-emerald-600 dark:text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/30',icon: CheckCircle2 },
  visits_scheduled:      { label: 'Visites en cours',                      tone: 'text-indigo-600 dark:text-indigo-400',bg: 'bg-indigo-500/10 border-indigo-500/30',icon: Calendar },
  applications_received: { label: 'Candidatures reçues',                   tone: 'text-indigo-600 dark:text-indigo-400',bg: 'bg-indigo-500/10 border-indigo-500/30',icon: Users },
  sent_to_agency:        { label: 'Dossiers transmis à la régie',          tone: 'text-purple-600 dark:text-purple-400',bg: 'bg-purple-500/10 border-purple-500/30',icon: Send },
  rented:                { label: 'Logement reloué — mission accomplie',   tone: 'text-emerald-700 dark:text-emerald-300',bg: 'bg-emerald-500/15 border-emerald-500/40',icon: CheckCircle2 },
  cancelled:             { label: 'Dossier annulé',                        tone: 'text-zinc-600',                        bg: 'bg-zinc-500/10 border-zinc-500/30',    icon: Clock },
  archived:              { label: 'Dossier archivé',                       tone: 'text-zinc-600',                        bg: 'bg-zinc-500/10 border-zinc-500/30',    icon: Clock },
};

export function ReletterStatusBanner({ request }: { request: Req }) {
  if (!request) return null;
  const meta = STATUS_BANNER[request.status] || STATUS_BANNER.to_qualify;
  const Icon = meta.icon;
  return (
    <div className={`rounded-xl border ${meta.bg} p-4 flex items-start gap-3 animate-fade-in`}>
      <div className="p-2 rounded-full bg-card/40 shrink-0">
        <Icon className={`w-5 h-5 ${meta.tone}`} />
      </div>
      <div className="flex-1">
        <p className={`font-semibold ${meta.tone}`}>📦 {meta.label}</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Dossier reloueur — {request.property_street ? `${request.property_street} ${request.property_number ?? ''}, ${request.property_zip ?? ''} ${request.property_city ?? ''}` : 'Logement à qualifier'}
        </p>
      </div>
    </div>
  );
}

const Stat = ({ label, value, prefix = '', variant = 'default' }: any) => {
  const variantStyles: Record<string, string> = {
    default: 'bg-muted/50 border-border/30 text-foreground',
    primary: 'bg-primary/10 border-primary/30 text-primary',
    success: 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400',
  };
  return (
    <div className={`p-4 rounded-xl border backdrop-blur-sm ${variantStyles[variant]}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold">
        {prefix}{typeof value === 'number' ? value.toLocaleString() : (value || '—')}
      </p>
    </div>
  );
};

const Cell = ({ label, value }: { label: string; value: any }) => (
  <div className="p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 hover:bg-muted/50 transition-all duration-300">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="font-medium text-sm">{value ?? 'Non renseigné'}</p>
  </div>
);

export function ReletterFinancialCard({ request }: { request: Req }) {
  const net = request?.rent_net ?? 0;
  const charges = request?.charges ?? 0;
  const gross = request?.rent_gross ?? (net + charges);
  const recommendedIncome = gross * 3;
  return (
    <PremiumCard icon={DollarSign} title="Situation financière du logement" delay={350}>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Loyer net" value={net} prefix="CHF " />
          <Stat label="Charges" value={charges} prefix="CHF " variant="primary" />
          <Stat label="Loyer brut" value={gross} prefix="CHF " variant="success" />
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="grid grid-cols-2 gap-4">
          <Cell label="Garantie demandée" value={request?.guarantee_amount ? `CHF ${Number(request.guarantee_amount).toLocaleString()}` : null} />
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-xs text-muted-foreground mb-1">Revenu min. recommandé futur locataire</p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">CHF {recommendedIncome.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Loyer brut × 3</p>
          </div>
        </div>
      </CardContent>
    </PremiumCard>
  );
}

export function ReletterCurrentSituationCard({ request }: { request: Req }) {
  return (
    <PremiumCard icon={Building2} title="Contact régie / situation actuelle" delay={450}>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Cell label="Nom de la régie" value={request?.agency_name} />
          <Cell label="Contact régie" value={request?.agency_contact_name} />
          <Cell label="Email régie" value={request?.agency_email} />
          <Cell label="Téléphone régie" value={request?.agency_phone} />
          <Cell label="Référence bail" value={request?.lease_reference} />
          <Cell label="Pièces" value={request?.rooms} />
          <Cell label="Fin de bail" value={request?.current_lease_end_date ? new Date(request.current_lease_end_date).toLocaleDateString('fr-CH') : null} />
          <Cell label="Disponibilité" value={request?.availability_date ? new Date(request.availability_date).toLocaleDateString('fr-CH') : null} />
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
          <div className={`w-3 h-3 rounded-full ${request?.resignation_sent ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-muted-foreground/30'}`} />
          <span className="text-sm">
            {request?.resignation_sent ? 'Résiliation envoyée' : 'Résiliation non envoyée'}
            {request?.resignation_date && (
              <span className="text-muted-foreground"> — {new Date(request.resignation_date).toLocaleDateString('fr-CH')}</span>
            )}
          </span>
        </div>
      </CardContent>
    </PremiumCard>
  );
}

export function ReletterFileMgmtCard({ request, agentName }: { request: Req; agentName?: string | null }) {
  return (
    <PremiumCard icon={ShieldCheck} title="Gestion du dossier" delay={500}>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Cell label="Agent assigné" value={agentName} />
          <Cell label="Statut du dossier" value={STATUS_BANNER[request?.status]?.label || request?.status} />
          <Cell label="Source" value="Relouer mon appartement" />
          <Cell label="Dernière activité" value={request?.updated_at ? new Date(request.updated_at).toLocaleDateString('fr-CH') : null} />
        </div>
      </CardContent>
    </PremiumCard>
  );
}

export function ReletterCriteriaCard({ request }: { request: Req }) {
  const gross = request?.rent_gross ?? ((request?.rent_net ?? 0) + (request?.charges ?? 0));
  return (
    <PremiumCard icon={Users} title="Critères du futur locataire" delay={550}>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
          <p className="text-xs text-muted-foreground mb-1">Revenu minimum nécessaire</p>
          <p className="font-bold text-primary text-lg">CHF {(gross * 3).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">3 × loyer brut</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
            <div className={`w-3 h-3 rounded-full ${request?.pets_allowed ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
            <span className="text-sm">Animaux acceptés</span>
          </div>
          <Cell label="Date d'entrée souhaitée" value={request?.availability_date ? new Date(request.availability_date).toLocaleDateString('fr-CH') : null} />
        </div>
        {request?.special_features && (
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Conditions particulières régie / propriétaire</p>
            <p className="text-sm">{request.special_features}</p>
          </div>
        )}
      </CardContent>
    </PremiumCard>
  );
}

export function ReletterPropertyFeaturesCard({ request }: { request: Req }) {
  const features = [
    { key: 'has_elevator', label: 'Ascenseur', on: request?.has_elevator },
    { key: 'has_balcony', label: 'Balcon', on: request?.has_balcony },
    { key: 'has_terrace', label: 'Terrasse', on: request?.has_terrace },
    { key: 'has_garden', label: 'Jardin', on: request?.has_garden },
    { key: 'has_cellar', label: 'Cave', on: request?.has_cellar },
    { key: 'has_indoor_parking', label: 'Parking intérieur', on: request?.has_indoor_parking },
    { key: 'has_outdoor_parking', label: 'Place de parc', on: request?.has_outdoor_parking },
    { key: 'has_box', label: 'Box', on: request?.has_box },
    { key: 'furnished', label: 'Meublé', on: request?.furnished },
    { key: 'pets_allowed', label: 'Animaux acceptés', on: request?.pets_allowed },
  ];
  return (
    <PremiumCard icon={Home} title="Autres informations du logement" delay={600}>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Cell label="Type de bien" value={request?.property_type} />
          <Cell label="Surface" value={request?.surface ? `${request.surface} m²` : null} />
          <Cell label="Étage" value={request?.floor} />
          <Cell label="Pièces" value={request?.rooms} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {features.map((f) => (
            <div key={f.key} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 backdrop-blur-sm border border-transparent hover:border-primary/20 transition-all">
              <div className={`w-3 h-3 rounded-full ${f.on ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse' : 'bg-muted-foreground/30'}`} />
              <span className="text-sm">{f.label}</span>
            </div>
          ))}
        </div>
        {request?.description && (
          <div className="p-3 rounded-xl bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{request.description}</p>
          </div>
        )}
      </CardContent>
    </PremiumCard>
  );
}

export function ReletterProfilesProposedCard({ count = 0 }: { count?: number }) {
  return (
    <PremiumCard icon={Send} title={`Profils proposés par Immo-Rama (${count})`} className="lg:col-span-2" delay={700}>
      <CardContent>
        {count > 0 ? (
          <p className="text-sm text-muted-foreground">
            Les candidats matchés et chercheurs à qui ce logement a été proposé apparaîtront ici.
          </p>
        ) : (
          <div className="text-center py-10">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-3">
              <Send className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">Aucun profil proposé pour le moment</p>
          </div>
        )}
      </CardContent>
    </PremiumCard>
  );
}

export function ReletterDossiersTransmisCard({ candidates = [] }: { candidates: any[] }) {
  const transmis = candidates.filter((c) => ['sent_to_agency', 'accepted', 'rejected'].includes(c.status));
  return (
    <PremiumCard icon={FileText} title={`Dossiers transmis à la régie (${transmis.length})`} className="lg:col-span-2" delay={750}>
      <CardContent>
        {transmis.length > 0 ? (
          <div className="space-y-3">
            {transmis.map((c, i) => (
              <div key={c.id || i} className="p-4 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{c.candidate_name || `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Candidat'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.sent_to_agency_at && <>Transmis le {new Date(c.sent_to_agency_at).toLocaleDateString('fr-CH')}</>}
                  </p>
                </div>
                <Badge variant="outline">
                  {c.status === 'accepted' ? 'Accepté' : c.status === 'rejected' ? 'Refusé' : 'En attente'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center mb-3">
              <FileText className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">Aucun dossier transmis à la régie</p>
          </div>
        )}
      </CardContent>
    </PremiumCard>
  );
}

export function ReletterAddressBadge({ request }: { request: Req }) {
  if (!request) return null;
  const addr = [request.property_street, request.property_number].filter(Boolean).join(' ');
  const city = [request.property_zip, request.property_city].filter(Boolean).join(' ');
  return (
    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
      <MapPin className="w-3 h-3 mr-1" />
      {addr || 'Logement'}{city ? `, ${city}` : ''}
    </Badge>
  );
}
