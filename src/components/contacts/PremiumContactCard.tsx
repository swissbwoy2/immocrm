import { cn } from "@/lib/utils";
import { Contact, contactTypeLabels } from "./contactTypes";
import { 
  Star, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  Edit2, 
  Trash2,
  User,
  Home,
  Briefcase,
  HardHat,
  UserCheck,
  Scale,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumContactCardProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onToggleFavorite: (contact: Contact) => void;
  delay?: number;
}

const typeConfig = {
  proprietaire: {
    icon: Home,
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    glow: "group-hover:shadow-emerald-500/20",
    gradient: "from-emerald-500/30 via-emerald-400/10 to-emerald-500/30",
    particle: "bg-emerald-400/40",
  },
  gerant_regie: {
    icon: Briefcase,
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/20",
    glow: "group-hover:shadow-primary/20",
    gradient: "from-primary/30 via-primary/10 to-primary/30",
    particle: "bg-primary/40",
  },
  concierge: {
    icon: HardHat,
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    glow: "group-hover:shadow-amber-500/20",
    gradient: "from-amber-500/30 via-amber-400/10 to-amber-500/30",
    particle: "bg-amber-400/40",
  },
  locataire: {
    icon: User,
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
    glow: "group-hover:shadow-violet-500/20",
    gradient: "from-violet-500/30 via-violet-400/10 to-violet-500/30",
    particle: "bg-violet-400/40",
  },
  client_potentiel: {
    icon: UserCheck,
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
    glow: "group-hover:shadow-rose-500/20",
    gradient: "from-rose-500/30 via-rose-400/10 to-rose-500/30",
    particle: "bg-rose-400/40",
  },
  regie: {
    icon: Building2,
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
    glow: "group-hover:shadow-cyan-500/20",
    gradient: "from-cyan-500/30 via-cyan-400/10 to-cyan-500/30",
    particle: "bg-cyan-400/40",
  },
  notaire: {
    icon: Scale,
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    border: "border-indigo-500/20",
    glow: "group-hover:shadow-indigo-500/20",
    gradient: "from-indigo-500/30 via-indigo-400/10 to-indigo-500/30",
    particle: "bg-indigo-400/40",
  },
  autre: {
    icon: Users,
    bg: "bg-muted",
    text: "text-muted-foreground",
    border: "border-border",
    glow: "group-hover:shadow-muted/20",
    gradient: "from-muted/30 via-muted/10 to-muted/30",
    particle: "bg-muted-foreground/40",
  },
};

export function PremiumContactCard({
  contact,
  onEdit,
  onDelete,
  onToggleFavorite,
  delay = 0,
}: PremiumContactCardProps) {
  const config = typeConfig[contact.contact_type] || typeConfig.autre;
  const TypeIcon = config.icon;
  const fullName = [contact.civilite, contact.prenom, contact.nom].filter(Boolean).join(" ");

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl",
        "bg-card/80 backdrop-blur-xl border border-border/50",
        "transition-all duration-500 ease-out",
        "hover:shadow-xl hover:-translate-y-1",
        config.glow,
        "animate-fade-in"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Animated border gradient */}
      <div
        className={cn(
          "absolute inset-0 rounded-xl p-[1px]",
          "bg-gradient-to-r opacity-0 group-hover:opacity-100",
          "transition-opacity duration-500",
          config.gradient
        )}
      />

      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/50 via-background/80 to-background/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div
          className={cn("absolute w-2 h-2 rounded-full blur-sm animate-float", config.particle)}
          style={{ top: "15%", left: "10%", animationDelay: "0s" }}
        />
        <div
          className={cn("absolute w-1.5 h-1.5 rounded-full blur-sm animate-float", config.particle)}
          style={{ top: "50%", right: "10%", animationDelay: "0.5s" }}
        />
        <div
          className={cn("absolute w-1 h-1 rounded-full blur-sm animate-float", config.particle)}
          style={{ bottom: "20%", left: "25%", animationDelay: "1s" }}
        />
      </div>

      {/* Shine effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      </div>

      {/* Content */}
      <div className="relative p-4">
        {/* Header with favorite & type */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={cn("p-2 rounded-lg transition-all duration-300 group-hover:scale-110", config.bg)}>
              <TypeIcon className={cn("h-4 w-4", config.text)} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate group-hover:text-primary transition-colors duration-300">
                {fullName || contact.nom}
              </h3>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", config.bg, config.text)}>
                {contactTypeLabels[contact.contact_type]}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 transition-all duration-300",
              contact.is_favorite
                ? "text-yellow-400 hover:text-yellow-500"
                : "text-muted-foreground hover:text-yellow-400"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(contact);
            }}
          >
            <Star
              className={cn("h-4 w-4 transition-transform duration-300", contact.is_favorite && "fill-current scale-110")}
            />
          </Button>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm">
          {contact.entreprise && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{contact.entreprise}</span>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-muted-foreground group/email">
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              <a
                href={`mailto:${contact.email}`}
                className="truncate hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {contact.email}
              </a>
            </div>
          )}
          {contact.telephone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 flex-shrink-0" />
              <a
                href={`tel:${contact.telephone}`}
                className="truncate hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {contact.telephone}
              </a>
            </div>
          )}
          {contact.ville && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">
                {[contact.code_postal, contact.ville].filter(Boolean).join(" ")}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1 mt-4 pt-3 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(contact);
            }}
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5" />
            Modifier
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(contact);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Supprimer
          </Button>
        </div>
      </div>
    </div>
  );
}
