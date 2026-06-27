import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, MapPin, Layers, Square, Hash, Calendar, ExternalLink, Heart, X, CalendarCheck, Banknote, Info } from 'lucide-react';
import { formatCHF } from '@/lib/purchaseFinancing';
import { AddressLink } from '@/components/AddressLink';

interface PurchaseOffreCardProps {
  offre: any;
  onInterested?: () => void;
  onNotInterested?: () => void;
  onRequestVisit?: () => void;
  compact?: boolean;
}

const STATUT_LABEL: Record<string, { label: string; color: string }> = {
  envoyee:              { label: 'Bien proposé', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  vue:                  { label: 'Vu', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  interesse:            { label: 'Intéressé', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  visite_planifiee:     { label: 'Visite planifiée', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  visite_effectuee:     { label: 'Visite effectuée', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  offre_envisagee:      { label: 'Offre d\'achat envisagée', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  refusee:              { label: 'Écarté', color: 'bg-zinc-100 text-zinc-600 border-zinc-200' },
};

export function PurchaseOffreCard({ offre, onInterested, onNotInterested, onRequestVisit, compact }: PurchaseOffreCardProps) {
  const statut = STATUT_LABEL[offre.statut] || { label: offre.statut || 'Proposé', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
  const isInterested = ['interesse', 'visite_planifiee', 'visite_effectuee', 'offre_envisagee'].includes(offre.statut);
  const isRefused = offre.statut === 'refusee';

  return (
    <Card className="overflow-hidden border-sky-100 bg-gradient-to-br from-white via-sky-50/30 to-white hover:border-sky-200 hover:shadow-md transition">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="h-9 w-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Home className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <AddressLink address={offre.adresse} className="font-semibold text-base text-foreground block" showIcon={false} />
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {[offre.npa, offre.ville].filter(Boolean).join(' ') || offre.localisation || ''}
                </div>
              </div>
            </div>
          </div>
          <Badge className={`border ${statut.color}`}>{statut.label}</Badge>
        </div>

        {/* Prix de vente */}
        <div className="rounded-xl bg-sky-600/5 border border-sky-200 px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-sky-700 font-semibold">Prix de vente</div>
            <div className="text-2xl font-bold text-sky-700">{formatCHF(Number(offre.prix) || 0)}</div>
          </div>
          <Banknote className="h-7 w-7 text-sky-600/60" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {offre.nombre_pieces || offre.pieces ? (
            <Stat icon={Layers} label="Pièces" value={offre.nombre_pieces || offre.pieces} />
          ) : null}
          {offre.surface ? <Stat icon={Square} label="Surface" value={`${offre.surface} m²`} /> : null}
          {offre.etage != null && offre.etage !== '' ? <Stat icon={Hash} label="Étage" value={offre.etage} /> : null}
          {offre.disponibilite ? <Stat icon={Calendar} label="Disponibilité" value={offre.disponibilite} /> : null}
        </div>

        {/* Description */}
        {offre.description && !compact && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{offre.description}</p>
        )}

        {/* Lien annonce */}
        {offre.lien_annonce && (
          <a
            href={offre.lien_annonce}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-sky-700 hover:underline"
          >
            Annonce originale <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {/* Carte Google Maps */}
        {!compact && offre.adresse && (
          <div className="rounded-xl overflow-hidden border border-sky-100 shadow-sm">
            <iframe
              title={`Carte ${offre.adresse}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(offre.adresse)}&output=embed`}
              width="100%"
              height="220"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ border: 0, display: 'block' }}
              allowFullScreen
            />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(offre.adresse)}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 py-2 transition"
            >
              <MapPin className="h-3.5 w-3.5" /> Ouvrir dans Google Maps
            </a>
          </div>
        )}

        {/* Conseil achat */}
        {!compact && (
          <div className="rounded-lg bg-amber-50/60 border border-amber-100 px-3 py-2 flex items-start gap-2 text-xs text-amber-900">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>Validation bancaire recommandée avant toute offre d'achat. Planifiez une visite ou demandez une analyse du bien.</span>
          </div>
        )}

        {/* Actions */}
        {(onInterested || onNotInterested || onRequestVisit) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {onInterested && !isInterested && (
              <Button size="sm" onClick={onInterested} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Heart className="h-4 w-4 mr-1.5" /> Intéressé
              </Button>
            )}
            {onRequestVisit && (
              <Button size="sm" variant="outline" onClick={onRequestVisit} className="border-sky-300 text-sky-700 hover:bg-sky-50">
                <CalendarCheck className="h-4 w-4 mr-1.5" /> Demander une visite
              </Button>
            )}
            {onNotInterested && !isRefused && (
              <Button size="sm" variant="ghost" onClick={onNotInterested} className="text-muted-foreground hover:text-red-600">
                <X className="h-4 w-4 mr-1.5" /> Pas intéressé
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function Stat({ icon: Icon, label, value }: any) {
  return (
    <div className="rounded-lg bg-white border border-sky-100 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="text-sm font-semibold text-foreground mt-0.5 truncate">{value}</div>
    </div>
  );
}
