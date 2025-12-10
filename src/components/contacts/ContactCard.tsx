import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Star, 
  StarOff, 
  Pencil, 
  Trash2, 
  Mail, 
  Phone, 
  Building2, 
  MapPin 
} from "lucide-react";
import { Contact, contactTypeLabels, contactTypeColors, ContactType } from "./contactTypes";

interface ContactCardProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onToggleFavorite: (contact: Contact) => void;
  showAgent?: boolean;
  agentName?: string;
}

export function ContactCard({ 
  contact, 
  onEdit, 
  onDelete, 
  onToggleFavorite,
  showAgent = false,
  agentName
}: ContactCardProps) {
  const fullName = [contact.civilite, contact.prenom, contact.nom].filter(Boolean).join(' ');
  const address = [contact.adresse, contact.code_postal, contact.ville].filter(Boolean).join(', ');

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <button 
                onClick={() => onToggleFavorite(contact)}
                className="text-muted-foreground hover:text-yellow-500 transition-colors"
              >
                {contact.is_favorite ? (
                  <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
                ) : (
                  <StarOff className="h-5 w-5" />
                )}
              </button>
              <h3 className="font-semibold text-foreground truncate">{fullName}</h3>
              <Badge className={contactTypeColors[contact.contact_type as ContactType]}>
                {contactTypeLabels[contact.contact_type as ContactType]}
              </Badge>
            </div>

            <div className="space-y-1 text-sm text-muted-foreground">
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0" />
                  <a 
                    href={`mailto:${contact.email}`} 
                    className="hover:text-primary truncate"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              
              {contact.telephone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  <a 
                    href={`tel:${contact.telephone}`} 
                    className="hover:text-primary"
                  >
                    {contact.telephone}
                  </a>
                  {contact.telephone_secondaire && (
                    <span className="text-muted-foreground/60">
                      / {contact.telephone_secondaire}
                    </span>
                  )}
                </div>
              )}

              {contact.entreprise && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {contact.entreprise}
                    {contact.fonction && ` - ${contact.fonction}`}
                  </span>
                </div>
              )}

              {address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{address}</span>
                </div>
              )}

              {showAgent && agentName && (
                <div className="text-xs text-muted-foreground/60 mt-2">
                  Agent: {agentName}
                </div>
              )}
            </div>

            {contact.tags && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {contact.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {contact.notes && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {contact.notes}
              </p>
            )}
          </div>

          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(contact)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(contact)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
