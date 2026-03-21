import { Badge } from "@/components/ui/badge";
import { Home, Key, Building2, HelpCircle } from "lucide-react";

interface ClientTypeBadgeProps {
  typeRecherche?: string | null;
  size?: 'sm' | 'default';
  showIcon?: boolean;
}

export function ClientTypeBadge({ typeRecherche, size = 'default', showIcon = true }: ClientTypeBadgeProps) {
  const isAcheteur = typeRecherche === 'Acheter';
  const isVendeur = typeRecherche === 'Vendre';
  const isLouer = typeRecherche === 'Louer';

  const config = isAcheteur
    ? { icon: Home, label: size === 'sm' ? 'Achat' : '🏠 Achat', className: 'bg-emerald-600 hover:bg-emerald-700' }
    : isVendeur
    ? { icon: Building2, label: size === 'sm' ? 'Vendeur' : '🏢 Vendeur', className: 'bg-purple-600 hover:bg-purple-700' }
    : isLouer
    ? { icon: Key, label: size === 'sm' ? 'Location' : '🔑 Location', className: 'bg-blue-600 hover:bg-blue-700' }
    : { icon: HelpCircle, label: 'À classifier', className: 'bg-muted text-muted-foreground' };

  const IconComponent = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <Badge 
      variant={typeRecherche ? "default" : "secondary"}
      className={config.className}
    >
      {showIcon && <IconComponent className={`${iconSize} mr-1`} />}
      {config.label}
    </Badge>
  );
}

export function getClientTypeLabel(typeRecherche?: string | null): string {
  if (typeRecherche === 'Acheter') return 'Achat';
  if (typeRecherche === 'Vendre') return 'Vendeur';
  return 'Location';
}

export function isClientAcheteur(typeRecherche?: string | null): boolean {
  return typeRecherche === 'Acheter';
}
