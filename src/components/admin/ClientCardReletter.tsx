import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Key, MapPin, Building2, Calendar, Camera, FileText, Users, Phone, Mail,
  ChevronRight, ArrowRight, Home, Send, AlertTriangle, CheckCircle, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReletterRequest {
  id: string;
  user_id: string | null;
  status: string;
  property_street: string | null;
  property_zip: string | null;
  property_city: string | null;
  property_type: string | null;
  rooms: number | null;
  surface: number | null;
  floor?: number | null;
  rent_net: number | null;
  charges?: number | null;
  availability_date: string | null;
  assigned_agent_id: string | null;
  agency_name?: string | null;
  agency_phone?: string | null;
  visit_contact_name?: string | null;
  visit_contact_phone?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface ReletterCounts {
  photos: number;
  docs: number;
  slots: number;
  candidates: number;
}

interface Profile {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  actif?: boolean;
}

interface Props {
  clientId: string;
  profile: Profile;
  request?: ReletterRequest;
  counts: ReletterCounts;
  agentName: string;
  isMixed?: boolean;
  isSelected: boolean;
  selectionMode: boolean;
  onToggleSelect: () => void;
  onOpenClient: () => void;
  onOpenDossier: () => void;
  onInvite?: (e: React.MouseEvent) => void;
  inviting?: boolean;
  index: number;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  new_request:          { label: 'Nouvelle',              cls: 'bg-blue-500/20 text-blue-600 border-blue-500/30' },
  to_qualify:           { label: 'À qualifier',           cls: 'bg-amber-500/20 text-amber-600 border-amber-500/30 animate-pulse-soft' },
  missing_information:  { label: 'Dossier incomplet',     cls: 'bg-amber-500/20 text-amber-600 border-amber-500/30' },
  waiting_documents:    { label: 'Documents manquants',   cls: 'bg-orange-500/20 text-orange-600 border-orange-500/30' },
  waiting_photos:       { label: 'Photos manquantes',     cls: 'bg-orange-500/20 text-orange-600 border-orange-500/30' },
  ready_to_publish:     { label: 'Prêt à publier',        cls: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30 shadow-[0_0_10px_rgba(34,197,94,0.2)]' },
  published:            { label: 'Publié',                cls: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30' },
  visits_scheduled:     { label: 'Visites en cours',      cls: 'bg-indigo-500/20 text-indigo-600 border-indigo-500/30' },
  applications_received:{ label: 'Candidatures reçues',   cls: 'bg-indigo-500/20 text-indigo-600 border-indigo-500/30' },
  sent_to_agency:       { label: 'Transmis régie',        cls: 'bg-purple-500/20 text-purple-600 border-purple-500/30' },
  rented:               { label: 'Reloué ✅',             cls: 'bg-emerald-600/25 text-emerald-700 border-emerald-600/30' },
  cancelled:            { label: 'Annulé',                cls: 'bg-zinc-500/20 text-zinc-600 border-zinc-500/30' },
  archived:             { label: 'Archivé',               cls: 'bg-zinc-500/20 text-zinc-600 border-zinc-500/30' },
};

const fmt = (v: any, suffix = '') =>
  v == null || v === '' ? <span className="text-muted-foreground italic">À renseigner</span> : <>{v}{suffix}</>;

export function ClientCardReletter({
  profile, request, counts, agentName, isMixed,
  isSelected, selectionMode, onToggleSelect, onOpenClient, onOpenDossier,
  onInvite, inviting, index,
}: Props) {
  const status = request?.status ? (STATUS_META[request.status] || { label: request.status, cls: 'bg-zinc-500/20 text-zinc-600 border-zinc-500/30' }) : null;
  const hasAgent = !!request?.assigned_agent_id;
  const rentNet = request?.rent_net ?? null;
  const charges = request?.charges ?? null;
  const rentBrut = rentNet != null && charges != null ? rentNet + charges : null;
  const lastActivity = request?.updated_at || request?.created_at;
  const daysSince = lastActivity ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000) : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card/90 backdrop-blur-xl p-4 md:p-5",
        "border border-border/50 cursor-pointer flex flex-col",
        "transition-all duration-500 ease-out",
        "hover:shadow-[0_8px_30px_rgba(14,165,233,0.15)] hover:border-sky-400/50 hover:-translate-y-2",
        "animate-fade-in",
        !hasAgent && "border-orange-400/30 hover:border-orange-400/50",
        isSelected && "ring-2 ring-primary border-primary/60 bg-primary/5"
      )}
      style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
      onClick={() => (selectionMode ? onToggleSelect() : onOpenClient())}
    >
      {selectionMode && (
        <div
          className="absolute top-3 left-3 z-20 h-7 w-7 rounded-md bg-background/90 backdrop-blur border border-border shadow-sm flex items-center justify-center"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
        >
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Glow / shine / particles — identique à la carte chercheur */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none shadow-[inset_0_0_20px_rgba(14,165,233,0.15)]" />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none overflow-hidden rounded-2xl">
        <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute top-3 right-12 w-8 h-8 bg-sky-400/10 rounded-full blur-xl animate-float" />
        <div className="absolute bottom-8 left-4 w-6 h-6 bg-blue-400/10 rounded-full blur-lg animate-float" style={{ animationDelay: '0.5s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />

      {/* Actions top-right */}
      <div className="absolute top-2 right-2 flex gap-0.5 md:gap-1 z-10">
        {onInvite && (
          <Button
            variant="ghost" size="icon"
            className={cn(
              "h-7 w-7 md:h-8 md:w-8 transition-all",
              !profile.actif
                ? "text-blue-600 hover:text-blue-700 hover:bg-blue-100 animate-pulse-soft"
                : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
            )}
            onClick={onInvite}
            disabled={inviting}
            title={!profile.actif ? "Envoyer l'invitation" : "Renvoyer l'invitation"}
          >
            {inviting ? <div className="h-3.5 w-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> : <Send className="h-3.5 w-3.5 md:h-4 md:w-4" />}
          </Button>
        )}
        {profile.telephone && (
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
            onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${profile.telephone}`; }}
            title="Appeler"
          >
            <Phone className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        )}
        {profile.email && (
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-sky-600 hover:bg-sky-50"
            onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:${profile.email}`; }}
            title="Email"
          >
            <Mail className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        )}
      </div>

      {/* SECTION 1 : Identité + badges */}
      <div className="relative z-10 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-border/30 pr-20">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-sm md:text-base font-bold shrink-0 bg-gradient-to-br shadow-lg transition-all duration-300 from-sky-500/20 to-sky-500/10 text-sky-700 group-hover:shadow-[0_0_20px_rgba(14,165,233,0.3)]">
            {(profile.prenom?.[0] || '?')}{(profile.nom?.[0] || '')}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent truncate">
              {profile.prenom} {profile.nom}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <Badge className="bg-sky-500/20 text-sky-700 border border-sky-500/30 text-[10px]">
                <Key className="w-2.5 h-2.5 mr-0.5" /> Client reloueur
              </Badge>
              {isMixed && (
                <Badge className="bg-violet-500/15 text-violet-700 border border-violet-500/30 text-[10px]">
                  + Chercheur
                </Badge>
              )}
              {!profile.actif && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] animate-pulse-soft">
                  <Mail className="w-2.5 h-2.5 mr-0.5" /> Non activé
                </Badge>
              )}
              {!hasAgent && (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30 text-[10px] animate-pulse-soft">
                  Sans agent
                </Badge>
              )}
              {status && (
                <Badge className={cn("border text-[10px]", status.cls)}>
                  {status.label}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-1 text-xs md:text-sm pl-[52px] md:pl-[60px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
            <span className="truncate">
              {[request?.property_street, request?.property_zip, request?.property_city].filter(Boolean).join(', ') || 'Adresse non renseignée'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2 : Logement à relouer (remplace "Finances") */}
      <div className="relative z-10 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-border/30">
        <p className="text-xs md:text-sm font-medium mb-2 flex items-center gap-1.5">
          <span className="text-base">🏠</span> Logement à relouer
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-2 md:p-2.5 rounded-xl text-center border border-border/30">
            <p className="text-[10px] md:text-xs text-muted-foreground">Type</p>
            <p className="text-xs md:text-sm font-bold truncate">{fmt(request?.property_type)}</p>
          </div>
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-2 md:p-2.5 rounded-xl text-center border border-border/30">
            <p className="text-[10px] md:text-xs text-muted-foreground">Pièces / Surface</p>
            <p className="text-xs md:text-sm font-bold">
              {request?.rooms != null ? `${request.rooms} p.` : '—'}{request?.surface ? ` · ${request.surface} m²` : ''}
            </p>
          </div>
          {request?.floor != null && (
            <div className="col-span-2 bg-muted/30 p-2 rounded-lg text-[11px] text-muted-foreground text-center">
              Étage : <span className="font-medium text-foreground">{request.floor}</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 3 : Conditions (remplace bloc finances chercheur) */}
      <div className="relative z-10 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-border/30">
        <p className="text-xs md:text-sm font-medium mb-2 flex items-center gap-1.5">
          <span className="text-base">💰</span> Conditions
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-sky-500/10 to-sky-500/5 p-2 md:p-2.5 rounded-xl text-center border border-sky-500/20">
            <p className="text-[10px] md:text-xs text-muted-foreground">Loyer net</p>
            <p className="text-xs md:text-sm font-bold text-sky-700">{rentNet != null ? `CHF ${rentNet.toLocaleString()}` : <span className="italic text-muted-foreground">À renseigner</span>}</p>
          </div>
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-2 md:p-2.5 rounded-xl text-center border border-border/30">
            <p className="text-[10px] md:text-xs text-muted-foreground">Charges</p>
            <p className="text-xs md:text-sm font-bold">{charges != null ? `CHF ${charges.toLocaleString()}` : <span className="italic text-muted-foreground">—</span>}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-2 md:p-2.5 rounded-xl text-center border border-emerald-500/20">
            <p className="text-[10px] md:text-xs text-muted-foreground">Loyer brut</p>
            <p className="text-xs md:text-sm font-bold text-emerald-700">{rentBrut != null ? `CHF ${rentBrut.toLocaleString()}` : <span className="italic text-muted-foreground">À renseigner</span>}</p>
          </div>
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-2 md:p-2.5 rounded-xl text-center border border-border/30">
            <p className="text-[10px] md:text-xs text-muted-foreground">Disponible</p>
            <p className="text-xs md:text-sm font-bold">
              {request?.availability_date ? new Date(request.availability_date).toLocaleDateString('fr-CH') : <span className="italic text-muted-foreground">À renseigner</span>}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 4 : Contact */}
      <div className="relative z-10 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-border/30">
        <p className="text-xs md:text-sm font-medium mb-2 flex items-center gap-1.5">
          <span className="text-base">📞</span> Contact
        </p>
        <div className="space-y-1 text-xs md:text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
            <span className="truncate">{profile.telephone || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
            <span className="truncate text-[10px] md:text-xs">{profile.email}</span>
          </div>
          {request?.agency_name && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
              <span className="truncate">Régie : <span className="text-foreground font-medium">{request.agency_name}</span>{request.agency_phone ? ` · ${request.agency_phone}` : ''}</span>
            </div>
          )}
          {request?.visit_contact_name && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
              <span className="truncate">Visite : <span className="text-foreground font-medium">{request.visit_contact_name}</span>{request.visit_contact_phone ? ` · ${request.visit_contact_phone}` : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5 : Dossier (remplace recherche/offres) */}
      <div className="relative z-10 mb-3 md:mb-4">
        <p className="text-xs md:text-sm font-medium mb-2 flex items-center gap-1.5">
          <span className="text-base">📁</span> Dossier
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          <CountChip icon={Camera}   label="Photos"     value={counts.photos} />
          <CountChip icon={FileText} label="Documents"  value={counts.docs} />
          <CountChip icon={Calendar} label="Créneaux"   value={counts.slots} />
          <CountChip icon={Users}    label="Candidats"  value={counts.candidates} />
        </div>
      </div>

      {/* Agent assigné */}
      <div className="relative z-10 text-xs text-muted-foreground mb-3 md:mb-4 pb-3 md:pb-4 border-b border-border/30">
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
          <Users className="h-3 w-3 md:h-3.5 md:w-3.5" />
          <span className="truncate">Agent : <span className="font-medium text-foreground">{hasAgent ? agentName : '— non assigné —'}</span></span>
        </div>
      </div>

      {/* Dernière activité */}
      <div className="relative z-10 mt-auto">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1 text-muted-foreground text-[10px] md:text-xs">
            <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3" />
            <span>
              {lastActivity ? `Activité : ${new Date(lastActivity).toLocaleDateString('fr-CH')}` : '—'}
            </span>
          </div>
          {daysSince != null && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold transition-all",
              daysSince < 7
                ? 'bg-green-500/20 text-green-600'
                : daysSince < 30
                  ? 'bg-amber-500/20 text-amber-600'
                  : 'bg-red-500/20 text-red-600'
            )}>
              J+{daysSince}
            </div>
          )}
        </div>

        <Button
          size="sm"
          className="w-full bg-sky-600 hover:bg-sky-700 text-white"
          onClick={(e) => { e.stopPropagation(); onOpenDossier(); }}
          disabled={!request}
        >
          <Home className="h-3.5 w-3.5 mr-1.5" />
          Voir dossier reloueur
          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
        </Button>
      </div>

      <ChevronRight className="absolute bottom-4 right-4 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-sky-600 group-hover:translate-x-1 transition-all pointer-events-none" />
    </div>
  );
}

function CountChip({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  const active = value > 0;
  return (
    <div className={cn(
      "rounded-lg p-2 text-center border transition-colors",
      active ? "bg-sky-500/10 border-sky-500/20" : "bg-muted/40 border-border/30"
    )}>
      <Icon className={cn("h-3.5 w-3.5 mx-auto mb-0.5", active ? "text-sky-600" : "text-muted-foreground")} />
      <div className={cn("text-sm font-bold leading-none", active && "text-sky-700")}>{value}</div>
      <div className="text-[9px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
