import { Users, User, Heart, Briefcase, Mail, Phone, Percent, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CoProprietaire {
  id: string;
  civilite: string | null;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  type_lien: string;
  quote_part: number | null;
  regime_matrimonial: string | null;
  etat_civil: string | null;
  signature_requise: boolean;
  signature_obtenue: boolean;
  date_signature: string | null;
}

interface PremiumCoProprietaireCardProps {
  coProprietaire: CoProprietaire;
  onEdit?: () => void;
  onDelete?: () => void;
}

const TYPE_LIEN_CONFIG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  proprietaire_principal: { label: 'Propriétaire principal', icon: User, color: 'bg-primary/10 text-primary' },
  conjoint: { label: 'Conjoint(e)', icon: Heart, color: 'bg-pink-500/10 text-pink-600' },
  co_proprietaire: { label: 'Co-propriétaire', icon: Users, color: 'bg-blue-500/10 text-blue-600' },
  associe: { label: 'Associé(e)', icon: Briefcase, color: 'bg-amber-500/10 text-amber-600' },
  heritier: { label: 'Héritier(ère)', icon: Users, color: 'bg-purple-500/10 text-purple-600' }
};

const REGIME_LABELS: Record<string, string> = {
  participation_acquets: 'Participation aux acquêts',
  separation_biens: 'Séparation de biens',
  communaute_biens: 'Communauté de biens'
};

export function PremiumCoProprietaireCard({ 
  coProprietaire, 
  onEdit, 
  onDelete 
}: PremiumCoProprietaireCardProps) {
  const typeLien = TYPE_LIEN_CONFIG[coProprietaire.type_lien] || TYPE_LIEN_CONFIG.co_proprietaire;
  const TypeIcon = typeLien.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeLien.color}`}>
              <TypeIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold">
                {coProprietaire.civilite && `${coProprietaire.civilite} `}
                {coProprietaire.prenom} {coProprietaire.nom}
              </h3>
              <p className="text-sm text-muted-foreground">{typeLien.label}</p>
            </div>
          </div>
          
          {coProprietaire.quote_part !== null && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Percent className="w-3 h-3" />
              {coProprietaire.quote_part}%
            </Badge>
          )}
        </div>

        {/* Contact */}
        <div className="space-y-1 mb-3">
          {coProprietaire.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-3.5 h-3.5" />
              <span>{coProprietaire.email}</span>
            </div>
          )}
          {coProprietaire.telephone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-3.5 h-3.5" />
              <span>{coProprietaire.telephone}</span>
            </div>
          )}
        </div>

        {/* Régime matrimonial (si conjoint) */}
        {coProprietaire.type_lien === 'conjoint' && coProprietaire.regime_matrimonial && (
          <div className="text-sm text-muted-foreground mb-3">
            <span className="font-medium">Régime: </span>
            {REGIME_LABELS[coProprietaire.regime_matrimonial] || coProprietaire.regime_matrimonial}
          </div>
        )}

        {/* Signature status */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            {coProprietaire.signature_obtenue ? (
              <>
                <div className="p-1 rounded-full bg-green-500/10">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                </div>
                <span className="text-sm text-green-600">Signature obtenue</span>
              </>
            ) : coProprietaire.signature_requise ? (
              <>
                <div className="p-1 rounded-full bg-amber-500/10">
                  <X className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-sm text-amber-600">Signature requise</span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Signature non requise</span>
            )}
          </div>

          <div className="flex gap-1">
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                Modifier
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onDelete}>
                Supprimer
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
