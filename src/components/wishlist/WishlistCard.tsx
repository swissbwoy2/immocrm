import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin, Home, Tag, Phone, Mail, User, ExternalLink, Send,
  CheckCircle2, Clock, Archive, Trash2, MessageSquare, Calendar,
} from 'lucide-react';
import { WishlistBien, WishlistStatut, useWishlist } from '@/hooks/useWishlist';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUT_META: Record<WishlistStatut, { label: string; color: string; icon: any }> = {
  a_contacter: { label: 'À contacter', color: 'bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-300', icon: Clock },
  contacte_sans_reponse: { label: 'Sans réponse', color: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300', icon: Clock },
  offre_envoyee: { label: 'Offre envoyée', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-300', icon: CheckCircle2 },
  indisponible: { label: 'Indisponible', color: 'bg-rose-500/10 text-rose-700 border-rose-300 dark:text-rose-300', icon: Archive },
  archive: { label: 'Archivé', color: 'bg-muted text-muted-foreground border-border', icon: Archive },
};

interface Props {
  item: WishlistBien;
  basePath: string; // '/admin' or '/agent'
}

export function WishlistCard({ item, basePath }: Props) {
  const navigate = useNavigate();
  const { markContacted, archive, remove, updateItem } = useWishlist();
  const meta = STATUT_META[item.statut];
  const StatutIcon = meta.icon;
  const isOfferSent = item.statut === 'offre_envoyee';

  const handleSendOffer = () => {
    const params = new URLSearchParams({
      lien: item.lien_annonce,
      adresse: item.adresse,
      ...(item.prix ? { prix: String(item.prix) } : {}),
      ...(item.nb_pieces ? { pieces: String(item.nb_pieces) } : {}),
      ...(item.type_bien ? { type: item.type_bien } : {}),
    });
    navigate(`${basePath}/envoyer-offre?${params.toString()}`);
  };

  return (
    <Card className={`overflow-hidden flex flex-col group hover:shadow-lg transition-all ${
      isOfferSent ? 'border-emerald-400/50 ring-1 ring-emerald-400/20' : ''
    }`}>
      {/* Header avec statut */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <Badge className={`${meta.color} border gap-1 font-medium`}>
          <StatutIcon className="h-3 w-3" />
          {meta.label}
        </Badge>
        {item.source_portail && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {item.source_portail}
          </span>
        )}
      </div>

      <div className="px-4 pb-3 flex-1 space-y-3">
        {/* Adresse principale */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight text-sm">{item.adresse}</p>
            {(item.npa || item.ville) && (
              <p className="text-xs text-muted-foreground">{[item.npa, item.ville].filter(Boolean).join(' ')}</p>
            )}
          </div>
        </div>

        {/* Caractéristiques */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {item.type_bien && (
            <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{item.type_bien}</span>
          )}
          {item.nb_pieces != null && (
            <span className="flex items-center gap-1"><Home className="h-3 w-3" />{item.nb_pieces} pièces</span>
          )}
          {item.surface != null && <span>{item.surface} m²</span>}
          {item.prix != null && (
            <span className="font-semibold text-foreground">{item.prix.toLocaleString('fr-CH')} CHF</span>
          )}
        </div>

        {/* Contact */}
        {(item.contact_nom || item.contact_telephone || item.contact_email) && (
          <div className="rounded-md bg-muted/50 p-2 space-y-1 text-xs">
            {item.contact_nom && (
              <div className="flex items-center gap-1.5"><User className="h-3 w-3 text-muted-foreground" />{item.contact_nom}</div>
            )}
            {item.contact_telephone && (
              <a href={`tel:${item.contact_telephone}`} className="flex items-center gap-1.5 hover:text-primary">
                <Phone className="h-3 w-3 text-muted-foreground" />{item.contact_telephone}
              </a>
            )}
            {item.contact_email && (
              <a href={`mailto:${item.contact_email}`} className="flex items-center gap-1.5 hover:text-primary truncate">
                <Mail className="h-3 w-3 text-muted-foreground shrink-0" /><span className="truncate">{item.contact_email}</span>
              </a>
            )}
          </div>
        )}

        {/* Lien annonce */}
        <a
          href={item.lien_annonce}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> Voir l'annonce
        </a>

        {/* Notes */}
        {item.notes && (
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground italic">
            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
            <p className="line-clamp-2">{item.notes}</p>
          </div>
        )}

        {/* Suivi */}
        {(item.date_dernier_contact || item.nb_relances > 0) && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground border-t pt-2">
            {item.date_dernier_contact && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Contacté le {format(new Date(item.date_dernier_contact), 'dd MMM', { locale: fr })}
              </span>
            )}
            {item.nb_relances > 0 && <span>· {item.nb_relances} relance{item.nb_relances > 1 ? 's' : ''}</span>}
          </div>
        )}

        {/* Offre envoyée */}
        {isOfferSent && item.date_offre_envoyee && (
          <div className="rounded-md bg-emerald-500/10 border border-emerald-300/30 p-2 text-xs flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Offre envoyée le {format(new Date(item.date_offre_envoyee), 'dd MMM yyyy', { locale: fr })}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 pt-2 border-t flex flex-wrap gap-2">
        {!isOfferSent && (
          <>
            <Button size="sm" variant="outline" onClick={() => markContacted(item)} className="flex-1 min-w-[120px]">
              <Clock className="h-3.5 w-3.5 mr-1" />
              {item.statut === 'contacte_sans_reponse' ? 'Relancer' : 'Marquer contacté'}
            </Button>
            <Button size="sm" onClick={handleSendOffer} className="flex-1 min-w-[120px]">
              <Send className="h-3.5 w-3.5 mr-1" /> Envoyer offre
            </Button>
          </>
        )}
        {item.statut !== 'archive' ? (
          <Button size="sm" variant="ghost" onClick={() => archive(item.id)} title="Archiver">
            <Archive className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => updateItem(item.id, { statut: 'a_contacter' })}>
            Restaurer
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => remove(item.id)} title="Supprimer" className="text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
