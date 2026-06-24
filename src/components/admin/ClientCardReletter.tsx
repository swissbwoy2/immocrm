import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Key, MapPin, Building2, Calendar, Camera, FileText, Users, Phone, Mail,
  ChevronRight, ArrowRight,
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
  rent_net: number | null;
  availability_date: string | null;
  assigned_agent_id: string | null;
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
  index: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new_request: { label: 'Nouvelle', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  to_qualify: { label: 'À qualifier', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  missing_information: { label: 'Infos manquantes', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  waiting_documents: { label: 'Docs en attente', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  waiting_photos: { label: 'Photos en attente', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  ready_to_publish: { label: 'Prêt à publier', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
  published: { label: 'Publié', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
  visits_scheduled: { label: 'Visites en cours', color: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30' },
  applications_received: { label: 'Candidatures reçues', color: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30' },
  sent_to_agency: { label: 'Transmis régie', color: 'bg-purple-500/15 text-purple-700 border-purple-500/30' },
  rented: { label: 'Reloué', color: 'bg-emerald-600/20 text-emerald-700 border-emerald-600/30' },
  cancelled: { label: 'Annulé', color: 'bg-zinc-500/15 text-zinc-600 border-zinc-500/30' },
  archived: { label: 'Archivé', color: 'bg-zinc-500/15 text-zinc-600 border-zinc-500/30' },
};

export function ClientCardReletter({
  clientId, profile, request, counts, agentName, isMixed,
  isSelected, selectionMode, onToggleSelect, onOpenClient, onOpenDossier, index,
}: Props) {
  const status = request?.status ? (STATUS_LABELS[request.status] || { label: request.status, color: 'bg-zinc-500/15 text-zinc-600 border-zinc-500/30' }) : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-card/90 backdrop-blur-xl p-4 md:p-5",
        "border border-sky-200/60 cursor-pointer flex flex-col",
        "transition-all duration-500 ease-out",
        "hover:shadow-[0_8px_30px_rgba(14,165,233,0.15)] hover:border-sky-400/60 hover:-translate-y-2",
        "animate-fade-in",
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

      <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />

      {/* Identity */}
      <div className="relative z-10 mb-3 pb-3 border-b border-border/30">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-500/10 text-sky-700 flex items-center justify-center text-sm md:text-base font-bold shrink-0">
            {(profile.prenom?.[0] || '?')}{(profile.nom?.[0] || '')}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-bold truncate">{profile.prenom} {profile.nom}</h3>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <Badge className="bg-sky-500/20 text-sky-700 border border-sky-500/30 text-[10px]">
                <Key className="w-2.5 h-2.5 mr-0.5" />
                Client reloueur
              </Badge>
              {isMixed && (
                <Badge className="bg-violet-500/15 text-violet-700 border border-violet-500/30 text-[10px]">
                  + Chercheur
                </Badge>
              )}
              {status && (
                <Badge className={cn("border text-[10px]", status.color)}>
                  {status.label}
                </Badge>
              )}
              {!request?.assigned_agent_id && (
                <Badge variant="outline" className="text-rose-600 border-rose-300 text-[10px]">
                  Sans agent
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-1 text-xs md:text-sm pl-[52px] md:pl-[60px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span className="truncate">{profile.telephone || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate text-[10px] md:text-xs">{profile.email}</span>
          </div>
        </div>
      </div>

      {/* Logement à relouer */}
      <div className="relative z-10 mb-3 pb-3 border-b border-border/30">
        <p className="text-xs md:text-sm font-medium mb-2 flex items-center gap-1.5">
          <span className="text-base">🏠</span> Logement à relouer
        </p>
        <div className="text-sm flex items-start gap-1.5 mb-2">
          <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <span className="line-clamp-2">
            {[request?.property_street, request?.property_zip, request?.property_city]
              .filter(Boolean).join(', ') || 'Adresse non renseignée'}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11px] md:text-xs">
          {request?.property_type && (
            <Badge variant="outline" className="bg-background/50">
              <Building2 className="h-3 w-3 mr-1" />
              {request.property_type}
            </Badge>
          )}
          {request?.rooms != null && (
            <Badge variant="outline" className="bg-background/50">{request.rooms} pièces</Badge>
          )}
          {request?.surface != null && (
            <Badge variant="outline" className="bg-background/50">{request.surface} m²</Badge>
          )}
          {request?.rent_net != null && (
            <Badge variant="outline" className="bg-background/50">CHF {request.rent_net}</Badge>
          )}
        </div>
        {request?.availability_date && (
          <div className="flex items-center gap-1.5 text-[11px] md:text-xs text-muted-foreground mt-2">
            <Calendar className="h-3 w-3" />
            Disponible le {new Date(request.availability_date).toLocaleDateString('fr-CH')}
          </div>
        )}
      </div>

      {/* Compteurs dossier */}
      <div className="relative z-10 mb-3 pb-3 border-b border-border/30">
        <div className="grid grid-cols-4 gap-2">
          <Counter icon={Camera} label="Photos" value={counts.photos} />
          <Counter icon={FileText} label="Docs" value={counts.docs} />
          <Counter icon={Calendar} label="Créneaux" value={counts.slots} />
          <Counter icon={Users} label="Candidats" value={counts.candidates} />
        </div>
      </div>

      {/* Agent */}
      <div className="relative z-10 text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-muted/30">
          <Users className="h-3.5 w-3.5" />
          <span className="truncate">Agent: <span className="font-medium text-foreground">{agentName}</span></span>
        </div>
      </div>

      {/* CTA dossier reloueur */}
      <div className="relative z-10 mt-auto">
        <Button
          size="sm"
          variant="default"
          className="w-full bg-sky-600 hover:bg-sky-700 text-white"
          onClick={(e) => { e.stopPropagation(); onOpenDossier(); }}
          disabled={!request}
        >
          Voir dossier reloueur
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>

      <ChevronRight className="absolute bottom-4 right-4 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-sky-600 group-hover:translate-x-1 transition-all pointer-events-none" />
    </div>
  );
}

function Counter({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="bg-muted/40 rounded-lg p-2 text-center">
      <Icon className="h-3.5 w-3.5 mx-auto mb-0.5 text-muted-foreground" />
      <div className="text-sm font-bold leading-none">{value}</div>
      <div className="text-[9px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
